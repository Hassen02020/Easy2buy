const { readFileSync } = require("fs");
const postgres = require("postgres");

const env = readFileSync(".env.local", "utf8");
const DATABASE_URL = env.match(/DATABASE_URL=([^\r\n]+)/)[1].trim();

// Cible : #1&#2 ADMIN, #3&#4 AGENT, #5&#6 LIVREUR
const STAFF = [
  { id: 1, name: "Admin Principal",  role: "ADMIN",   email: "admin@easy2buy.tn",   phone: "+21698000001" },
  { id: 2, name: "Admin Secondaire", role: "ADMIN",   email: "admin2@easy2buy.tn",  phone: "+21698000002" },
  { id: 3, name: "Karim Agent",      role: "AGENT",   email: "karim@easy2buy.tn",   phone: "+21621000003" },
  { id: 4, name: "Sonia Agent",      role: "AGENT",   email: "sonia@easy2buy.tn",   phone: "+21621000004" },
  { id: 5, name: "Tarek Livreur",    role: "LIVREUR", email: "tarek@easy2buy.tn",   phone: "+21629000005" },
  { id: 6, name: "Mehdi Livreur",    role: "LIVREUR", email: "mehdi@easy2buy.tn",   phone: "+21629000006" },
];

async function main() {
  const sql = postgres(DATABASE_URL, { ssl: "require", max: 1 });

  for (const s of STAFF) {
    await sql`
      INSERT INTO staff (id, name, role, email, phone, active, created_at)
      VALUES (${s.id}, ${s.name}, ${s.role}, ${s.email}, ${s.phone}, true, NOW())
      ON CONFLICT (id) DO UPDATE
        SET name   = EXCLUDED.name,
            role   = EXCLUDED.role,
            email  = EXCLUDED.email,
            phone  = EXCLUDED.phone,
            active = true
    `;
    console.log(`✓ #${s.id} [${s.role}] ${s.name}`);
  }

  // Réinitialiser la séquence pour éviter les conflits futurs
  await sql`SELECT setval(pg_get_serial_sequence('staff','id'), (SELECT MAX(id) FROM staff))`;

  console.log("\n=== ACCÈS LOGIN ===");
  console.log("URL : http://192.168.100.33:3000/admin/login");
  console.log("");
  console.log("  #1  ADMIN  → saisir ID : 1");
  console.log("  #2  ADMIN  → saisir ID : 2");
  console.log("  #3  AGENT  → saisir ID : 3");
  console.log("  #4  AGENT  → saisir ID : 4");
  console.log("  #5  LIVREUR → saisir ID : 5");
  console.log("  #6  LIVREUR → saisir ID : 6");

  await sql.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
