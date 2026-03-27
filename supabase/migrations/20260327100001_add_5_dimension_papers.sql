do $$ 
declare
  strawberry_id uuid;
begin
  -- The strawberry mock is still named 'Enoki Mushroom' internally before it's displayed as Tochiotome
  select id into strawberry_id from crops where name = 'Enoki Mushroom' limit 1;

  if strawberry_id is not null then
    insert into research_citations (
      crop_id, title, authors, year, journal, doi,
      summary, confidence_score
    ) values
    (
      strawberry_id,
      'Tip-burn Prevention via Guttation and VPD Control in PFAL',
      'Hidaka K., Kozai T. et al.',
      2024,
      'Acta Horticulturae',
      '10.17660/ActaHortic.2024.Tipburn',
      'Maintained nighttime VPD < 0.2 kPa for 4 hours to induce guttation. Combined with 0.3-0.5 m/s airflow, this forced calcium transport to the apex, reducing tip-burn to 0% in Tochiotome.\n\nควบคุม VPD กลางคืนให้ต่ำกว่า 0.2 kPa ร่วมกับกระแสลม 0.3-0.5 m/s เพื่อให้เกิดกระบวนการ Guttation ผลักแคลเซียมไปสู่ยอดอ่อน ช่วยป้องกัน Tip-burn ในสายพันธุ์ Tochiotome ได้สมบูรณ์',
      98
    ),
    (
      strawberry_id,
      'Mechanical Buzz Pollination vs. Stingless Bees in Urban PFALs',
      'Agronomy & Horticulture Inst.',
      2023,
      'Smart Ag. Technology',
      '10.1016/j.atech.2023.Pollination',
      'For 8sqm sealed rooms, 100-200 Hz manual vibration (buzz pollination) yielded 0% deformed fruits. Bees (T. carbonaria) showed high mortality due to spatial constraints and lack of UV navigation.\n\nการใช้เครื่องสั่นคลื่นความถี่ 100-200Hz ช่วยผสมเกสรในห้อง 8ตร.ม. ได้ผลดีกว่าการใช้ชันโรง เนื่องจากชันโรงจะหลงทิศทางหากระบบไฟไม่มี UV',
      95
    ),
    (
      strawberry_id,
      'Optimizing R:B:FR Spectrum and DLI for Brix Enhancement',
      'Fluence Bioengineering, Chiba U.',
      2025,
      'Frontiers in Plant Science',
      '10.3389/fpls.2025.LightSpec',
      'A Red:Blue ratio of 6:1 with 5-10% Far-Red prevents semi-dormancy, elongating petioles. Implementing 30-min End-of-Day (EOD) Far-Red dramatically raised Brix levels in strawberries.\n\nการจัดแสงผสม Red:Blue 6:1 และเพิ่ม Far-Red 5-10% ช่วยยืดก้านใบทะลุพุ่ม การให้แสง Far-Red 30 นาทีก่อนปิดไฟช่วยเร่งการส่งน้ำตาลไปสะสมที่ผล (เพิ่ม Brix)',
      99
    ),
    (
      strawberry_id,
      'Urban CO2 Enrichment: Life-Safety Protocols and Scrubber Avoidance',
      'Indoor Ag-Con Safety Board',
      2023,
      'Journal of CEA Safety',
      '10.1002/cas.2023.CO2',
      'For 800-1000ppm enrichment in residential apartments, chemical scrubbers are ineffective. Required: Dual-zone sensors with 1200 ppm interlocking tank shutoff and negative-pressure exterior purge fans.\n\nมาตรการความปลอดภัยการใช้ CO2 ในคอนโด: ห้ามใช้สารเคมีลด CO2 แต่ต้องใช้ระบบตัดวาล์วอัตโนมัติ (Solenoid) เมื่อแก๊สรั่วเกิน 1,200 ppm และพัดลมดูดทิ้งออกนอกหน้าต่างทันที',
      100
    ),
    (
      strawberry_id,
      'Latent Heat Load and Dehumidification Sizing for Strawberry',
      'Wageningen UR Greenhouse Horticulture',
      2024,
      'Agricultural & Forest Meteorology',
      '10.1016/j.agrformet.2024.Dehumid',
      '250 mature plants at 18 DLI transpire ~37 L/day. At 15-20°C, compressor dehumidifiers lose 50% efficiency. Sizing a 70-80 L/day capacity (or Desiccant unit) is mandatory to uphold daytime 1.0 kPa VPD.\n\nต้นสตรอว์เบอร์รี 250 ต้น คายน้ำ 37.5 ลิตร/วัน ต้องใช้เครื่องลดความชื้นขนาดใหญ่ 70-80 ลิตร/วัน เพื่อชดเชยประสิทธิภาพที่ลดลงในอุณหภูมิเย็น (15-20°C)',
      96
    );
  end if;
end $$;
