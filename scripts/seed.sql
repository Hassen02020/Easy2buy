INSERT INTO products (slug, name, description, price, purchase_price, category, stock, active)
VALUES
  ('monstera-deliciosa', 'Monstera Deliciosa', 'Plante tropicale', 34.90, 18.00, 'interieur', 500, true),
  ('pothos-dore',        'Pothos Dore',        'Plante facile', 12.50, 5.00, 'interieur', 500, true),
  ('aloe-vera',          'Aloe Vera',          'Plante medicinale', 14.90, 6.50, 'succulente', 500, true),
  ('lavande-vraie',      'Lavande Vraie',      'Lavande mediterraneenne', 9.90, 4.00, 'exterieur', 500, true)
ON CONFLICT (slug) DO UPDATE
  SET stock = 500, active = true,
      price = EXCLUDED.price,
      purchase_price = EXCLUDED.purchase_price;
