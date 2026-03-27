/*
  # Remove mock crops, keep only Enoki Mushroom and Napa Cabbage

  1. Changes
    - Delete all crops except Enoki Mushroom and Napa Cabbage
    - Also clean up related research_citations for removed crops

  2. Crops removed
    - Oyster Mushroom, Shiitake Mushroom, Chinese Kale, Morning Glory,
      Thai Basil, Tomato, Chili, Lettuce

  3. Crops retained
    - Enoki Mushroom (mushroom)
    - Napa Cabbage (leafy_green)
*/

DELETE FROM research_citations
WHERE crop_id NOT IN (
  SELECT id FROM crops WHERE name IN ('Enoki Mushroom', 'Napa Cabbage')
);

DELETE FROM crops
WHERE name NOT IN ('Enoki Mushroom', 'Napa Cabbage');
