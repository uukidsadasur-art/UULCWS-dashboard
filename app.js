// State Management
let state = {
  viewMode: 'daily', // daily, weekly, monthly, yearly
  activeTab: 'overview', // overview, ww, water
  startDate: '2026-01-01',
  endDate: '2026-01-01',
  currentCalYear: 2026,
  currentCalMonth: 0, // 0-indexed (January)
  tempStartDate: null,
  tempEndDate: null,
  showDataLabels: false,
  dataSource: 'preloaded',
  liveUrl: '',
  allData: [],
  wwQualSelected: ['cod_sump', 'cod_post'],
  waterQualSelected: ['turb_raw', 'turb_tap', 'ph_raw', 'ph_tap', 'chlorine'],
  wwQualScope: 'month',      // 'filter' | 'month'
  waterQualScope: 'month',   // 'filter' | 'month'
  wwQualDisplay: 'both',     // 'both' | 'table' | 'chart'
  waterQualDisplay: 'both',  // 'both' | 'table' | 'chart'
  wwQtyMode: 'normal',       // 'normal' | 'month_avg'
  waterQtyMode: 'normal',    // 'normal' | 'month_avg'
  rawQtyMode: 'normal',      // 'normal' | 'month_avg'
  chartTypes: {
    'chart-ww-qty': 'bar',
    'chart-ww-qual-compare': 'bar',
    'chart-cod-sump': 'bar',
    'chart-cod-post': 'bar',
    'chart-water-qty': 'bar',
    'chart-raw-intake': 'bar',
    'chart-water-qual-compare': 'bar',
    'chart-ph-raw': 'line'
  }
};

// Water Quality Parameters Metadata (Separated for Wastewater & Tap Water)
const WW_QUAL_PARAMS = [
  {
    key: 'cod_sump',
    label: 'ค่า COD บ่อ Collecting Sump',
    shortLabel: 'COD Collecting Sump',
    unit: 'mg/L',
    decimals: 1,
    color: '#d97706',
    stdText: 'เกณฑ์ ≤ 750 mg/L',
    isOk: (v) => v <= 750
  },
  {
    key: 'cod_post',
    label: 'ค่า COD บ่อ Post Aeration (Lab)',
    shortLabel: 'COD Post Aeration (Lab)',
    unit: 'mg/L',
    decimals: 1,
    color: '#059669',
    stdText: 'เกณฑ์ ≤ 120 mg/L',
    isOk: (v) => v <= 120
  },
  {
    key: 'cod_online',
    label: 'ค่า COD Online (Post Aeration)',
    shortLabel: 'COD Online (Post)',
    unit: 'mg/L',
    decimals: 1,
    color: '#2563eb',
    stdText: 'เกณฑ์ ≤ 120 mg/L',
    isOk: (v) => v <= 120
  },
  {
    key: 'bod_online',
    label: 'ค่า BOD Online (Post Aeration)',
    shortLabel: 'BOD Online (Post)',
    unit: 'mg/L',
    decimals: 1,
    color: '#7c3aed',
    stdText: 'เกณฑ์ ≤ 20 mg/L',
    isOk: (v) => v <= 20
  }
];

const WATER_QUAL_PARAMS = [
  {
    key: 'turb_raw',
    label: 'ความขุ่น น้ำดิบ',
    shortLabel: 'ความขุ่น น้ำดิบ',
    unit: 'NTU',
    decimals: 2,
    color: '#0d9488',
    stdText: 'หน่วย NTU',
    isOk: null
  },
  {
    key: 'turb_tap',
    label: 'ความขุ่น น้ำประปา',
    shortLabel: 'ความขุ่น น้ำประปา',
    unit: 'NTU',
    decimals: 2,
    color: '#0284c7',
    stdText: 'เกณฑ์ ≤ 4.0 NTU',
    isOk: (v) => v <= 4.0
  },
  {
    key: 'ph_raw',
    label: 'ค่า pH น้ำดิบ',
    shortLabel: 'pH น้ำดิบ',
    unit: 'pH',
    decimals: 2,
    color: '#6366f1',
    stdText: 'เกณฑ์ 6.0 - 9.0',
    isOk: (v) => v >= 6.0 && v <= 9.0
  },
  {
    key: 'ph_tap',
    label: 'ค่า pH น้ำประปา',
    shortLabel: 'pH น้ำประปา',
    unit: 'pH',
    decimals: 2,
    color: '#2563eb',
    stdText: 'เกณฑ์ 6.5 - 8.5',
    isOk: (v) => v >= 6.5 && v <= 8.5
  },
  {
    key: 'chlorine',
    label: 'คลอรีนคงเหลือ น้ำประปา',
    shortLabel: 'คลอรีน น้ำประปา',
    unit: 'mg/L',
    decimals: 2,
    color: '#10b981',
    stdText: 'เกณฑ์ 0.2 - 2.0 mg/L',
    isOk: (v) => v >= 0.2 && v <= 2.0
  }
];

// Global Chart instances
let charts = {};

// Constant standards
const STANDARDS = {
  wwMinContract: 4300,
  wMinContract: 4800,
  codSumpMax: 750,
  codPostMax: 120,
  phMin: 6,
  phMax: 9
};

// Month Names in Thai (Short versions for minimalist look)
const THAI_MONTHS_SHORT = {
  '01': 'ม.ค.', '02': 'ก.พ.', '03': 'มี.ค.', '04': 'เม.ย.',
  '05': 'พ.ค.', '06': 'มิ.ย.', '07': 'ก.ค.', '08': 'ส.ค.',
  '09': 'ก.ย.', '10': 'ต.ค.', '11': 'พ.ย.', '12': 'ธ.ค.'
};

const THAI_MONTHS_FULL = {
  '01': 'มกราคม', '02': 'กุมภาพันธ์', '03': 'มีนาคม', '04': 'เมษายน',
  '05': 'พฤษภาคม', '06': 'มิถุนายน', '07': 'กรกฎาคม', '08': 'สิงหาคม',
  '09': 'กันยายน', '10': 'ตุลาคม', '11': 'พฤศจิกายน', '12': 'ธันวาคม'
};

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
  initUI();
  setupEventListeners();
  initData();
});

const SHEET_ID = '1XWht8w-kyG-eKhwNILd9wK9snNwHAjmH7aR7Y-25uA0';
const SHEET_QTY_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('ข้อมูลปริมาณน้ำ')}`;
const SHEET_QUAL_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('คุณภาพน้ำ')}`;

// 1. Data Loading
function initData() {
  const savedUrl = localStorage.getItem('uulcws_live_url');
  const savedSource = localStorage.getItem('uulcws_data_source');
  
  if (savedUrl) {
    state.liveUrl = savedUrl;
    document.getElementById('input-live-url').value = savedUrl;
  }
  if (savedSource) {
    state.dataSource = savedSource;
  } else {
    state.dataSource = 'live'; // Default to live auto sheet
  }

  updateSourceToggleUI();

  if (state.dataSource === 'live') {
    if (state.liveUrl) {
      fetchLiveData();
    } else {
      fetchAutoGoogleSheet();
    }
  } else {
    usePreloadedData();
  }
}

function usePreloadedData() {
  if (typeof WATER_DATA !== 'undefined') {
    state.allData = WATER_DATA;
    showToast('โหลดข้อมูลออฟไลน์เรียบร้อย', 'success');
    processDataAndRender();
  } else {
    showToast('ไม่พบข้อมูลตัวอย่าง กรุณาเชื่อมต่อ Google Sheets API', 'error');
  }
}

function parseSheetIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  if (url.match(/^[a-zA-Z0-9-_]{40,50}$/)) return url;
  return null;
}

function fetchLiveData() {
  if (!state.liveUrl) {
    showToast('กรุณาระบุลิงก์ Google Sheets หรือ Web App URL ในเมนูตั้งค่า', 'error');
    setDataSource('preloaded');
    return;
  }

  const sheetId = parseSheetIdFromUrl(state.liveUrl);
  if (sheetId) {
    fetchAutoGoogleSheet(sheetId);
    return;
  }

  // Otherwise, treat as Apps Script Web App JSON URL
  document.getElementById('loader').style.display = 'flex';
  document.getElementById('loader').querySelector('span').textContent = 'กำลังโหลดข้อมูลสดจาก Google Apps Script...';
  
  fetch(state.liveUrl)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(data => {
      if (data.error) throw new Error(data.error);
      if (!Array.isArray(data) || data.length === 0) throw new Error('Data format is invalid or empty');
      
      state.allData = data;
      showToast('ดึงข้อมูลสดผ่าน Apps Script สำเร็จ', 'success');
      processDataAndRender();
    })
    .catch(err => {
      console.error(err);
      showToast('ดึงข้อมูลผิดพลาด: ' + err.message + ' (กำลังใช้ข้อมูลตัวอย่างแทน)', 'error');
      setDataSource('preloaded');
    })
    .finally(() => {
      document.getElementById('loader').style.display = 'none';
    });
}

// Automatic Google Sheet direct fetch & CSV parse
async function fetchAutoGoogleSheet(customSheetId) {
  const activeSheetId = customSheetId || SHEET_ID;
  const qtyUrl = `https://docs.google.com/spreadsheets/d/${activeSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('ข้อมูลปริมาณน้ำ')}`;
  const qualUrl = `https://docs.google.com/spreadsheets/d/${activeSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('คุณภาพน้ำ')}`;

  document.getElementById('loader').style.display = 'flex';
  document.getElementById('loader').querySelector('span').textContent = 'กำลังโหลดข้อมูลสดจาก Google Sheet...';
  
  try {
    const qtyRes = await fetch(qtyUrl);
    if (!qtyRes.ok) throw new Error('ไม่สามารถเข้าถึงแผ่นงานข้อมูลปริมาณน้ำได้ (โปรดตรวจสอบการตั้งค่าแชร์แผ่นงานให้เป็นสาธารณะ)');
    const qtyText = await qtyRes.text();
    const qtyRows = parseCSV(qtyText);
    
    const qualRes = await fetch(qualUrl);
    if (!qualRes.ok) throw new Error('ไม่สามารถเข้าถึงแผ่นงานข้อมูลคุณภาพน้ำได้ (โปรดตรวจสอบการตั้งค่าแชร์แผ่นงานให้เป็นสาธารณะ)');
    const qualText = await qualRes.text();
    const qualRows = parseCSV(qualText);
    
    // Find Date Column dynamically in Quantity sheet (Self-healing offset)
    let qtyDateColIdx = -1;
    for (let i = 4; i < qtyRows.length; i++) {
      const row = qtyRows[i];
      for (let j = 0; j < row.length; j++) {
        if (parseCSVDate(row[j])) {
          qtyDateColIdx = j;
          break;
        }
      }
      if (qtyDateColIdx !== -1) break;
    }
    if (qtyDateColIdx === -1) qtyDateColIdx = 1; // Fallback to column B
    const qtyOffset = qtyDateColIdx - 1;
    
    // Find Date Column dynamically in Quality sheet
    let qualDateColIdx = -1;
    for (let i = 7; i < qualRows.length; i++) {
      const row = qualRows[i];
      for (let j = 0; j < row.length; j++) {
        if (parseCSVDate(row[j])) {
          qualDateColIdx = j;
          break;
        }
      }
      if (qualDateColIdx !== -1) break;
    }
    if (qualDateColIdx === -1) qualDateColIdx = 1; // Fallback to column B
    const qualOffset = qualDateColIdx - 1;
    
    const records = {};
    
    // Parse Quantity (start from row index 4, i.e., Row 5 in Sheet)
    for (let i = 4; i < qtyRows.length; i++) {
      const row = qtyRows[i];
      if (!row || row.length <= qtyDateColIdx) continue;
      const dateStr = parseCSVDate(row[qtyDateColIdx]);
      if (!dateStr) continue;
      
      records[dateStr] = {
        date: dateStr,
        ww_qty_p1: parseCSVNum(row[3 + qtyOffset]),      // Col D
        ww_qty_p2: parseCSVNum(row[5 + qtyOffset]),      // Col F
        ww_qty_total: parseCSVNum(row[6 + qtyOffset]),   // Col G
        ww_qty_min: parseCSVNum(row[7 + qtyOffset]),     // Col H
        w_qty_p100: parseCSVNum(row[10 + qtyOffset]),    // Col K
        w_qty_p150: parseCSVNum(row[12 + qtyOffset]),    // Col M
        w_qty_total: parseCSVNum(row[13 + qtyOffset]),   // Col N
        w_qty_min: parseCSVNum(row[14 + qtyOffset]),     // Col O
        raw_qty_p1: parseCSVNum(row[17 + qtyOffset]),    // Col R
        raw_qty_p2: parseCSVNum(row[19 + qtyOffset]),    // Col T
        raw_qty_p3: parseCSVNum(row[21 + qtyOffset]),    // Col V
        raw_qty_total: parseCSVNum(row[22 + qtyOffset]), // Col W
        water_loss_pct: parseCSVNum(row[29 + qtyOffset]) // Col AD
      };
      
      // Cap negative quantities at null
      const qtyKeys = ['ww_qty_p1', 'ww_qty_p2', 'ww_qty_total', 'w_qty_p100', 'w_qty_p150', 'w_qty_total', 'raw_qty_p1', 'raw_qty_p2', 'raw_qty_p3', 'raw_qty_total', 'water_loss_pct'];
      qtyKeys.forEach(k => {
        if (records[dateStr][k] !== null && records[dateStr][k] < 0) {
          records[dateStr][k] = null;
        }
      });
    }
    
    // Parse Quality (start from row index 7, i.e., Row 8 in Sheet)
    for (let i = 7; i < qualRows.length; i++) {
      const row = qualRows[i];
      if (!row || row.length <= qualDateColIdx) continue;
      const dateStr = parseCSVDate(row[qualDateColIdx]);
      if (!dateStr || !records[dateStr]) continue;
      
      records[dateStr].turb_raw = parseCSVNum(row[2 + qualOffset]);   // Col C
      records[dateStr].turb_tap = parseCSVNum(row[3 + qualOffset]);   // Col D
      records[dateStr].chlorine = parseCSVNum(row[4 + qualOffset]);   // Col E
      records[dateStr].ph_raw = parseCSVNum(row[5 + qualOffset]);     // Col F
      records[dateStr].ph_tap = parseCSVNum(row[6 + qualOffset]);     // Col G
      records[dateStr].cod_sump = parseCSVNum(row[7 + qualOffset]);    // Col H
      records[dateStr].cod_post = parseCSVNum(row[8 + qualOffset]);    // Col I
      records[dateStr].cod_online = parseCSVNum(row[9 + qualOffset]);  // Col J
      records[dateStr].bod_online = parseCSVNum(row[10 + qualOffset]); // Col K
    }
    
    // Convert to sorted array
    const list = Object.keys(records).map(k => {
      const r = records[k];
      if (r.turb_raw === undefined) {
        r.turb_raw = null; r.turb_tap = null; r.chlorine = null;
        r.ph_raw = null; r.ph_tap = null; r.cod_sump = null;
        r.cod_post = null; r.cod_online = null; r.bod_online = null;
      }
      return r;
    });
    
    list.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (list.length === 0) throw new Error('ไม่พบแถวข้อมูลวันที่ถูกต้องในไฟล์ชีต');
    
    state.allData = list;
    state.dataSource = 'live';
    updateSourceToggleUI();
    showToast('เชื่อมโยงอัปเดตข้อมูลสดอัตโนมัติสำเร็จ', 'success');
    processDataAndRender();
  } catch (err) {
    console.error('Auto Sheet Fetch failed:', err);
    showToast('เชื่อมโยงชีตไม่สำเร็จ: ' + err.message, 'error');
    state.dataSource = 'preloaded';
    usePreloadedData();
  } finally {
    document.getElementById('loader').style.display = 'none';
  }
}

function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let entry = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && next === '"') {
        entry += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(entry);
      entry = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(entry);
      lines.push(row);
      row = [];
      entry = '';
    } else {
      entry += char;
    }
  }
  if (entry || row.length > 0) {
    row.push(entry);
    lines.push(row);
  }
  return lines;
}

function parseCSVDate(val) {
  if (!val) return null;
  let str = String(val).trim();
  const match = str.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (match) {
    const y = parseInt(match[1]);
    const m = String(parseInt(match[2]) + 1).padStart(2, '0');
    const d = String(parseInt(match[3])).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;
  
  const parts = str.split('/');
  if (parts.length === 3) {
    let p0 = parseInt(parts[0]);
    let p1 = parseInt(parts[1]);
    let y = parseInt(parts[2]);
    if (y < 100) {
      if (y >= 60) {
        y = 2500 + y - 543; // E.g., 69 -> 2569 - 543 = 2026
      } else {
        y = 2000 + y;       // E.g., 26 -> 2026
      }
    } else if (y > 2500) {
      y -= 543;
    }
    
    let d = String(p0).padStart(2, '0');
    let m = String(p1).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  const num = parseFloat(str);
  if (!isNaN(num) && num > 40000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return null;
}

function parseCSVNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const clean = String(val).replace(/,/g, '').replace(/%/g, '').trim();
  if (clean === '-' || clean === '') return null;
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function setDataSource(source) {
  state.dataSource = source;
  localStorage.setItem('uulcws_data_source', source);
  updateSourceToggleUI();
  
  if (source === 'live') {
    if (state.liveUrl) {
      fetchLiveData();
    } else {
      fetchAutoGoogleSheet();
    }
  } else {
    usePreloadedData();
  }
}

function updateSourceToggleUI() {
  const preloadedBtn = document.getElementById('btn-source-preloaded');
  const liveBtn = document.getElementById('btn-source-live');
  if (state.dataSource === 'live') {
    liveBtn.classList.add('btn-primary');
    preloadedBtn.classList.remove('btn-primary');
  } else {
    preloadedBtn.classList.add('btn-primary');
    liveBtn.classList.remove('btn-primary');
  }
}

function processDataAndRender() {
  if (state.allData.length === 0) return;
  
  // 1. Find default record (latest date with actual data)
  let defaultRec = null;
  for (let i = state.allData.length - 1; i >= 0; i--) {
    const rec = state.allData[i];
    const hasData = (rec.ww_qty_p1 > 0 || rec.ww_qty_p2 > 0 || rec.w_qty_p100 > 0 || rec.w_qty_p150 > 0 || rec.raw_qty_p1 > 0 || rec.raw_qty_p2 > 0 || rec.raw_qty_p3 > 0) ||
                    (rec.turb_raw !== null || rec.turb_tap !== null || rec.chlorine !== null || rec.ph_raw !== null || rec.ph_tap !== null || rec.cod_sump !== null || rec.cod_post !== null || rec.cod_online !== null || rec.bod_online !== null);
    if (hasData) {
      defaultRec = rec;
      break;
    }
  }
  
  if (defaultRec && defaultRec.date) {
    if (!state.startDate || state.startDate === '2026-01-01') {
      state.startDate = defaultRec.date;
      state.endDate = defaultRec.date;
    }
    
    // Sync calendar display to selected start date
    const parts = state.startDate.split('-');
    state.currentCalYear = parseInt(parts[0]);
    state.currentCalMonth = parseInt(parts[1]) - 1;
  }
  
  updateDatePickerLabel();
  renderCalendar();
  updateDashboard();
}

// 2. Custom Date Range Popover Calendar
function updateDatePickerLabel() {
  const label = document.getElementById('date-picker-label');
  if (!state.startDate) {
    label.textContent = 'เลือกช่วงวันที่...';
    return;
  }
  
  if (state.startDate === state.endDate) {
    label.textContent = formatThaiDatePickerDate(state.startDate);
  } else {
    label.textContent = `${formatThaiDatePickerDate(state.startDate)} - ${formatThaiDatePickerDate(state.endDate)}`;
  }
}

function formatThaiDatePickerDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const y = parseInt(parts[0]) + 543;
  const m = THAI_MONTHS_SHORT[parts[1]] || parts[1];
  const d = parseInt(parts[2]);
  return `${d} ${m} ${y}`;
}

function renderCalendar() {
  const monthYearSpan = document.getElementById('calendar-month-year');
  const daysGrid = document.getElementById('calendar-days');
  
  if (!monthYearSpan || !daysGrid) return;
  
  monthYearSpan.textContent = `${THAI_MONTHS_FULL[String(state.currentCalMonth + 1).padStart(2, '0')]} ${state.currentCalYear + 543}`;
  daysGrid.innerHTML = '';
  
  const firstDay = new Date(state.currentCalYear, state.currentCalMonth, 1).getDay();
  const totalDays = new Date(state.currentCalYear, state.currentCalMonth + 1, 0).getDate();
  
  // Empty slots at start
  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day empty';
    daysGrid.appendChild(cell);
  }
  
  // Generate days
  for (let d = 1; d <= totalDays; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day selectable';
    cell.textContent = d;
    
    const mStr = String(state.currentCalMonth + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const curDateStr = `${state.currentCalYear}-${mStr}-${dStr}`;
    
    // Store date on cell dataset for easy hover querying
    cell.dataset.date = curDateStr;
    
    // Check if within our dataset range (2026-01-01 to latest active date)
    const latestDateRec = state.allData[state.allData.length - 1];
    const latestDateStr = latestDateRec ? latestDateRec.date : '2026-12-31';
    const withinRange = curDateStr >= '2026-01-01' && curDateStr <= latestDateStr;
    
    if (!withinRange) {
      cell.classList.add('disabled');
    } else {
      // Check if day has actual data
      const rec = state.allData.find(r => r.date === curDateStr);
      const hasData = rec && (
        (rec.ww_qty_p1 > 0 || rec.ww_qty_p2 > 0 || rec.w_qty_p100 > 0 || rec.w_qty_p150 > 0 || rec.raw_qty_p1 > 0 || rec.raw_qty_p2 > 0 || rec.raw_qty_p3 > 0) ||
        (rec.turb_raw !== null || rec.turb_tap !== null || rec.chlorine !== null || rec.ph_raw !== null || rec.ph_tap !== null || rec.cod_sump !== null || rec.cod_post !== null || rec.cod_online !== null || rec.bod_online !== null)
      );
      if (hasData) {
        cell.classList.add('day-has-data');
      }
      
      // Styling selected dates
      const isStart = state.startDate === curDateStr;
      const isEnd = state.endDate === curDateStr;
      const inRange = state.startDate && state.endDate && curDateStr > state.startDate && curDateStr < state.endDate;
      
      if (isStart && isEnd) {
        cell.classList.add('selected');
      } else if (isStart) {
        cell.classList.add('range-start');
      } else if (isEnd) {
        cell.classList.add('range-end');
      } else if (inRange) {
        cell.classList.add('in-range');
      }
      
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCalDayClick(curDateStr);
      });
      
      // Class-based hover preview (Performant: updates existing DOM classes instead of clearing & rebuilding)
      cell.addEventListener('mouseenter', () => {
        if (state.startDate && !state.endDate) {
          const hoverDate = curDateStr;
          const allCells = daysGrid.querySelectorAll('.calendar-day.selectable:not(.disabled)');
          allCells.forEach(c => {
            const cDate = c.dataset.date;
            if (cDate > state.startDate && cDate < hoverDate) {
              c.classList.add('in-range');
              c.classList.remove('range-end');
              c.classList.remove('selected');
            } else if (cDate === hoverDate && hoverDate !== state.startDate) {
              c.classList.add('range-end');
              c.classList.remove('in-range');
              c.classList.remove('selected');
            } else {
              // Reset if it's not the start date
              if (cDate !== state.startDate) {
                c.classList.remove('in-range');
                c.classList.remove('range-end');
                c.classList.remove('selected');
              }
            }
          });
        }
      });
    }
    
    daysGrid.appendChild(cell);
  }
  
  // Clear hover styles when mouse leaves grid container
  daysGrid.addEventListener('mouseleave', () => {
    if (state.startDate && !state.endDate) {
      const allCells = daysGrid.querySelectorAll('.calendar-day.selectable:not(.disabled)');
      allCells.forEach(c => {
        const cDate = c.dataset.date;
        if (cDate !== state.startDate) {
          c.classList.remove('in-range');
          c.classList.remove('range-end');
          c.classList.remove('selected');
        }
      });
    }
  });
}

function handleCalDayClick(dateStr) {
  if (!state.startDate || (state.startDate && state.endDate)) {
    state.startDate = dateStr;
    state.endDate = null;
    state.tempHoverDate = null;
  } else {
    if (dateStr < state.startDate) {
      state.startDate = dateStr;
      state.endDate = null;
    } else {
      state.endDate = dateStr;
    }
    state.tempHoverDate = null;
  }
  renderCalendar();
  updateDatePickerLabel();
}

// 3. Event Listeners
function setupEventListeners() {
  // Time Resolution Tabs
  document.querySelectorAll('.time-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      state.viewMode = e.target.dataset.mode;
      updateDashboard();
    });
  });

  // Popover Calendar controls
  document.getElementById('btn-prev-month').addEventListener('click', () => {
    state.currentCalMonth--;
    if (state.currentCalMonth < 0) {
      state.currentCalMonth = 11;
      state.currentCalYear--;
    }
    renderCalendar();
  });
  
  document.getElementById('btn-next-month').addEventListener('click', () => {
    state.currentCalMonth++;
    if (state.currentCalMonth > 11) {
      state.currentCalMonth = 0;
      state.currentCalYear++;
    }
    renderCalendar();
  });
  
  document.getElementById('btn-apply-date').addEventListener('click', () => {
    if (state.startDate) {
      if (!state.endDate) {
        state.endDate = state.startDate; // Single day selection
      }
      updateDatePickerLabel();
      document.getElementById('calendar-popover').classList.remove('open');
      document.getElementById('btn-date-picker').classList.remove('active');
      updateDashboard();
    }
  });
  
  document.getElementById('btn-clear-date').addEventListener('click', () => {
    state.startDate = null;
    state.endDate = null;
    state.tempHoverDate = null;
    
    // Fallback to latest date with data
    let defaultRec = null;
    for (let i = state.allData.length - 1; i >= 0; i--) {
      const rec = state.allData[i];
      const hasData = (rec.ww_qty_p1 > 0 || rec.ww_qty_p2 > 0 || rec.w_qty_p100 > 0 || rec.w_qty_p150 > 0 || rec.raw_qty_p1 > 0 || rec.raw_qty_p2 > 0 || rec.raw_qty_p3 > 0);
      if (hasData) { defaultRec = rec; break; }
    }
    if (defaultRec) {
      state.startDate = defaultRec.date;
      state.endDate = defaultRec.date;
    }
    renderCalendar();
    updateDatePickerLabel();
    updateDashboard();
  });

  const pickerBtn = document.getElementById('btn-date-picker');
  const popover = document.getElementById('calendar-popover');
  
  if (pickerBtn && popover) {
    pickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = popover.classList.contains('open');
      if (isOpen) {
        if (state.startDate && !state.endDate) {
          state.endDate = state.startDate;
          updateDatePickerLabel();
          updateDashboard();
        }
        popover.classList.remove('open');
        pickerBtn.classList.remove('active');
      } else {
        popover.classList.add('open');
        pickerBtn.classList.add('active');
        renderCalendar();
      }
    });
    
    // Block clicks inside the popover from bubbling to document (prevent auto-close on day click)
    popover.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    document.addEventListener('click', (e) => {
      if (!popover.contains(e.target) && !pickerBtn.contains(e.target)) {
        const isOpen = popover.classList.contains('open');
        if (isOpen) {
          if (state.startDate && !state.endDate) {
            state.endDate = state.startDate;
            updateDatePickerLabel();
            updateDashboard();
          }
          popover.classList.remove('open');
          pickerBtn.classList.remove('active');
        }
      }
    });
  }

  // Data Source Selectors
  document.getElementById('btn-source-preloaded').addEventListener('click', () => setDataSource('preloaded'));
  document.getElementById('btn-source-live').addEventListener('click', () => setDataSource('live'));

  // Settings Modal Events
  const modal = document.getElementById('settings-modal');
  document.getElementById('btn-settings').addEventListener('click', () => modal.classList.add('open'));
  document.getElementById('btn-close-modal').addEventListener('click', () => modal.classList.remove('open'));
  document.getElementById('btn-cancel-settings').addEventListener('click', () => modal.classList.remove('open'));
  
  document.getElementById('btn-save-settings').addEventListener('click', () => {
    const url = document.getElementById('input-live-url').value.trim();
    state.liveUrl = url;
    localStorage.setItem('uulcws_live_url', url);
    modal.classList.remove('open');
    setDataSource('live');
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
    }
  });

  // Toggle Data Labels
  const btnToggleLabels = document.getElementById('btn-toggle-labels');
  if (btnToggleLabels) {
    btnToggleLabels.addEventListener('click', () => {
      state.showDataLabels = !state.showDataLabels;
      updateLabelsToggleUI();
      const filtered = getFilteredData();
      updateCharts(filtered.chartData);
      updateQualityCompareSection('ww', filtered.chartData);
      updateQualityCompareSection('water', filtered.chartData);
    });
  }
}

function initUI() {
  initQualityCompareUI();
  lucide.createIcons();
  updateLabelsToggleUI();
}

function updateLabelsToggleUI() {
  const btn = document.getElementById('btn-toggle-labels');
  if (!btn) return;
  const icon = btn.querySelector('i');
  const text = btn.querySelector('span');
  
  if (state.showDataLabels) {
    btn.classList.add('btn-primary');
    if (icon) icon.setAttribute('data-lucide', 'eye-off');
    if (text) text.textContent = 'ซ่อนตัวเลขบนกราฟ';
  } else {
    btn.classList.remove('btn-primary');
    if (icon) icon.setAttribute('data-lucide', 'eye');
    if (text) text.textContent = 'แสดงตัวเลขบนกราฟ';
  }
  lucide.createIcons();
}

// 4. Tab Navigation Switcher (Overview, Wastewater, Water Output)
window.switchTab = function(tabName) {
  state.activeTab = tabName;
  
  // Update sidebar active class
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.getElementById(`nav-${tabName}`).classList.add('active');
  
  // Containers
  const wwSection = document.getElementById('ww-section');
  const waterSection = document.getElementById('water-section');
  const kpisWW = document.querySelectorAll('.kpi-card.ww');
  const kpisWater = document.querySelectorAll('.kpi-card.water');
  const reportSection = document.getElementById('unified-report-section');
  
  // Toggle visible elements based on active tab
  if (tabName === 'overview') {
    wwSection.classList.remove('hidden-section');
    waterSection.classList.remove('hidden-section');
    kpisWW.forEach(el => el.classList.remove('hidden-section'));
    kpisWater.forEach(el => el.classList.remove('hidden-section'));
    reportSection.classList.remove('hidden-section');
  } 
  else if (tabName === 'ww') {
    wwSection.classList.remove('hidden-section');
    waterSection.classList.add('hidden-section');
    kpisWW.forEach(el => el.classList.remove('hidden-section'));
    kpisWater.forEach(el => el.classList.add('hidden-section'));
    reportSection.classList.add('hidden-section');
  } 
  else if (tabName === 'water') {
    wwSection.classList.add('hidden-section');
    waterSection.classList.remove('hidden-section');
    kpisWW.forEach(el => el.classList.add('hidden-section'));
    kpisWater.forEach(el => el.classList.remove('hidden-section'));
    reportSection.classList.add('hidden-section');
  }

  // Dispatch resize event to trigger ApexCharts layout redraw/scaling
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 100);
};

// 5. Update UI Components
function updateDashboard() {
  const filtered = getFilteredData();
  const isSingleDay = state.startDate === state.endDate;
  const currentRecord = isSingleDay ? (state.allData.find(r => r.date === state.startDate) || {}) : filtered.aggregatedRecord;
  const activeRecord = (state.viewMode === 'daily') ? currentRecord : filtered.aggregatedRecord;

  updateKPIs(filtered.data, activeRecord);
  updateCharts(filtered.chartData);
  updateUnifiedReportWidget(activeRecord);
  updateQualityCompareSection('ww', filtered.chartData);
  updateQualityCompareSection('water', filtered.chartData);
}

// 6. Filter & Aggregate Data
function getFilteredData() {
  const start = state.startDate;
  const end = state.endDate;
  
  // Extract active year, month, and day from start date for legacy context
  const parts = start.split('-');
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  
  let data = [];
  let chartData = [];
  let aggregatedRecord = {};
  
  if (state.viewMode === 'daily') {
    // 1. Get raw records in range
    const rangeRecords = state.allData.filter(r => r.date >= start && r.date <= end);
    data = rangeRecords;
    chartData = rangeRecords.map(r => ({
      x: formatShortDate(r.date),
      rawX: r.date,
      ww_qty_p1: r.ww_qty_p1,
      ww_qty_p2: r.ww_qty_p2,
      ww_qty_total: r.ww_qty_total,
      ww_qty_min: STANDARDS.wwMinContract, // Constant 4300 for daily
      w_qty_p100: r.w_qty_p100,
      w_qty_p150: r.w_qty_p150,
      w_qty_total: r.w_qty_total,
      w_qty_min: STANDARDS.wMinContract,   // Constant 4800 for daily
      raw_qty_p1: r.raw_qty_p1,
      raw_qty_p2: r.raw_qty_p2,
      raw_qty_p3: r.raw_qty_p3,
      raw_qty_total: r.raw_qty_total,
      cod_sump: r.cod_sump,
      cod_post: r.cod_post,
      cod_online: r.cod_online,
      bod_online: r.bod_online,
      ph_raw: r.ph_raw,
      ph_tap: r.ph_tap,
      turb_raw: r.turb_raw,
      turb_tap: r.turb_tap,
      chlorine: r.chlorine,
      water_loss_pct: r.water_loss_pct
    }));
    
    aggregatedRecord = computePeriodStats(rangeRecords);
    if (start === end) {
      aggregatedRecord.dateLabel = `ข้อมูลประจำวันที่ ${formatThaiDateFull(start)}`;
    } else {
      aggregatedRecord.dateLabel = `ข้อมูลช่วงวันที่ ${formatThaiDateFull(start)} ถึง ${formatThaiDateFull(end)}`;
    }
  } 
  
  else if (state.viewMode === 'weekly') {
    // Filter data for the selected month of the active year only
    const monthData = state.allData.filter(r => r.date.startsWith(`${year}-${month}`));
    
    // Group into Week 1 (day 1-7), Week 2 (day 8-14), Week 3 (day 15-21), Week 4 (day 22-28), Week 5 (day 29+)
    const weeklyGroups = {
      'Week 1': [],
      'Week 2': [],
      'Week 3': [],
      'Week 4': []
    };
    
    if (monthData.length > 28) {
      weeklyGroups['Week 5'] = [];
    }
    
    monthData.forEach(r => {
      const p = r.date.split('-');
      if (p.length < 3) return;
      const dVal = parseInt(p[2]);
      
      if (dVal >= 1 && dVal <= 7) {
        weeklyGroups['Week 1'].push(r);
      } else if (dVal >= 8 && dVal <= 14) {
        weeklyGroups['Week 2'].push(r);
      } else if (dVal >= 15 && dVal <= 21) {
        weeklyGroups['Week 3'].push(r);
      } else if (dVal >= 22 && dVal <= 28) {
        weeklyGroups['Week 4'].push(r);
      } else if (dVal >= 29) {
        if (weeklyGroups['Week 5']) {
          weeklyGroups['Week 5'].push(r);
        } else {
          weeklyGroups['Week 4'].push(r);
        }
      }
    });
    
    const activeWeeks = Object.keys(weeklyGroups);
    chartData = activeWeeks.map(wk => {
      const group = weeklyGroups[wk];
      const stats = computePeriodStats(group);
      return {
        x: wk,
        rawX: wk,
        ...stats
      };
    });
    
    data = chartData;
    
    // Determine which week group the selected start date belongs to
    const selectedDay = parseInt(day);
    let activeWk = 'Week 1';
    if (selectedDay >= 1 && selectedDay <= 7) activeWk = 'Week 1';
    else if (selectedDay >= 8 && selectedDay <= 14) activeWk = 'Week 2';
    else if (selectedDay >= 15 && selectedDay <= 21) activeWk = 'Week 3';
    else if (selectedDay >= 22 && selectedDay <= 28) activeWk = 'Week 4';
    else if (selectedDay >= 29) activeWk = weeklyGroups['Week 5'] ? 'Week 5' : 'Week 4';
    
    const targetGroup = weeklyGroups[activeWk] || [];
    aggregatedRecord = computePeriodStats(targetGroup);
    aggregatedRecord.dateLabel = `สัปดาห์ ${activeWk} ของเดือน${THAI_MONTHS_FULL[month]} พ.ศ. ${parseInt(year) + 543}`;
  } 
  
  else if (state.viewMode === 'monthly') {
    // Monthly aggregation for the active year
    const yearData = state.allData.filter(r => r.date.startsWith(year));
    const monthlyGroups = {};
    yearData.forEach(r => {
      const m = r.date.split('-')[1];
      if (!monthlyGroups[m]) monthlyGroups[m] = [];
      monthlyGroups[m].push(r);
    });
    
    const sortedMonths = Object.keys(monthlyGroups).sort();
    chartData = sortedMonths.map(m => {
      const group = monthlyGroups[m];
      const stats = computePeriodStats(group);
      return {
        x: `${THAI_MONTHS_SHORT[m]} ${String(parseInt(year) - 2000 + 43)}`,
        rawX: m,
        ...stats
      };
    });
    
    data = chartData;
    const targetGroup = monthlyGroups[month] || [];
    aggregatedRecord = computePeriodStats(targetGroup);
    aggregatedRecord.dateLabel = `เดือน ${THAI_MONTHS_FULL[month]} พ.ศ. ${parseInt(year) + 543}`;
  } 
  
  else if (state.viewMode === 'yearly') {
    // Yearly aggregation for all data
    const yearlyGroups = {};
    state.allData.forEach(r => {
      const y = r.date.split('-')[0];
      if (!yearlyGroups[y]) yearlyGroups[y] = [];
      yearlyGroups[y].push(r);
    });
    
    const sortedYears = Object.keys(yearlyGroups).sort();
    chartData = sortedYears.map(y => {
      const group = yearlyGroups[y];
      const stats = computePeriodStats(group);
      return {
        x: 'พ.ศ. ' + (parseInt(y) + 543),
        rawX: y,
        ...stats
      };
    });
    
    data = chartData;
    const targetGroup = yearlyGroups[year] || [];
    aggregatedRecord = computePeriodStats(targetGroup);
    aggregatedRecord.dateLabel = `ปี พ.ศ. ${parseInt(year) + 543}`;
  }
  return { data, chartData, aggregatedRecord };
}

function getYearWeek(dateStr) {
  const date = new Date(dateStr);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return d.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0');
}

function formatThaiDateFull(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const y = parseInt(parts[0]) + 543;
  const m = THAI_MONTHS_FULL[parts[1]] || parts[1];
  const d = parseInt(parts[2]);
  return `${d} ${m} พ.ศ. ${y}`;
}

// 7. Core Calculations Helper
function computePeriodStats(records) {
  if (records.length === 0) return {};
  
  // Columns to SUM (Quantities and Contract Minimums)
  const sumKeys = [
    'ww_qty_p1', 'ww_qty_p2', 'ww_qty_total', 'ww_qty_min',
    'w_qty_p100', 'w_qty_p150', 'w_qty_total', 'w_qty_min',
    'raw_qty_p1', 'raw_qty_p2', 'raw_qty_p3', 'raw_qty_total'
  ];
  
  // Columns to AVERAGE (Quality metrics and percentages)
  const avgKeys = [
    'cod_sump', 'cod_post', 'cod_online', 'bod_online',
    'ph_raw', 'ph_tap', 'turb_raw', 'turb_tap', 'chlorine', 'water_loss_pct'
  ];
  
  const result = {};
  
  // Compute SUMs
  sumKeys.forEach(k => {
    let sum = 0;
    let hasVal = false;
    records.forEach(r => {
      if (r[k] !== null && r[k] !== undefined) {
        sum += r[k];
        hasVal = true;
      }
    });
    result[k] = hasVal ? parseFloat(sum.toFixed(2)) : null;
  });
  
  // Compute AVERAGEs (ignoring nulls)
  avgKeys.forEach(k => {
    let sum = 0;
    let count = 0;
    records.forEach(r => {
      if (r[k] !== null && r[k] !== undefined) {
        sum += r[k];
        count++;
      }
    });
    result[k] = count > 0 ? parseFloat((sum / count).toFixed(2)) : null;
  });

  // Compute Daily Averages (ลบ.ม./วัน) for Wastewater, Water Distribution & Raw Water Intake
  let wwDays = 0;
  let wDays = 0;
  let rawDays = 0;
  records.forEach(r => {
    if (r.ww_qty_total !== null && r.ww_qty_total !== undefined && r.ww_qty_total > 0) wwDays++;
    if (r.w_qty_total !== null && r.w_qty_total !== undefined && r.w_qty_total > 0) wDays++;
    if (r.raw_qty_total !== null && r.raw_qty_total !== undefined && r.raw_qty_total > 0) rawDays++;
  });
  result.ww_days_count = wwDays;
  result.ww_qty_daily_avg = (wwDays > 0 && result.ww_qty_total !== null) ? parseFloat((result.ww_qty_total / wwDays).toFixed(2)) : null;
  result.ww_qty_p1_daily_avg = (wwDays > 0 && result.ww_qty_p1 !== null) ? parseFloat((result.ww_qty_p1 / wwDays).toFixed(2)) : null;
  result.ww_qty_p2_daily_avg = (wwDays > 0 && result.ww_qty_p2 !== null) ? parseFloat((result.ww_qty_p2 / wwDays).toFixed(2)) : null;

  result.w_days_count = wDays;
  result.w_qty_daily_avg = (wDays > 0 && result.w_qty_total !== null) ? parseFloat((result.w_qty_total / wDays).toFixed(2)) : null;
  result.w_qty_p100_daily_avg = (wDays > 0 && result.w_qty_p100 !== null) ? parseFloat((result.w_qty_p100 / wDays).toFixed(2)) : null;
  result.w_qty_p150_daily_avg = (wDays > 0 && result.w_qty_p150 !== null) ? parseFloat((result.w_qty_p150 / wDays).toFixed(2)) : null;

  result.raw_days_count = rawDays;
  result.raw_qty_daily_avg = (rawDays > 0 && result.raw_qty_total !== null) ? parseFloat((result.raw_qty_total / rawDays).toFixed(2)) : null;
  result.raw_qty_p1_daily_avg = (rawDays > 0 && result.raw_qty_p1 !== null) ? parseFloat((result.raw_qty_p1 / rawDays).toFixed(2)) : null;
  result.raw_qty_p2_daily_avg = (rawDays > 0 && result.raw_qty_p2 !== null) ? parseFloat((result.raw_qty_p2 / rawDays).toFixed(2)) : null;
  result.raw_qty_p3_daily_avg = (rawDays > 0 && result.raw_qty_p3 !== null) ? parseFloat((result.raw_qty_p3 / rawDays).toFixed(2)) : null;
  
  return result;
}

// Helper: Compute full-month daily averages (ลบ.ม./วัน) for the month of state.startDate
function getActiveMonthStats() {
  const dateStr = state.startDate || '2026-01-01';
  const parts = dateStr.split('-');
  const year = parts[0] || '2026';
  const month = parts[1] || '01';
  const yearMonth = `${year}-${month}`;
  const monthFull = `${THAI_MONTHS_FULL[month] || month} ${parseInt(year) + 543}`;
  const monthShort = `${THAI_MONTHS_SHORT[month] || month} ${String(parseInt(year) + 543).slice(-2)}`;

  const monthRecords = state.allData.filter(r => r.date && r.date.startsWith(yearMonth));
  const stats = computePeriodStats(monthRecords);

  // Active daily records in that month for chart plotting
  const activeMonthChartData = monthRecords
    .filter(r => (r.w_qty_total > 0 || r.raw_qty_total > 0 || r.ww_qty_total > 0))
    .map(r => ({
      x: formatShortDate(r.date),
      rawX: r.date,
      ...r,
      w_qty_min: STANDARDS.wMinContract,
      ww_qty_min: STANDARDS.wwMinContract
    }));

  return {
    ...stats,
    yearMonth,
    monthLabel: monthFull,
    monthShortLabel: monthShort,
    monthChartData: activeMonthChartData
  };
}

// Helper: Convert YYYY-MM-DD to short Thai DD/MM/YY (e.g. 01/05/69)
function formatShortDate(dateStr) {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('-');
  const yy = String(parseInt(parts[0]) - 2000 + 43); // 2026 -> 69
  return `${parts[2]}/${parts[1]}/${yy}`;
}

// Helper: Convert YYYY-Www to Www/yy (e.g. 2026-W05 -> W05/69)
function formatShortWeek(wkStr) {
  if (!wkStr || !wkStr.includes('-W')) return wkStr;
  const parts = wkStr.split('-W');
  const yy = String(parseInt(parts[0]) - 2000 + 43);
  return `W${parts[1]}/${yy}`;
}

function getISOWeekString(date) {
  const tempDate = new Date(date.valueOf());
  tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
  const yearStart = new Date(tempDate.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
  return `${tempDate.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Helper for labels in tooltip formatting
function formatXAxisLabel(xVal) {
  return xVal;
}

// 8. Update KPI values
function updateKPIs(dataList, activeRec) {
  const monthStats = getActiveMonthStats();
  const isWwMonthAvg = state.wwQtyMode === 'month_avg';
  const wwVal = isWwMonthAvg ? monthStats.ww_qty_daily_avg : activeRec.ww_qty_total;
  const isWaterMonthAvg = state.waterQtyMode === 'month_avg';
  const wVal = isWaterMonthAvg ? monthStats.w_qty_daily_avg : activeRec.w_qty_total;
  
  // KPI Numbers
  document.getElementById('ww-kpi-val').innerHTML = formatVal(wwVal, 0) + `<span class="kpi-unit">${isWwMonthAvg ? 'ลบ.ม./วัน' : 'ลบ.ม.'}</span>`;
  document.getElementById('water-kpi-val').innerHTML = formatVal(wVal, 0) + `<span class="kpi-unit">${isWaterMonthAvg ? 'ลบ.ม./วัน' : 'ลบ.ม.'}</span>`;
  
  const wwKpiTitle = document.getElementById('ww-kpi-title');
  if (wwKpiTitle) {
    wwKpiTitle.textContent = isWwMonthAvg ? 'น้ำเสียเข้าระบบรวม (เฉลี่ยทั้งเดือน)' : 'น้ำเสียเข้าระบบรวม';
  }
  const wwKpiSub = document.getElementById('ww-kpi-month-avg-sub');
  if (wwKpiSub) {
    if (isWwMonthAvg) {
      wwKpiSub.textContent = `เดือน${monthStats.monthShortLabel} รวม ${formatVal(monthStats.ww_qty_total, 0)} ลบ.ม. (${monthStats.ww_days_count || 0} วัน)`;
    } else {
      wwKpiSub.textContent = `เฉลี่ยทั้งเดือน (${monthStats.monthShortLabel}): ${formatVal(monthStats.ww_qty_daily_avg, 0)} ลบ.ม./วัน`;
    }
  }

  const wKpiTitle = document.getElementById('water-kpi-title');
  if (wKpiTitle) {
    wKpiTitle.textContent = isWaterMonthAvg ? 'ปริมาณน้ำจ่ายรวม (เฉลี่ยทั้งเดือน)' : 'ปริมาณน้ำจ่ายรวม';
  }
  const wKpiSub = document.getElementById('water-kpi-month-avg-sub');
  if (wKpiSub) {
    if (isWaterMonthAvg) {
      wKpiSub.textContent = `เดือน${monthStats.monthShortLabel} รวม ${formatVal(monthStats.w_qty_total, 0)} ลบ.ม. (${monthStats.w_days_count || 0} วัน)`;
    } else {
      wKpiSub.textContent = `เฉลี่ยทั้งเดือน (${monthStats.monthShortLabel}): ${formatVal(monthStats.w_qty_daily_avg, 0)} ลบ.ม./วัน`;
    }
  }
  
  // Scaled contract values
  let wwMinTarget = STANDARDS.wwMinContract;
  let wMinTarget = STANDARDS.wMinContract;
  
  if (state.viewMode === 'weekly') {
    wwMinTarget = isWwMonthAvg ? STANDARDS.wwMinContract : (activeRec.ww_qty_min || (STANDARDS.wwMinContract * 7));
    wMinTarget = isWaterMonthAvg ? STANDARDS.wMinContract : (activeRec.w_qty_min || (STANDARDS.wMinContract * 7));
  } else if (state.viewMode === 'monthly') {
    // average days in month
    wwMinTarget = isWwMonthAvg ? STANDARDS.wwMinContract : (activeRec.ww_qty_min || (STANDARDS.wwMinContract * 30));
    wMinTarget = isWaterMonthAvg ? STANDARDS.wMinContract : (activeRec.w_qty_min || (STANDARDS.wMinContract * 30));
  } else if (state.viewMode === 'yearly') {
    wwMinTarget = isWwMonthAvg ? STANDARDS.wwMinContract : (activeRec.ww_qty_min || (STANDARDS.wwMinContract * 365));
    wMinTarget = isWaterMonthAvg ? STANDARDS.wMinContract : (activeRec.w_qty_min || (STANDARDS.wMinContract * 365));
  }
  
  const wwPct = wwVal && wwMinTarget ? ((wwVal / wwMinTarget) * 100).toFixed(1) : 0;
  const wPct = wVal && wMinTarget ? ((wVal / wMinTarget) * 100).toFixed(1) : 0;
  
  // Footer text
  const wwCompareText = document.getElementById('ww-compare-text');
  const wwTrendBadge = document.getElementById('ww-trend-badge');
  wwCompareText.textContent = isWwMonthAvg
    ? `เกณฑ์ตามสัญญา (${formatVal(wwMinTarget, 0)} ลบ.ม./วัน)`
    : `เกณฑ์ตามสัญญา (${formatVal(wwMinTarget, 0)} ลบ.ม.)`;
  if (wwVal >= wwMinTarget) {
    wwTrendBadge.className = 'trend-badge up';
    wwTrendBadge.innerHTML = `<i data-lucide="check-circle-2"></i> ${wwPct}%`;
  } else {
    wwTrendBadge.className = 'trend-badge down';
    wwTrendBadge.innerHTML = `<i data-lucide="alert-triangle"></i> ${wwPct}%`;
  }
  
  const wCompareText = document.getElementById('water-compare-text');
  const wTrendBadge = document.getElementById('water-trend-badge');
  wCompareText.textContent = isWaterMonthAvg
    ? `เกณฑ์ตามสัญญา (${formatVal(wMinTarget, 0)} ลบ.ม./วัน)`
    : `เกณฑ์ตามสัญญา (${formatVal(wMinTarget, 0)} ลบ.ม.)`;
  if (wVal >= wMinTarget) {
    wTrendBadge.className = 'trend-badge up';
    wTrendBadge.innerHTML = `<i data-lucide="check-circle-2"></i> ${wPct}%`;
  } else {
    wTrendBadge.className = 'trend-badge down';
    wTrendBadge.innerHTML = `<i data-lucide="alert-triangle"></i> ${wPct}%`;
  }
  
  // COD Sump
  const codVal = activeRec.cod_sump;
  document.getElementById('cod-kpi-val').innerHTML = formatVal(codVal, 1) + '<span class="kpi-unit">mg/L</span>';
  const codBadge = document.getElementById('cod-trend-badge');
  const codCompareText = document.getElementById('cod-compare-text');
  codCompareText.textContent = `มาตรฐานไม่เกิน ${STANDARDS.codSumpMax} mg/L`;
  if (codVal === null) {
    codBadge.className = 'trend-badge down';
    codBadge.innerHTML = 'N/A';
  } else if (codVal <= STANDARDS.codSumpMax) {
    codBadge.className = 'trend-badge up';
    codBadge.innerHTML = `<i data-lucide="shield-check"></i> ปกติ`;
  } else {
    codBadge.className = 'trend-badge down';
    codBadge.innerHTML = `<i data-lucide="alert-octagon"></i> เกินเกณฑ์`;
  }
  
  // pH Raw
  const phVal = activeRec.ph_raw;
  document.getElementById('ph-kpi-val').innerHTML = formatVal(phVal, 2) + '<span class="kpi-unit">pH</span>';
  const phBadge = document.getElementById('ph-trend-badge');
  const phCompareText = document.getElementById('ph-compare-text');
  phCompareText.textContent = `เกณฑ์ ${STANDARDS.phMin} - ${STANDARDS.phMax}`;
  if (phVal === null) {
    phBadge.className = 'trend-badge down';
    phBadge.innerHTML = 'N/A';
  } else if (phVal >= STANDARDS.phMin && phVal <= STANDARDS.phMax) {
    phBadge.className = 'trend-badge up';
    phBadge.innerHTML = `<i data-lucide="droplet"></i> ปกติ`;
  } else {
    phBadge.className = 'trend-badge down';
    phBadge.innerHTML = `<i data-lucide="alert-triangle"></i> นอกเกณฑ์`;
  }
  
  lucide.createIcons();
}

function formatVal(val, decimals = 1) {
  if (val === null || val === undefined) return '-';
  return val.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

// 9. Update Unified Daily Text Report Card
function updateUnifiedReportWidget(rec) {
  const monthStats = getActiveMonthStats();
  // Date Label
  const label = rec.dateLabel || ('ข้อมูลประจำวันที่ ' + formatShortDate(state.startDate));
  document.getElementById('report-date-label').textContent = label;
  
  // 1. ปริมาณน้ำดิบรวม
  const isRawMonthAvg = state.rawQtyMode === 'month_avg';
  document.getElementById('report-raw-total').textContent = isRawMonthAvg
    ? `${formatVal(monthStats.raw_qty_daily_avg, 0)} ลบ.ม./วัน`
    : `${formatVal(rec.raw_qty_total, 0)} ลบ.ม.`;
  const reportRawSub = document.getElementById('report-raw-month-avg');
  if (reportRawSub) {
    reportRawSub.textContent = isRawMonthAvg
      ? `เฉลี่ยทั้งเดือน ${monthStats.monthShortLabel} (รวม ${formatVal(monthStats.raw_qty_total, 0)} ลบ.ม. / ${monthStats.raw_days_count || 0} วัน)`
      : `เฉลี่ยทั้งเดือน (${monthStats.monthShortLabel}): ${formatVal(monthStats.raw_qty_daily_avg, 0)} ลบ.ม./วัน`;
  }
  
  // 2. ปริมาณน้ำจ่ายรวม
  const isWaterMonthAvg = state.waterQtyMode === 'month_avg';
  document.getElementById('report-water-total').textContent = isWaterMonthAvg
    ? `${formatVal(monthStats.w_qty_daily_avg, 0)} ลบ.ม./วัน`
    : `${formatVal(rec.w_qty_total, 0)} ลบ.ม.`;
  const reportWaterSub = document.getElementById('report-water-month-avg');
  if (reportWaterSub) {
    reportWaterSub.textContent = isWaterMonthAvg
      ? `เฉลี่ยทั้งเดือน ${monthStats.monthShortLabel} (รวม ${formatVal(monthStats.w_qty_total, 0)} ลบ.ม. / ${monthStats.w_days_count || 0} วัน)`
      : `เฉลี่ยทั้งเดือน (${monthStats.monthShortLabel}): ${formatVal(monthStats.w_qty_daily_avg, 0)} ลบ.ม./วัน`;
  }
  
  // 3. % น้ำสูญเสียเฉลี่ยสะสม
  document.getElementById('report-water-loss').textContent = formatVal(rec.water_loss_pct, 2) + ' %';
  
  // 4. ปริมาณน้ำเสีย
  const isWwMonthAvg = state.wwQtyMode === 'month_avg';
  document.getElementById('report-ww-total').textContent = isWwMonthAvg
    ? `${formatVal(monthStats.ww_qty_daily_avg, 0)} ลบ.ม./วัน`
    : `${formatVal(rec.ww_qty_total, 0)} ลบ.ม.`;
  const reportWwSub = document.getElementById('report-ww-month-avg');
  if (reportWwSub) {
    reportWwSub.textContent = isWwMonthAvg
      ? `เฉลี่ยทั้งเดือน ${monthStats.monthShortLabel} (รวม ${formatVal(monthStats.ww_qty_total, 0)} ลบ.ม. / ${monthStats.ww_days_count || 0} วัน)`
      : `เฉลี่ยทั้งเดือน (${monthStats.monthShortLabel}): ${formatVal(monthStats.ww_qty_daily_avg, 0)} ลบ.ม./วัน`;
  }
  
  // Quality fields (5 to 13)
  document.getElementById('report-turb-raw').textContent = formatVal(rec.turb_raw, 2) + ' NTU';
  document.getElementById('report-turb-tap').textContent = formatVal(rec.turb_tap, 2) + ' NTU';
  document.getElementById('report-ph-raw').textContent = formatVal(rec.ph_raw, 2);
  document.getElementById('report-ph-tap').textContent = formatVal(rec.ph_tap, 2);
  document.getElementById('report-chlorine').textContent = formatVal(rec.chlorine, 2) + ' mg/L';
  document.getElementById('report-cod-sump').textContent = formatVal(rec.cod_sump, 1) + ' mg/L';
  document.getElementById('report-cod-post').textContent = formatVal(rec.cod_post, 1) + ' mg/L';
  document.getElementById('report-cod-online').textContent = formatVal(rec.cod_online, 1) + ' mg/L';
  document.getElementById('report-bod-online').textContent = formatVal(rec.bod_online, 1) + ' mg/L';
  
  // Indicators
  updateIndicatorRange('ind-report-ph-raw', rec.ph_raw, STANDARDS.phMin, STANDARDS.phMax);
  updateIndicatorRange('ind-report-ph-tap', rec.ph_tap, 6.5, 8.5);
  updateIndicator('ind-report-cod-sump', rec.cod_sump, 0, STANDARDS.codSumpMax);
  updateIndicator('ind-report-cod-post', rec.cod_post, 0, STANDARDS.codPostMax);
}

function updateIndicator(id, val, min, max) {
  const el = document.getElementById(id);
  if (!el) return;
  if (val === null || val === undefined) {
    el.className = 'status-indicator';
  } else if (val > max) {
    el.className = 'status-indicator danger';
  } else {
    el.className = 'status-indicator safe';
  }
}

function updateIndicatorRange(id, val, min, max) {
  const el = document.getElementById(id);
  if (!el) return;
  if (val === null || val === undefined) {
    el.className = 'status-indicator';
  } else if (val < min || val > max) {
    el.className = 'status-indicator danger';
  } else {
    el.className = 'status-indicator safe';
  }
}

// 10. Update & Redraw Charts
function updateCharts(chartData) {
  const categories = chartData.map(c => c.x);
  const monthStats = getActiveMonthStats();
  const isPeriodAggregated = (state.viewMode === 'monthly' || state.viewMode === 'yearly');
  
  // 10.1 Wastewater Quantity Chart (Show only Total, breakdown in tooltip)
  const isWwQtyLine = state.chartTypes['chart-ww-qty'] === 'line';
  const isWwMonthAvg = state.wwQtyMode === 'month_avg';
  const valWwBanner = document.getElementById('val-ww-qty-month-avg');
  const subWwBanner = document.getElementById('sub-ww-qty-month-avg');
  const wwBannerEl = document.getElementById('ww-qty-avg-banner');
  if (valWwBanner) valWwBanner.textContent = `${formatVal(monthStats.ww_qty_daily_avg, 0)} ลบ.ม./วัน`;
  if (subWwBanner) subWwBanner.textContent = `เดือน${monthStats.monthLabel} (รวม ${formatVal(monthStats.ww_qty_total, 0)} ลบ.ม. จาก ${monthStats.ww_days_count || 0} วัน)`;
  if (wwBannerEl) wwBannerEl.classList.toggle('active-mode', isWwMonthAvg);

  const wwChartDataset = (isWwMonthAvg && (state.viewMode === 'daily' || state.viewMode === 'weekly'))
    ? monthStats.monthChartData
    : chartData;
  const wwCategories = wwChartDataset.map(c => c.x);

  const wwQtySeries = [
    {
      name: isWwMonthAvg ? 'น้ำเสียรวมเฉลี่ย (ลบ.ม./วัน)' : 'น้ำเสียรวมเข้าระบบ',
      type: isWwQtyLine ? 'line' : 'column',
      data: wwChartDataset.map(c => (isWwMonthAvg && isPeriodAggregated) ? c.ww_qty_daily_avg : c.ww_qty_total)
    },
    {
      name: 'เกณฑ์สัญญาขั้นต่ำ',
      type: 'line',
      data: wwChartDataset.map(c => (isWwMonthAvg || state.viewMode === 'daily') ? STANDARDS.wwMinContract : (c.ww_qty_min || (STANDARDS.wwMinContract * (state.viewMode === 'weekly' ? 7 : (state.viewMode === 'monthly' ? 30 : 365)))))
    }
  ];
  const wwQtyAnnotations = (isWwMonthAvg && !isPeriodAggregated && monthStats.ww_qty_daily_avg !== null) ? {
    yaxis: [{
      y: monthStats.ww_qty_daily_avg,
      borderColor: '#3b82f6',
      borderWidth: 2,
      strokeDashArray: 4,
      label: {
        borderColor: '#3b82f6',
        style: { color: '#ffffff', background: '#3b82f6', fontSize: '10px', fontWeight: 600 },
        text: `เฉลี่ยทั้งเดือน ${formatVal(monthStats.ww_qty_daily_avg, 0)} ลบ.ม./วัน`
      }
    }]
  } : {};

  const wwQtyOptions = {
    series: wwQtySeries,
    chart: {
      height: 300,
      type: 'line',
      toolbar: { show: false }
    },
    colors: ['#3b82f6', '#ef4444'],
    stroke: {
      width: [isWwQtyLine ? 3 : 0, 2],
      dashArray: [0, 5], // line series is dashed
      curve: 'smooth'
    },
    markers: {
      size: [isWwQtyLine ? 4 : 0, 0]
    },
    plotOptions: {
      bar: {
        columnWidth: '45%',
        borderRadius: 3,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: state.showDataLabels,
      enabledOnSeries: [0],
      offsetY: isWwQtyLine ? -6 : -18,
      style: {
        fontSize: '9px',
        colors: ['#000000']
      }
    },
    xaxis: { categories: wwCategories },
    yaxis: {
      title: { text: isWwMonthAvg ? 'ลบ.ม./วัน' : 'ลบ.ม. / ช่วงเวลา' }
    },
    annotations: wwQtyAnnotations,
    tooltip: {
      custom: function({series, seriesIndex, dataPointIndex, w}) {
        const item = wwChartDataset[dataPointIndex];
        if (!item) return '';
        const unitStr = isWwMonthAvg ? 'ลบ.ม./วัน' : 'ลบ.ม.';
        const mainVal = (isWwMonthAvg && isPeriodAggregated) ? item.ww_qty_daily_avg : item.ww_qty_total;
        const p1Val = (isWwMonthAvg && isPeriodAggregated) ? item.ww_qty_p1_daily_avg : item.ww_qty_p1;
        const p2Val = (isWwMonthAvg && isPeriodAggregated) ? item.ww_qty_p2_daily_avg : item.ww_qty_p2;
        const minVal = (isWwMonthAvg || state.viewMode === 'daily') ? STANDARDS.wwMinContract : item.ww_qty_min;
        return '<div class="custom-tooltip">' +
          '<div><b>ช่วงเวลา:</b> ' + item.x + '</div>' +
          '<div style="color:#2563eb"><b>น้ำเสียเข้าระบบรวม:</b> ' + formatVal(mainVal, 0) + ' ' + unitStr + '</div>' +
          '<div>Plant 1: ' + formatVal(p1Val, 0) + ' ' + unitStr + '</div>' +
          '<div>Plant 2: ' + formatVal(p2Val, 0) + ' ' + unitStr + '</div>' +
          (isWwMonthAvg && !isPeriodAggregated ? '<div style="color:#1d4ed8; font-weight:600;">ค่าเฉลี่ยทั้งเดือน: ' + formatVal(monthStats.ww_qty_daily_avg, 0) + ' ลบ.ม./วัน</div>' : '') +
          '<div style="color:#ef4444; border-top: 1px solid #e2e8f0; margin-top:4px; padding-top:4px;">เกณฑ์ขั้นต่ำสัญญา: ' + formatVal(minVal, 0) + ' ' + unitStr + '</div>' +
          '</div>';
      }
    }
  };
  renderChart('chart-ww-qty', wwQtyOptions, `${state.chartTypes['chart-ww-qty']}-${state.wwQtyMode}`);

  // 10.2 COD Collecting Sump vs Standard
  const isCodSumpLine = state.chartTypes['chart-cod-sump'] === 'line';
  const codSumpSeries = [{
    name: 'COD Collecting Sump',
    data: chartData.map(c => c.cod_sump)
  }];
  const codSumpOptions = {
    series: codSumpSeries,
    chart: {
      height: 280,
      type: isCodSumpLine ? 'line' : 'bar',
      toolbar: { show: false }
    },
    colors: ['#d97706'],
    stroke: {
      width: isCodSumpLine ? 3 : 0,
      curve: 'smooth'
    },
    markers: {
      size: isCodSumpLine ? 4 : 0
    },
    plotOptions: {
      bar: {
        columnWidth: '40%',
        borderRadius: 3,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: state.showDataLabels,
      offsetY: isCodSumpLine ? -6 : -18,
      style: {
        fontSize: '9px',
        colors: ['#000000']
      }
    },
    xaxis: { categories: categories },
    yaxis: {
      title: { text: 'COD (mg/L)' },
      min: 0,
      max: Math.max(...chartData.map(c => c.cod_sump || 0), 800)
    },
    annotations: {
      yaxis: [{
        y: STANDARDS.codSumpMax,
        borderColor: '#f97316',
        borderWidth: 2,
        strokeDashArray: 5,
        label: {
          borderColor: '#f97316',
          style: { color: '#fff', background: '#f97316' },
          text: `เกณฑ์สูงสุด ${STANDARDS.codSumpMax} mg/L`
        }
      }]
    }
  };
  renderChart('chart-cod-sump', codSumpOptions, state.chartTypes['chart-cod-sump']);

  // 10.3 COD Post Aeration Lab only vs 120 standard
  const isCodPostLine = state.chartTypes['chart-cod-post'] === 'line';
  const codPostSeries = [{
    name: 'COD Post Aeration (Lab)',
    data: chartData.map(c => c.cod_post)
  }];
  const codPostOptions = {
    series: codPostSeries,
    chart: {
      height: 280,
      type: isCodPostLine ? 'line' : 'bar',
      toolbar: { show: false }
    },
    colors: ['#b45309'],
    stroke: {
      width: isCodPostLine ? 3 : 0,
      curve: 'smooth'
    },
    markers: {
      size: isCodPostLine ? 4 : 0
    },
    plotOptions: {
      bar: {
        columnWidth: '40%',
        borderRadius: 3,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: state.showDataLabels,
      offsetY: isCodPostLine ? -6 : -18,
      style: {
        fontSize: '9px',
        colors: ['#000000']
      }
    },
    xaxis: { categories: categories },
    yaxis: {
      title: { text: 'COD (mg/L)' },
      min: 0,
      max: Math.max(...chartData.map(c => c.cod_post || 0), 150)
    },
    annotations: {
      yaxis: [{
        y: STANDARDS.codPostMax,
        borderColor: '#16a34a',
        borderWidth: 2,
        strokeDashArray: 5,
        label: {
          borderColor: '#16a34a',
          style: { color: '#fff', background: '#16a34a' },
          text: `เกณฑ์มาตรฐาน ${STANDARDS.codPostMax} mg/L`
        }
      }]
    }
  };
  renderChart('chart-cod-post', codPostOptions, state.chartTypes['chart-cod-post']);

  // Monthly Daily Average Info for Water Distribution & Raw Water Intake
  const monthStats = getActiveMonthStats();

  // 10.4 Water Quantity (Distribution vs Contract)
  const isWaterQtyLine = state.chartTypes['chart-water-qty'] === 'line';
  const isWaterMonthAvg = state.waterQtyMode === 'month_avg';
  const valWaterBanner = document.getElementById('val-water-qty-month-avg');
  const subWaterBanner = document.getElementById('sub-water-qty-month-avg');
  const waterBannerEl = document.getElementById('water-qty-avg-banner');
  if (valWaterBanner) valWaterBanner.textContent = `${formatVal(monthStats.w_qty_daily_avg, 0)} ลบ.ม./วัน`;
  if (subWaterBanner) subWaterBanner.textContent = `เดือน${monthStats.monthLabel} (รวม ${formatVal(monthStats.w_qty_total, 0)} ลบ.ม. จาก ${monthStats.w_days_count || 0} วัน)`;
  if (waterBannerEl) waterBannerEl.classList.toggle('active-mode', isWaterMonthAvg);

  const wChartDataset = (isWaterMonthAvg && (state.viewMode === 'daily' || state.viewMode === 'weekly'))
    ? monthStats.monthChartData
    : chartData;
  const wCategories = wChartDataset.map(c => c.x);
  const isPeriodAggregated = (state.viewMode === 'monthly' || state.viewMode === 'yearly');

  const wQtySeries = [
    {
      name: isWaterMonthAvg ? 'น้ำจ่ายรวมเฉลี่ย (ลบ.ม./วัน)' : 'น้ำประปาจ่ายรวม',
      type: isWaterQtyLine ? 'line' : 'column',
      data: wChartDataset.map(c => (isWaterMonthAvg && isPeriodAggregated) ? c.w_qty_daily_avg : c.w_qty_total)
    },
    {
      name: 'เกณฑ์สัญญาขั้นต่ำ',
      type: 'line',
      data: wChartDataset.map(c => (isWaterMonthAvg || state.viewMode === 'daily') ? STANDARDS.wMinContract : (c.w_qty_min || (STANDARDS.wMinContract * (state.viewMode === 'weekly' ? 7 : (state.viewMode === 'monthly' ? 30 : 365)))))
    }
  ];
  const wQtyAnnotations = (isWaterMonthAvg && !isPeriodAggregated && monthStats.w_qty_daily_avg !== null) ? {
    yaxis: [{
      y: monthStats.w_qty_daily_avg,
      borderColor: '#0284c7',
      borderWidth: 2,
      strokeDashArray: 4,
      label: {
        borderColor: '#0284c7',
        style: { color: '#ffffff', background: '#0284c7', fontSize: '10px', fontWeight: 600 },
        text: `เฉลี่ยทั้งเดือน ${formatVal(monthStats.w_qty_daily_avg, 0)} ลบ.ม./วัน`
      }
    }]
  } : {};

  const wQtyOptions = {
    series: wQtySeries,
    chart: {
      height: 300,
      type: 'line',
      toolbar: { show: false }
    },
    colors: ['#0284c7', '#ef4444'],
    stroke: {
      width: [isWaterQtyLine ? 3 : 0, 2],
      dashArray: [0, 5],
      curve: 'smooth'
    },
    markers: {
      size: [isWaterQtyLine ? 4 : 0, 0]
    },
    plotOptions: {
      bar: {
        columnWidth: '45%',
        borderRadius: 3,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: state.showDataLabels,
      enabledOnSeries: [0],
      offsetY: isWaterQtyLine ? -6 : -18,
      style: {
        fontSize: '9px',
        colors: ['#000000']
      }
    },
    xaxis: { categories: wCategories },
    yaxis: { title: { text: isWaterMonthAvg ? 'ลบ.ม./วัน' : 'ลบ.ม. / ช่วงเวลา' } },
    annotations: wQtyAnnotations,
    tooltip: {
      custom: function({series, seriesIndex, dataPointIndex, w}) {
        const item = wChartDataset[dataPointIndex];
        if (!item) return '';
        const unitStr = isWaterMonthAvg ? 'ลบ.ม./วัน' : 'ลบ.ม.';
        const mainVal = (isWaterMonthAvg && isPeriodAggregated) ? item.w_qty_daily_avg : item.w_qty_total;
        const p100Val = (isWaterMonthAvg && isPeriodAggregated) ? item.w_qty_p100_daily_avg : item.w_qty_p100;
        const p150Val = (isWaterMonthAvg && isPeriodAggregated) ? item.w_qty_p150_daily_avg : item.w_qty_p150;
        const minVal = (isWaterMonthAvg || state.viewMode === 'daily') ? STANDARDS.wMinContract : item.w_qty_min;
        return '<div class="custom-tooltip">' +
          '<div><b>ช่วงเวลา:</b> ' + item.x + '</div>' +
          '<div style="color:#0284c7"><b>น้ำจ่ายรวม:</b> ' + formatVal(mainVal, 0) + ' ' + unitStr + '</div>' +
          '<div>Plant 100: ' + formatVal(p100Val, 0) + ' ' + unitStr + '</div>' +
          '<div>Plant 150: ' + formatVal(p150Val, 0) + ' ' + unitStr + '</div>' +
          (isWaterMonthAvg && !isPeriodAggregated ? '<div style="color:#0369a1; font-weight:600;">ค่าเฉลี่ยทั้งเดือน: ' + formatVal(monthStats.w_qty_daily_avg, 0) + ' ลบ.ม./วัน</div>' : '') +
          '<div style="color:#ef4444; border-top: 1px solid #e2e8f0; margin-top:4px; padding-top:4px;">เกณฑ์ขั้นต่ำสัญญา: ' + formatVal(minVal, 0) + ' ' + unitStr + '</div>' +
          '</div>';
      }
    }
  };
  renderChart('chart-water-qty', wQtyOptions, `${state.chartTypes['chart-water-qty']}-${state.waterQtyMode}`);

  // 10.5 Raw Water Intake (Only Total column, breakdown in tooltip)
  const isRawIntakeLine = state.chartTypes['chart-raw-intake'] === 'line';
  const isRawMonthAvg = state.rawQtyMode === 'month_avg';
  const valRawBanner = document.getElementById('val-raw-intake-month-avg');
  const subRawBanner = document.getElementById('sub-raw-intake-month-avg');
  const rawBannerEl = document.getElementById('raw-intake-avg-banner');
  if (valRawBanner) valRawBanner.textContent = `${formatVal(monthStats.raw_qty_daily_avg, 0)} ลบ.ม./วัน`;
  if (subRawBanner) subRawBanner.textContent = `เดือน${monthStats.monthLabel} (รวม ${formatVal(monthStats.raw_qty_total, 0)} ลบ.ม. จาก ${monthStats.raw_days_count || 0} วัน)`;
  if (rawBannerEl) rawBannerEl.classList.toggle('active-mode', isRawMonthAvg);

  const rawChartDataset = (isRawMonthAvg && (state.viewMode === 'daily' || state.viewMode === 'weekly'))
    ? monthStats.monthChartData
    : chartData;
  const rawCategories = rawChartDataset.map(c => c.x);

  const rawIntakeSeries = [{
    name: isRawMonthAvg ? 'น้ำดิบรวมเฉลี่ย (ลบ.ม./วัน)' : 'น้ำดิบเข้าระบบรวม',
    data: rawChartDataset.map(c => (isRawMonthAvg && isPeriodAggregated) ? c.raw_qty_daily_avg : c.raw_qty_total)
  }];
  const rawAnnotations = (isRawMonthAvg && !isPeriodAggregated && monthStats.raw_qty_daily_avg !== null) ? {
    yaxis: [{
      y: monthStats.raw_qty_daily_avg,
      borderColor: '#0d9488',
      borderWidth: 2,
      strokeDashArray: 4,
      label: {
        borderColor: '#0d9488',
        style: { color: '#ffffff', background: '#0d9488', fontSize: '10px', fontWeight: 600 },
        text: `เฉลี่ยทั้งเดือน ${formatVal(monthStats.raw_qty_daily_avg, 0)} ลบ.ม./วัน`
      }
    }]
  } : {};

  const rawIntakeOptions = {
    series: rawIntakeSeries,
    chart: {
      height: 280,
      type: isRawIntakeLine ? 'line' : 'bar',
      toolbar: { show: false }
    },
    colors: ['#0d9488'],
    stroke: {
      width: isRawIntakeLine ? 3 : 0,
      curve: 'smooth'
    },
    markers: {
      size: isRawIntakeLine ? 4 : 0
    },
    plotOptions: {
      bar: {
        columnWidth: '40%',
        borderRadius: 3,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: state.showDataLabels,
      offsetY: isRawIntakeLine ? -6 : -18,
      style: {
        fontSize: '9px',
        colors: ['#000000']
      }
    },
    xaxis: { categories: rawCategories },
    yaxis: { title: { text: isRawMonthAvg ? 'ปริมาณน้ำดิบ (ลบ.ม./วัน)' : 'ปริมาณน้ำดิบ (ลบ.ม.)' } },
    annotations: rawAnnotations,
    tooltip: {
      custom: function({series, seriesIndex, dataPointIndex, w}) {
        const item = rawChartDataset[dataPointIndex];
        if (!item) return '';
        const unitStr = isRawMonthAvg ? 'ลบ.ม./วัน' : 'ลบ.ม.';
        const mainVal = (isRawMonthAvg && isPeriodAggregated) ? item.raw_qty_daily_avg : item.raw_qty_total;
        const p1Val = (isRawMonthAvg && isPeriodAggregated) ? item.raw_qty_p1_daily_avg : item.raw_qty_p1;
        const p2Val = (isRawMonthAvg && isPeriodAggregated) ? item.raw_qty_p2_daily_avg : item.raw_qty_p2;
        const p3Val = (isRawMonthAvg && isPeriodAggregated) ? item.raw_qty_p3_daily_avg : item.raw_qty_p3;
        return '<div class="custom-tooltip">' +
          '<div><b>ช่วงเวลา:</b> ' + item.x + '</div>' +
          '<div style="color:#0d9488"><b>ปริมาณน้ำดิบรวม:</b> ' + formatVal(mainVal, 0) + ' ' + unitStr + '</div>' +
          '<div>แพลนท์ 1: ' + formatVal(p1Val, 0) + ' ' + unitStr + '</div>' +
          '<div>แพลนท์ 2: ' + formatVal(p2Val, 0) + ' ' + unitStr + '</div>' +
          '<div>แพลนท์ 3: ' + formatVal(p3Val, 0) + ' ' + unitStr + '</div>' +
          (isRawMonthAvg && !isPeriodAggregated ? '<div style="color:#0f766e; border-top: 1px solid #e2e8f0; margin-top:4px; padding-top:4px; font-weight:600;">ค่าเฉลี่ยทั้งเดือน: ' + formatVal(monthStats.raw_qty_daily_avg, 0) + ' ลบ.ม./วัน</div>' : '') +
          '</div>';
      }
    }
  };
  renderChart('chart-raw-intake', rawIntakeOptions, `${state.chartTypes['chart-raw-intake']}-${state.rawQtyMode}`);

  // 10.6 Raw Water pH with Max/Min highlight area
  const isPhRawLine = state.chartTypes['chart-ph-raw'] === 'line';
  const phSeries = [{
    name: 'pH น้ำดิบ',
    data: chartData.map(c => c.ph_raw)
  }];
  const phOptions = {
    series: phSeries,
    chart: {
      height: 280,
      type: isPhRawLine ? 'line' : 'bar',
      toolbar: { show: false }
    },
    colors: ['#0284c7'],
    stroke: {
      width: isPhRawLine ? 3 : 0,
      curve: 'smooth'
    },
    markers: {
      size: isPhRawLine ? 4 : 0
    },
    plotOptions: {
      bar: {
        columnWidth: '40%',
        borderRadius: 3,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: state.showDataLabels,
      offsetY: isPhRawLine ? -6 : -18,
      style: {
        fontSize: '9px',
        colors: ['#000000']
      }
    },
    xaxis: { categories: categories },
    yaxis: {
      min: isPhRawLine ? 4 : 0,
      max: 11,
      title: { text: 'pH' }
    },
    annotations: {
      yaxis: [
        {
          y: STANDARDS.phMax,
          borderColor: '#dc2626',
          borderWidth: 1.5,
          strokeDashArray: 4,
          label: {
            borderColor: '#dc2626',
            style: { color: '#fff', background: '#dc2626' },
            text: `เกณฑ์สูงสุด pH ${STANDARDS.phMax}`
          }
        },
        {
          y: STANDARDS.phMin,
          borderColor: '#dc2626',
          borderWidth: 1.5,
          strokeDashArray: 4,
          label: {
            borderColor: '#dc2626',
            style: { color: '#fff', background: '#dc2626' },
            text: `เกณฑ์ขั้นต่ำ pH ${STANDARDS.phMin}`
          }
        },
        // Pale Red/Orange highlight for pH > 9
        {
          y: STANDARDS.phMax,
          y2: 12,
          fillColor: '#ef4444',
          opacity: 0.05,
          label: {
            text: 'เกินเกณฑ์สูงสุด (pH > 9)',
            style: { color: '#ef4444', fontSize: '9px' }
          }
        },
        // Pale Red/Orange highlight for pH < 6
        {
          y: 0,
          y2: STANDARDS.phMin,
          fillColor: '#ef4444',
          opacity: 0.05,
          label: {
            text: 'ต่ำกว่าเกณฑ์ขั้นต่ำ (pH < 6)',
            style: { color: '#ef4444', fontSize: '9px' }
          }
        }
      ]
    }
  };
  renderChart('chart-ph-raw', phOptions, state.chartTypes['chart-ph-raw']);
}

let chartModes = {};

function renderChart(containerId, options, modeKey) {
  const effectiveMode = modeKey || (options.chart && options.chart.type) || 'bar';
  if (charts[containerId]) {
    if (chartModes[containerId] && chartModes[containerId] !== effectiveMode) {
      charts[containerId].destroy();
      delete charts[containerId];
    }
  }
  chartModes[containerId] = effectiveMode;

  if (charts[containerId]) {
    charts[containerId].updateOptions(options, true, true);
  } else {
    const el = document.getElementById(containerId);
    if (el) {
      el.innerHTML = '';
      charts[containerId] = new ApexCharts(el, options);
      charts[containerId].render();
    }
  }
}

// =========================================================
// 10.7 Multi-Parameter Water Quality Comparison (WW & Tap Water)
// =========================================================
function initQualityCompareUI() {
  setupPlantQualityControls('ww', WW_QUAL_PARAMS);
  setupPlantQualityControls('water', WATER_QUAL_PARAMS);
  initChartTypeSwitchers();
  initQtyModeSwitchers();
}

function initQtyModeSwitchers() {
  document.querySelectorAll('.qty-mode-tabs[data-target]').forEach(group => {
    const target = group.dataset.target;
    group.querySelectorAll('.qty-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextMode = btn.dataset.mode; // 'normal' | 'month_avg'
        if (target === 'ww_qty') {
          state.wwQtyMode = nextMode;
        } else if (target === 'water_qty') {
          state.waterQtyMode = nextMode;
        } else if (target === 'raw_qty') {
          state.rawQtyMode = nextMode;
        } else if (target === 'both') {
          state.wwQtyMode = nextMode;
          state.waterQtyMode = nextMode;
          state.rawQtyMode = nextMode;
        }
        syncQtyModeTabsUI();
        updateDashboard();
      });
    });
  });
}

function syncQtyModeTabsUI() {
  document.querySelectorAll('.qty-mode-tabs[data-target]').forEach(group => {
    const target = group.dataset.target;
    group.querySelectorAll('.qty-mode-btn').forEach(btn => {
      const m = btn.dataset.mode;
      if (target === 'ww_qty') {
        btn.classList.toggle('active', state.wwQtyMode === m);
      } else if (target === 'water_qty') {
        btn.classList.toggle('active', state.waterQtyMode === m);
      } else if (target === 'raw_qty') {
        btn.classList.toggle('active', state.rawQtyMode === m);
      } else if (target === 'both') {
        const allMatch = (state.wwQtyMode === m && state.waterQtyMode === m && state.rawQtyMode === m);
        btn.classList.toggle('active', allMatch);
      }
    });
  });
}

function initChartTypeSwitchers() {
  // Per-chart type switchers
  document.querySelectorAll('.chart-type-tabs[data-chart]').forEach(tabGroup => {
    const chartId = tabGroup.dataset.chart;
    tabGroup.querySelectorAll('.chart-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextType = btn.dataset.type;
        state.chartTypes[chartId] = nextType;
        tabGroup.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        syncGlobalChartTypeUI();

        const filtered = getFilteredData();
        if (chartId === 'chart-ww-qual-compare') {
          updateQualityCompareSection('ww', filtered.chartData);
        } else if (chartId === 'chart-water-qual-compare') {
          updateQualityCompareSection('water', filtered.chartData);
        } else {
          updateCharts(filtered.chartData);
        }
      });
    });
  });

  // Global chart type switcher (All charts at once)
  const globalTabs = document.getElementById('global-chart-type-tabs');
  if (globalTabs) {
    globalTabs.querySelectorAll('.chart-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetType = btn.dataset.type;
        Object.keys(state.chartTypes).forEach(k => {
          state.chartTypes[k] = targetType;
        });

        // Update all per-chart buttons UI
        document.querySelectorAll('.chart-type-tabs[data-chart]').forEach(group => {
          group.querySelectorAll('.chart-type-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.type === targetType);
          });
        });
        syncGlobalChartTypeUI();

        const filtered = getFilteredData();
        updateCharts(filtered.chartData);
        updateQualityCompareSection('ww', filtered.chartData);
        updateQualityCompareSection('water', filtered.chartData);
      });
    });
  }
}

function syncGlobalChartTypeUI() {
  const globalTabs = document.getElementById('global-chart-type-tabs');
  if (!globalTabs) return;
  const allValues = Object.values(state.chartTypes);
  const allBar = allValues.every(v => v === 'bar');
  const allLine = allValues.every(v => v === 'line');
  globalTabs.querySelectorAll('.chart-type-btn').forEach(btn => {
    if (btn.dataset.type === 'bar') btn.classList.toggle('active', allBar);
    if (btn.dataset.type === 'line') btn.classList.toggle('active', allLine);
  });
}

function setupPlantQualityControls(plant, paramConfigs) {
  const listEl = document.getElementById(`${plant}-qual-param-list`);
  const selectAllBtn = document.getElementById(`btn-${plant}-qual-select-all`);
  if (!listEl) return;

  listEl.innerHTML = '';
  const selectedKey = plant === 'ww' ? 'wwQualSelected' : 'waterQualSelected';

  paramConfigs.forEach(p => {
    const isChecked = state[selectedKey].includes(p.key);
    const chip = document.createElement('div');
    chip.className = `qual-param-chip ${isChecked ? 'active' : ''}`;
    chip.dataset.key = p.key;
    chip.style.setProperty('--chip-color', p.color);
    chip.innerHTML = `
      <span class="qual-chip-check">${isChecked ? '✓' : ''}</span>
      <span>${p.label}</span>
    `;
    chip.addEventListener('click', () => {
      const idx = state[selectedKey].indexOf(p.key);
      if (idx > -1) {
        if (state[selectedKey].length <= 1) {
          showToast('กรุณาเลือกอย่างน้อย 1 ค่าคุณภาพน้ำเพื่อแสดงผล', 'error');
          return;
        }
        state[selectedKey].splice(idx, 1);
      } else {
        // Keep original parameter order
        const nextSet = new Set([...state[selectedKey], p.key]);
        state[selectedKey] = paramConfigs.map(cfg => cfg.key).filter(k => nextSet.has(k));
      }
      const filtered = getFilteredData();
      updateQualityCompareSection(plant, filtered.chartData);
    });
    listEl.appendChild(chip);
  });

  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      state[selectedKey] = paramConfigs.map(cfg => cfg.key);
      const filtered = getFilteredData();
      updateQualityCompareSection(plant, filtered.chartData);
    });
  }

  // Scope tabs (filter vs month)
  document.querySelectorAll(`.qual-scope-tabs[data-plant="${plant}"] .qual-scope-btn`).forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll(`.qual-scope-tabs[data-plant="${plant}"] .qual-scope-btn`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (plant === 'ww') state.wwQualScope = btn.dataset.scope;
      else state.waterQualScope = btn.dataset.scope;
      const filtered = getFilteredData();
      updateQualityCompareSection(plant, filtered.chartData);
    });
  });

  // Display mode tabs (both / table / chart)
  document.querySelectorAll(`.qual-display-tabs[data-plant="${plant}"] .qual-display-btn`).forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll(`.qual-display-tabs[data-plant="${plant}"] .qual-display-btn`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (plant === 'ww') state.wwQualDisplay = btn.dataset.display;
      else state.waterQualDisplay = btn.dataset.display;
      const filtered = getFilteredData();
      updateQualityCompareSection(plant, filtered.chartData);
    });
  });
}

function getQualityCompareDataset(plant, baseChartData) {
  const scope = plant === 'ww' ? state.wwQualScope : state.waterQualScope;
  if (scope === 'month' && state.startDate) {
    const parts = state.startDate.split('-');
    const yearMonth = `${parts[0]}-${parts[1]}`;
    const paramConfigs = plant === 'ww' ? WW_QUAL_PARAMS : WATER_QUAL_PARAMS;
    const monthRecords = state.allData.filter(r => {
      if (!r.date || !r.date.startsWith(yearMonth)) return false;
      // Include days that have at least one quality metric or quantity recorded
      return paramConfigs.some(p => r[p.key] !== null && r[p.key] !== undefined) ||
             (r.ww_qty_total > 0 || r.w_qty_total > 0 || r.raw_qty_total > 0);
    });
    return monthRecords.map(r => ({
      x: formatShortDate(r.date),
      rawX: r.date,
      ...r
    }));
  }
  return baseChartData || [];
}

function updateQualityCompareSection(plant, baseChartData) {
  const paramConfigs = plant === 'ww' ? WW_QUAL_PARAMS : WATER_QUAL_PARAMS;
  const selectedKeys = plant === 'ww' ? state.wwQualSelected : state.waterQualSelected;
  const displayMode = plant === 'ww' ? state.wwQualDisplay : state.waterQualDisplay;
  const selectedParams = paramConfigs.filter(p => selectedKeys.includes(p.key));

  // 1. Sync Chip Active States
  const listEl = document.getElementById(`${plant}-qual-param-list`);
  if (listEl) {
    listEl.querySelectorAll('.qual-param-chip').forEach(chip => {
      const k = chip.dataset.key;
      const active = selectedKeys.includes(k);
      chip.classList.toggle('active', active);
      const checkSpan = chip.querySelector('.qual-chip-check');
      if (checkSpan) checkSpan.textContent = active ? '✓' : '';
    });
  }

  // 2. Toggle Table & Chart Visibility
  const tableWrap = document.getElementById(`${plant}-qual-table-wrap`);
  const chartWrap = document.getElementById(`${plant}-qual-chart-wrap`);
  if (tableWrap) tableWrap.style.display = (displayMode === 'both' || displayMode === 'table') ? 'block' : 'none';
  if (chartWrap) chartWrap.style.display = (displayMode === 'both' || displayMode === 'chart') ? 'block' : 'none';

  const dataset = getQualityCompareDataset(plant, baseChartData);

  // 3. Render Comparison Table
  const tableEl = document.getElementById(`table-${plant}-qual`);
  if (tableEl) {
    const thead = tableEl.querySelector('thead');
    const tbody = tableEl.querySelector('tbody');
    const tfoot = tableEl.querySelector('tfoot');

    thead.innerHTML = `
      <tr>
        <th>วันที่ / ช่วงเวลา</th>
        ${selectedParams.map(p => `
          <th>
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:5px;"></span>${p.label}
            <span class="qual-th-sub">${p.stdText}</span>
          </th>
        `).join('')}
      </tr>
    `;

    if (dataset.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${selectedParams.length + 1}" style="text-align:center;color:var(--text-muted);padding:1.25rem;">ไม่พบข้อมูลในช่วงเวลาที่เลือก</td></tr>`;
      tfoot.innerHTML = '';
    } else {
      tbody.innerHTML = dataset.map(item => `
        <tr>
          <td>${item.x}</td>
          ${selectedParams.map(p => {
            const val = item[p.key];
            if (val === null || val === undefined) {
              return `<td><span style="color:var(--text-muted);">-</span></td>`;
            }
            const ok = p.isOk ? p.isOk(val) : true;
            const unitSuffix = p.unit === 'pH' ? '' : ` <small style="font-weight:400;opacity:0.75;">${p.unit}</small>`;
            return `<td><span class="qual-val-badge ${ok ? 'in-spec' : 'out-of-spec'}">${formatVal(val, p.decimals)}${unitSuffix}${!ok ? ' ⚠️' : ''}</span></td>`;
          }).join('')}
        </tr>
      `).join('');

      // Compute Average for Footer Row
      tfoot.innerHTML = `
        <tr>
          <td>ค่าเฉลี่ย (Average)</td>
          ${selectedParams.map(p => {
            let sum = 0;
            let count = 0;
            dataset.forEach(item => {
              const v = item[p.key];
              if (v !== null && v !== undefined) {
                sum += v;
                count++;
              }
            });
            if (count === 0) return `<td>-</td>`;
            const avg = sum / count;
            const ok = p.isOk ? p.isOk(avg) : true;
            const unitSuffix = p.unit === 'pH' ? '' : ` <small style="font-weight:400;opacity:0.75;">${p.unit}</small>`;
            return `<td><span class="qual-val-badge ${ok ? 'in-spec' : 'out-of-spec'}">${formatVal(avg, p.decimals)}${unitSuffix}${!ok ? ' ⚠️' : ''}</span></td>`;
          }).join('')}
        </tr>
      `;
    }
  }

  // 4. Render Side-by-Side Comparison Chart
  if (displayMode === 'both' || displayMode === 'chart') {
    const chartId = `chart-${plant}-qual-compare`;
    const isLine = state.chartTypes[chartId] === 'line';
    const categories = dataset.map(d => d.x);
    const series = selectedParams.map(p => ({
      name: `${p.shortLabel} (${p.unit})`,
      data: dataset.map(d => d[p.key])
    }));
    const colors = selectedParams.map(p => p.color);

    // Compute max value in dataset across selected parameters
    let maxVal = 0;
    dataset.forEach(d => {
      selectedParams.forEach(p => {
        const v = d[p.key];
        if (v !== null && v !== undefined && v > maxVal) maxVal = v;
      });
    });

    // Build Standard Reference Lines (annotations.yaxis)
    const yaxisAnnotations = [];
    let yMax = undefined;

    if (plant === 'ww') {
      // 2.1 ค่า COD Collecting Sump อยู่ที่ค่า 750 mg/L เป็นเส้นประสีส้ม
      if (selectedKeys.includes('cod_sump')) {
        yaxisAnnotations.push({
          y: 750,
          borderColor: '#f97316',
          borderWidth: 2,
          strokeDashArray: 5,
          label: {
            borderColor: '#f97316',
            style: { color: '#ffffff', background: '#f97316', fontSize: '10px', fontWeight: 600 },
            text: 'เกณฑ์ COD Collecting Sump 750 mg/L'
          }
        });
        yMax = Math.max(maxVal, 800);
      }
      // 2.2 ค่า COD Post Aeration อยู่ที่ค่า 120 mg/L เป็นเส้นประสีเขียว
      if (selectedKeys.includes('cod_post') || selectedKeys.includes('cod_online')) {
        yaxisAnnotations.push({
          y: 120,
          borderColor: '#16a34a',
          borderWidth: 2,
          strokeDashArray: 5,
          label: {
            borderColor: '#16a34a',
            style: { color: '#ffffff', background: '#16a34a', fontSize: '10px', fontWeight: 600 },
            text: 'เกณฑ์ COD Post Aeration 120 mg/L'
          }
        });
        if (!yMax) {
          yMax = Math.max(maxVal, 150);
        }
      }
    } else if (plant === 'water') {
      // 2.3 ค่าความขุ่น อยู่ที่ค่า 4 NTU เป็นเส้นประสีแดง
      if (selectedKeys.includes('turb_tap') || selectedKeys.includes('turb_raw')) {
        yaxisAnnotations.push({
          y: 4,
          borderColor: '#dc2626',
          borderWidth: 2,
          strokeDashArray: 5,
          label: {
            borderColor: '#dc2626',
            style: { color: '#ffffff', background: '#dc2626', fontSize: '10px', fontWeight: 600 },
            text: 'เกณฑ์ความขุ่น 4 NTU'
          }
        });
        yMax = Math.max(maxVal, 5);
      }
      // 2.4 ค่าคลอรีนคงเหลือ น้ำประปา อยู่ที่ค่า 0.2 mg/L เป็นเส้นประสีแดง
      if (selectedKeys.includes('chlorine')) {
        yaxisAnnotations.push({
          y: 0.2,
          borderColor: '#dc2626',
          borderWidth: 2,
          strokeDashArray: 5,
          label: {
            borderColor: '#dc2626',
            position: 'left',
            offsetX: 60,
            style: { color: '#ffffff', background: '#dc2626', fontSize: '10px', fontWeight: 600 },
            text: 'เกณฑ์คลอรีนคงเหลือ 0.2 mg/L'
          }
        });
        if (!yMax) {
          yMax = Math.max(maxVal, 1.5);
        }
      }
    }

    const chartOptions = {
      series: series,
      chart: {
        height: 300,
        type: isLine ? 'line' : 'bar',
        toolbar: { show: false }
      },
      colors: colors,
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: selectedParams.length > 2 ? '68%' : '52%',
          borderRadius: 3,
          dataLabels: {
            position: 'top'
          }
        }
      },
      dataLabels: {
        enabled: state.showDataLabels,
        offsetY: isLine ? -6 : -18,
        style: {
          fontSize: '9px',
          colors: ['#000000']
        }
      },
      stroke: isLine
        ? { show: true, width: 3, curve: 'smooth' }
        : { show: true, width: 2, colors: ['transparent'] },
      markers: {
        size: isLine ? 4 : 0
      },
      xaxis: {
        categories: categories
      },
      yaxis: {
        min: 0,
        max: yMax,
        title: {
          text: plant === 'ww' ? 'ค่าคุณภาพน้ำเสีย (mg/L)' : 'ค่าคุณภาพน้ำประปา'
        }
      },
      annotations: {
        yaxis: yaxisAnnotations
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left'
      },
      tooltip: {
        shared: true,
        intersect: false,
        custom: function({ series, seriesIndex, dataPointIndex, w }) {
          const item = dataset[dataPointIndex];
          if (!item) return '';
          let rowsHtml = selectedParams.map(p => {
            const val = item[p.key];
            const valStr = (val === null || val === undefined) ? '-' : `${formatVal(val, p.decimals)} ${p.unit === 'pH' ? '' : p.unit}`;
            const ok = (val !== null && val !== undefined && p.isOk) ? p.isOk(val) : true;
            return `<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
              <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:5px;"></span>${p.label}:</span>
              <b style="color:${ok ? '#0f172a' : '#dc2626'}">${valStr}${!ok ? ' ⚠️' : ''}</b>
            </div>`;
          }).join('');
          return `<div class="custom-tooltip">
            <div style="border-bottom:1px solid #e2e8f0;margin-bottom:4px;padding-bottom:4px;"><b>วันที่ / ช่วงเวลา: ${item.x}</b></div>
            ${rowsHtml}
          </div>`;
        }
      }
    };
    renderChart(chartId, chartOptions, state.chartTypes[chartId]);
  }
}

// 11. Toast Notifications
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  container.className = `toast show toast-${type}`;
  let icon = '<i class="lucide-check-circle-2"></i>';
  if (type === 'error') {
    icon = '<i class="lucide-alert-octagon"></i>';
  }
  container.innerHTML = `${icon} <span>${msg}</span>`;
  setTimeout(() => {
    container.classList.remove('show');
  }, 4000);
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => {
        console.log('Service Worker registered successfully:', reg.scope);
        // Force update check on every load
        reg.update();
        
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showToast("ตรวจพบฟังก์ชันใหม่! กำลังอัปเดตแดชบอร์ด...", "success");
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            }
          });
        });
      })
      .catch(err => console.log('Service Worker registration failed:', err));
  });
}
