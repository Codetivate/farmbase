import sys
import re

with open(r"c:\Users\numsi\OneDrive\เดสก์ท็อป\Farmbase-Project\project\lib\i18n\translations.ts", "r", encoding="utf8") as f:
    text = f.read()

types_insert = """  procurement: {
    backToDiscovery: string;
    title: string;
    savedDesigns: string;
    savedDesignsDesc: string;
    noSavedDesigns: string;
    estimatedCapex: string;
    targetYield: string;
    footprint: string;
    confirmOrder: string;
    processing: string;
    orderSuccess: string;
    orderFailed: string;
  };
  operations: {
    backToProcurement: string;
    title: string;
    subtitle: string;
    sensorData: string;
    guide4d: string;
    connectingToEdge: string;
    tempLabel: string;
    rhLabel: string;
    co2Label: string;
    lightLabel: string;
    target: string;
    statusNormal: string;
    systemLogs: string;
    guideTitle: string;
    guideSubtitle: string;
    phase1Title: string;
    phase1Desc: string;
    phase2Title: string;
    phase2Desc: string;
    phase3Title: string;
    phase3Desc: string;
    phase4Title: string;
    phase4Desc: string;
    rhUnit: string;
    umolUnit: string;
  };
"""

th_insert = """  procurement: {
    backToDiscovery: 'กลับไปหน้าค้นหา',
    title: 'สั่งซื้อวัสดุ (Smart Procurement)',
    savedDesigns: 'แบบฟาร์มที่คุณบันทึกไว้ (Saved Designs)',
    savedDesignsDesc: 'ตรวจสอบรายการบัญชีวัสดุ (BOM) ที่ AI สร้างขึ้น และสั่งซื้อชิ้นส่วนโดยตรงจากผู้จัดจำหน่ายฮาร์ดแวร์ระดับโลก',
    noSavedDesigns: 'คุณยังไม่ได้บันทึกการออกแบบใดๆ',
    estimatedCapex: 'งบลงทุนคาดการณ์',
    targetYield: 'เป้าหมายผลผลิต',
    footprint: 'พื้นที่ที่ต้องการ',
    confirmOrder: 'ยืนยันสั่งซื้อวัสดุ (Confirm Real-World Order)',
    processing: 'กำลังดำเนินการ...',
    orderSuccess: 'สำเร็จ! ออเดอร์กำลังดำเนินการ',
    orderFailed: 'ไม่สามารถดำเนินการสั่งซื้อได้',
  },
  operations: {
    backToProcurement: 'กลับไปหน้าสั่งซื้อ',
    title: 'ศูนย์ควบคุมปฏิบัติการ (Live Operations)',
    subtitle: 'เชื่อมต่อและตรวจสอบสถานะโรงเรือนแบบเรียลไทม์ (Digital Twin)',
    sensorData: 'ข้อมูลเซ็นเซอร์',
    guide4d: 'คู่มือประกอบ 4D',
    connectingToEdge: 'กำลังเชื่อมต่อกับอุปกรณ์ฮาร์ดแวร์...',
    tempLabel: 'อุณหภูมิ (TEMP)',
    rhLabel: 'ความชื้น (RH)',
    co2Label: 'ก๊าซคาร์บอน (CO2)',
    lightLabel: 'ความสว่าง (LIGHT)',
    target: 'เป้าหมาย:',
    statusNormal: 'ปกติ',
    systemLogs: 'บันทึกการทำงานของระบบ (System Logs)',
    guideTitle: 'คู่มือการประกอบโครงสร้าง (4D Assembly Guide)',
    guideSubtitle: 'ขั้นตอนการติดตั้งและขึ้นโครงสร้างโรงเรือนตามพิมพ์เขียว (IFC) ของคุณ',
    phase1Title: 'ระยะที่ 1: งานปรับพื้นที่และฐานราก',
    phase1Desc: 'เตรียมจุดต่อท่อระบายน้ำ',
    phase2Title: 'ระยะที่ 2: งานโครงสร้างพื้นฐาน',
    phase2Desc: 'ขึ้นโครงอลูมิเนียมเสริมเหล็ก ประกอบเสา ผนังฉนวนกันความร้อน และระบบหลังคาปิดทึบ',
    phase3Title: 'ระยะที่ 3: ระบบควบคุมสภาพอากาศ (HVAC)',
    phase3Desc: 'ติดตั้งแอร์ เซ็นเซอร์ความชื้น แผงไฟ LED Grow Light และเดินท่อระบบพ่นหมอก',
    phase4Title: 'ระยะที่ 4: เชื่อมต่อ Smart Node (IoT)',
    phase4Desc: 'ลงทะเบียนเชื่อมต่อระบบสั่งการอัตโนมัติ',
    rhUnit: '% RH',
    umolUnit: 'μmol',
  },
"""

en_insert = """  procurement: {
    backToDiscovery: 'Back to Discovery',
    title: 'Smart Procurement',
    savedDesigns: 'Your Saved Designs',
    savedDesignsDesc: 'Review your AI-generated Bill of Materials and automatically source components directly from global hardware suppliers.',
    noSavedDesigns: "You haven't saved any parametric designs yet.",
    estimatedCapex: 'ESTIMATED CAPEX',
    targetYield: 'TARGET YIELD',
    footprint: 'FOOTPRINT',
    confirmOrder: 'Confirm Real-World Order',
    processing: 'Processing...',
    orderSuccess: 'Success! Order is now processing.',
    orderFailed: 'Failed to place order due to an error.',
  },
  operations: {
    backToProcurement: 'Back to Procurement',
    title: 'Live Operations Center',
    subtitle: 'Connect and monitor real-time greenhouse status (Digital Twin)',
    sensorData: 'Sensor Data',
    guide4d: '4D Assembly Guide',
    connectingToEdge: 'Connecting to Edge Hardware...',
    tempLabel: 'TEMPERATURE (TEMP)',
    rhLabel: 'RELATIVE HUMIDITY (RH)',
    co2Label: 'CARBON DIOXIDE (CO2)',
    lightLabel: 'LIGHT INTENSITY',
    target: 'Target:',
    statusNormal: 'Normal',
    systemLogs: 'System Event Logs',
    guideTitle: '4D Structural Assembly Guide',
    guideSubtitle: 'Step-by-step installation instructions for your generated IFC blueprint.',
    phase1Title: 'Phase 1: Foundation & Grading',
    phase1Desc: 'Pour concrete pad or lay damp-proof membrane per specs. Set drainage points.',
    phase2Title: 'Phase 2: Core Structure',
    phase2Desc: 'Erect aluminum profiles, assemble pillars, insulated panels, and opaque roof.',
    phase3Title: 'Phase 3: HVAC Integration',
    phase3Desc: 'Install A/C units, sensors, LED Grow Lights, and micro-mist pipework.',
    phase4Title: 'Phase 4: Smart Node Link (IoT)',
    phase4Desc: 'Register MAC Address with Farmbase Cloud and engage power.',
    rhUnit: '% RH',
    umolUnit: 'μmol',
  },
"""

text = re.sub(r"(failedToSave:\sstring;\s*\n\s*\};\s*\n)\}", r"\g<1>" + types_insert + "}", text)
text = re.sub(r"(failedToSave:\s'[^']+',\s*\n\s*\},\s*\n)\}\;", r"\g<1>" + th_insert + "};", text, count=1)
text = re.sub(r"(failedToSave:\s'[^']+',\s*\n\s*\},\s*\n)\}\;", r"\g<1>" + en_insert + "};", text)

with open(r"c:\Users\numsi\OneDrive\เดสก์ท็อป\Farmbase-Project\project\lib\i18n\translations.ts", "w", encoding="utf8") as f:
    f.write(text)

print("SUCCESS")
