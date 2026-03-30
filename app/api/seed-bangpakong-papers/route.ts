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

    // Check for duplicates first
    const { data: existing } = await supabase
      .from('research_citations')
      .select('doi')
      .eq('crop_id', crop.id);

    const existingDois = new Set((existing || []).map(e => e.doi));

    const papers = [
      {
        crop_id: crop.id,
        title: 'Development and validation of an innovative algorithm for sodium accumulation management in closed-loop soilless culture systems',
        authors: 'Giannothanasis E., Savvas D., Danai A., Leonardi C.',
        year: 2024, journal: 'Agricultural Water Management',
        doi: '10.1016/j.agwat.2024.108968',
        summary: 'พัฒนาอัลกอริทึมจัดการ Na⁺ ใน closed-loop hydroponic. ใช้ ion-selective electrodes ตรวจวัด real-time. คำนวณจุด flush/drain เพื่อป้องกัน EC สะสมเกิน. NUE สูงขึ้น 88-94% vs. open-loop. สตรอว์เบอร์รีทนเค็มได้แค่ ~2.0 dS/m — ต้องมี algorithm จัดการ Na⁺ โดยเฉพาะเมื่อใช้น้ำจากพื้นที่น้ำเค็มหนุน เช่น บางปะกง',
        confidence_score: 94,
      },
      {
        crop_id: crop.id,
        title: 'Plant factories versus greenhouses: Comparison of resource use efficiency',
        authors: 'Graamans L., Baeza E., van den Dobbelsteen A., Tsafaras I., Stanghellini C.',
        year: 2018, journal: 'Agricultural Systems',
        doi: '10.1016/j.agsy.2017.11.003',
        summary: 'เปรียบเทียบ PFAL vs. Greenhouse หลายภูมิอากาศ. PFAL ใช้พลังงาน 247 kWh/kg dry weight vs. GH 70-111 kWh แต่ใช้น้ำ/ที่ดินน้อยกว่ามาก. ในเขตร้อนชื้น cooling load สูงเป็นพิเศษ. เป็น benchmark สำหรับคำนวณว่า PFAL ในไทยคุ้มทุนหรือไม่',
        confidence_score: 96,
      },
      {
        crop_id: crop.id,
        title: 'Environmental and resource use analysis of plant factories with energy technology options: A case study in Japan',
        authors: 'Kikuchi Y., Kanematsu Y., Yoshikawa N., Okubo T., Takagaki M.',
        year: 2018, journal: 'Journal of Cleaner Production',
        doi: '10.1016/j.jclepro.2018.03.110',
        summary: 'LCA เต็มรูปแบบของ Plant Factory ญี่ปุ่น. เปรียบเทียบ PFAL vs. PFSL vs. เกษตรทั่วไป. PFAL ลด land/water/phosphorus ได้ดี แต่ energy เป็นจุดอ่อน. การเสริม renewable energy (solar) ช่วยลด footprint ได้มาก',
        confidence_score: 93,
      },
      {
        crop_id: crop.id,
        title: 'Advances in strawberry postharvest preservation and packaging: A comprehensive review',
        authors: 'Priyadarshi R., Jayakumar A., Krebs de Souza C., Rhim J.W.',
        year: 2024, journal: 'Comprehensive Reviews in Food Science and Food Safety',
        doi: '10.1111/1541-4337.13417',
        summary: 'Review ครอบคลุมเทคนิค post-harvest สตรอว์เบอร์รี: MAP (Modified Atmosphere Packaging), 1-MCP, ozone treatment, edible coatings (chitosan), cold chain logistics. สตรอว์เบอร์รีเน่าเร็ว 2-3 วัน ต้องมีระบบส่งที่ดี',
        confidence_score: 95,
      },
    ];

    // Filter out already-existing DOIs
    const newPapers = papers.filter(p => !existingDois.has(p.doi));

    if (newPapers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All 4 Bangpakong papers already exist in DB',
        skipped: papers.length,
      });
    }

    // Insert citations
    const { data: inserted, error: insErr } = await supabase
      .from('research_citations')
      .insert(newPapers)
      .select();

    if (insErr) {
      return NextResponse.json({ error: 'Insert citations failed', details: insErr.message }, { status: 500 });
    }

    // Backfill paper_submissions for each new citation
    let linkedCount = 0;
    for (const citation of inserted || []) {
      const { data: sub, error: subErr } = await supabase
        .from('paper_submissions')
        .insert({
          doi: citation.doi,
          url: '',
          crop_id: citation.crop_id,
          submitted_by_email: 'system@farmbase.ai',
          title: citation.title,
          authors: citation.authors,
          year: citation.year,
          journal: citation.journal,
          abstract_text: '',
          ai_summary: citation.summary,
          ai_confidence_score: citation.confidence_score,
          ai_relevance_tags: ['verified', 'bangpakong_gap'],
          ai_model_used: 'engineer-seed',
          status: 'approved',
          error_message: '',
          priority: 'normal',
        })
        .select()
        .single();

      if (!subErr && sub) {
        await supabase
          .from('research_citations')
          .update({ submission_id: sub.id })
          .eq('id', citation.id);
        linkedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Added ${inserted?.length} Bangpakong gap papers, linked ${linkedCount} submissions`,
      papers: inserted?.map(p => ({ doi: p.doi, title: p.title.substring(0, 80) })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
