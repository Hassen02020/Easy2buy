/**
 * seed-products.mjs
 * Insère les produits de test directement en PostgreSQL via psql
 */
import { execSync } from "child_process";

const SQL = `
INSERT INTO products (slug, name, description, price, purchase_price, category, stock, active)
VALUES
  ('monstera-deliciosa', 'Monstera Deliciosa', 'Plante tropicale aux grandes feuilles découpées', 34.90, 18.00, 'interieur', 500, true),
  ('pothos-dore',        'Pothos Doré',        'Plante facile aux feuilles en coeur vert et jaune', 12.50, 5.00, 'interieur', 500, true),
  ('aloe-vera',          'Aloe Vera',           'Plante médicinale et décorative', 14.90, 6.50, 'succulente', 500, true),
  ('lavande-vraie',      'Lavande Vraie',       'Lavande méditerranéenne aux fleurs violettes', 9.90, 4.00, 'exterieur', 500, true)
ON CONFLICT (slug) DO UPDATE
  SET stock = 500, active = true;
`;

try {
  execSync(
    `"C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe" -U postgres -d jardin_delivery -c "${SQL.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`,
    { env: { ...process.env, PGPASSWORD: "postgres" }, stdio: "pipe" }
  );
  console.log("✅ Produits insérés/mis à jour (stock=500 chacun)");
  console.log("   ID 1: Monstera Deliciosa  — prix vente: 34.90€, achat: 18.00€");
  console.log("   ID 2: Pothos Doré         — prix vente: 12.50€, achat:  5.00€");
  console.log("   ID 3: Aloe Vera           — prix vente: 14.90€, achat:  6.50€");
  console.log("   ID 4: Lavande Vraie       — prix vente:  9.90€, achat:  4.00€");
} catch (err) {
  console.error("❌ Erreur seed:", err.stderr?.toString() ?? err.message);
  process.exit(1);
}
