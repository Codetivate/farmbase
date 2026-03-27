-- Add 3 new dimension papers: Tropical Cooling, Nutrient Optimization, Disease AI Detection
-- Total papers after this: 8 (5 existing + 3 new)

DO $$
DECLARE
  target_crop_id uuid;
BEGIN
  SELECT id INTO target_crop_id FROM crops ORDER BY created_at ASC LIMIT 1;
  IF target_crop_id IS NULL THEN RETURN; END IF;

  -- Paper 6: Naphrom et al. 2025, MDPI International Journal of Plant Biology
  -- DOI VERIFIED: https://doi.org/10.3390/ijpb16020054
  -- Dimension: Tropical Adaptation / Evaporative Cooling + IoT
  INSERT INTO research_citations (crop_id, title, authors, year, journal, doi, summary, confidence_score)
  VALUES (target_crop_id,
    'The Effect of Root Zone Cooling on the Growth and Development of Strawberry (Fragaria x ananassa) in a Tropical Climate',
    'Naphrom D., Santasup C., Panchai W., Boonraeng S., Promwungkwa A.',
    2025, 'International Journal of Plant Biology (MDPI)', '10.3390/ijpb16020054',
    'Root-zone cooling in evaporative GH in tropical climate (Thailand). CWD+CWP (10C cold water drip + pipe) reduced root zone temp by 2C. Cultivars tested: Akihime, Pharachatan 80/88. CWD+CWP promoted both vegetative and reproductive growth. Pharachatan 80 cannot flower without RZC. IoT monitored GH avg 21.1C (4.2C below outside). CWD+CWP increased phenolics, anthocyanins, vitamin C.',
    93);

  -- Paper 7: Yu et al. 2023, IJABE
  -- DOI VERIFIED: https://doi.org/10.25165/j.ijabe.20231602.7797
  -- Dimension: Nutrient & Fertigation / Brix Optimization
  INSERT INTO research_citations (crop_id, title, authors, year, journal, doi, summary, confidence_score)
  VALUES (target_crop_id,
    'Adjusting the nutrient solution formula based on growth stages to promote the yield and quality of strawberry in greenhouse',
    'Yu W.Z., Zheng J.F., Wang Y.L., Ji F., Zhu B.Y.',
    2023, 'International Journal of Agricultural and Biological Engineering (IJABE)', '10.25165/j.ijabe.20231602.7797',
    'Modified Yamasaki nutrient formula (NM) by growth stage. Flowering/Fruiting: N/K=1.7, K/Ca=1.5, NO3-N/NH4-N=13.3. EC 0.8-1.4 mS/cm, pH 5.8-6.5. NM increased yield 26%, sugar-acid ratio +41% (10.6), vitamin C +34%. Maturity advanced 1 week. Vegetative: N/K=2.2, K/Ca=1.0. Fruit expanding: N/K=1.6, K/Ca=2.0.',
    94);

  -- Paper 8: Kim et al. 2022, Frontiers in Plant Science
  -- DOI VERIFIED: https://doi.org/10.3389/fpls.2022.991134
  -- Dimension: Pest & Disease AI Detection
  INSERT INTO research_citations (crop_id, title, authors, year, journal, doi, summary, confidence_score)
  VALUES (target_crop_id,
    'Detecting strawberry diseases and pest infections in the very early stage with an ensemble deep-learning model',
    'Kim T.Y., Shin J., Hyun T.K., Kim K.',
    2022, 'Frontiers in Plant Science', '10.3389/fpls.2022.991134',
    'Ensemble deep-learning with automatic image acquisition (13,393 images). Detects 7 diseases/pests including powdery mildew and spider mites at VERY EARLY stage. Average AUPRC 0.81. Powdery mildew, spider mites, Ca deficiency are top 3 issues. Good detection on leaves. Key for Smart Farm IPM reducing chemical pesticides by enabling early intervention.',
    95);

  RAISE NOTICE 'Added 3 new dimension papers. Total: 8 papers for crop %', target_crop_id;
END $$;
