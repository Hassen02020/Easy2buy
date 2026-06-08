import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL manquant");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "require" });

const products = [
  { id: 1, slug: "jasmin-tunisien",        name: "Jasmin Tunisien",        price: "34.000", purchase_price: "12.000", stock: 50, category: "exterieur", image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",  active: true },
  { id: 2, slug: "lavande",                name: "Lavande",                price: "34.000", purchase_price: "12.000", stock: 50, category: "exterieur", image_url: "https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=600&q=80",  active: true },
  { id: 3, slug: "olivier-tunisien",       name: "Olivier Tunisien",       price: "34.000", purchase_price: "14.000", stock: 40, category: "exterieur", image_url: "https://images.unsplash.com/photo-1593357849668-f8e1e62c8e21?w=600&q=80",  active: true },
  { id: 4, slug: "grenadier",              name: "Grenadier",              price: "34.000", purchase_price: "13.000", stock: 40, category: "exterieur", image_url: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600&q=80",  active: true },
  { id: 5, slug: "figuier-commun",         name: "Figuier Commun",         price: "34.000", purchase_price: "13.000", stock: 40, category: "exterieur", image_url: "https://images.unsplash.com/photo-1536822410-e0c8df26afcb?w=600&q=80",  active: true },
  { id: 6, slug: "oranger-citronnier",     name: "Oranger / Citronnier",   price: "34.000", purchase_price: "13.000", stock: 40, category: "exterieur", image_url: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?w=600&q=80",  active: true },
  { id: 7, slug: "pecher-de-tunisie",      name: "Pêcher de Tunisie",      price: "34.000", purchase_price: "13.000", stock: 30, category: "exterieur", image_url: "https://images.unsplash.com/photo-1629828874346-3f8c8b9e8a1d?w=600&q=80",  active: true },
  { id: 8, slug: "pack-3-arbres-fruitiers",name: "Pack 3 Arbres Fruitiers",price: "34.000", purchase_price: "35.000", stock: 20, category: "exterieur", image_url: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=600&q=80",  active: true },
];

try {
  for (const p of products) {
    await sql`
      INSERT INTO products (id, slug, name, price, purchase_price, stock, category, image_url, active)
      VALUES (${p.id}, ${p.slug}, ${p.name}, ${p.price}, ${p.purchase_price}, ${p.stock}, ${p.category}, ${p.image_url}, ${p.active})
      ON CONFLICT (id) DO UPDATE SET
        slug           = EXCLUDED.slug,
        name           = EXCLUDED.name,
        price          = EXCLUDED.price,
        purchase_price = EXCLUDED.purchase_price,
        stock          = EXCLUDED.stock,
        category       = EXCLUDED.category,
        image_url      = EXCLUDED.image_url,
        active         = EXCLUDED.active
    `;
    console.log(`✅ ${p.name}`);
  }

  // Reset sequence to avoid id conflicts
  await sql`SELECT setval('products_id_seq', 8, true)`;
  console.log("\n🌿 Tous les produits ont été seedés avec succès !");
} catch (err) {
  console.error("❌ Erreur:", err.message);
} finally {
  await sql.end();
}
