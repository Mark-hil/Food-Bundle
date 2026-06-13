/*
  # Seed Sample Food Bundles

  This migration adds sample food bundles to demonstrate the system.
  These bundles are available for students to order.
*/

INSERT INTO bundles (name, description, price, items, available, delivery_days) VALUES
(
  'Morning Starter Bundle',
  'Perfect breakfast combo to start your day with energy and nutrition',
  15.99,
  '["Oatmeal with Fruits", "Toast with Butter", "Orange Juice", "Boiled Eggs"]'::jsonb,
  true,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
),
(
  'Lunch Power Pack',
  'Hearty lunch bundle with protein and vegetables for the afternoon',
  25.50,
  '["Grilled Chicken", "Fried Rice", "Mixed Vegetables", "Salad", "Water Bottle"]'::jsonb,
  true,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
),
(
  'Evening Light Meal',
  'Light and healthy evening bundle perfect before studies',
  18.75,
  '["Vegetable Soup", "Whole Wheat Bread", "Grilled Fish", "Garden Salad"]'::jsonb,
  true,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
),
(
  'Weekend Deluxe',
  'Premium bundle with extra portions and special items',
  35.00,
  '["Jollof Rice", "Grilled Meat", "Fried Plantains", "Coleslaw", "Dessert", "Soft Drink"]'::jsonb,
  true,
  ARRAY['Saturday', 'Sunday']
),
(
  'Budget Saver Combo',
  'Affordable and filling bundle for students on a budget',
  12.99,
  '["Rice and Beans", "Fried Chicken", "Gari", "Groundnut Soup"]'::jsonb,
  true,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
),
(
  'Vegetarian Delight',
  'Nutritious plant-based bundle with local vegetables',
  20.00,
  '["Vegetable Stir-fry", "Brown Rice", "Tofu Curry", "Fresh Fruits", "Smoothie"]'::jsonb,
  true,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
);
