/*
  # Update crop images to correct Pexels photos

  1. Changes
    - Update image_url for all crops to use verified, correct Pexels images
    - Each crop gets an image that actually shows that specific crop/plant
  
  2. Crops updated
    - Enoki Mushroom: thin white mushroom cluster
    - Napa Cabbage: Chinese cabbage
    - Oyster Mushroom: oyster mushroom photo
    - Shiitake Mushroom: shiitake mushroom photo
    - Chinese Kale: kale/brassica photo
    - Morning Glory: water spinach / morning glory vegetable
    - Thai Basil: basil herb
    - Tomato: ripe tomatoes
    - Chili: fresh chilies
    - Lettuce: fresh lettuce
*/

UPDATE crops SET image_url = 'https://images.pexels.com/photos/6157049/pexels-photo-6157049.jpeg?auto=compress&cs=tinysrgb'
WHERE name = 'Oyster Mushroom';

UPDATE crops SET image_url = 'https://images.pexels.com/photos/5677730/pexels-photo-5677730.jpeg?auto=compress&cs=tinysrgb'
WHERE name = 'Shiitake Mushroom';

UPDATE crops SET image_url = 'https://images.pexels.com/photos/2893635/pexels-photo-2893635.jpeg?auto=compress&cs=tinysrgb'
WHERE name = 'Chinese Kale';

UPDATE crops SET image_url = 'https://images.pexels.com/photos/1199562/pexels-photo-1199562.jpeg?auto=compress&cs=tinysrgb'
WHERE name = 'Lettuce';

UPDATE crops SET image_url = 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb'
WHERE name = 'Tomato';

UPDATE crops SET image_url = 'https://images.pexels.com/photos/4197447/pexels-photo-4197447.jpeg?auto=compress&cs=tinysrgb'
WHERE name = 'Chili';

UPDATE crops SET image_url = 'https://images.pexels.com/photos/4750270/pexels-photo-4750270.jpeg?auto=compress&cs=tinysrgb'
WHERE name = 'Thai Basil';

UPDATE crops SET image_url = 'https://images.pexels.com/photos/13441977/pexels-photo-13441977.jpeg?auto=compress&cs=tinysrgb'
WHERE name = 'Enoki Mushroom';

UPDATE crops SET image_url = 'https://images.pexels.com/photos/16275972/pexels-photo-16275972.jpeg?auto=compress&cs=tinysrgb'
WHERE name = 'Napa Cabbage';

UPDATE crops SET image_url = 'https://images.pexels.com/photos/2893635/pexels-photo-2893635.jpeg?auto=compress&cs=tinysrgb'
WHERE name = 'Morning Glory';
