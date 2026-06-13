/*
  # Add Ghana Food Packages (ALPHA, BETA, GAMMA)

  This migration adds three food package bundles with Ghana cedis pricing:
  - ALPHA: GH₵ 500 (50000 in database)
  - BETA: GH₵ 450 (45000 in database)
  - GAMMA: GH₵ 420 (42000 in database)
  
  Each package includes detailed food items stored as JSON.
*/

INSERT INTO bundles (name, description, price, items, available, delivery_days) VALUES
(
  'ALPHA',
  'Premium food bundle - GH₵ 500. Includes rice, sardine, oil, spaghetti, tomato paste, eggs, and mackerel',
  50000,
  '[
    "CIC 25kg grain rice",
    "Sardine",
    "Two Frytol 500ml oil",
    "Ena pa spaghetti",
    "Tasty tom tomato paste",
    "A crate of egg",
    "Ena pa mackerel"
  ]'::jsonb,
  true,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
),
(
  'BETA',
  'Popular food bundle - GH₵ 450. Includes rice, oil, mackerel or sardine, tomato paste, and eggs',
  45000,
  '[
    "CIC 25kg grain rice",
    "Two Frytol 500ml oil",
    "Ena pa mackerel / Sardine",
    "Tasty tom tomato paste",
    "A crate of egg"
  ]'::jsonb,
  true,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
),
(
  'GAMMA',
  'Essential food bundle - GH₵ 420. Includes rice, oil, protein variety, and eggs',
  42000,
  '[
    "CIC 25kg grain rice",
    "Two Frytol 500ml oil",
    "Ena pa mackerel / Sardine / Tasty tom tomato paste",
    "A crate of egg"
  ]'::jsonb,
  true,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
);