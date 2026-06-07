import Database from "better-sqlite3";
const db = new Database("./data/aura-state/aura.sqlite");

const CID = "a2eab9cf-1264-405a-ab39-0c1d08de3cf3";
const BASE = process.env.DEMO_BASE_URL || "http://localhost:3009";

const fans = db.prepare(`
  SELECT f.id, COALESCE(f.display_name, f.email) as name, l.balance, m.tier
  FROM sf_fans f
  JOIN sf_points_ledger l ON l.fan_id=f.id AND l.community_id=?
  JOIN sf_memberships m ON m.fan_id=f.id AND m.community_id=?
  ORDER BY l.balance DESC LIMIT 3
`).all(CID, CID);

const community = db.prepare("SELECT * FROM sf_communities WHERE id=?").get(CID);

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║               AURA — DEMO URLS                              ║");
console.log("╠══════════════════════════════════════════════════════════════╣");
console.log(`║ Club page   ${BASE}/club/nour-inner-circle`);
console.log(`║ Admin dash  ${BASE}/dashboard/${CID}`);
fans.forEach((f, i) => {
  const label = ["Top fan (VIP)  ", "2nd fan (VIP)  ", "3rd fan (Superfan)"][i];
  console.log(`║ ${label} ${BASE}/fan/${f.id}`);
  console.log(`║               → ${f.name} — ${f.balance} pts [${f.tier}]`);
});
console.log("╚══════════════════════════════════════════════════════════════╝\n");

db.close();
