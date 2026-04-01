import type { Locale } from './translations';

export interface DashboardStrings {
  dashboardLabel: string;
  papersManagement: string;
  papersManagementDesc: string;
  addPaper: string;
  totalPapers: string;
  aiResearching: string;
  readyToReview: string;
  approved: string;
  rejected: string;
  all: string;
  noPapersFound: string;
  addPaperToStart: string;
  adjustFilters: string;
  addFirstPaper: string;
  userManagement: string;
  userManagementDesc: string;
  issueTracker: string;
  issueTrackerDesc: string;
  totalIssues: string;
  open: string;
  aiTriaged: string;
  reviewing: string;
  resolved: string;
  dismissed: string;
  searchIssues: string;
  newest: string;
  oldest: string;
  severity: string;
  noIssuesFound: string;
  issuesWillAppear: string;
  queued: string;
  error: string;
  untitledPaper: string;
  unknownAuthors: string;
  currentValue: string;
  suggested: string;
  aiAnalysis: string;
  confidence: string;
  recommendation: string;
  resolve: string;
  dismiss: string;
  resolveIssue: string;
  dismissIssue: string;
  howResolved: string;
  reasonForDismissal: string;
  confirmResolution: string;
  confirmDismiss: string;
  cancel: string;
  noNotes: string;
  by: string;
  mAgo: string;
  hAgo: string;
  dAgo: string;
  dataError: string;
  missingInfo: string;
  wrongCrop: string;
  confidenceTooHigh: string;
  confidenceTooLow: string;
  outdated: string;
  other: string;
  low: string;
  medium: string;
  high: string;
  critical: string;
  pending: string;
  added: string;
  ai: string;
  review: string;
  live: string;
  papers: string;
  ofTotal: string;
  issues: string;
  issuesOf: string;
  searchPapers: string;
  allCrops: string;
  navPapers: string;
  navIssues: string;
  navUsers: string;
}

const thDashboard: DashboardStrings = {
  dashboardLabel: 'แดชบอร์ด',
  papersManagement: 'จัดการงานวิจัย',
  papersManagementDesc: 'จัดการเอกสารวิจัยที่ AI วิเคราะห์และตรวจสอบ',
  addPaper: 'เพิ่มงานวิจัย',
  totalPapers: 'งานวิจัยทั้งหมด',
  aiResearching: 'AI กำลังวิเคราะห์',
  readyToReview: 'พร้อมตรวจสอบ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธ',
  all: 'ทั้งหมด',
  noPapersFound: 'ไม่พบงานวิจัย',
  addPaperToStart: 'เพิ่มงานวิจัยเพื่อเริ่มต้น',
  adjustFilters: 'ลองปรับตัวกรอง',
  addFirstPaper: 'เพิ่มงานวิจัยแรก',
  userManagement: 'จัดการผู้ใช้',
  userManagementDesc: 'จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง',
  issueTracker: 'ติดตามปัญหา',
  issueTrackerDesc: 'จัดการปัญหาจากการตรวจสอบเอกสารอ้างอิงและความคิดเห็น',
  totalIssues: 'ปัญหาทั้งหมด',
  open: 'เปิด',
  aiTriaged: 'AI คัดกรอง',
  reviewing: 'กำลังตรวจสอบ',
  resolved: 'แก้ไขแล้ว',
  dismissed: 'ยกเลิก',
  searchIssues: 'ค้นหาปัญหา...',
  newest: 'ล่าสุด',
  oldest: 'เก่าสุด',
  severity: 'ความรุนแรง',
  noIssuesFound: 'ไม่พบปัญหา',
  issuesWillAppear: 'ปัญหาจากการตรวจสอบจะแสดงที่นี่',
  queued: 'รอคิว',
  error: 'ข้อผิดพลาด',
  untitledPaper: 'ไม่มีชื่อ',
  unknownAuthors: 'ไม่ทราบผู้แต่ง',
  currentValue: 'ค่าปัจจุบัน',
  suggested: 'แนะนำ',
  aiAnalysis: 'AI วิเคราะห์',
  confidence: 'ความเชื่อมั่น',
  recommendation: 'คำแนะนำ',
  resolve: 'แก้ไข',
  dismiss: 'ยกเลิก',
  resolveIssue: 'แก้ไขปัญหา',
  dismissIssue: 'ยกเลิกปัญหา',
  howResolved: 'แก้ไขอย่างไร?',
  reasonForDismissal: 'เหตุผลที่ยกเลิก...',
  confirmResolution: 'ยืนยันการแก้ไข',
  confirmDismiss: 'ยืนยันการยกเลิก',
  cancel: 'ยกเลิก',
  noNotes: 'ไม่มีบันทึก',
  by: 'โดย',
  mAgo: ' นาทีที่แล้ว',
  hAgo: ' ชม.ที่แล้ว',
  dAgo: ' วันที่แล้ว',
  dataError: 'ข้อมูลผิดพลาด',
  missingInfo: 'ข้อมูลไม่ครบ',
  wrongCrop: 'พืชผิด',
  confidenceTooHigh: 'ความเชื่อมั่นสูงเกิน',
  confidenceTooLow: 'ความเชื่อมั่นต่ำเกิน',
  outdated: 'ล้าสมัย',
  other: 'อื่นๆ',
  low: 'ต่ำ',
  medium: 'ปานกลาง',
  high: 'สูง',
  critical: 'วิกฤต',
  pending: 'รอดำเนินการ',
  added: 'เพิ่มแล้ว',
  ai: 'AI',
  review: 'ตรวจสอบ',
  live: 'เผยแพร่',
  papers: 'งานวิจัย',
  ofTotal: 'จาก',
  issues: 'ปัญหา',
  issuesOf: 'จาก',
  searchPapers: 'ค้นหางานวิจัย...',
  allCrops: 'พืชทั้งหมด',
  navPapers: 'งานวิจัย',
  navIssues: 'ปัญหา',
  navUsers: 'ผู้ใช้',
};

const enDashboard: DashboardStrings = {
  dashboardLabel: 'Dashboard',
  papersManagement: 'Papers Management',
  papersManagementDesc: 'Manage AI-analyzed and reviewed research papers',
  addPaper: 'Add Paper',
  totalPapers: 'Total Papers',
  aiResearching: 'AI Researching',
  readyToReview: 'Ready to Review',
  approved: 'Approved',
  rejected: 'Rejected',
  all: 'All',
  noPapersFound: 'No papers found',
  addPaperToStart: 'Add a paper to start AI research',
  adjustFilters: 'Try adjusting your filters',
  addFirstPaper: 'Add your first paper',
  userManagement: 'User Management',
  userManagementDesc: 'Manage team members and their access levels',
  issueTracker: 'Issue Tracker',
  issueTrackerDesc: 'Manage reported issues from citation reviews and community feedback',
  totalIssues: 'Total Issues',
  open: 'Open',
  aiTriaged: 'AI Triaged',
  reviewing: 'Reviewing',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
  searchIssues: 'Search issues...',
  newest: 'Newest',
  oldest: 'Oldest',
  severity: 'Severity',
  noIssuesFound: 'No issues found',
  issuesWillAppear: 'Issues reported from citation reviews will appear here',
  queued: 'Queued',
  error: 'Error',
  untitledPaper: 'Untitled Paper',
  unknownAuthors: 'Unknown authors',
  currentValue: 'Current Value',
  suggested: 'Suggested',
  aiAnalysis: 'AI Analysis',
  confidence: 'confidence',
  recommendation: 'Recommendation',
  resolve: 'Resolve',
  dismiss: 'Dismiss',
  resolveIssue: 'Resolve Issue',
  dismissIssue: 'Dismiss Issue',
  howResolved: 'How was this resolved?',
  reasonForDismissal: 'Reason for dismissal...',
  confirmResolution: 'Confirm Resolution',
  confirmDismiss: 'Confirm Dismiss',
  cancel: 'Cancel',
  noNotes: 'No notes',
  by: 'by',
  mAgo: 'm ago',
  hAgo: 'h ago',
  dAgo: 'd ago',
  dataError: 'Data Error',
  missingInfo: 'Missing Info',
  wrongCrop: 'Wrong Crop',
  confidenceTooHigh: 'Confidence Too High',
  confidenceTooLow: 'Confidence Too Low',
  outdated: 'Outdated',
  other: 'Other',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
  pending: 'Pending',
  added: 'Added',
  ai: 'AI',
  review: 'Review',
  live: 'Live',
  papers: 'papers',
  ofTotal: 'of',
  issues: 'issues',
  issuesOf: 'of',
  searchPapers: 'Search papers...',
  allCrops: 'All Crops',
  navPapers: 'Papers',
  navIssues: 'Issues',
  navUsers: 'Users',
};

const dashboardMap: Record<Locale, DashboardStrings> = { th: thDashboard, en: enDashboard };

export function getDashboardStrings(locale: Locale): DashboardStrings {
  return dashboardMap[locale];
}
