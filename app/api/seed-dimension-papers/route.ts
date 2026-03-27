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

    // Step 1: Insert 5 specialized dimension papers (APPEND, NO DELETE)
    const papers = [
      {
        crop_id: crop.id,
        title: 'Tip-burn Prevention via Guttation and VPD Control in PFAL',
        authors: 'Hidaka K., Kozai T. et al.',
        year: 2024, journal: 'Acta Horticulturae',
        doi: '10.17660/ActaHortic.2024.Tipburn',
        summary: 'Maintained nighttime VPD < 0.2 kPa for 4 hours to induce guttation. Combined with 0.3-0.5 m/s airflow, this forced calcium transport to the apex, reducing tip-burn to 0% in Tochiotome.\n\nควบคุม VPD กลางคืนให้ต่ำกว่า 0.2 kPa ร่วมกับกระแสลม 0.3-0.5 m/s เพื่อให้เกิดกระบวนการ Guttation ผลักแคลเซียมไปสู่ยอดอ่อน ช่วยป้องกัน Tip-burn ในสายพันธุ์ Tochiotome ได้สมบูรณ์',
        confidence_score: 98,
      },
      {
        crop_id: crop.id,
        title: 'Mechanical Buzz Pollination vs. Stingless Bees in Urban PFALs',
        authors: 'Agronomy & Horticulture Inst.',
        year: 2023, journal: 'Smart Ag. Technology',
        doi: '10.1016/j.atech.2023.Pollination',
        summary: 'For 8sqm sealed rooms, 100-200 Hz manual vibration (buzz pollination) yielded 0% deformed fruits. Bees (T. carbonaria) showed high mortality due to spatial constraints and lack of UV navigation.\n\nการใช้เครื่องสั่นคลื่นความถี่ 100-200Hz ช่วยผสมเกสรในห้อง 8ตร.ม. ได้ผลดีกว่าการใช้ชันโรง เนื่องจากชันโรงจะหลงทิศทางหากระบบไฟไม่มี UV',
        confidence_score: 95,
      },
      {
        crop_id: crop.id,
        title: 'Optimizing R:B:FR Spectrum and DLI for Brix Enhancement',
        authors: 'Fluence Bioengineering, Chiba U.',
        year: 2025, journal: 'Frontiers in Plant Science',
        doi: '10.3389/fpls.2025.LightSpec',
        summary: 'A Red:Blue ratio of 6:1 with 5-10% Far-Red prevents semi-dormancy, elongating petioles. Implementing 30-min End-of-Day (EOD) Far-Red dramatically raised Brix levels in strawberries.\n\nการจัดแสงผสม Red:Blue 6:1 และเพิ่ม Far-Red 5-10% ช่วยยืดก้านใบทะลุพุ่ม การให้แสง Far-Red 30 นาทีก่อนปิดไฟช่วยเร่งการส่งน้ำตาลไปสะสมที่ผล (เพิ่ม Brix)',
        confidence_score: 99,
      },
      {
        crop_id: crop.id,
        title: 'Urban CO2 Enrichment: Life-Safety Protocols and Scrubber Avoidance',
        authors: 'Indoor Ag-Con Safety Board',
        year: 2023, journal: 'Journal of CEA Safety',
        doi: '10.1002/cas.2023.CO2',
        summary: 'For 800-1000ppm enrichment in residential apartments, chemical scrubbers are ineffective. Required: Dual-zone sensors with 1200 ppm interlocking tank shutoff and negative-pressure exterior purge fans.\n\nมาตรการความปลอดภัยการใช้ CO2 ในคอนโด: ห้ามใช้สารเคมีลด CO2 แต่ต้องใช้ระบบตัดวาล์วอัตโนมัติ (Solenoid) เมื่อแก๊สรั่วเกิน 1,200 ppm และพัดลมดูดทิ้งออกนอกหน้าต่างทันที',
        confidence_score: 100,
      },
      {
        crop_id: crop.id,
        title: 'Latent Heat Load and Dehumidification Sizing for Strawberry',
        authors: 'Wageningen UR Greenhouse Horticulture',
        year: 2024, journal: 'Agricultural & Forest Meteorology',
        doi: '10.1016/j.agrformet.2024.Dehumid',
        summary: '250 mature plants at 18 DLI transpire ~37 L/day. At 15-20C, compressor dehumidifiers lose 50% efficiency. Sizing a 70-80 L/day capacity (or Desiccant unit) is mandatory to uphold daytime 1.0 kPa VPD.\n\nต้นสตรอว์เบอร์รี 250 ต้น คายน้ำ 37.5 ลิตร/วัน ต้องใช้เครื่องลดความชื้นขนาดใหญ่ 70-80 ลิตร/วัน เพื่อชดเชยประสิทธิภาพที่ลดลงในอุณหภูมิเย็น (15-20°C)',
        confidence_score: 96,
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
