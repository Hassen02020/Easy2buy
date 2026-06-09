const { readFileSync } = require("fs");
const postgres = require("postgres");

const env = readFileSync(".env.local", "utf8");
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const DATABASE_URL = match[1].trim();

// Mapping produit → images Cloudinary réelles disponibles
// Cloud: dfvgsn4r1
const BASE = "https://res.cloudinary.com/dfvgsn4r1/image/upload/q_auto,f_auto,w_800";

// Seules les images Cloudinary réelles disponibles sont mappées
// Les autres produits gardent Unsplash jusqu'à upload sur Cloudinary
const UPDATES = [
  {
    slug: "jasmin-tunisien",
    image_url: `${BASE}/jasmin-officinal11_p80ppg.jpg`,
    images: JSON.stringify([
      `${BASE}/jasmin-officinal11_p80ppg.jpg`,
      `${BASE}/jasmin-etoile_joqoqh.png`,
      `${BASE}/jasmin-etoile_xfo8j6.png`,
      `${BASE}/jasminum-sambac_cyj4ap.jpg`,
    ]),
  },
  {
    slug: "lavande",
    image_url: `${BASE}/Lavande_violette-G-FP1114-FP-1_ybfonx.jpg`,
    images: JSON.stringify([
      `${BASE}/Lavande_violette-G-FP1114-FP-1_ybfonx.jpg`,
      `${BASE}/lavandula-angustifolia-bleu-fonce-vraie-lavande_jatirb.jpg`,
      `${BASE}/lavandula-angustifolia-spear-blue-vraie-lavande-bleu-violet_acm5bc.jpg`,
      `${BASE}/652fed36cec6a_lavande_papillon_pot_lavandula_stoechas_pmppza.jpg`,
    ]),
  },
  {
    slug: "olivier-tunisien",
    image_url: `${BASE}/65b0ca0984510_conseil_arbuste_arbre_olivier_en_pot_jardin_cfi3zd.png`,
    images: JSON.stringify([
      `${BASE}/65b0ca0984510_conseil_arbuste_arbre_olivier_en_pot_jardin_cfi3zd.png`,
      `${BASE}/Algarve_cilindro_48-58_tijmgroen._Olea_europaea.c1_uivsyj.png`,
    ]),
  },
  {
    slug: "grenadier",
    image_url: `${BASE}/grenadier-provence_q8zm7i.jpg`,
    images: JSON.stringify([
      `${BASE}/grenadier-provence_q8zm7i.jpg`,
      `${BASE}/punica-granatum-grenadier-a-fruits_uer9ka.jpg`,
      `${BASE}/bonsai-punica-granatun-granado-800x800_Z7qGjxC_dk4chg.jpg`,
      `${BASE}/grenadier-nain-_xn2iuc.png`,
    ]),
  },
  {
    slug: "figuier-commun",
    image_url: `${BASE}/ficus-carica-zidi-25-8-20-760x570_blg6ri.jpg`,
    images: JSON.stringify([
      `${BASE}/ficus-carica-zidi-25-8-20-760x570_blg6ri.jpg`,
      `${BASE}/variet_C3_A9-zidi_iqn4k6.jpg`,
      `${BASE}/Zidi-400x400_ofp4bv.png`,
    ]),
  },
  {
    slug: "oranger-citronnier",
    image_url: `${BASE}/citrus-limon-x-citrus-paradisi-lipo-03_cvubtg.jpg`,
    images: JSON.stringify([
      `${BASE}/citrus-limon-x-citrus-paradisi-lipo-03_cvubtg.jpg`,
      `${BASE}/citrus-x-aurantium-canaliculata-02_hhm1n4.jpg`,
      `${BASE}/Plants_Citronnier_Jaune_pour_Professionel_a_prix_producteur_afqafs.jpg`,
    ]),
  },
  {
    slug: "pecher-de-tunisie",
    image_url: `${BASE}/pecher-nain-bonanza_bxqj95.jpg`,
    images: JSON.stringify([
      `${BASE}/pecher-nain-bonanza_bxqj95.jpg`,
      `${BASE}/Fournisseur_grossiste_Plant_Pecher_xpdph9.jpg`,
    ]),
  },
  {
    slug: "pack-3-arbres-fruitiers",
    image_url: `${BASE}/monstera-deliciosa-bulbasaur_zc5ekv.jpg`,
    images: JSON.stringify([
      `${BASE}/monstera-deliciosa-bulbasaur_zc5ekv.jpg`,
      `${BASE}/la-grenattitude-plant-pot_ntphg7.jpg`,
      `${BASE}/ficus-carica-zidi-25-8-20-760x570_blg6ri.jpg`,
    ]),
  },
];

async function main() {
  const sql = postgres(DATABASE_URL, { ssl: "require", max: 1 });

  for (const u of UPDATES) {
    const result = await sql`
      UPDATE products
      SET image_url = ${u.image_url},
          images    = ${u.images},
          updated_at = NOW()
      WHERE slug = ${u.slug}
      RETURNING id, name, slug
    `;
    if (result.length > 0) {
      console.log(`✓ Mis à jour : ${result[0].name} (id=${result[0].id})`);
    } else {
      console.log(`✗ Produit non trouvé : ${u.slug}`);
    }
  }

  console.log("\n=== Vérification finale ===");
  const rows = await sql`SELECT id, name, image_url FROM products ORDER BY id`;
  for (const r of rows) {
    const src = r.image_url?.includes("cloudinary") ? "☁️ Cloudinary" : "📷 Unsplash";
    console.log(`${src}  #${r.id} ${r.name}`);
  }

  await sql.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
