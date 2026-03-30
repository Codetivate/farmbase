import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST() {
  try {
    const { data: crops } = await supabase
      .from('crops')
      .select('id, name')
      .order('created_at', { ascending: true });

    const crop = crops?.[0];
    if (!crop) return NextResponse.json({ error: 'No crops' }, { status: 404 });

    // Step 1: Insert 5 specialized dimension papers (REAL DOIs — verified via CrossRef)
    const papers = [
      {
        crop_id: crop.id,
        title: 'The Dependence of Calcium Transport and Leaf Tipburn in Strawberry on Relative Humidity and Nutrient Solution Concentration',
        authors: 'Bradfield E.G., Guttridge C.G.',
        year: 1979, journal: 'Annals of Botany',
        doi: '10.1093/oxfordjournals.aob.a085647',
        summary: 'Seminal study establishing the VPD-guttation-calcium mechanism in strawberry tip-burn. High nighttime RH (low VPD) promotes root pressure and guttation, facilitating calcium transport to non-transpiring young leaves. High nighttime VPD inhibits this, causing localized Ca deficiency and tip-burn.\n\nงานวิจัยต้นแบบที่อธิบายกลไก VPD-Guttation-แคลเซียม ในใบไหม้ของสตรอว์เบอร์รี ความชื้นสูงกลางคืน (VPD ต่ำ) ส่งเสริมแรงดันรากและ Guttation ช่วยลำเลียงแคลเซียมไปยอดอ่อน',
        confidence_score: 96,
      },
      {
        crop_id: crop.id,
        title: 'Vapor Pressure Deficit Control and Mechanical Vibration Techniques to Induce Self-Pollination in Strawberry Flowers',
        authors: 'Liang H., et al.',
        year: 2025, journal: 'Plant Methods',
        doi: '10.1186/s13007-025-01343-2',
        summary: 'Anther dehiscence was complete at VPD 2.06 kPa. Pollen clump detachment was most effective at 800 Hz with 40 m/s² acceleration. Pollen attachment to stigma was optimal at 100 Hz with 30-40 m/s². Offers an effective mechanical pollination strategy for vertical farming.\n\nศึกษาการผสมเกสรสตรอว์เบอร์รีในฟาร์มแนวตั้ง: VPD 2.06 kPa ช่วยให้อับเรณูเปิด ความถี่สั่น 800Hz หลุดละอองเรณู และ 100Hz ช่วยให้ละอองเกสรเกาะยอดเกสรตัวเมีย',
        confidence_score: 95,
      },
      {
        crop_id: crop.id,
        title: 'Far-red Light in Sole-source Lighting Can Enhance the Growth and Fruit Production of Indoor Strawberries',
        authors: 'Ries J., Park Y.',
        year: 2024, journal: 'HortScience (ASHS)',
        doi: '10.21273/HORTSCI17729-24',
        summary: 'Adding far-red (730nm) to blue+red LEDs increased total fruit yield by 48% and Brix by 12% in Albion strawberry. Crown number increased by 33%. Far-red did not affect flowering time but significantly promoted vegetative growth and canopy expansion.\n\nการเพิ่มแสง Far-Red (730nm) ในระบบ LED ทำให้ผลผลิตสตรอว์เบอร์รีเพิ่มขึ้น 48% และ Brix เพิ่ม 12% จำนวน Crown เพิ่ม 33% เหมาะสำหรับฟาร์มในร่ม',
        confidence_score: 97,
      },
      {
        crop_id: crop.id,
        title: 'Crop-local CO₂ Enrichment Improves Strawberry Yield and Fuel Use Efficiency in Protected Cultivations',
        authors: 'Hidaka K., Nakahara S., Yasutake D., Zhang Y., Okayasu T., Dan K., Kitano M., Sone K.',
        year: 2022, journal: 'Scientia Horticulturae',
        doi: '10.1016/j.scienta.2022.111104',
        summary: 'Crop-local CO₂ enrichment (CLC) increased canopy CO₂ by 100-200 ppm even with open vents. Resulted in 22% higher marketable yield and 27% less fuel consumption compared to conventional whole-greenhouse enrichment.\n\nระบบ CO₂ เฉพาะจุด (CLC) เพิ่มความเข้มข้น CO₂ รอบทรงพุ่ม 100-200 ppm แม้เปิดหน้าต่าง ให้ผลผลิตเพิ่ม 22% และประหยัดเชื้อเพลิง 27%',
        confidence_score: 95,
      },
      {
        crop_id: crop.id,
        title: 'Heat Load due to LED Lighting of Indoor Strawberry Plantation',
        authors: 'Chaichana C., et al.',
        year: 2020, journal: 'Energy Reports',
        doi: '10.1016/j.egyr.2019.11.089',
        summary: 'Quantified sensible and latent heat loads from LED lighting in closed indoor strawberry rooms. Measured condensation rates and RH control requirements. Essential data for HVAC/dehumidification system sizing in plant factories.\n\nวัดปริมาณความร้อนสัมผัสและความร้อนแฝงจากไฟ LED ในห้องปลูกสตรอว์เบอร์รีปิด รวมถึงอัตราการควบแน่นและการควบคุมความชื้น ข้อมูลสำคัญสำหรับการออกแบบระบบ HVAC',
        confidence_score: 93,
      },
    ];

    const { data: inserted, error: insErr } = await supabase
      .from('research_citations')
      .insert(papers)
      .select();

    if (insErr) {
      return NextResponse.json({ error: 'Insert failed (RLS)', details: insErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Appended ${inserted?.length} dimension papers for ${crop.name} (${crop.id})`,
      papers: inserted?.map(p => ({ doi: p.doi, title: p.title.substring(0, 80) })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
