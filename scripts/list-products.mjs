import { readFileSync } from "fs";
import postgres from "postgres";

const env = readFileSync(".env.local", "utf8");
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
if (!match) { console.error("DATABASE_URL non trouvée"); process.exit(1); }
const DATABASE_URL = match[1].trim();

const sql = postgres(DATABASE_URL, { ssl: "require", max: 1 });
const rows = await sql`SELECT id, name, slug, image_url, images FROM products ORDER BY id`;
console.log(JSON.stringify(rows, null, 2));
await sql.end();
