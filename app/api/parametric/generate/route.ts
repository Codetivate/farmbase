import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { crop_id, target_yield_kg, yield_per_m2, target_temp_c } = body;

    // Phase 2 Parametric Solver (Next.js Edition)
    // 1. Calculate Space requirements based on biological yield potential
    const area = yield_per_m2 > 0 ? target_yield_kg / yield_per_m2 : 100;
    
    // 2. Select Materials based on Environmental rules (Temp limit)
    const requiresInsulation = target_temp_c < 20;
    
    // 3. Generate Bill of Materials (BOM)
    const bom = [];
    bom.push({ 
      category: 'โครงสร้าง',
      name: 'โครงสร้างเหล็กชุบกัลวาไนซ์ (Galvanized Steel)', 
      quantity: parseFloat((area * 1.5).toFixed(2)), 
      unit: 'กก.', 
      unit_price: 30, // USD Base Price
      total_price: parseFloat((area * 1.5 * 30).toFixed(2))
    });
    
    bom.push({ 
      category: 'ระบบวัสดุห่อหุ้ม',
      name: requiresInsulation ? 'แผงฉนวนกันความร้อน EPS' : 'แผ่นโพลีคาร์บอเนต', 
      quantity: parseFloat(area.toFixed(2)), 
      unit: 'ตร.ม.', 
      unit_price: requiresInsulation ? 85 : 45,
      total_price: parseFloat((area * (requiresInsulation ? 85 : 45)).toFixed(2))
    });
    
    const hvacTons = Math.ceil(area / 20);
    bom.push({ 
      category: 'ระบบควบคุมสภาพอากาศ',
      name: 'เครื่องปรับอากาศอัจฉริยะ (Advanced HVAC Unit)', 
      quantity: hvacTons, 
      unit: 'ตัน', 
      unit_price: 1200,
      total_price: hvacTons * 1200
    });
    
    const totalCost = bom.reduce((sum, item) => sum + item.total_price, 0) + 1500; // adding baseline cost

    // Match exactly the Python GenerateBOMResponse Pydantic model
    return NextResponse.json({
      calculated_area_m2: parseFloat(area.toFixed(2)),
      bom: bom,
      estimated_cost_usd: parseFloat(totalCost.toFixed(2))
    });

  } catch (error) {
    console.error('Error generating parametric data:', error);
    return NextResponse.json({ error: 'Failed to generate parameters' }, { status: 500 });
  }
}
