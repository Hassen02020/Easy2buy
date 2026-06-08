INSERT INTO staff (name, email, phone, role, active)
VALUES
  ('Admin Principal',  'admin@jardin.tn',  '+21698000001', 'ADMIN',   true),
  ('Karim Agent',      'karim@jardin.tn',  '+21621000002', 'AGENT',   true),
  ('Sara Agent',       'sara@jardin.tn',   '+21655000003', 'AGENT',   true),
  ('Tarek Livreur',    'tarek@jardin.tn',  '+21629000004', 'LIVREUR', true),
  ('Mehdi Livreur',    'mehdi@jardin.tn',  '+21690000005', 'LIVREUR', true)
ON CONFLICT (email) DO NOTHING;
