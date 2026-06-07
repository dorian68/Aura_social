/**
 * Seed script: demo data for commercial presentations
 *
 * Creates a compelling creator + fan community with realistic engagement history.
 * Safe to run multiple times — skips if slug already exists.
 *
 * Usage:
 *   node scripts/seed-demo.mjs
 *   SMOKE_BASE_URL=https://your-ngrok-url node scripts/seed-demo.mjs
 */

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3009";

const DEMO_SLUG = "nour-inner-circle";

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!d.success) throw new Error(`POST ${path} → ${d.error?.code}: ${d.error?.message}`);
  return d.data;
}

async function get(path) {
  const r = await fetch(`${BASE}${path}`);
  const d = await r.json();
  if (!d.success) throw new Error(`GET ${path} → ${d.error?.code}: ${d.error?.message}`);
  return d.data;
}

// ── Check if demo community already exists ──────────────────────────────────

console.log("🔍 Checking for existing demo community…");
let communityId, creatorId;

try {
  const existing = await get(`/api/club/${DEMO_SLUG}`);
  communityId = existing.community.id;
  creatorId = existing.community.creatorId;
  console.log(`✓ Demo community exists (id: ${communityId.slice(0, 8)})`);
} catch {
  communityId = null;
}

// ── Create creator + community if needed ────────────────────────────────────

if (!communityId) {
  console.log("🎤 Creating demo creator: Nour…");
  const creator = await post("/api/creators", {
    displayName: "Nour",
    bio: "Artiste indie-pop basée à Paris. 280k abonnés Instagram. En tournée jusqu'en décembre.",
    niche: "music",
    city: "Paris",
    instagramHandle: "@nourmusique",
    tiktokHandle: "@nourmusique",
  });
  creatorId = creator.creator.id;
  console.log(`  → creator id: ${creatorId.slice(0, 8)}`);

  console.log("🏛️  Creating community: Nour Inner Circle…");
  const community = await post("/api/admin/communities", {
    creatorId,
    name: "Nour Inner Circle",
    description: "Le club privé des vrais fans de Nour. Accès aux coulisses, écoutes en avant-première, et rencontres exclusives.",
    brandColor: "#C8B4FA",
    isPublic: true,
    customSlug: DEMO_SLUG,
  });
  communityId = community.community.id;
  console.log(`  → community id: ${communityId.slice(0, 8)}, slug: ${DEMO_SLUG}`);
}

// ── Create challenges ───────────────────────────────────────────────────────

console.log("⚡ Creating challenges…");

const challenges = await Promise.all([
  post(`/api/admin/challenges/${communityId}`, {
    title: "Poste une photo au concert",
    description: "Tag @nourmusique sur Instagram avec le hashtag #NourInnerCircle",
    type: "post",
    pointsReward: 200,
    maxCompletions: 1,
    requiresProof: true,
  }),
  post(`/api/admin/challenges/${communityId}`, {
    title: "Partage une story",
    description: "Partage notre annonce de tournée en story Instagram",
    type: "share",
    pointsReward: 100,
    maxCompletions: 3,
    requiresProof: false,
  }),
  post(`/api/admin/challenges/${communityId}`, {
    title: "Recrute un ami",
    description: "Invite un ami à rejoindre le Inner Circle via ton lien de parrainage",
    type: "referral",
    pointsReward: 150,
    maxCompletions: 10,
    requiresProof: false,
  }),
  post(`/api/admin/challenges/${communityId}`, {
    title: "Écoute l'album en avant-première",
    description: "Clique sur le lien privé et écoute le nouvel album avant tout le monde",
    type: "custom",
    pointsReward: 300,
    maxCompletions: 1,
    requiresProof: false,
  }),
]);

console.log(`  → ${challenges.length} challenges créés`);

// ── Create rewards ──────────────────────────────────────────────────────────

console.log("🎁 Creating rewards…");

const rewards = await Promise.all([
  post(`/api/admin/rewards/${communityId}`, {
    title: "Backstage VIP — Concert Paris",
    description: "Rencontre Nour en backstage après le concert du 15 novembre à La Cigale. 1 place incluse.",
    pointsCost: 800,
    type: "experience",
    stock: 5,
  }),
  post(`/api/admin/rewards/${communityId}`, {
    title: "Vinyle dédicacé",
    description: "Édition limitée du dernier album, signé par Nour avec un message personnalisé.",
    pointsCost: 400,
    type: "physical",
    stock: 20,
  }),
  post(`/api/admin/rewards/${communityId}`, {
    title: "T-shirt Inner Circle exclusif",
    description: "Le t-shirt officiel Inner Circle, disponible uniquement pour les membres. Taille au choix.",
    pointsCost: 250,
    type: "physical",
    stock: 50,
  }),
  post(`/api/admin/rewards/${communityId}`, {
    title: "Masterclass live — composition",
    description: "Session live privée de 45 min avec Nour sur Zoom. Apprenez ses techniques de composition.",
    pointsCost: 600,
    type: "experience",
    stock: 10,
  }),
]);

console.log(`  → ${rewards.length} rewards créés`);

// ── Create fans with varied engagement ─────────────────────────────────────

console.log("👥 Creating demo fans…");

const FAN_DATA = [
  { email: "sophie.martin@gmail.com",    name: "Sophie M.",    pts: 950, tier: "vip" },
  { email: "theo.bernard@outlook.fr",    name: "Théo B.",      pts: 820, tier: "vip" },
  { email: "camille.dupont@yahoo.fr",    name: "Camille D.",   pts: 710, tier: "vip" },
  { email: "lucas.petit@gmail.com",      name: "Lucas P.",     pts: 580, tier: "superfan" },
  { email: "inès.moreau@hotmail.fr",     name: "Inès M.",      pts: 490, tier: "superfan" },
  { email: "hugo.simon@gmail.com",       name: "Hugo S.",      pts: 410, tier: "superfan" },
  { email: "jade.leroy@outlook.fr",      name: "Jade L.",      pts: 320, tier: "superfan" },
  { email: "noah.roux@gmail.com",        name: "Noah R.",      pts: 200, tier: "fan" },
  { email: "emma.faure@yahoo.fr",        name: "Emma F.",      pts: 150, tier: "fan" },
  { email: "baptiste.henry@gmail.com",   name: "Baptiste H.",  pts: 100, tier: "fan" },
  { email: "clara.blanc@outlook.fr",     name: "Clara B.",     pts: 50,  tier: "fan" },
  { email: "maxime.garcia@gmail.com",    name: "Maxime G.",    pts: 50,  tier: "fan" },
];

const fanIds = [];
for (const fan of FAN_DATA) {
  try {
    const joined = await post(`/api/club/${DEMO_SLUG}/join`, {
      email: fan.email,
      displayName: fan.name,
    });

    const fanId = joined.fan.id;
    fanIds.push({ fanId, ...fan });

    // Award extra points to reach target (join gives 50)
    const extra = fan.pts - 50;
    if (extra > 0) {
      await post("/api/admin/points/award", {
        fanId,
        communityId,
        amount: extra,
        note: "points cumulés — activités passées",
      });
    }
    process.stdout.write(`  ✓ ${fan.name} (${fan.pts} pts)\n`);
  } catch (e) {
    process.stdout.write(`  ~ ${fan.name} already exists or error: ${e.message}\n`);
  }
}

// ── Create a QR code for a venue ────────────────────────────────────────────

console.log("📱 Creating venue QR code…");

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3009";
const topFan = fanIds[0];

try {
  const qr = await post("/api/admin/qr", {
    communityId,
    label: "La Cigale — Paris — 15 Nov",
    redirectUrl: `${BASE_URL}/club/${DEMO_SLUG}`,
  });
  console.log(`  → QR code créé: /qr/${qr.qrCode?.code ?? "ok"}`);
} catch (e) {
  console.log(`  ~ QR code: ${e.message}`);
}

// ── Create a signal rule ────────────────────────────────────────────────────

console.log("📡 Creating Instagram signal rule…");
try {
  await post(`/api/admin/signals/rules/${communityId}`, {
    platform: "instagram",
    signalType: "post",
    keywords: ["nourmusique", "NourInnerCircle", "nourofficial"],
    pointsReward: 75,
    maxPerFan: 10,
    maxPerDay: 3,
  });
  console.log("  → rule created");
} catch (e) {
  console.log(`  ~ signal rule: ${e.message}`);
}

// ── Final summary ───────────────────────────────────────────────────────────

console.log("\n✅ DEMO READY\n");
console.log(`Club public   : ${BASE}/club/${DEMO_SLUG}`);
console.log(`Admin dash    : ${BASE}/dashboard/${communityId}`);
if (fanIds[0]) {
  console.log(`Fan profil    : ${BASE}/fan/${fanIds[0].fanId}`);
}
console.log(`\nCommunity ID  : ${communityId}`);
console.log(`Slug          : ${DEMO_SLUG}`);
console.log(`Fans créés    : ${fanIds.length} / ${FAN_DATA.length}`);
