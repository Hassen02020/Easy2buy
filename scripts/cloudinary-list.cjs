const https = require("https");

const CLOUD = "dfvgsn4r1";
const KEY   = "358554975822244";
const SEC   = "eCUzNuFRaA46U4JKNYwhKLSrhXU";
const auth  = Buffer.from(`${KEY}:${SEC}`).toString("base64");

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { Authorization: `Basic ${auth}` } }, r => {
      let d = "";
      r.on("data", c => d += c);
      r.on("end", () => res(JSON.parse(d)));
    }).on("error", rej);
  });
}

async function main() {
  let all = [];
  let next_cursor = null;
  do {
    const url = `https://api.cloudinary.com/v1_1/${CLOUD}/resources/image?max_results=100${next_cursor ? '&next_cursor='+next_cursor : ''}`;
    const data = await get(url);
    if (data.error) { console.error(data.error.message); return; }
    all = all.concat(data.resources || []);
    next_cursor = data.next_cursor || null;
  } while (next_cursor);

  console.log(`\n=== ${all.length} images totales ===\n`);
  // Filtrer les samples Cloudinary par défaut
  const real = all.filter(r => !r.public_id.startsWith('samples/') && r.public_id !== 'main-sample');
  console.log(`=== ${real.length} images réelles (hors samples) ===\n`);
  for (const r of real) {
    console.log(`${r.public_id}  →  https://res.cloudinary.com/${CLOUD}/image/upload/q_auto,f_auto/${r.public_id}.${r.format}`);
  }
  console.log(`\n=== Toutes (avec samples) ===`);
  for (const r of all) {
    console.log(`  ${r.public_id}.${r.format}`);
  }
}
main().catch(console.error);
