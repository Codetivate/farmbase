DELETE FROM research_citations;

INSERT INTO research_citations (crop_id, title, authors, year, journal, doi, summary, confidence_score) 
SELECT c.id, v.title, v.authors, v.year::int, v.journal, v.doi, v.summary, v.score::int 
FROM (SELECT id FROM crops ORDER BY created_at LIMIT 1) c, 
(VALUES 
  ('Yield and Photosynthesis Related to Growth Forms of Two Strawberry Cultivars in a Plant Factory with Artificial Lighting', 'Takahashi A., Yasutake D., Hidaka K., Ono S., Kitano M., Hirota T., Yokoyama G., Nakamura T., Toro M.', '2024', 'HortScience (ASHS)', '10.21273/HORTSCI17587-23', 'Compared Tochiotome vs Koiminori in PFAL. Koiminori: 1.9x higher yield, 2.0x dry weight, 2.2x photosynthetic rate.', '96'),
  ('Crown-cooling Treatment Induces Earlier Flower Bud Differentiation of Strawberry under High Air Temperatures', 'Hidaka K., Dan K., Imamura H., Takayama T.', '2017', 'Environmental Control in Biology', '10.2525/ecb.55.21', 'Crown-cooling at 20C + short-day (8h) for 22 days induced earlier flower bud differentiation.', '94'),
  ('Effects of Varying Electrical Conductivity Levels on Plant Growth, Yield, and Photosynthetic Parameters of Tochiotome Strawberry', 'AJCS Research Group', '2025', 'Australian Journal of Crop Science', '10.21475/ajcs.25.19.04.p322', 'Optimal EC: 2.0-4.0 dS/m. EC >6.0 significantly reduces growth and yield.', '92'),
  ('Effects of Light and Temperature on Photosynthetic Enhancement by High CO2 Concentration of Tochiotome Leaves', 'Wada Y., Soeno T., Inaba Y.', '2010', 'Japanese Journal of Crop Science', '10.1626/jcs.79.192', 'CO2 enrichment at 800-1000 ppm significantly enhances Tochiotome leaf photosynthesis.', '93'),
  ('Propagation and Floral Induction of Transplant for Forcing Long-term Production of Seasonal Flowering Strawberries in Japan', 'Yamasaki A.', '2020', 'The Horticulture Journal (JSHS)', '10.2503/hortj.UTD-R010', 'Comprehensive review of Japanese strawberry forcing culture. 3 artificial low-temp methods.', '95'),
  ('The Dependence of Calcium Transport and Leaf Tipburn in Strawberry on Relative Humidity and Nutrient Solution Concentration', 'Bradfield E.G., Guttridge C.G.', '1979', 'Annals of Botany', '10.1093/oxfordjournals.aob.a085647', 'Seminal study on VPD-guttation-calcium mechanism in strawberry tip-burn.', '96'),
  ('Vapor Pressure Deficit Control and Mechanical Vibration Techniques to Induce Self-Pollination in Strawberry Flowers', 'Liang H., et al.', '2025', 'Plant Methods', '10.1186/s13007-025-01343-2', 'VPD 2.06 kPa promotes anther dehiscence. 800Hz detaches pollen, 100Hz attaches to stigma.', '95'),
  ('Far-red Light in Sole-source Lighting Can Enhance the Growth and Fruit Production of Indoor Strawberries', 'Ries J., Park Y.', '2024', 'HortScience (ASHS)', '10.21273/HORTSCI17729-24', 'Adding far-red (730nm) to LEDs increased total fruit yield by 48% and Brix by 12%.', '97'),
  ('Crop-local CO2 Enrichment Improves Strawberry Yield and Fuel Use Efficiency in Protected Cultivations', 'Hidaka K., Nakahara S., Yasutake D., Zhang Y., Okayasu T., Dan K., Kitano M., Sone K.', '2022', 'Scientia Horticulturae', '10.1016/j.scienta.2022.111104', 'Crop-local CO2 increased canopy CO2 by 100-200 ppm. 22% higher yield.', '95'),
  ('Heat Load due to LED Lighting of Indoor Strawberry Plantation', 'Chaichana C., et al.', '2020', 'Energy Reports', '10.1016/j.egyr.2019.11.089', 'Quantified sensible and latent heat loads from LED lighting for HVAC sizing.', '93')
) AS v(title, authors, year, journal, doi, summary, score);

-- Print inserted rows
SELECT doi FROM research_citations;
