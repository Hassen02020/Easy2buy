const { readFileSync } = require("fs");
const postgres = require("postgres");

const env = readFileSync(".env.local", "utf8");
const DATABASE_URL = env.match(/DATABASE_URL=([^\r\n]+)/)[1].trim();

async function main() {
  const sql = postgres(DATABASE_URL, { ssl: "require", max: 1 });
  const rows = await sql`SELECT id, name, role, email, phone, active FROM staff ORDER BY role, id`;
  console.log("\n=== STAFF ===\n");
  for (const r of rows) {
    console.log(`#${r.id} [${r.role}] ${r.name} | email: ${r.email ?? "-"} | phone: ${r.phone ?? "-"} | actif: ${r.active}`);
  }
  await sql.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
