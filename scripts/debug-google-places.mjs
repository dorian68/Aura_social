import {
  discoverGooglePlaces,
  getGooglePlacesReadiness,
} from "../lib/b2b-agent/googlePlacesProvider.ts";

const readiness = getGooglePlacesReadiness();
if (!readiness.configured || !readiness.enabled) {
  console.log(JSON.stringify({
    script: "debug-google-places",
    success: true,
    skipped: true,
    readiness,
    blocker: "Set GOOGLE_PLACES_API_KEY and AURA_ALLOW_REAL_DISCOVERY=true to run a real provider call.",
  }, null, 2));
  process.exit(0);
}

const businesses = await discoverGooglePlaces({
  location: process.env.GOOGLE_PLACES_TEST_LOCATION || "Fort-de-France",
  categories: ["restaurant", "concept_store"],
  limit: 5,
});

console.log(JSON.stringify({
  script: "debug-google-places",
  success: businesses.length > 0,
  skipped: false,
  readiness,
  businesses: businesses.map((business) => ({
    id: business.id,
    name: business.name,
    address: business.address,
    rating: business.rating,
    source: business.source,
  })),
}, null, 2));

if (businesses.length === 0) process.exitCode = 1;
