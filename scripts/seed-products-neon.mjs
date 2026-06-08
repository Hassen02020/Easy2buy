import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL manquant");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "require" });

const products = [
  { id: 1, slug: "jasmin-tunisien",        name: "Jasmin Tunisien",        price: "34.000", purchase_price: "12.000", stock: 999, category: "exterieur", image_url: "https://images.unsplash.com/photo-1490750967868-88df5691cc88?w=600&q=80", active: true },
  { id: 2, slug: "lavande",                name: "Lavande",                price: "34.000", purchase_price: "12.000", stock: 999, category: "exterieur", image_url: "https://images.unsplash.com/photo-1499744937866-d7e566a20a61?w=600&q=80", active: true },
  { id: 3, slug: "olivier-tunisien",       name: "Olivier Tunisien",       price: "34.000", purchase_price: "14.000", stock: 999, category: "exterieur", image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80", active: true },
  { id: 4, slug: "grenadier",              name: "Grenadier",              price: "34.000", purchase_price: "13.000", stock: 999, category: "exterieur", image_url: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&q=80", active: true },
  { id: 5, slug: "figuier-commun",         name: "Figuier Commun",         price: "34.000", purchase_price: "13.000", stock: 999, category: "exterieur", image_url: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&q=80", active: true },
  { id: 6, slug: "oranger-citronnier",     name: "Oranger / Citronnier",   price: "34.000", purchase_price: "13.000", stock: 999, category: "exterieur", image_url: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600&q=80", active: true },
  { id: 7, slug: "pecher-de-tunisie",      name: "Pêcher de Tunisie",      price: "34.000", purchase_price: "13.000", stock: 999, category: "exterieur", image_url: "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=600&q=80", active: true },
  { id: 8, slug: "pack-3-arbres-fruitiers",name: "Pack 3 Arbres Fruitiers",price: "34.000", purchase_price: "35.000", stock: 999, category: "exterieur", image_url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80", active: true },
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
