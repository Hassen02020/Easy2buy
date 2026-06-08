INSERT INTO products (id, slug, name, description, price, purchase_price, category, stock, active)
VALUES
  (1, 'monstera-deliciosa', 'Monstera Deliciosa', 'Plante tropicale aux grandes feuilles decoupees', 34.90, 18.00, 'interieur', 500, true),
  (2, 'pothos-dore',        'Pothos Dore',        'Plante facile aux feuilles en coeur vert et jaune', 12.50, 5.00, 'interieur', 500, true),
  (3, 'ficus-lyrata',       'Ficus Lyrata',       'Le figuier lyre star des espaces design', 52.00, 25.00, 'interieur', 500, true),
  (4, 'cactus-etoile',      'Cactus Etoile',      'Succulent architectural au port compact', 8.90, 3.50, 'succulente', 500, true),
  (5, 'basilic-grand-vert', 'Basilic Grand Vert', 'Herbe aromatique incontournable', 4.50, 1.50, 'aromatique', 500, true),
  (6, 'lavande-vraie',      'Lavande Vraie',      'Lavande mediterraneenne aux fleurs violettes', 9.90, 4.00, 'exterieur', 500, true),
  (7, 'aloe-vera',          'Aloe Vera',          'Plante medicinale et decorative', 14.90, 6.50, 'succulente', 500, true),
  (8, 'palmier-kentia',     'Palmier Kentia',     'Le palmier appartement par excellence', 79.00, 40.00, 'interieur', 500, true)
ON CONFLICT (id) DO UPDATE
  SET slug = EXCLUDED.slug,
      name = EXCLUDED.name,
      price = EXCLUDED.price,
      purchase_price = EXCLUDED.purchase_price,
      stock = 500,
      active = true;

SELECT setval('products_id_seq', 8, true);
