import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL manquant");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "require" });

const products = [
  { id: 1, slug: "monstera-deliciosa",  name: "Monstera Deliciosa",  price: "39.90", purchase_price: "15.00", stock: 50,  category: "interieur",  image_url: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&q=80", active: true },
  { id: 2, slug: "pothos-dore",         name: "Pothos Doré",         price: "17.50", purchase_price: "5.00",  stock: 80,  category: "interieur",  image_url: "https://images.unsplash.com/photo-1637967886160-fd78dc3ce3f5?w=600&q=80", active: true },
  { id: 3, slug: "ficus-lyrata",        name: "Ficus Lyrata",        price: "57.00", purchase_price: "22.00", stock: 30,  category: "interieur",  image_url: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=600&q=80", active: true },
  { id: 4, slug: "cactus-etoile",       name: "Cactus Étoilé",       price: "13.90",  purchase_price: "3.00",  stock: 100, category: "succulente", image_url: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600&q=80", active: true },
  { id: 5, slug: "basilic-grand-vert",  name: "Basilic Grand Vert",  price: "9.50",  purchase_price: "1.50",  stock: 150, category: "aromatique", image_url: "https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=600&q=80", active: true },
  { id: 6, slug: "lavande-vraie",       name: "Lavande Vraie",       price: "14.90",  purchase_price: "4.00",  stock: 70,  category: "exterieur",  image_url: "https://images.unsplash.com/photo-1499744937866-d7e566a20a61?w=600&q=80", active: true },
  { id: 7, slug: "aloe-vera",           name: "Aloe Vera",           price: "19.90", purchase_price: "6.00",  stock: 90,  category: "succulente", image_url: "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=600&q=80", active: true },
  { id: 8, slug: "palmier-kentia",      name: "Palmier Kentia",      price: "84.00", purchase_price: "35.00", stock: 20,  category: "interieur",  image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", active: true },
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
