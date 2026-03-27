/**
 * Farmbase API Client
 * Used to communicate with the Python FastAPI Backend
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface GenerateBOMRequest {
  crop_id: string;
  target_yield_kg: number;
  yield_per_m2: number;
  target_temp_c: number;
}

export interface BOMItem {
  category: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

export interface GenerateBOMResponse {
  calculated_area_m2: number;
  bom: BOMItem[];
  estimated_cost_usd: number;
}

/**
 * Calls the Parametric Route on the FastAPI Backend
 * Pass in crop parameters to generate the required architectural footprint and BOM.
 */
export async function generateParametricDesign(req: GenerateBOMRequest): Promise<GenerateBOMResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/parametric/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error generating parametric design:", error);
    return null;
  }
}
