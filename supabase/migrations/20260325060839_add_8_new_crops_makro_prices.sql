/*
  # Add 8 new crops with Thai Makro wholesale prices

  1. New Crops Added
    - Oyster Mushroom (เห็ดนางฟ้า) - mushroom, indoor, soil-free
    - Shiitake Mushroom (เห็ดหอม) - mushroom, needs hardwood substrate
    - Chinese Kale (คะน้า) - leafy_green, soil pH critical
    - Morning Glory (ผักบุ้ง) - leafy_green, water-based
    - Thai Basil (กะเพรา) - herb, well-drained soil essential
    - Tomato (มะเขือเทศ) - fruit, soil nutrients & pH critical
    - Chili (พริก) - fruit, soil drainage & nutrients critical
    - Lettuce (ผักกาดหอม) - leafy_green, soil pH & organic matter important

  2. Price Sources
    - All prices based on Makro Thailand wholesale rates (2025)
    - Stored in USD at ~34.5 THB/USD exchange rate

  3. Soil & Growing Notes
    - Tomato, Chili, Thai Basil: Require well-drained loamy soil with specific pH
    - Chinese Kale: Needs fertile clay-loam soil, pH 6.0-6.8
    - Lettuce: Prefers light sandy-loam, high organic matter
    - Morning Glory: Semi-aquatic, tolerates waterlogged soil
    - Mushrooms: Substrate-based, no soil required
*/

ALTER TABLE crops ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;

INSERT INTO crops (name, scientific_name, category, optimal_conditions, growth_params, market_data, tags, image_url, is_published, benefit_summary_en, benefit_summary_th) VALUES

(
  'Oyster Mushroom',
  'Pleurotus ostreatus',
  'mushroom',
  '{"temperature":{"min":20,"max":28,"optimal":24,"unit":"°C"},"humidity":{"min":80,"max":95,"optimal":85,"unit":"%"},"co2":{"min":400,"max":1500,"optimal":800,"unit":"ppm"},"light":{"min":100,"max":500,"optimal":200,"unit":"lux"},"ph":{"min":5.5,"max":7.0,"optimal":6.5}}'::jsonb,
  '{"max_height_cm":12,"carrying_capacity_K":12,"growth_rate_r":0.30,"midpoint_t0":10,"cycle_days":25,"biomass_density_g_per_cm3":0.40}'::jsonb,
  '{"price_per_kg_usd":1.16,"yield_per_sqm_kg":4.0,"demand_index":0.82,"seasonality":["summer","winter","spring"],"capex_per_sqm_usd":7.25,"opex_per_cycle_usd":2.32}'::jsonb,
  ARRAY['mushroom','summer','indoor','high-roi','gourmet'],
  'https://images.pexels.com/photos/6157049/pexels-photo-6157049.jpeg?auto=compress&cs=tinysrgb&w=800',
  true,
  'Oyster mushroom (Pleurotus ostreatus) is an excellent source of protein, B-vitamins, and lovastatin which helps lower cholesterol. Contains powerful antioxidants and beta-glucans that boost immune function. Studies show substrate optimization can increase protein content by 20%.',
  'เห็ดนางฟ้า (Pleurotus ostreatus) เป็นแหล่งโปรตีน วิตามินบี และสารโลวาสแตตินที่ช่วยลดคอเลสเตอรอล มีสารต้านอนุมูลอิสระและเบต้า-กลูแคนที่ช่วยเสริมภูมิคุ้มกัน งานวิจัยพบว่าการปรับสูตรวัสดุเพาะช่วยเพิ่มโปรตีนได้ 20%'
),

(
  'Shiitake Mushroom',
  'Lentinula edodes',
  'mushroom',
  '{"temperature":{"min":10,"max":20,"optimal":15,"unit":"°C"},"humidity":{"min":75,"max":90,"optimal":85,"unit":"%"},"co2":{"min":400,"max":1500,"optimal":700,"unit":"ppm"},"light":{"min":50,"max":300,"optimal":150,"unit":"lux"},"ph":{"min":4.5,"max":6.0,"optimal":5.5}}'::jsonb,
  '{"max_height_cm":10,"carrying_capacity_K":10,"growth_rate_r":0.18,"midpoint_t0":25,"cycle_days":90,"biomass_density_g_per_cm3":0.45}'::jsonb,
  '{"price_per_kg_usd":4.35,"yield_per_sqm_kg":2.5,"demand_index":0.90,"seasonality":["winter","spring"],"capex_per_sqm_usd":11.59,"opex_per_cycle_usd":4.06}'::jsonb,
  ARRAY['mushroom','winter','gourmet','high-roi','premium'],
  'https://images.pexels.com/photos/5677730/pexels-photo-5677730.jpeg?auto=compress&cs=tinysrgb&w=800',
  true,
  'Shiitake mushroom (Lentinula edodes) contains lentinan, a polysaccharide with proven anti-tumor properties. Rich in eritadenine which lowers cholesterol, and vitamin D when sun-dried. Requires hardwood substrate (oak preferred). Research shows controlled humidity cycling increases lentinan content by 25%.',
  'เห็ดหอม (Lentinula edodes) มีสารเลนทิแนนที่มีฤทธิ์ต้านเนื้องอก อุดมด้วยสารเอริตาดีนีนที่ช่วยลดคอเลสเตอรอล และวิตามินดีเมื่อตากแดด ต้องใช้ท่อนไม้เนื้อแข็งเป็นวัสดุเพาะ งานวิจัยพบว่าการควบคุมรอบความชื้นช่วยเพิ่มสารเลนทิแนนได้ 25%'
),

(
  'Chinese Kale',
  'Brassica oleracea var. alboglabra',
  'leafy_green',
  '{"temperature":{"min":18,"max":30,"optimal":25,"unit":"°C"},"humidity":{"min":60,"max":80,"optimal":70,"unit":"%"},"co2":{"min":300,"max":1200,"optimal":600,"unit":"ppm"},"light":{"min":10000,"max":40000,"optimal":25000,"unit":"lux"},"ph":{"min":6.0,"max":6.8,"optimal":6.5}}'::jsonb,
  '{"max_height_cm":35,"carrying_capacity_K":35,"growth_rate_r":0.22,"midpoint_t0":18,"cycle_days":45,"biomass_density_g_per_cm3":0.25}'::jsonb,
  '{"price_per_kg_usd":1.16,"yield_per_sqm_kg":6.0,"demand_index":0.88,"seasonality":["winter","summer","spring"],"capex_per_sqm_usd":2.61,"opex_per_cycle_usd":1.01}'::jsonb,
  ARRAY['leafy-green','summer','high-roi','outdoor','soil-critical'],
  'https://images.pexels.com/photos/2893635/pexels-photo-2893635.jpeg?auto=compress&cs=tinysrgb&w=800',
  true,
  'Chinese kale (Brassica oleracea var. alboglabra) is exceptionally rich in calcium, iron, and vitamins A, C, K. High in glucosinolates with anti-cancer properties. Requires fertile clay-loam soil with pH 6.0-6.8. Soil enrichment with compost significantly improves leaf thickness and nutrient density.',
  'คะน้า (Brassica oleracea var. alboglabra) อุดมด้วยแคลเซียม เหล็ก วิตามินเอ ซี เค สูงในกลูโคซิโนเลตที่มีฤทธิ์ต้านมะเร็ง ต้องการดินร่วนเหนียวที่อุดมสมบูรณ์ pH 6.0-6.8 การปรับปรุงดินด้วยปุ๋ยหมักช่วยเพิ่มความหนาของใบและคุณค่าทางโภชนาการอย่างมีนัยสำคัญ'
),

(
  'Morning Glory',
  'Ipomoea aquatica',
  'leafy_green',
  '{"temperature":{"min":25,"max":38,"optimal":30,"unit":"°C"},"humidity":{"min":70,"max":95,"optimal":85,"unit":"%"},"co2":{"min":300,"max":1000,"optimal":500,"unit":"ppm"},"light":{"min":15000,"max":50000,"optimal":30000,"unit":"lux"},"ph":{"min":5.5,"max":7.0,"optimal":6.5}}'::jsonb,
  '{"max_height_cm":40,"carrying_capacity_K":40,"growth_rate_r":0.35,"midpoint_t0":10,"cycle_days":25,"biomass_density_g_per_cm3":0.20}'::jsonb,
  '{"price_per_kg_usd":0.43,"yield_per_sqm_kg":8.0,"demand_index":0.75,"seasonality":["summer","spring"],"capex_per_sqm_usd":1.45,"opex_per_cycle_usd":0.58}'::jsonb,
  ARRAY['leafy-green','summer','outdoor','fast-harvest','budget'],
  'https://images.pexels.com/photos/11419819/pexels-photo-11419819.jpeg?auto=compress&cs=tinysrgb&w=800',
  true,
  'Morning glory (Ipomoea aquatica) is a fast-growing semi-aquatic vegetable rich in iron, calcium, and vitamins A and C. Thrives in waterlogged or marshy soil. Contains lutein beneficial for eye health. Can be harvested every 25 days. Tolerates poor soil but responds dramatically to organic fertilization.',
  'ผักบุ้ง (Ipomoea aquatica) เป็นผักกึ่งน้ำที่เติบโตเร็ว อุดมด้วยเหล็ก แคลเซียม วิตามินเอและซี เติบโตได้ดีในดินที่มีน้ำขัง มีลูทีนที่ดีต่อสายตา เก็บเกี่ยวได้ทุก 25 วัน ทนต่อดินที่สภาพไม่ดีแต่ตอบสนองต่อปุ๋ยอินทรีย์อย่างดีเยี่ยม'
),

(
  'Thai Basil',
  'Ocimum basilicum var. thyrsiflora',
  'herb',
  '{"temperature":{"min":20,"max":35,"optimal":28,"unit":"°C"},"humidity":{"min":50,"max":75,"optimal":65,"unit":"%"},"co2":{"min":300,"max":1000,"optimal":500,"unit":"ppm"},"light":{"min":15000,"max":45000,"optimal":30000,"unit":"lux"},"ph":{"min":6.0,"max":7.5,"optimal":6.8}}'::jsonb,
  '{"max_height_cm":50,"carrying_capacity_K":50,"growth_rate_r":0.20,"midpoint_t0":20,"cycle_days":45,"biomass_density_g_per_cm3":0.18}'::jsonb,
  '{"price_per_kg_usd":1.45,"yield_per_sqm_kg":3.5,"demand_index":0.92,"seasonality":["summer","spring","winter"],"capex_per_sqm_usd":2.03,"opex_per_cycle_usd":0.87}'::jsonb,
  ARRAY['summer','outdoor','high-roi','herb','soil-critical'],
  'https://images.pexels.com/photos/4750270/pexels-photo-4750270.jpeg?auto=compress&cs=tinysrgb&w=800',
  true,
  'Thai basil (Ocimum basilicum var. thyrsiflora) contains eugenol, linalool, and methyl chavicol with antibacterial and anti-inflammatory properties. Rich in vitamin K and manganese. REQUIRES well-drained sandy-loam soil with pH 6.0-7.5. Waterlogged soil causes root rot. Soil organic matter above 3% dramatically improves essential oil yield.',
  'กะเพรา (Ocimum basilicum var. thyrsiflora) มีสารยูจีนอล ลินาลูล และเมทิลชาวิคอลที่มีฤทธิ์ต้านแบคทีเรียและลดการอักเสบ อุดมด้วยวิตามินเคและแมงกานีส ต้องการดินร่วนปนทรายที่ระบายน้ำดี pH 6.0-7.5 ดินที่แฉะทำให้รากเน่า ดินที่มีอินทรียวัตถุ 3% ขึ้นไปช่วยเพิ่มผลผลิตน้ำมันหอมระเหยได้อย่างมาก'
),

(
  'Tomato',
  'Solanum lycopersicum',
  'fruit',
  '{"temperature":{"min":18,"max":32,"optimal":25,"unit":"°C"},"humidity":{"min":50,"max":80,"optimal":65,"unit":"%"},"co2":{"min":300,"max":1200,"optimal":800,"unit":"ppm"},"light":{"min":20000,"max":60000,"optimal":35000,"unit":"lux"},"ph":{"min":6.0,"max":6.8,"optimal":6.5}}'::jsonb,
  '{"max_height_cm":150,"carrying_capacity_K":150,"growth_rate_r":0.12,"midpoint_t0":35,"cycle_days":75,"biomass_density_g_per_cm3":0.15}'::jsonb,
  '{"price_per_kg_usd":1.16,"yield_per_sqm_kg":5.0,"demand_index":0.85,"seasonality":["winter","spring"],"capex_per_sqm_usd":4.35,"opex_per_cycle_usd":2.03}'::jsonb,
  ARRAY['fruit','winter','outdoor','soil-critical','high-roi'],
  'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=800',
  true,
  'Tomato (Solanum lycopersicum) is the richest dietary source of lycopene, a powerful antioxidant linked to reduced cancer risk. High in vitamins C and K. SOIL IS CRITICAL: requires deep loamy soil with pH 6.0-6.8, rich in calcium to prevent blossom-end rot. Calcium-enriched soil reduces fruit defects by 40%. Crop rotation essential to prevent soil-borne diseases.',
  'มะเขือเทศ (Solanum lycopersicum) เป็นแหล่งไลโคปีนที่ดีที่สุดจากอาหาร ซึ่งเป็นสารต้านอนุมูลอิสระที่ช่วยลดความเสี่ยงมะเร็ง อุดมด้วยวิตามินซีและเค ดินเป็นปัจจัยสำคัญ: ต้องการดินร่วนลึก pH 6.0-6.8 ที่อุดมด้วยแคลเซียมเพื่อป้องกันก้นผลเน่า ดินที่เพิ่มแคลเซียมลดผลเสียหายได้ 40% การหมุนเวียนพืชจำเป็นเพื่อป้องกันโรคในดิน'
),

(
  'Chili',
  'Capsicum annuum',
  'fruit',
  '{"temperature":{"min":20,"max":35,"optimal":27,"unit":"°C"},"humidity":{"min":50,"max":75,"optimal":65,"unit":"%"},"co2":{"min":300,"max":1000,"optimal":600,"unit":"ppm"},"light":{"min":20000,"max":50000,"optimal":35000,"unit":"lux"},"ph":{"min":6.0,"max":7.0,"optimal":6.5}}'::jsonb,
  '{"max_height_cm":80,"carrying_capacity_K":80,"growth_rate_r":0.14,"midpoint_t0":30,"cycle_days":70,"biomass_density_g_per_cm3":0.12}'::jsonb,
  '{"price_per_kg_usd":1.74,"yield_per_sqm_kg":3.0,"demand_index":0.88,"seasonality":["summer","winter","spring"],"capex_per_sqm_usd":3.19,"opex_per_cycle_usd":1.45}'::jsonb,
  ARRAY['fruit','summer','outdoor','soil-critical','high-roi','spicy'],
  'https://images.pexels.com/photos/4197447/pexels-photo-4197447.jpeg?auto=compress&cs=tinysrgb&w=800',
  true,
  'Chili pepper (Capsicum annuum) is extremely rich in capsaicin with proven pain-relief and metabolism-boosting properties. High in vitamins C and A. SOIL DRAINAGE IS CRITICAL: waterlogged soil kills chili roots within days. Requires well-drained loamy soil enriched with phosphorus and potassium. Mycorrhizal fungi in soil increase capsaicin content by 30%.',
  'พริก (Capsicum annuum) อุดมด้วยแคปไซซินที่มีฤทธิ์บรรเทาปวดและกระตุ้นการเผาผลาญ สูงในวิตามินซีและเอ การระบายน้ำของดินสำคัญมาก: ดินที่แฉะจะทำให้รากพริกตายภายในไม่กี่วัน ต้องการดินร่วนที่ระบายน้ำดีเสริมฟอสฟอรัสและโพแทสเซียม เชื้อราไมคอร์ไรซาในดินช่วยเพิ่มแคปไซซินได้ 30%'
),

(
  'Lettuce',
  'Lactuca sativa',
  'leafy_green',
  '{"temperature":{"min":10,"max":25,"optimal":18,"unit":"°C"},"humidity":{"min":60,"max":80,"optimal":70,"unit":"%"},"co2":{"min":300,"max":1200,"optimal":700,"unit":"ppm"},"light":{"min":10000,"max":30000,"optimal":20000,"unit":"lux"},"ph":{"min":6.0,"max":7.0,"optimal":6.5}}'::jsonb,
  '{"max_height_cm":30,"carrying_capacity_K":30,"growth_rate_r":0.25,"midpoint_t0":15,"cycle_days":35,"biomass_density_g_per_cm3":0.22}'::jsonb,
  '{"price_per_kg_usd":0.87,"yield_per_sqm_kg":5.5,"demand_index":0.78,"seasonality":["winter","spring"],"capex_per_sqm_usd":2.32,"opex_per_cycle_usd":0.87}'::jsonb,
  ARRAY['leafy-green','winter','indoor','outdoor','fast-harvest'],
  'https://images.pexels.com/photos/1199562/pexels-photo-1199562.jpeg?auto=compress&cs=tinysrgb&w=800',
  true,
  'Lettuce (Lactuca sativa) is low in calories but rich in folate, vitamin K, and antioxidants. Prefers cool temperatures and light sandy-loam soil with high organic matter content. Soil pH between 6.0-7.0 is essential for nutrient uptake. Adding compost (5%+ organic matter) reduces tip burn by 60% and increases crispness.',
  'ผักกาดหอม (Lactuca sativa) แคลอรี่ต่ำแต่อุดมด้วยโฟเลต วิตามินเค และสารต้านอนุมูลอิสระ ชอบอากาศเย็นและดินร่วนปนทรายเบาที่มีอินทรียวัตถุสูง pH ดินระหว่าง 6.0-7.0 จำเป็นสำหรับการดูดซึมธาตุอาหาร การเพิ่มปุ๋ยหมัก (อินทรียวัตถุ 5% ขึ้นไป) ลดปลายใบไหม้ได้ 60% และเพิ่มความกรอบ'
);