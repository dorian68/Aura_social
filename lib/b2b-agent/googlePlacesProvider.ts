import crypto from "node:crypto";
import { DomainError } from "@/lib/domainError";
import type {
  B2BDiscoveryInput,
  BusinessCategory,
  LocalBusiness,
} from "./types";

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  primaryType?: string;
  types?: string[];
}

interface GooglePlacesResponse {
  places?: GooglePlace[];
  error?: { code?: number; message?: string; status?: string };
}

const CATEGORY_QUERY: Record<BusinessCategory, string> = {
  restaurant: "restaurants",
  bar: "bars",
  fashion: "fashion stores",
  beauty: "beauty salons",
  gym: "gyms",
  hotel: "hotels",
  tourism: "tourist attractions",
  event_venue: "event venues",
  local_product: "local product stores",
  concept_store: "concept stores",
  culture: "cultural venues",
};

export function getGooglePlacesReadiness() {
  return {
    configured: Boolean(process.env.GOOGLE_PLACES_API_KEY),
    enabled: process.env.AURA_ALLOW_REAL_DISCOVERY === "true",
  };
}

export async function discoverGooglePlaces(
  input: B2BDiscoveryInput,
): Promise<LocalBusiness[]> {
  const readiness = getGooglePlacesReadiness();
  if (!readiness.enabled) {
    throw new DomainError(
      "GOOGLE_PLACES_DISABLED",
      "Real Google Places discovery is disabled. Set AURA_ALLOW_REAL_DISCOVERY=true explicitly.",
      409,
    );
  }
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || "";
  if (!apiKey) {
    throw new DomainError(
      "GOOGLE_PLACES_NOT_CONFIGURED",
      "GOOGLE_PLACES_API_KEY is required for real business discovery.",
      503,
    );
  }

  const categories: BusinessCategory[] = input.categories.length
    ? input.categories
    : ["restaurant"];
  const query = `${categories.slice(0, 4).map((category) => CATEGORY_QUERY[category]).join(" or ")} in ${input.location}`;
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.websiteUri",
        "places.nationalPhoneNumber",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.primaryType",
        "places.types",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: Math.max(1, Math.min(input.limit || 8, 20)),
      languageCode: "fr",
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as GooglePlacesResponse;
  if (!response.ok) {
    throw new DomainError(
      "GOOGLE_PLACES_REQUEST_FAILED",
      payload.error?.message || `Google Places returned HTTP ${response.status}.`,
      502,
      { providerStatus: payload.error?.status || "", httpStatus: response.status },
    );
  }

  return (payload.places || []).map((place) => mapGooglePlace(place, input.location));
}

function mapGooglePlace(place: GooglePlace, location: string): LocalBusiness {
  const category = mapCategory(place.primaryType, place.types || []);
  return {
    id: `google_place_${place.id || crypto.randomUUID()}`,
    name: place.displayName?.text || "Unnamed Google Place",
    category,
    address: place.formattedAddress || location,
    city: location,
    region: "",
    country: "",
    latitude: place.location?.latitude || 0,
    longitude: place.location?.longitude || 0,
    website: place.websiteUri,
    phone: place.nationalPhoneNumber,
    googlePlaceId: place.id,
    rating: place.rating || 0,
    reviewCount: place.userRatingCount || 0,
    priceLevel: mapPriceLevel(place.priceLevel),
    source: "google_places",
    discoveryStatus: "qualified",
    createdAt: new Date().toISOString(),
  };
}

function mapCategory(primaryType = "", types: string[]): BusinessCategory {
  const value = [primaryType, ...types].join(" ");
  if (/restaurant|food|cafe|bakery/.test(value)) return "restaurant";
  if (/bar|night_club/.test(value)) return "bar";
  if (/beauty|hair|spa/.test(value)) return "beauty";
  if (/gym|fitness/.test(value)) return "gym";
  if (/hotel|lodging/.test(value)) return "hotel";
  if (/museum|art_gallery|cultural/.test(value)) return "culture";
  if (/tourist|travel/.test(value)) return "tourism";
  if (/event|convention/.test(value)) return "event_venue";
  if (/clothing|shoe|jewelry|fashion/.test(value)) return "fashion";
  return "concept_store";
}

function mapPriceLevel(value?: string): 1 | 2 | 3 | 4 {
  if (value === "PRICE_LEVEL_EXPENSIVE" || value === "PRICE_LEVEL_VERY_EXPENSIVE") return 4;
  if (value === "PRICE_LEVEL_MODERATE") return 3;
  if (value === "PRICE_LEVEL_INEXPENSIVE") return 2;
  return 1;
}
