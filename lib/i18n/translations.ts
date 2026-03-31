export type Locale = 'th' | 'en';

export interface Translations {
  header: {
    farmbase: string;
    farmingResearch: string;
    research: string;
    scientificHub: string;
    signIn: string;
    signOut: string;
    dashboard: string;
  };
  hero: {
    title: string;
    subtitle: string;
  };
  search: {
    placeholders: string[];
    suggestions: string[];
    popularSearches: string;
  };
  tags: {
    summerHighROI: string;
    quickHarvest: string;
    mushrooms: string;
    leafyGreens: string;
    highROI: string;
    indoorFarming: string;
    winterCrops: string;
    gourmet: string;
  };
  marketplace: {
    title: string;
    subtitle: string;
    crops: string;
    crop: string;
    noResults: string;
    noResultsHint: string;
  };
  card: {
    days: string;
    kgPerCycle: string;
    aiCtrl: string;
    market: string;
    cost: string;
    perCycle: string;
    scientificFoundation: string;
    peerReviewedStudy: string;
    peerReviewedStudies: string;
    investAndStart: string;
    mushroom: string;
    leafyGreen: string;
    herb: string;
    fruit: string;
    vegetable: string;
    highDemand: string;
    trending: string;
    stable: string;
    capexLabel: string;
    opexLabel: string;
    aiConfidence: string;
    researchBacked: string;
    highConfidence: string;
    moderateConfidence: string;
    lowConfidence: string;
    studies: string;
  };
  popover: {
    harvestDuration: string;
    harvestDurationDesc: string;
    projectedYield: string;
    projectedYieldDesc: string;
    aiAutomation: string;
    aiAutomationDesc: string;
    marketTrend: string;
    marketTrendDesc: string;
    growthRate: string;
    midpoint: string;
    maxHeight: string;
    yieldPerSqm: string;
    healthFactor: string;
    area: string;
    total: string;
    category: string;
    indoorHigher: string;
    mixed: string;
    tempRange: string;
    demandIndex: string;
    pricePerKg: string;
    seasonality: string;
    formula: string;
    unitCm: string;
    unitKg: string;
    unitSqm: string;
  };
  seasons: Record<string, string>;
  detail: {
    backToResearch: string;
    researchPapers: string;
    day: string;
    costBreakdown: string;
    totalCostPerCycle: string;
    capitalExpenditure: string;
    operatingExpenditure: string;
    pricingComingSoon: string;
    farmPlanCreated: string;
    executeToFarm: string;
    aiGrowingGuide: string;
    costLabel: string;
    benefitSummary: string;
    researchBacked: string;
  };
  stats: {
    height: string;
    biomass: string;
    perUnit: string;
    health: string;
    optimal: string;
    stressed: string;
    critical: string;
  };
  guide: {
    prepareSubstrate: string;
    prepareSubstrateDesc: string;
    inoculateIncubate: string;
    inoculateIncubateDesc: string;
    initiateFruiting: string;
    initiatefruitingDesc: string;
    monitorGrowth: string;
    monitorGrowthDesc: string;
    harvest: string;
    harvestMushroomDesc: string;
    startSeeds: string;
    startSeedsDesc: string;
    transplantSeedlings: string;
    transplantSeedlingsDesc: string;
    optimizeEnvironment: string;
    optimizeEnvironmentDesc: string;
    headFormation: string;
    headFormationDesc: string;
    harvestVegetableDesc: string;
    postHarvest: string;
    postHarvestDesc: string;
  };
  environment: {
    title: string;
    live: string;
    temperature: string;
    humidity: string;
    co2: string;
    light: string;
    simulationDay: string;
    optimal: string;
  };
  cropNames: Record<string, string>;
  auth: {
    welcomeBack: string;
    createAccount: string;
    signInSubtitle: string;
    signUpSubtitle: string;
    fullName: string;
    fullNamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    minChars: string;
    signingIn: string;
    creatingAccount: string;
    signInBtn: string;
    createAccountBtn: string;
    noAccount: string;
    hasAccount: string;
    accountCreated: string;
    accountCreatedDesc: string;
    goToSignIn: string;
    backToMarketplace: string;
  };
  drawer: {
    scientificFoundation: string;
    modelConfidence: string;
    aiInsight: string;
    aiInsightText: (cropName: string, citationCount: number, avgConfidence: number) => string;
    aiVerified: string;
    manual: string;
    pendingReview: string;
    feedbackOpen: string;
    open: string;
    academicCitations: string;
    reportIssueHint: string;
    noCitations: string;
    verified: string;
    confidence: string;
    openIssue: string;
    openIssues: string;
    reportIssue: string;
    issueReportedSuccess: string;
    issueReportedDesc: string;
    whatTypeOfIssue: string;
    dataError: string;
    scoreTooHigh: string;
    scoreTooLow: string;
    outdated: string;
    other: string;
    affectedField: string;
    generalCitation: string;
    title: string;
    authors: string;
    year: string;
    journal: string;
    summary: string;
    confidenceScore: string;
    severity: string;
    low: string;
    medium: string;
    high: string;
    critical: string;
    continueBtn: string;
    describeIssue: string;
    currentValue: string;
    whatIsWrong: string;
    suggestedCorrection: string;
    back: string;
    almostDone: string;
    type: string;
    submitReport: string;
    loginRequired: string;
    loginRequiredDesc: string;
    loginBtn: string;
  };
  simControls: {
    resetToDay1: string;
  };
  currency: {
    perSqm: string;
    perSqmPerCycle: string;
    exchangeRate: string;
    liveRate: string;
  };
  dashboardNav: {
    papers: string;
    issues: string;
    users: string;
  };
  coffee: {
    buyMeCoffee: string;
    supportUs: string;
    supportSubtitle: string;
    amount: string;
    scanToPay: string;
    promptPay: string;
    thankYou: string;
    thankYouDesc: string;
    customAmount: string;
    close: string;
  };
  designLab: {
    backToDiscovery: string;
    title: string;
    facility: string;
    adjustYieldDesc: string;
    targetYield: string;
    requiredArea: string;
    cyclesYear: string;
    requiredSystems: string;
    hvac: string;
    maintainsTemp: string;
    irrigation: string;
    targetRh: string;
    growLights: string;
    ledSpectrum: string;
    liveMesh: string;
    buildingFuture: string;
    exportBomDesc: string;
    generateBom: string;
    generatedBom: string;
    totalCapex: string;
    saveAndCheckout: string;
    loginRequired: string;
    failedToConnect: string;
    failedToSave: string;
  };
  procurement: {
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
    facilitySelector: string;
    aiAutoPilot: string;
    aiActive: string;
    manualMode: string;
    currentValue: string;
    status: string;
  };
  howItWorks?: {
    title: string;
    subtitle: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    step4Title: string;
    step4Desc: string;
  };
  controlRoom: {
    projects: string;
    newProject: string;
    monitoring: string;
    overview: string;
    energy: string;
    bom: string;
    robotics: string;
    startSimulation: string;
    stopSimulation: string;
    controlVersion: string;
    status: string;
    parametersInRange: string;
    noData: string;
    healthy: string;
    alert: string;
    weather: string;
    loadingWeather: string;
    cropCycle: string;
    day: string;
    phase: string;
    health: string;
    noActiveSimulation: string;
    realtimeParams: string;
    parameter: string;
    current: string;
    targetRange: string;
    delta: string;
    statusCol: string;
    ok: string;
    noSensorData: string;
    noSensorDataHint: string;
    clickStartSim: string;
    robotTitle: string;
    robot: string;
    vision: string;
    isaacSim: string;
    digitalTwin: string;
    standby: string;
    notConnected: string;
    simReady: string;
    hilNotConnected: string;
    hilHint: string;
    temp: string;
    humidity: string;
    co2: string;
    ec: string;
    ph: string;
    ppfd: string;
    vpd: string;
    clear: string;
    partlyCloudy: string;
    foggy: string;
    rain: string;
    storm: string;
  };
  energyBom: {
    tabEnergy: string;
    tabEnergyDesc: string;
    tabBom: string;
    tabBomDesc: string;
    energyMonitor: string;
    live: string;
    kwhToday: string;
    kwhMonth: string;
    costMonth: string;
    powerBreakdown: string;
    solarOffset: string;
    solarSwitching: string;
    optimize: string;
    active: string;
    save: string;
    devicePower: string;
    elecRateLabel: string;
    elecRateUnit: string;
    bomTitle: string;
    itemsEditable: string;
    costByCategory: string;
    ecoMode: string;
    ecoDesc: string;
    solarReady: string;
    solarDesc: string;
    nightShift: string;
    nightDesc: string;
  };
}

export const th: Translations = {
  header: {
    farmbase: 'Farmbase',
    farmingResearch: 'เรียนรู้การทำฟาร์ม',
    research: 'วิจัย',
    scientificHub: 'ศูนย์วิจัย',
    signIn: 'เข้าสู่ระบบ',
    signOut: 'ออกจากระบบ',
    dashboard: 'แดชบอร์ด',
  },
  hero: {
    title: 'ปลูกอะไรดี',
    subtitle: 'จำลองผลผลิต ออกแบบโครงสร้าง และบริหารฟาร์มอัจฉริยะจบในที่เดียว',
  },
  search: {
    placeholders: [
      'อยากปลูกอะไร?',
      'ค้นหาพืช ต้นทุน ฤดูกาล...',
      'ค้นหาพืชที่เหมาะกับคุณ...',
    ],
    suggestions: [
      'พืชที่กำไรดีที่สุดในฤดูนี้',
      'เก็บเกี่ยวเร็วภายใน 30 วัน',
      'เห็ดที่เหมาะปลูกในร่ม',
      'ผักใบเขียวดูแลง่าย',
      'พืชฤดูหนาวกำไรสูง',
    ],
    popularSearches: 'ค้นหายอดนิยม',
  },
  tags: {
    summerHighROI: 'กำไรดีฤดูร้อน',
    quickHarvest: 'เก็บเกี่ยวเร็ว',
    mushrooms: 'เห็ด',
    leafyGreens: 'ผักใบเขียว',
    highROI: 'กำไรสูง',
    indoorFarming: 'ปลูกในร่ม',
    winterCrops: 'พืชฤดูหนาว',
    gourmet: 'พืชเกรดพรีเมียม',
  },
  marketplace: {
    title: 'วิเคราะห์พืชจากงานวิจัย',
    subtitle: 'วิเคราะห์ต้นทุนจากข้อมูลวิทยาศาสตร์',
    crops: 'พืช',
    crop: 'พืช',
    noResults: 'ไม่พบพืชที่ตรงกับการค้นหา',
    noResultsHint: 'ลองใช้คำค้นอื่น หรือล้างตัวกรอง',
  },
  card: {
    days: 'วัน',
    kgPerCycle: 'กก./รอบ',
    aiCtrl: 'AI ควบคุม',
    market: 'ตลาด',
    cost: 'ต้นทุน',
    perCycle: 'ต่อรอบ',
    scientificFoundation: 'พื้นฐานทางวิทยาศาสตร์',
    peerReviewedStudy: 'งานวิจัยที่ผ่านการตรวจสอบ',
    peerReviewedStudies: 'งานวิจัยที่ผ่านการตรวจสอบ',
    investAndStart: 'เริ่มปลูก',
    mushroom: 'เห็ด',
    leafyGreen: 'ผักใบเขียว',
    herb: 'สมุนไพร',
    fruit: 'ผลไม้',
    vegetable: 'ผัก',
    highDemand: 'ต้องการสูง',
    trending: 'กำลังมาแรง',
    stable: 'มีเสถียรภาพ',
    capexLabel: 'ลงทุน',
    opexLabel: 'ดำเนินการ',
    aiConfidence: 'AI Confidence',
    researchBacked: 'งานวิจัยรองรับ',
    highConfidence: 'ความเชื่อมั่นสูง',
    moderateConfidence: 'ความเชื่อมั่นปานกลาง',
    lowConfidence: 'ความเชื่อมั่นต่ำ',
    studies: 'งานวิจัย',
  },
  popover: {
    harvestDuration: 'ระยะเวลาเก็บเกี่ยว',
    harvestDurationDesc: 'จำนวนวันทั้งหมดจากการปลูกจนถึงเก็บเกี่ยวภายใต้สภาพแวดล้อมที่เหมาะสม',
    projectedYield: 'ผลผลิตที่คาดการณ์',
    projectedYieldDesc: 'ผลผลิตที่คาดการณ์สำหรับพื้นที่ปลูก 10 ตร.ม. ภายใต้สภาวะที่เหมาะสม โดยคำนึงถึงสุขภาพพืช',
    aiAutomation: 'AI อัตโนมัติ',
    aiAutomationDesc: 'เปอร์เซ็นต์ของกระบวนการปลูกที่สามารถจัดการได้ด้วยระบบควบคุมสภาพอากาศอัตโนมัติ ยิ่งสูง = ยิ่งไม่ต้องดูแลเอง',
    marketTrend: 'แนวโน้มตลาด',
    marketTrendDesc: 'ตัวชี้วัดความต้องการแบบเรียลไทม์ จากกิจกรรมการขายส่ง รูปแบบฤดูกาล และข้อมูลห่วงโซ่อุปทาน',
    growthRate: 'อัตราการเจริญเติบโต (r)',
    midpoint: 'จุดกึ่งกลาง',
    maxHeight: 'ความสูงสูงสุด',
    yieldPerSqm: 'ผลผลิต / ตร.ม.',
    healthFactor: 'ปัจจัยสุขภาพ',
    area: 'พื้นที่',
    total: 'รวม',
    category: 'ประเภท',
    indoorHigher: 'ในร่ม (สูงกว่า)',
    mixed: 'ผสม',
    tempRange: 'ช่วงอุณหภูมิ',
    demandIndex: 'ดัชนีความต้องการ',
    pricePerKg: 'ราคา / กก.',
    seasonality: 'ฤดูกาล',
    formula: 'สูตร',
    unitCm: 'ซม.',
    unitKg: 'กก.',
    unitSqm: 'ตร.ม.',
  },
  seasons: {
    winter: 'ฤดูหนาว',
    spring: 'ฤดูใบไม้ผลิ',
    summer: 'ฤดูร้อน',
    fall: 'ฤดูใบไม้ร่วง',
    autumn: 'ฤดูใบไม้ร่วง',
    'year-round': 'ตลอดปี',
  },
  detail: {
    backToResearch: 'กลับไปวิจัย',
    researchPapers: 'งานวิจัย',
    day: 'วัน',
    costBreakdown: 'รายละเอียดต้นทุน',
    totalCostPerCycle: 'ต้นทุนรวมต่อรอบ',
    capitalExpenditure: 'ค่าลงทุน (CAPEX)',
    operatingExpenditure: 'ค่าดำเนินการ (OPEX)',
    pricingComingSoon: 'การเปรียบเทียบราคาขายปลีก/ส่ง ในแต่ละตลาด (ไทย, จีน, สหรัฐฯ) กำลังจะมาเร็ว ๆ นี้',
    farmPlanCreated: 'สร้างแผนฟาร์มแล้ว',
    executeToFarm: 'เริ่มทำฟาร์ม',
    aiGrowingGuide: 'AI คู่มือการปลูก',
    costLabel: 'ต้นทุน',
    benefitSummary: 'สรรพคุณ & ประโยชน์',
    researchBacked: 'อ้างอิงจากงานวิจัย',
  },
  stats: {
    height: 'ความสูง',
    biomass: 'ชีวมวล',
    perUnit: 'ต่อหน่วย',
    health: 'สุขภาพ',
    optimal: 'เหมาะสม',
    stressed: 'เครียด',
    critical: 'วิกฤต',
  },
  guide: {
    prepareSubstrate: 'เตรียมวัสดุเพาะ',
    prepareSubstrateDesc: 'ผสมขี้เลื่อยกับรำข้าวหรือฟางข้าวสาลี ให้ความชื้น 65% บรรจุถุงและฆ่าเชื้อที่ 121\u00B0C เป็นเวลา 90 นาที',
    inoculateIncubate: 'ใส่เชื้อ & บ่ม',
    inoculateIncubateDesc: 'ใส่เชื้อเห็ดในวัสดุที่เย็นแล้วอัตราส่วน 20-25% ปิดผนึกถุงและบ่มที่ 22-25\u00B0C ในที่มืดจนเชื้อเห็ดเจริญเต็มถุง',
    initiateFruiting: 'เริ่มการออกดอก',
    initiatefruitingDesc: 'ย้ายไปห้องเปิดดอก ตั้งอุณหภูมิ ความชื้น และ CO2 ตามค่าที่เหมาะสม เปิดปากถุงให้อากาศเข้า',
    monitorGrowth: 'ติดตามการเจริญเติบโต',
    monitorGrowthDesc: 'รักษาสภาพแวดล้อมให้คงที่ ดอกเห็ดจะเริ่มงอกภายใน 3-5 วัน รักษาแสงตามค่าที่เหมาะสม พ่นน้ำที่ผนัง (ไม่ใช่ที่ดอกเห็ด) เพื่อรักษาความชื้น',
    harvest: 'เก็บเกี่ยว',
    harvestMushroomDesc: 'เก็บเกี่ยวเมื่อหมวกเห็ดเริ่มแบนก่อนสปอร์หลุด ตัดที่โคนเป็นกลุ่ม ผลผลิตที่คาดหวัง:',
    startSeeds: 'ระยะทำใบ (Vegetative Growth)',
    startSeedsDesc: 'นำต้นไหลปลอดโรคปลูกใน Deep Water Culture ตั้ง LED: Blue 90 + Red 250 + Far-red 50 µmol/m²/s (Ries 2024) ใช้สูตร Yamazaki N77/P23/K116/Ca40 mg/L ควบคุมลมสม่ำเสมอ 0.3-0.5 m/s ผ่านท่อ PE เจาะรู (Zhang & Kacira 2016) เฝ้าระวัง Na⁺ < 2 mmol/L สำหรับน้ำบางปะกง (Giannothanasis 2024)',
    transplantSeedlings: 'การกระตุ้นตาดอก (Flower Induction)',
    transplantSeedlingsDesc: 'เทคนิค Crown-cooling: ทำเย็นเฉพาะจุดยอดที่ 20°C + วันสั้น 8 ชม. นาน 22 วัน แม้อากาศรอบข้าง 30°C ก็กระตุ้นตาดอกสำเร็จ (Hidaka 2017) ทางเลือก: Kaburei เก็บเย็นมืดต่อเนื่อง 5°C / Kanketsu-reizo สลับร้อน-เย็น (Yamasaki 2020)',
    optimizeEnvironment: 'ระยะออกดอกและติดผล (Flowering & Fruiting)',
    optimizeEnvironmentDesc: 'ผสมเกสรด้วย VPD 2.06 kPa + สั่น 800Hz เขย่าเกสร แล้วสั่น 100Hz ติดยอดเกสรตัวเมีย ไม่ต้องใช้ผึ้ง (Liang 2025) เพิ่ม CO₂ เฉพาะระดับต้น 800-1000 ppm เพิ่มผลผลิต 22% (Hidaka 2022) EC 2.0-4.0 dS/m (AJCS 2025)',
    headFormation: 'เพิ่มความหวาน (Brix Boosting)',
    headFormationDesc: 'แสง Far-red 730nm (50 µmol/m²/s) เพิ่ม Brix 12% โดยกระตุ้นยีนขนส่งน้ำตาลเข้าผล (Ries 2024) ฉาย UV-C ทันทีหลังปิดไฟ ฆ่าสปอร์ราแป้งลดเคมี 100% (Suthaparan 2020) รักษา VPD > 0.8 kPa ป้องกันใบไหม้ปลาย (Bradfield 1979)',
    harvestVegetableDesc: 'แสง Far-red ช่วยยืดก้านผล 62% ทำให้หุ่นยนต์ตรวจจับง่ายขึ้น (Ries 2024) เข้าสู่รอบเก็บเกี่ยวแรกวันที่ 85-90 เก็บซ้ำทุก 3-4 วัน ผลผลิต 8.5 กก./ตร.ม./ปี (Takahashi 2024) ผลผลิตเพิ่ม 48% กับ FR LED:',
    postHarvest: 'ดูแลหลังเก็บเกี่ยว (Post-Harvest Care)',
    postHarvestDesc: 'ผลผลิต: Pre-cool 1-4°C ภายใน 1 ชม. เก็บในถุง MAP (บรรจุภัณฑ์ยืดอายุถนอมอาหาร ลด O₂ เพิ่ม CO₂ 15-20%) ยืดอายุได้ 7-10 วัน (Priyadarshi 2024) ต้นแม่: อายุสูงสุด 8-10 เดือน เมื่อแตกไหล (Runners) นำไปขยายพันธุ์ต่อแบบ Tray-plant (Yamasaki 2020) ตัดไหลที่มีใบ 2-4 ใบชำในถาดเพาะแยกจากแม่เพื่อตัดวงจรโรค (แม่ 1 ต้น ผลิตต้นลูกได้ 30-50 ต้น) พอรากเดินเต็มที่ เก็บพักในห้องเย็น 2-5°C (ทำ Crown-cooling) เพื่อกระตุ้นตาดอกเริ่มลูปใหม่',
  },
  environment: {
    title: 'ควบคุมสภาพแวดล้อม',
    live: 'สด',
    temperature: 'อุณหภูมิ',
    humidity: 'ความชื้น',
    co2: 'CO2',
    light: 'แสง',
    simulationDay: 'วันจำลอง',
    optimal: 'เหมาะสม',
  },
  cropNames: {
    'Tochiotome Strawberry': 'สตรอว์เบอร์รี โทะจิโอะโทะเมะ',
    'Enoki Mushroom': 'Enoki Mushroom',
    'Napa Cabbage': 'ผักกาดขาว',
    'Oyster Mushroom': 'เห็ดนางฟ้า',
    'Shiitake Mushroom': 'เห็ดหอม',
    'King Oyster Mushroom': 'เห็ดเป๋าฮื้อ',
    'Bok Choy': 'ผักกวางตุ้ง',
    'Chinese Kale': 'คะน้า',
    'Morning Glory': 'ผักบุ้ง',
    'Thai Basil': 'กะเพรา',
    'Holy Basil': 'โหระพา',
    'Lettuce': 'ผักกาดหอม',
    'Spinach': 'ผักโขม',
    'Cabbage': 'กะหล่ำปลี',
    'Broccoli': 'บร็อคโคลี',
    'Cauliflower': 'กะหล่ำดอก',
    'Tomato': 'มะเขือเทศ',
    'Chili': 'พริก',
  },
  auth: {
    welcomeBack: 'ยินดีต้อนรับกลับ',
    createAccount: 'สร้างบัญชีของคุณ',
    signInSubtitle: 'เข้าสู่ระบบเพื่อใช้งาน Farmbase อย่างเต็มรูปแบบ',
    signUpSubtitle: 'สมัครสมาชิก Farmbase เพื่อติดตามพืชและเข้าถึงงานวิจัย',
    fullName: 'ชื่อ-นามสกุล',
    fullNamePlaceholder: 'ชื่อ-นามสกุลของคุณ',
    email: 'อีเมล',
    emailPlaceholder: 'you@email.com',
    password: 'รหัสผ่าน',
    passwordPlaceholder: 'กรอกรหัสผ่าน',
    minChars: 'อย่างน้อย 6 ตัวอักษร',
    signingIn: 'กำลังเข้าสู่ระบบ...',
    creatingAccount: 'กำลังสร้างบัญชี...',
    signInBtn: 'เข้าสู่ระบบ',
    createAccountBtn: 'สร้างบัญชี',
    noAccount: 'ยังไม่มีบัญชี? สร้างบัญชีใหม่',
    hasAccount: 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ',
    accountCreated: 'สร้างบัญชีสำเร็จ',
    accountCreatedDesc: 'บัญชีของคุณถูกสร้างเรียบร้อยแล้ว กรุณาตรวจสอบอีเมลของคุณและคลิกลิงก์ยืนยัน เพื่อเปิดใช้งานบัญชี',
    goToSignIn: 'ไปหน้าเข้าสู่ระบบ',
    backToMarketplace: 'กลับไปหน้าหลัก',
  },
  drawer: {
    scientificFoundation: 'พื้นฐานทางวิทยาศาสตร์',
    modelConfidence: 'ความเชื่อมั่นของโมเดล',
    aiInsight: 'AI วิเคราะห์',
    aiInsightText: (cropName, citationCount, avgConfidence) =>
      `การปลูก${cropName}ได้รับการศึกษาอย่างกว้างขวางภายใต้สภาพแวดล้อมควบคุม (CEA) โมเดลจำลองรวมผลจาก ${citationCount} งานวิจัยที่ผ่านการตรวจสอบ ด้วยคะแนนความเชื่อมั่นรวม ${avgConfidence}% ความไวต่ออุณหภูมิเป็นปัจจัยหลักในการเจริญเติบโต`,
    aiVerified: 'AI ตรวจสอบแล้ว',
    manual: 'เพิ่มเอง',
    pendingReview: 'รอตรวจสอบ',
    feedbackOpen: 'ความคิดเห็นเปิด',
    open: 'เปิด',
    academicCitations: 'เอกสารอ้างอิงทางวิชาการ',
    reportIssueHint: 'กด "รายงานปัญหา" เพื่อแจ้งข้อผิดพลาด',
    noCitations: 'ไม่มีเอกสารอ้างอิงสำหรับพืชชนิดนี้',
    verified: 'ยืนยันแล้ว',
    confidence: 'ความเชื่อมั่น',
    openIssue: 'ปัญหาเปิด',
    openIssues: 'ปัญหาเปิด',
    reportIssue: 'รายงานปัญหา',
    issueReportedSuccess: 'รายงานปัญหาสำเร็จ',
    issueReportedDesc: 'AI จะคัดกรองอัตโนมัติ สามารถติดตามได้ในแดชบอร์ดปัญหา',
    whatTypeOfIssue: 'ปัญหาประเภทใด?',
    dataError: 'ข้อมูลผิดพลาด',
    scoreTooHigh: 'คะแนนสูงเกินไป',
    scoreTooLow: 'คะแนนต่ำเกินไป',
    outdated: 'ล้าสมัย',
    other: 'อื่นๆ',
    affectedField: 'ฟิลด์ที่ได้รับผลกระทบ',
    generalCitation: 'ทั่วไป (ทั้งเอกสาร)',
    title: 'ชื่อเรื่อง',
    authors: 'ผู้แต่ง',
    year: 'ปี',
    journal: 'วารสาร',
    summary: 'บทสรุป',
    confidenceScore: 'คะแนนความเชื่อมั่น',
    severity: 'ความรุนแรง',
    low: 'ต่ำ',
    medium: 'ปานกลาง',
    high: 'สูง',
    critical: 'วิกฤต',
    continueBtn: 'ถัดไป',
    describeIssue: 'อธิบายปัญหา',
    currentValue: 'ค่าปัจจุบัน',
    whatIsWrong: 'มีอะไรผิดพลาด? กรุณาระบุให้ชัดเจน...',
    suggestedCorrection: 'แนะนำการแก้ไข (ไม่บังคับ)',
    back: 'กลับ',
    almostDone: 'เกือบเสร็จแล้ว -- กรอกอีเมลของคุณ',
    type: 'ประเภท',
    submitReport: 'ส่งรายงาน',
    loginRequired: 'กรุณาเข้าสู่ระบบ',
    loginRequiredDesc: 'เข้าสู่ระบบเพื่อรายงานปัญหาเกี่ยวกับงานวิจัย',
    loginBtn: 'เข้าสู่ระบบ',
  },
  simControls: {
    resetToDay1: 'รีเซ็ตเป็นวันที่ 1',
  },
  currency: {
    perSqm: '/ตร.ม.',
    perSqmPerCycle: '/ตร.ม./รอบ',
    exchangeRate: 'อัตราแลกเปลี่ยน',
    liveRate: 'อัตราสดวันนี้',
  },
  dashboardNav: {
    papers: 'งานวิจัย',
    issues: 'ปัญหา',
    users: 'ผู้ใช้',
  },
  coffee: {
    buyMeCoffee: 'เลี้ยงกาแฟ',
    supportUs: 'สนับสนุนเรา',
    supportSubtitle: 'ซื้อกาแฟให้ทีมพัฒนา Farmbase',
    amount: 'จำนวนเงิน',
    scanToPay: 'สแกนเพื่อชำระ',
    promptPay: 'พร้อมเพย์',
    thankYou: 'ขอบคุณครับ!',
    thankYouDesc: 'การสนับสนุนของคุณช่วยให้เราพัฒนาต่อไปได้',
    customAmount: 'ระบุเอง',
    close: 'ปิด',
  },
  howItWorks: {
    title: "ระบบของ Farmbase ทำงานอย่างไร",
    subtitle: "แพลตฟอร์มแบบครบวงจรตั้งแต่การค้นคว้างานวิจัยไปจนถึงการปฏิบัติงานบนฟาร์มจริง",
    step1Title: "1. ศูนย์วิจัย AI",
    step1Desc: "ค้นหาพืชที่ให้ผลผลิตสูง อ้างอิงจากงานวิจัยที่ได้รับการรับรองจากทั่วโลก",
    step2Title: "2. Engineering Console",
    step2Desc: "สร้างแปลนโครงสร้าง 3 มิติ และระบบสภาพแวดล้อมที่เหมาะสมกับเป้าหมายผลผลิต",
    step3Title: "3. ระบบจัดซื้ออัจฉริยะ",
    step3Desc: "ลิสต์รายการวัสดุ (BOM) อัตโนมัติ เพื่อจัดหาและคำนวณต้นทุนการก่อสร้างได้อย่างรวดเร็ว",
    step4Title: "4. แฝดดิจิทัล (Digital Twin)",
    step4Desc: "ติดตามสถานะสภาพแวดล้อมจริงแบบเรียลไทม์ผ่านแดชบอร์ดเซิร์ฟเวอร์ IoT",
  },
  designLab: {
    backToDiscovery: 'กลับไปหน้าค้นหา',
    title: 'ห้องปฏิบัติการออกแบบพารามิเตอร์',
    facility: 'โรงเรือน',
    adjustYieldDesc: 'ปรับเป้าหมายผลผลิตของคุณเพื่อคำนวณขนาดโรงเรือนและวัสดุที่ต้องใช้อัตโนมัติ',
    targetYield: 'เป้าหมายผลผลิต (ต่อรอบ)',
    requiredArea: 'พื้นที่ที่ต้องการ',
    cyclesYear: 'จำนวนรอบ / ปี',
    requiredSystems: 'ระบบควบคุมที่ต้องมี',
    hvac: 'ระบบควบคุมอุณหภูมิ (HVAC)',
    maintainsTemp: 'รักษาอุณหภูมิที่',
    irrigation: 'ระบบให้น้ำแม่นยำ',
    targetRh: 'ความชื้นเป้าหมาย',
    growLights: 'ไฟปลูกพืช',
    ledSpectrum: 'ไฟ LED สเปกตรัม',
    liveMesh: 'พื้นที่โครงสร้างจำลอง',
    buildingFuture: 'กำลังสร้างนวัตกรรมอนาคต',
    exportBomDesc: 'คำนวณรายการวัสดุ (BOM) และโมเดล 3 มิติทันที',
    generateBom: 'สร้างรายการวัสดุ',
    generatedBom: 'รายการวัสดุที่คำนวณได้',
    totalCapex: 'งบประมาณการลงทุนคาดการณ์',
    saveAndCheckout: 'บันทึกแบบโรงเรือน & สั่งซื้อวัสดุ',
    loginRequired: 'กรุณาเข้าสู่ระบบเพื่อบันทึกและสั่งซื้อ',
    failedToConnect: 'ไม่สามารถเชื่อมต่อระบบ AI ได้',
    failedToSave: 'ไม่สามารถบันทึกการออกแบบได้',
  },
  procurement: {
    backToDiscovery: 'กลับไปหน้าค้นหา',
    title: 'สั่งซื้อวัสดุ (Smart Procurement)',
    savedDesigns: 'Saved Designs',
    savedDesignsDesc: 'ตรวจสอบ BOM จาก AI และสั่งซื้ออุปกรณ์โดยตรง',
    noSavedDesigns: 'คุณยังไม่ได้บันทึกการออกแบบใดๆ',
    estimatedCapex: 'งบลงทุนคาดการณ์',
    targetYield: 'เป้าหมายผลผลิต',
    footprint: 'พื้นที่ที่ต้องการ',
    confirmOrder: 'ยืนยันสั่งซื้อวัสดุ',
    processing: 'กำลังดำเนินการ...',
    orderSuccess: 'สำเร็จ! ออเดอร์กำลังดำเนินการ',
    orderFailed: 'ไม่สามารถดำเนินการสั่งซื้อได้',
  },
  operations: {
    backToProcurement: 'กลับไปหน้าสั่งซื้อ',
    title: 'ศูนย์ควบคุมปฎิบัติการ (Live Operations)',
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
    guideTitle: 'คู่มือประกอบโรงเรือน Plant Factory (4D)',
    guideSubtitle: 'ขั้นตอนการสร้างฟาร์มสตรอว์เบอร์รี Indoor สายพันธุ์ Tochiotome',
    phase1Title: 'ระยะที่ 1: ติดตั้งโครงสร้างและฉนวน (Isowall Setup)',
    phase1Desc: 'กั้นห้องด้วยแผ่นฉนวน Isowall หนายึดบล็อกความร้อน 100% เป็นพื้นฐานสำคัญในการทิ้งดิ่งอุณหภูมิกลางคืน (Temperature Swing) ให้เหลือ 10-12°C',
    phase2Title: 'ระยะที่ 2: ระบบ HVAC และควบคุมความชื้น (VPD Control)',
    phase2Desc: 'ติดตั้งแอร์แบบ Dual-system และ Dehumidifiers เพื่อรักษาระดับ VPD ที่ 0.3-1.2 kPa ตัดรอบวงจรเชื้อราเทา (Botrytis) ช่วงปลายทาง',
    phase3Title: 'ระยะที่ 3: ระบบแสงสว่างและรางปลูก (DLI Array)',
    phase3Desc: 'ติดตั้งไฟ LED Grow Light สเปกตรัมเฉพาะ (ตั้งเป้า DLI: 15-20 mol/m²/d ที่ความเข้มแสง 400-450 µmol) พร้อมระบบน้ำหยดเพื่อคุมปริมาณ EC',
    phase4Title: 'ระยะที่ 4: เชื่อมต่อ AI Node & Smart Grid',
    phase4Desc: 'เปิดให้ Farmbase AI เข้าคุม Smart Grid เพื่อโยกพลังงาน Solar มาใช้ทำความเย็น และเริ่มสั่งทำความเย็นแบบ Shift เพื่อสร้างความหวาน (Brix)',
    rhUnit: '% RH',
    umolUnit: 'μmol',
    facilitySelector: 'โรงเรือนที่ 1 (ตู้คอนเทนเนอร์หลัก)',
    aiAutoPilot: 'AI นำร่องอัตโนมัติ',
    aiActive: 'AI กำลังคุม',
    manualMode: 'โหมดตั้งค่าเอง (Manual)',
    currentValue: 'ค่าปัจจุบัน',
    status: 'สถานะ',
  },
  controlRoom: {
    projects: 'โปรเจกต์',
    newProject: 'โปรเจกต์ใหม่',
    monitoring: 'ตรวจสอบ',
    overview: 'ภาพรวม',
    energy: 'พลังงาน',
    bom: 'รายการวัสดุ',
    robotics: 'หุ่นยนต์',
    startSimulation: 'เริ่มจำลอง',
    stopSimulation: 'หยุดจำลอง',
    controlVersion: 'Farmbase Control v3.0',
    status: 'สถานะ',
    parametersInRange: 'พารามิเตอร์อยู่ในช่วง',
    noData: 'ไม่มีข้อมูล',
    healthy: 'ปกติ',
    alert: 'แจ้งเตือน',
    weather: 'สภาพอากาศ',
    loadingWeather: 'กำลังโหลดข้อมูลอากาศ...',
    cropCycle: 'รอบการปลูก',
    day: 'วันที่',
    phase: 'ระยะ',
    health: 'สุขภาพ',
    noActiveSimulation: 'ไม่มีการจำลองที่ใช้งานอยู่',
    realtimeParams: 'พารามิเตอร์แบบเรียลไทม์',
    parameter: 'พารามิเตอร์',
    current: 'ปัจจุบัน',
    targetRange: 'ช่วงเป้าหมาย',
    delta: 'ค่าเบี่ยงเบน',
    statusCol: 'สถานะ',
    ok: 'ปกติ',
    noSensorData: 'ไม่มีข้อมูลเซ็นเซอร์',
    noSensorDataHint: 'คลิก',
    clickStartSim: 'ที่แถบด้านข้าง หรือเชื่อมต่อ AI Engine ผ่าน WebSocket',
    robotTitle: 'หุ่นยนต์ — Franka Panda เก็บเกี่ยว',
    robot: 'หุ่นยนต์',
    vision: 'กล้อง',
    isaacSim: 'Isaac Sim',
    digitalTwin: 'แฝดดิจิทัล',
    standby: 'พร้อมใช้งาน',
    notConnected: 'ไม่ได้เชื่อมต่อ',
    simReady: 'พร้อมจำลอง',
    hilNotConnected: 'ไม่ได้เชื่อมต่อ Hardware-in-the-Loop',
    hilHint: 'รัน Isaac Sim ด้วย',
    temp: 'อุณหภูมิ',
    humidity: 'ความชื้น',
    co2: 'CO₂',
    ec: 'EC',
    ph: 'pH',
    ppfd: 'PPFD',
    vpd: 'VPD',
    clear: 'ท้องฟ้าแจ่มใส',
    partlyCloudy: 'มีเมฆบางส่วน',
    foggy: 'มีหมอก',
    rain: 'ฝนตก',
    storm: 'พายุ',
  },
  energyBom: {
    tabEnergy: '⚡ พลังงาน',
    tabEnergyDesc: 'ตรวจสอบการใช้ไฟฟ้า',
    tabBom: '📋 รายการวัสดุ',
    tabBomDesc: 'รายการวัสดุทั้งหมด',
    energyMonitor: '⚡ ตรวจสอบพลังงาน',
    live: 'LIVE',
    kwhToday: 'kWh วันนี้',
    kwhMonth: 'kWh/เดือน (คาด)',
    costMonth: 'ค่าไฟ/เดือน (คาด)',
    powerBreakdown: 'สัดส่วนการใช้พลังงาน',
    solarOffset: 'ชดเชยโซลาร์',
    solarSwitching: 'ไฟฟ้า → โซลาร์',
    optimize: '🎯 ปรับแต่ง',
    active: '✓ ใช้งานอยู่',
    save: 'ประหยัด',
    devicePower: '📊 กำลังไฟต่ออุปกรณ์',
    elecRateLabel: 'ค่าไฟ/unit:',
    elecRateUnit: 'บาท/kWh',
    bomTitle: '📋 รายการวัสดุ — Isaac Sim LOD 400',
    itemsEditable: 'รายการ · แก้ราคาได้',
    costByCategory: 'ต้นทุนตามหมวดหมู่',
    ecoMode: 'Eco Mode',
    ecoDesc: 'ลด LED photoperiod เหลือ 12 ชม., AC night setback',
    solarReady: 'Solar Ready',
    solarDesc: 'Shift pump/dosing ไปกลางวัน, peak shaving AC',
    nightShift: 'Night Shift',
    nightDesc: 'LED ทำงานตอนกลางคืน (ค่าไฟ TOU ถูกกว่า)',
  },
};


export const en: Translations = {
  header: {
    farmbase: 'Farmbase',
    farmingResearch: 'Learn to Farm',
    research: 'Research',
    scientificHub: 'Scientific Hub',
    signIn: 'Sign in',
    signOut: 'Sign out',
    dashboard: 'Dashboard',
  },
  hero: {
    title: 'What will you grow today?',
    subtitle: 'Simulate yields, predict costs, and build smart farms with precision AI.',
  },
  search: {
    placeholders: [
      'What do you want to grow?',
      'Search crops, profits, seasons...',
      'Find your next harvest...',
    ],
    suggestions: [
      'Most profitable crop this season',
      'Quick harvest under 30 days',
      'Best mushrooms for indoor farming',
      'Low-maintenance leafy greens',
      'High ROI winter crops',
    ],
    popularSearches: 'Popular searches',
  },
  tags: {
    summerHighROI: 'SummerHighROI',
    quickHarvest: 'QuickHarvest',
    mushrooms: 'Mushrooms',
    leafyGreens: 'LeafyGreens',
    highROI: 'HighROI',
    indoorFarming: 'IndoorFarming',
    winterCrops: 'WinterCrops',
    gourmet: 'Gourmet',
  },
  marketplace: {
    title: 'Research-Backed Crop Analysis',
    subtitle: 'Cost analysis with scientific projections',
    crops: 'crops',
    crop: 'crop',
    noResults: 'No crops match your search.',
    noResultsHint: 'Try different keywords or clear your filters.',
  },
  card: {
    days: 'Days',
    kgPerCycle: 'kg/cyc',
    aiCtrl: 'AI Ctrl',
    market: 'Market',
    cost: 'Cost',
    perCycle: 'per cycle',
    scientificFoundation: 'Scientific Foundation',
    peerReviewedStudy: 'peer-reviewed study',
    peerReviewedStudies: 'peer-reviewed studies',
    investAndStart: 'Start Growing',
    mushroom: 'Mushroom',
    leafyGreen: 'Leafy Green',
    herb: 'Herb',
    fruit: 'Fruit',
    vegetable: 'Vegetable',
    highDemand: 'High Demand',
    trending: 'Trending',
    stable: 'Stable',
    capexLabel: 'CAPEX',
    opexLabel: 'OPEX',
    aiConfidence: 'AI Confidence',
    researchBacked: 'Research-Backed',
    highConfidence: 'High Confidence',
    moderateConfidence: 'Moderate',
    lowConfidence: 'Low Confidence',
    studies: 'studies',
  },
  popover: {
    harvestDuration: 'Harvest Duration',
    harvestDurationDesc: 'Total days from planting to harvest under optimal environmental conditions.',
    projectedYield: 'Projected Yield',
    projectedYieldDesc: 'Absolute projected yield for a standard 10m\u00B2 growing setup under optimal conditions, factoring in crop health.',
    aiAutomation: 'AI Automation',
    aiAutomationDesc: 'Percentage of the growing process manageable by automated climate control. Higher = less manual intervention.',
    marketTrend: 'Market Trend',
    marketTrendDesc: 'Real-time demand indicator based on wholesale activity, seasonal patterns, and supply chain data.',
    growthRate: 'Growth Rate (r)',
    midpoint: 'Midpoint',
    maxHeight: 'Max Height',
    yieldPerSqm: 'Yield / m\u00B2',
    healthFactor: 'Health Factor',
    area: 'Area',
    total: 'Total',
    category: 'Category',
    indoorHigher: 'Indoor (higher)',
    mixed: 'Mixed',
    tempRange: 'Temp Range',
    demandIndex: 'Demand Index',
    pricePerKg: 'Price / kg',
    seasonality: 'Seasonality',
    formula: 'Formula',
    unitCm: 'cm',
    unitKg: 'kg',
    unitSqm: 'm\u00B2',
  },
  seasons: {
    winter: 'Winter',
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall',
    autumn: 'Autumn',
    'year-round': 'Year-round',
  },
  detail: {
    backToResearch: 'Back to Research',
    researchPapers: 'Research Papers',
    day: 'Day',
    costBreakdown: 'Cost Breakdown',
    totalCostPerCycle: 'Total Cost per Cycle',
    capitalExpenditure: 'Capital Expenditure',
    operatingExpenditure: 'Operating Expenditure',
    pricingComingSoon: 'Retail & wholesale pricing comparison across markets (Thailand, China, USA) coming soon.',
    farmPlanCreated: 'Farm Plan Created',
    executeToFarm: 'Execute to Farm',
    aiGrowingGuide: 'AI Growing Guide',
    costLabel: 'Cost',
    benefitSummary: 'Benefits & Properties',
    researchBacked: 'Research-backed',
  },
  stats: {
    height: 'Height',
    biomass: 'Biomass',
    perUnit: 'per unit',
    health: 'Health',
    optimal: 'Optimal',
    stressed: 'Stressed',
    critical: 'Critical',
  },
  guide: {
    prepareSubstrate: 'Prepare Substrate',
    prepareSubstrateDesc: 'Mix sawdust with rice bran or wheat straw. Hydrate to 65% moisture. Bag and sterilize at 121\u00B0C for 90 minutes.',
    inoculateIncubate: 'Inoculate & Incubate',
    inoculateIncubateDesc: 'Inoculate cooled substrate with spawn at 20-25% ratio. Seal bags and incubate at 22-25\u00B0C in darkness for full mycelial colonization.',
    initiateFruiting: 'Initiate Fruiting',
    initiatefruitingDesc: 'Move to fruiting chamber. Set temperature, humidity, and CO2 to optimal levels. Open bag tops for fresh air exchange.',
    monitorGrowth: 'Monitor Growth',
    monitorGrowthDesc: 'Maintain environmental conditions. Pins should appear within 3-5 days. Keep light at optimal levels. Mist walls (not mushrooms) to maintain humidity.',
    harvest: 'Harvest',
    harvestMushroomDesc: 'Harvest when caps begin to flatten but before spore drop. Cut at base in clusters. Expected yield:',
    startSeeds: 'Vegetative Growth',
    startSeedsDesc: 'Plant virus-free runners in Deep Water Culture. Set LEDs: Blue 90 + Red 250 + Far-red 50 µmol/m²/s at 18h photoperiod (Ries 2024). Use Yamazaki formula N77/P23/K116/Ca40 mg/L. Ensure uniform airflow 0.3-0.5 m/s via perforated PE ducts (Zhang & Kacira 2016). Monitor Na⁺ < 2 mmol/L for Bangpakong water (Giannothanasis 2024).',
    transplantSeedlings: 'Flower Induction',
    transplantSeedlingsDesc: 'Crown-cooling: cool only the crown to 20°C + short-day (8h) for 22 days. Works even at 30°C ambient — critical for tropical sites (Hidaka 2017). Alternatives: Kaburei continuous dark cold 5°C / Kanketsu-reizo intermittent cold cycles (Yamasaki 2020).',
    optimizeEnvironment: 'Flowering & Fruiting',
    optimizeEnvironmentDesc: 'Self-pollinate with VPD 2.06 kPa + 800Hz vibration to detach pollen, then 100Hz to attach to stigma — no bees needed (Liang 2025). Crop-local CO₂ enrichment at 800-1000 ppm increases yield by 22% (Hidaka 2022). EC 2.0-4.0 dS/m (AJCS 2025).',
    headFormation: 'Brix Boosting',
    headFormationDesc: 'Far-red 730nm (50 µmol/m²/s) increases Brix by 12% by upregulating fruit sugar transport genes and sink strength (Ries 2024). UV-C immediately after lights-off kills powdery mildew spores without chemicals (Suthaparan 2020). Maintain VPD > 0.8 kPa to prevent tip-burn (Bradfield 1979).',
    harvestVegetableDesc: 'Far-red extends peduncle length by 62%, improving robotic harvest detection (Ries 2024). First harvest Day 85-90. Pick every 3-4 days. Yield: 8.5 kg/m²/yr (Takahashi 2024). FR-LED boosts total fruit yield by 48%. Expected yield:',
    postHarvest: 'Post-Harvest Care',
    postHarvestDesc: 'Fruits: Pre-cool to 1-4°C within 1h. Store in MAP bags (Modified Atmosphere Packaging to reduce O₂ and elevate CO₂ to 15-20%) for 7-10 day shelf life (Priyadarshi 2024). Mother plants: Max lifespan 8-10 months. Once yield declines and runners emerge, propagate via Tray-plant method (Yamasaki 2020) — excise runners with 2-4 leaves into clean cell trays (yields 30-50 daughter plants/mother). Root them and store in a 2-5°C cold room (crown-cooling) to re-induce flowers for the next cycle.',
  },
  environment: {
    title: 'Environment Controls',
    live: 'LIVE',
    temperature: 'Temperature',
    humidity: 'Humidity',
    co2: 'CO2',
    light: 'Light',
    simulationDay: 'Simulation Day',
    optimal: 'OPT',
  },
  cropNames: {},
  auth: {
    welcomeBack: 'Welcome back',
    createAccount: 'Create your account',
    signInSubtitle: 'Sign in to access the full Farmbase platform',
    signUpSubtitle: 'Join Farmbase to track crops and access research',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Your full name',
    email: 'Email',
    emailPlaceholder: 'you@email.com',
    password: 'Password',
    passwordPlaceholder: 'Enter password',
    minChars: 'Min 6 characters',
    signingIn: 'Signing in...',
    creatingAccount: 'Creating account...',
    signInBtn: 'Sign in',
    createAccountBtn: 'Create account',
    noAccount: "Don't have an account? Create one",
    hasAccount: 'Already have an account? Sign in',
    accountCreated: 'Account created',
    accountCreatedDesc: 'Your account has been created successfully. Please check your inbox and click the confirmation link to verify your email.',
    goToSignIn: 'Go to sign in',
    backToMarketplace: 'Back to marketplace',
  },
  drawer: {
    scientificFoundation: 'Scientific Foundation',
    modelConfidence: 'Model Confidence',
    aiInsight: 'AI Insight',
    aiInsightText: (cropName, citationCount, avgConfidence) =>
      `${cropName} cultivation has been extensively studied under controlled environment agriculture (CEA) conditions. The simulation model integrates ${citationCount} peer-reviewed studies with a combined confidence score of ${avgConfidence}%. Temperature sensitivity is the primary growth determinant, with strict cold-fruiting requirements documented across multiple research groups.`,
    aiVerified: 'AI-verified',
    manual: 'manual',
    pendingReview: 'pending review',
    feedbackOpen: 'feedback open',
    open: 'open',
    academicCitations: 'Academic Citations',
    reportIssueHint: 'Click "Report Issue" to flag errors',
    noCitations: 'No citations available for this crop.',
    verified: 'Verified',
    confidence: 'confidence',
    openIssue: 'open issue',
    openIssues: 'open issues',
    reportIssue: 'Report Issue',
    issueReportedSuccess: 'Issue reported successfully',
    issueReportedDesc: 'AI will triage this automatically. You can track it in the Issues dashboard.',
    whatTypeOfIssue: 'What type of issue?',
    dataError: 'Data Error',
    scoreTooHigh: 'Score Too High',
    scoreTooLow: 'Score Too Low',
    outdated: 'Outdated',
    other: 'Other',
    affectedField: 'Affected Field',
    generalCitation: 'General (entire citation)',
    title: 'Title',
    authors: 'Authors',
    year: 'Year',
    journal: 'Journal',
    summary: 'Summary',
    confidenceScore: 'Confidence Score',
    severity: 'Severity',
    low: 'Low',
    medium: 'Med',
    high: 'High',
    critical: 'Crit',
    continueBtn: 'Continue',
    describeIssue: 'Describe the issue',
    currentValue: 'Current value',
    whatIsWrong: "What's wrong? Be as specific as possible...",
    suggestedCorrection: 'Suggested correction (optional)',
    back: 'Back',
    almostDone: 'Almost done -- just your email',
    type: 'Type',
    submitReport: 'Submit Report',
    loginRequired: 'Login Required',
    loginRequiredDesc: 'Sign in to report an issue about this research',
    loginBtn: 'Sign In',
  },
  simControls: {
    resetToDay1: 'Reset to Day 1',
  },
  currency: {
    perSqm: '/m\u00B2',
    perSqmPerCycle: '/m\u00B2/cycle',
    exchangeRate: 'Exchange Rate',
    liveRate: 'Live rate today',
  },
  dashboardNav: {
    papers: 'Papers',
    issues: 'Issues',
    users: 'Users',
  },
  coffee: {
    buyMeCoffee: 'Buy a Coffee',
    supportUs: 'Support Us',
    supportSubtitle: 'Buy the Farmbase team a coffee',
    amount: 'Amount',
    scanToPay: 'Scan to Pay',
    promptPay: 'PromptPay',
    thankYou: 'Thank you!',
    thankYouDesc: 'Your support helps us keep building',
    customAmount: 'Custom',
    close: 'Close',
  },
  howItWorks: {
    title: "How Farmbase Works",
    subtitle: "An end-to-end platform from scientific discovery to live operations.",
    step1Title: "1. AI Research Hub",
    step1Desc: "Discover high-yield crops backed by peer-reviewed research.",
    step2Title: "2. Engineering Console",
    step2Desc: "Generate precision 3D BRep models with CadQuery for structural engineering.",
    step3Title: "3. Smart Procurement",
    step3Desc: "Automatically source materials and generate precise Bills of Materials.",
    step4Title: "4. Digital Twin",
    step4Desc: "Monitor live operations with simulated IoT sensor telemetry.",
  },
  designLab: {
    backToDiscovery: 'Back to Discovery',
    title: 'Parametric Design Lab',
    facility: 'Facility',
    adjustYieldDesc: 'Adjust your target yield to automatically scale the facility dimensions and materials.',
    targetYield: 'Target Yield (per cycle)',
    requiredArea: 'Required Area',
    cyclesYear: 'Cycles / Year',
    requiredSystems: 'Required Active Systems',
    hvac: 'HVAC Climate Control',
    maintainsTemp: 'Maintains',
    irrigation: 'Precision Irrigation',
    targetRh: 'Target',
    growLights: 'Grow Lights',
    ledSpectrum: 'LED Spectrum',
    liveMesh: 'Live Mesh',
    buildingFuture: 'Wait, Building the Future',
    exportBomDesc: 'Export Bill of Materials & IFC Structural model instantly.',
    generateBom: 'Generate BOM',
    generatedBom: 'Generated Bill of Materials',
    totalCapex: 'Total Estimated Capex',
    saveAndCheckout: 'Save Facility Design & Checkout',
    loginRequired: 'Please log in to save and procure designs.',
    failedToConnect: 'Failed to connect to AI Engine. Please check if FastAPI is running locally on port 8000.',
    failedToSave: 'Failed to save design to database.',
  },
  procurement: {
    backToDiscovery: 'Back to Discovery',
    title: 'Smart Procurement',
    savedDesigns: 'Saved Designs',
    savedDesignsDesc: 'Review your AI-generated BOM and source hardware directly.',
    noSavedDesigns: "You haven't saved any parametric designs yet.",
    estimatedCapex: 'ESTIMATED CAPEX',
    targetYield: 'TARGET YIELD',
    footprint: 'FOOTPRINT',
    confirmOrder: 'Confirm Order',
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
    guideTitle: 'Plant Factory Assembly Guide (4D)',
    guideSubtitle: 'Construction steps for Tochiotome Indoor Strawberry Farm.',
    phase1Title: 'Phase 1: Structure & Isowall Insulation',
    phase1Desc: 'Erect 100% sealed Isowall panels to block external heat. This is critical for executing aggressive night-time temperature swings (10-12°C).',
    phase2Title: 'Phase 2: HVAC & VPD Management',
    phase2Desc: 'Install Air Conditioning and Dehumidifiers to maintain VPD between 0.3-1.2 kPa, effectively preventing Botrytis and Tipburn.',
    phase3Title: 'Phase 3: LED Array & Hydroponics',
    phase3Desc: 'Install precise LED lighting for a 15-16h photoperiod (Target DLI: 15-20 mol/m²/d at 400-450 µmol) and drip irrigation systems for EC control.',
    phase4Title: 'Phase 4: AI Telemetry & Smart Grid',
    phase4Desc: 'Farmbase AI takes over to balance Solar BESS usage, automate day/night temperature swings for Brix enhancement, and track live telemetry.',
    rhUnit: '% RH',
    umolUnit: 'μmol',
    facilitySelector: 'Facility 1 (Main Container)',
    aiAutoPilot: 'AI Auto-Pilot',
    aiActive: 'AI Active',
    manualMode: 'Manual Mode',
    currentValue: 'Current',
    status: 'Status',
  },
  controlRoom: {
    projects: 'Projects',
    newProject: 'New Project',
    monitoring: 'Monitoring',
    overview: 'Overview',
    energy: 'Energy',
    bom: 'Bill of Materials',
    robotics: 'Robotics',
    startSimulation: 'Start Simulation',
    stopSimulation: 'Stop Simulation',
    controlVersion: 'Farmbase Control v3.0',
    status: 'Status',
    parametersInRange: 'parameters in range',
    noData: 'NO DATA',
    healthy: 'HEALTHY',
    alert: 'ALERT',
    weather: 'Weather',
    loadingWeather: 'Loading weather data...',
    cropCycle: 'Crop Cycle',
    day: 'Day',
    phase: 'phase',
    health: 'Health',
    noActiveSimulation: 'No active simulation',
    realtimeParams: 'Real-time Parameters',
    parameter: 'Parameter',
    current: 'Current',
    targetRange: 'Target Range',
    delta: 'Delta',
    statusCol: 'Status',
    ok: 'OK',
    noSensorData: 'No sensor data available',
    noSensorDataHint: 'Click',
    clickStartSim: 'in the sidebar or connect the AI Engine via WebSocket.',
    robotTitle: 'Robotics — Franka Panda Harvester',
    robot: 'Robot',
    vision: 'Vision',
    isaacSim: 'Isaac Sim',
    digitalTwin: 'Digital Twin',
    standby: 'STANDBY',
    notConnected: 'NOT CONNECTED',
    simReady: 'SIM READY',
    hilNotConnected: 'Hardware-in-the-Loop bridge not connected',
    hilHint: 'Run Isaac Sim with',
    temp: 'Temperature',
    humidity: 'Humidity',
    co2: 'CO₂',
    ec: 'EC',
    ph: 'pH',
    ppfd: 'PPFD',
    vpd: 'VPD',
    clear: 'Clear',
    partlyCloudy: 'Partly cloudy',
    foggy: 'Foggy',
    rain: 'Rain',
    storm: 'Storm',
  },
  energyBom: {
    tabEnergy: '⚡ Energy',
    tabEnergyDesc: 'Power Monitor',
    tabBom: '📋 BOM',
    tabBomDesc: 'Bill of Materials',
    energyMonitor: '⚡ Energy Monitor',
    live: 'LIVE',
    kwhToday: 'kWh today',
    kwhMonth: 'kWh/month (est)',
    costMonth: 'Cost/month (est)',
    powerBreakdown: 'Power Breakdown',
    solarOffset: 'Solar Offset',
    solarSwitching: 'Grid → Solar switching',
    optimize: '🎯 Optimize',
    active: '✓ Active',
    save: 'Save',
    devicePower: '📊 Device Power',
    elecRateLabel: 'Rate/unit:',
    elecRateUnit: 'THB/kWh',
    bomTitle: '📋 Bill of Materials — Isaac Sim LOD 400',
    itemsEditable: 'items · editable prices',
    costByCategory: 'Cost by Category',
    ecoMode: 'Eco Mode',
    ecoDesc: 'Reduce LED photoperiod to 12h, AC night setback',
    solarReady: 'Solar Ready',
    solarDesc: 'Shift pump/dosing to daytime, peak shaving AC',
    nightShift: 'Night Shift',
    nightDesc: 'LED runs at night (cheaper TOU electricity)',
  },
};

