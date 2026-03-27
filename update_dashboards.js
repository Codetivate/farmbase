const fs = require('fs');

// 1. Update Operations Dashboard
const opPath = 'c:/Users/numsi/OneDrive/เดสก์ท็อป/Farmbase-Project/project/features/operations/operations-dashboard.tsx';
let opCode = fs.readFileSync(opPath, 'utf8');

if (!opCode.includes('useI18n')) {
  opCode = opCode.replace("import { useAuth } from '@/lib/auth-context';", "import { useAuth } from '@/lib/auth-context';\nimport { useI18n } from '@/lib/i18n/i18n-context';");
  opCode = opCode.replace('const { user } = useAuth();', 'const { user } = useAuth();\n  const { t } = useI18n();');
}

opCode = opCode.replace(/ศูนย์ควบคุมปฎิบัติการ \(Live Operations\)/g, "{t.operations.title}");
opCode = opCode.replace(/เชื่อมต่อและตรวจสอบสถานะโรงเรือนแบบเรียลไทม์ \(Digital Twin\)/g, "{t.operations.subtitle}");
opCode = opCode.replace(/> ข้อมูลเซ็นเซอร์</g, ">{t.operations.sensorData}<");
opCode = opCode.replace(/> คู่มือประกอบ 4D</g, "> {t.operations.guide4d}<");
opCode = opCode.replace(/Connecting to Edge Hardware\.\.\./g, "{t.operations.connectingToEdge}");
opCode = opCode.replace(/อุณหภูมิ \(TEMP\)/g, "{t.operations.tempLabel}");
opCode = opCode.replace(/ความชื้น \(RH\)/g, "{t.operations.rhLabel}");
opCode = opCode.replace(/ก๊าซคาร์บอน \(CO2\)/g, "{t.operations.co2Label}");
opCode = opCode.replace(/ความสว่าง \(LIGHT\)/g, "{t.operations.lightLabel}");
opCode = opCode.replace(/เป้าหมาย/g, "{t.operations.target}");
opCode = opCode.replace(/>ปกติ</g, ">{t.operations.statusNormal}<");
opCode = opCode.replace(/บันทึกการทำงานของระบบ \(System Logs\)/g, "{t.operations.systemLogs}");

opCode = opCode.replace(/คู่มือการประกอบโครงสร้าง \(4D Assembly Guide\)/g, "{t.operations.guideTitle}");
opCode = opCode.replace(/ขั้นตอนการติดตั้งและขึ้นโครงสร้างโรงเรือนตามพิมพ์เขียว \(IFC\) ของคุณ/g, "{t.operations.guideSubtitle}");

opCode = opCode.replace(/ระยะที่ 1: งานปรับพื้นที่และฐานราก/g, "{t.operations.phase1Title}");
opCode = opCode.replace(/เตรียมจุดต่อท่อระบายน้ำ/g, "{t.operations.phase1Desc}");
opCode = opCode.replace(/ระยะที่ 2: งานโครงสร้างพื้นฐาน/g, "{t.operations.phase2Title}");
opCode = opCode.replace(/ขึ้นโครงอลูมิเนียมเสริมเหล็ก ประกอบเสา ผนังฉนวนกันความร้อน และระบบหลังคาปิดทึบ/g, "{t.operations.phase2Desc}");
opCode = opCode.replace(/ระยะที่ 3: ระบบควบคุมสภาพอากาศ \(HVAC\)/g, "{t.operations.phase3Title}");
opCode = opCode.replace(/ติดตั้งแอร์ เซ็นเซอร์ความชื้น แผงไฟ LED Grow Light และเดินท่อระบบพ่นหมอก/g, "{t.operations.phase3Desc}");
opCode = opCode.replace(/ระยะที่ 4: เชื่อมต่อ Smart Node \(IoT\)/g, "{t.operations.phase4Title}");
opCode = opCode.replace(/ลงทะเบียนเชื่อมต่อระบบสั่งการอัตโนมัติ/g, "{t.operations.phase4Desc}");

opCode = opCode.replace(/\{t\.operations\.target\}: 90%/g, "{t.operations.target} 90 {t.operations.rhUnit}");
opCode = opCode.replace(/\{t\.operations\.target\}: 50 μmol/g, "{t.operations.target} 50 {t.operations.umolUnit}");

// Fix the main telemetry unit % -> {t.operations.rhUnit}
opCode = opCode.replace(/<span className="text-lg font-bold text-muted-foreground">%<\/span>/, `<span className="text-lg font-bold text-muted-foreground">{t.operations.rhUnit}</span>`);
opCode = opCode.replace(/<span className="text-lg font-bold text-muted-foreground">μmol<\/span>/, `<span className="text-lg font-bold text-muted-foreground">{t.operations.umolUnit}</span>`);

fs.writeFileSync(opPath, opCode);
console.log('Updated operations-dashboard.tsx');

// 2. Update Procurement Dashboard
const procPath = 'c:/Users/numsi/OneDrive/เดสก์ท็อป/Farmbase-Project/project/features/procurement/procurement-dashboard.tsx';
let procCode = fs.readFileSync(procPath, 'utf8');

if (!procCode.includes('useI18n')) {
  procCode = procCode.replace("import { useCurrency } from '@/lib/currency-context';", "import { useCurrency } from '@/lib/currency-context';\nimport { useI18n } from '@/lib/i18n/i18n-context';");
  procCode = procCode.replace('const { formatCurrency } = useCurrency();', 'const { formatCurrency } = useCurrency();\n  const { t } = useI18n();');
}

procCode = procCode.replace(/Back to Discovery/g, "{t.procurement.backToDiscovery}");
procCode = procCode.replace(/Your Saved Designs/g, "{t.procurement.savedDesigns}");
procCode = procCode.replace(/Review your AI-generated Bill of Materials and automatically source components directly from global hardware suppliers./g, "{t.procurement.savedDesignsDesc}");
procCode = procCode.replace(/You haven't saved any parametric designs yet./g, "{t.procurement.noSavedDesigns}");
procCode = procCode.replace(/Estimated Capex/g, "{t.procurement.estimatedCapex}");
procCode = procCode.replace(/TARGET YIELD/g, "{t.procurement.targetYield}");
procCode = procCode.replace(/FOOTPRINT/g, "{t.procurement.footprint}");
procCode = procCode.replace(/Confirm Real-World Order/g, "{t.procurement.confirmOrder}");
procCode = procCode.replace(/Processing\.\.\./g, "{t.procurement.processing}");

fs.writeFileSync(procPath, procCode);
console.log('Updated procurement-dashboard.tsx');
