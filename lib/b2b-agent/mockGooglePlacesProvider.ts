import type { B2BDiscoveryInput, BusinessCategory, LocalBusiness } from "./types";

const now = "2026-06-04T09:00:00.000Z";

const mockBusinesses: LocalBusiness[] = [
  buildBusiness({
    id: "biz_sunset_table_fdf",
    name: "Le Sunset Table",
    category: "restaurant",
    address: "Rue Victor Hugo",
    city: "Fort-de-France",
    region: "Martinique",
    country: "France",
    latitude: 14.607,
    longitude: -61.07,
    rating: 4.6,
    reviewCount: 418,
    priceLevel: 3,
    instagramHandle: "@lesunsettable",
  }),
  buildBusiness({
    id: "biz_madiana_fit",
    name: "Madiana Fit Club",
    category: "gym",
    address: "Schoelcher",
    city: "Fort-de-France",
    region: "Martinique",
    country: "France",
    latitude: 14.616,
    longitude: -61.101,
    rating: 4.4,
    reviewCount: 201,
    priceLevel: 2,
    instagramHandle: "@madianafit",
  }),
  buildBusiness({
    id: "biz_creole_concept",
    name: "Creole Concept Store",
    category: "concept_store",
    address: "Centre-ville",
    city: "Fort-de-France",
    region: "Martinique",
    country: "France",
    latitude: 14.604,
    longitude: -61.074,
    rating: 4.7,
    reviewCount: 145,
    priceLevel: 2,
    instagramHandle: "@creoleconcept",
  }),
  buildBusiness({
    id: "biz_spice_beauty",
    name: "Spice Beauty Studio",
    category: "beauty",
    address: "Route de Didier",
    city: "Fort-de-France",
    region: "Martinique",
    country: "France",
    latitude: 14.624,
    longitude: -61.067,
    rating: 4.8,
    reviewCount: 93,
    priceLevel: 2,
    instagramHandle: "@spicebeautystudio",
  }),
  buildBusiness({
    id: "biz_papaya_rooftop",
    name: "Papaya Rooftop",
    category: "bar",
    address: "Marina Bas-du-Fort",
    city: "Pointe-à-Pitre",
    region: "Guadeloupe",
    country: "France",
    latitude: 16.222,
    longitude: -61.526,
    rating: 4.5,
    reviewCount: 327,
    priceLevel: 3,
    instagramHandle: "@papayarooftop",
  }),
  buildBusiness({
    id: "biz_kreyol_threads",
    name: "Kreyol Threads",
    category: "fashion",
    address: "Rue Frébault",
    city: "Pointe-à-Pitre",
    region: "Guadeloupe",
    country: "France",
    latitude: 16.241,
    longitude: -61.535,
    rating: 4.6,
    reviewCount: 178,
    priceLevel: 2,
    instagramHandle: "@kreyolthreads",
  }),
  buildBusiness({
    id: "biz_blue_lagoon_tours",
    name: "Blue Lagoon Tours",
    category: "tourism",
    address: "Gosier Marina",
    city: "Pointe-à-Pitre",
    region: "Guadeloupe",
    country: "France",
    latitude: 16.205,
    longitude: -61.501,
    rating: 4.9,
    reviewCount: 512,
    priceLevel: 4,
    instagramHandle: "@bluelagoontours",
  }),
  buildBusiness({
    id: "biz_culture_yard",
    name: "Culture Yard",
    category: "event_venue",
    address: "Basse-Terre Centre",
    city: "Basse-Terre",
    region: "Guadeloupe",
    country: "France",
    latitude: 15.996,
    longitude: -61.732,
    rating: 4.3,
    reviewCount: 88,
    priceLevel: 2,
    instagramHandle: "@cultureyard",
  }),
];

export function discoverMockPlaces(input: B2BDiscoveryInput): LocalBusiness[] {
  const normalizedLocation = normalize(input.location);
  const categories = input.categories.length ? new Set(input.categories) : null;

  return mockBusinesses
    .filter((business) => {
      const locationMatch =
        normalize(business.city).includes(normalizedLocation) ||
        normalizedLocation.includes(normalize(business.city)) ||
        normalize(business.region).includes(normalizedLocation);
      const categoryMatch = !categories || categories.has(business.category);
      return locationMatch && categoryMatch;
    })
    .slice(0, input.limit || 8)
    .map((business) => ({
      ...business,
      discoveryStatus: "mock_discovered",
      source: "mock_google_places",
    }));
}

export function getMockBusinessCatalog() {
  return mockBusinesses;
}

function buildBusiness(input: Omit<LocalBusiness, "source" | "discoveryStatus" | "createdAt" | "googlePlaceId" | "website" | "phone" | "email">): LocalBusiness {
  return {
    ...input,
    website: `https://example.local/${input.id}`,
    phone: "+596000000000",
    email: "mock-contact@example.local",
    googlePlaceId: `mock_place_${input.id}`,
    source: "mock_google_places",
    discoveryStatus: "mock_discovered",
    createdAt: now,
  };
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export const defaultB2BCategories: BusinessCategory[] = [
  "restaurant",
  "bar",
  "fashion",
  "beauty",
  "event_venue",
  "gym",
  "tourism",
  "concept_store",
];
