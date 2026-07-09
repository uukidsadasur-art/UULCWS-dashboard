// State Management
let state = {
  viewMode: 'daily', // daily, weekly, monthly, yearly
  activeTab: 'overview', // overview, ww, water
  selectedYear: '2026',
  selectedMonth: '01',
  selectedDate: '2026-01-01',
  dataSource: 'preloaded',
  liveUrl: '',
  allData: []
};

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
  initData();
  setupEventListeners();
  initUI();
});

const SHEET_ID = '1TrzIgdqfWHTJpQWGnRiuujLyr_yNYxQA9oBriqOyM_k';
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

function fetchLiveData() {
  if (!state.liveUrl) {
    showToast('กรุณาระบุ URL ของ Google Sheets API ในเมนูตั้งค่า', 'error');
    setDataSource('preloaded');
    return;
  }

  document.getElementById('loader').style.display = 'flex';
  
  fetch(state.liveUrl)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(data => {
      if (data.error) throw new Error(data.error);
      if (!Array.isArray(data) || data.length === 0) throw new Error('Data format is invalid or empty');
      
      state.allData = data;
      showToast('ดึงข้อมูลสดสำเร็จ', 'success');
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
async function fetchAutoGoogleSheet() {
  document.getElementById('loader').style.display = 'flex';
  document.getElementById('loader').querySelector('span').textContent = 'กำลังโหลดข้อมูลสดจาก Google Sheet...';
  
  try {
    const qtyRes = await fetch(SHEET_QTY_URL);
    if (!qtyRes.ok) throw new Error('Cannot fetch Quantity sheet');
    const qtyText = await qtyRes.text();
    const qtyRows = parseCSV(qtyText);
    
    const qualRes = await fetch(SHEET_QUAL_URL);
    if (!qualRes.ok) throw new Error('Cannot fetch Quality sheet');
    const qualText = await qualRes.text();
    const qualRows = parseCSV(qualText);
    
    const records = {};
    
    // Parse Quantity (start from row index 4, i.e., Row 5 in Sheet)
    for (let i = 4; i < qtyRows.length; i++) {
      const row = qtyRows[i];
      if (!row || row.length < 2) continue;
      const dateStr = parseCSVDate(row[1]); // Col B
      if (!dateStr) continue;
      
      records[dateStr] = {
        date: dateStr,
        ww_qty_p1: parseCSVNum(row[3]),      // Col D
        ww_qty_p2: parseCSVNum(row[5]),      // Col F
        ww_qty_total: parseCSVNum(row[6]),   // Col G
        ww_qty_min: parseCSVNum(row[7]),     // Col H
        w_qty_p100: parseCSVNum(row[10]),    // Col K
        w_qty_p150: parseCSVNum(row[12]),    // Col M
        w_qty_total: parseCSVNum(row[13]),   // Col N
        w_qty_min: parseCSVNum(row[14]),     // Col O
        raw_qty_p1: parseCSVNum(row[17]),    // Col R
        raw_qty_p2: parseCSVNum(row[19]),    // Col T
        raw_qty_p3: parseCSVNum(row[21]),    // Col V
        raw_qty_total: parseCSVNum(row[22]), // Col W
        water_loss_pct: parseCSVNum(row[29]) // Col AD
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
      if (!row || row.length < 2) continue;
      const dateStr = parseCSVDate(row[1]); // Col B
      if (!dateStr || !records[dateStr]) continue;
      
      records[dateStr].turb_raw = parseCSVNum(row[2]);   // Col C
      records[dateStr].turb_tap = parseCSVNum(row[3]);   // Col D
      records[dateStr].chlorine = parseCSVNum(row[4]);   // Col E
      records[dateStr].ph_raw = parseCSVNum(row[5]);     // Col F
      records[dateStr].ph_tap = parseCSVNum(row[6]);     // Col G
      records[dateStr].cod_sump = parseCSVNum(row[7]);    // Col H
      records[dateStr].cod_post = parseCSVNum(row[8]);    // Col I
      records[dateStr].cod_online = parseCSVNum(row[9]);  // Col J
      records[dateStr].bod_online = parseCSVNum(row[10]); // Col K
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
    
    if (list.length === 0) throw new Error('No valid records parsed from sheet');
    
    state.allData = list;
    state.dataSource = 'live';
    updateSourceToggleUI();
    showToast('อัปเดตข้อมูลสดเชื่อมโยงอัตโนมัติจาก Google Sheet เรียบร้อย', 'success');
    processDataAndRender();
  } catch (err) {
    console.error('Auto Sheet Fetch failed:', err);
    showToast('เชื่อมโยงชีตอัตโนมัติไม่สำเร็จ กำลังใช้ข้อมูลออฟไลน์แทน', 'error');
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
    const d = String(parseInt(parts[0])).padStart(2, '0');
    const m = String(parseInt(parts[1])).padStart(2, '0');
    let y = parseInt(parts[2]);
    if (y > 2500) y -= 543;
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
  
  populateYearDropdown();
  populateMonthDropdown();
  populateDateDropdown();
  
  // Set default selected date to the last available date in the dataset
  const lastRec = state.allData[state.allData.length - 1];
  if (lastRec && lastRec.date) {
    state.selectedDate = lastRec.date;
    const parts = lastRec.date.split('-');
    state.selectedYear = parts[0];
    state.selectedMonth = parts[1];
    
    // Sync dropdowns
    document.getElementById('select-year').value = state.selectedYear;
    document.getElementById('select-month').value = state.selectedMonth;
    document.getElementById('select-date').value = state.selectedDate;
  }
  
  updateDashboard();
}

// 2. Dropdown Population
function populateYearDropdown() {
  const select = document.getElementById('select-year');
  select.innerHTML = '';
  const years = [...new Set(state.allData.map(r => r.date.split('-')[0]))].sort();
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = 'ปี ' + (parseInt(y) + 543);
    select.appendChild(opt);
  });
}

function populateMonthDropdown() {
  const select = document.getElementById('select-month');
  select.innerHTML = '';
  const activeYear = document.getElementById('select-year').value || state.selectedYear;
  const months = [...new Set(state.allData
    .filter(r => r.date.startsWith(activeYear))
    .map(r => r.date.split('-')[1])
  )].sort();
  
  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = THAI_MONTHS_FULL[m] || m;
    select.appendChild(opt);
  });
}

function populateDateDropdown() {
  const select = document.getElementById('select-date');
  select.innerHTML = '';
  const activeYear = document.getElementById('select-year').value || state.selectedYear;
  const activeMonth = document.getElementById('select-month').value || state.selectedMonth;
  
  const dates = state.allData
    .filter(r => r.date.startsWith(`${activeYear}-${activeMonth}`))
    .map(r => r.date)
    .sort();
    
  dates.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = formatShortDate(d);
    select.appendChild(opt);
  });
}

// 3. Event Listeners
function setupEventListeners() {
  // Time Resolution Tabs
  document.querySelectorAll('.time-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      state.viewMode = e.target.dataset.mode;
      
      const monthContainer = document.getElementById('select-month').parentNode;
      const dateContainer = document.getElementById('select-date').parentNode;
      
      if (state.viewMode === 'yearly') {
        monthContainer.style.display = 'none';
        dateContainer.style.display = 'none';
      } else if (state.viewMode === 'monthly') {
        monthContainer.style.display = 'block';
        dateContainer.style.display = 'none';
      } else {
        monthContainer.style.display = 'block';
        dateContainer.style.display = 'block';
      }
      
      updateDashboard();
    });
  });

  // Selectors Change Events
  document.getElementById('select-year').addEventListener('change', (e) => {
    state.selectedYear = e.target.value;
    populateMonthDropdown();
    populateDateDropdown();
    state.selectedMonth = document.getElementById('select-month').value || '01';
    state.selectedDate = document.getElementById('select-date').value || `${state.selectedYear}-${state.selectedMonth}-01`;
    updateDashboard();
  });

  document.getElementById('select-month').addEventListener('change', (e) => {
    state.selectedMonth = e.target.value;
    populateDateDropdown();
    state.selectedDate = document.getElementById('select-date').value || `${state.selectedYear}-${state.selectedMonth}-01`;
    updateDashboard();
  });

  document.getElementById('select-date').addEventListener('change', (e) => {
    state.selectedDate = e.target.value;
    updateDashboard();
  });

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
}

function initUI() {
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
  const currentRecord = state.allData.find(r => r.date === state.selectedDate) || {};
  
  // In daily mode, show daily values. In aggregated mode, show aggregated values.
  const activeRecord = (state.viewMode === 'daily') ? currentRecord : filtered.aggregatedRecord;

  updateKPIs(filtered.data, activeRecord);
  updateCharts(filtered.chartData);
  updateUnifiedReportWidget(activeRecord);
}

// 6. Filter & Aggregate Data
function getFilteredData() {
  const year = state.selectedYear;
  const month = state.selectedMonth;
  const date = state.selectedDate;
  
  let data = [];
  let chartData = [];
  let aggregatedRecord = {};
  
  if (state.viewMode === 'daily') {
    // Show data for the selected month to give context in daily charts
    data = state.allData.filter(r => r.date.startsWith(`${year}-${month}`));
    chartData = data.map(r => ({
      x: formatShortDate(r.date),
      rawX: r.date,
      ww_qty_p1: r.ww_qty_p1,
      ww_qty_p2: r.ww_qty_p2,
      ww_qty_total: r.ww_qty_total,
      ww_qty_min: r.ww_qty_min || 4300,
      w_qty_p100: r.w_qty_p100,
      w_qty_p150: r.w_qty_p150,
      w_qty_total: r.w_qty_total,
      w_qty_min: r.w_qty_min || 4800,
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
    
    // Check if the month has days > 28, if so, add Week 5
    const monthDaysCount = monthData.length;
    if (monthDaysCount > 28) {
      weeklyGroups['Week 5'] = [];
    }
    
    monthData.forEach(r => {
      const parts = r.date.split('-');
      if (parts.length < 3) return;
      const day = parseInt(parts[2]);
      
      if (day >= 1 && day <= 7) {
        weeklyGroups['Week 1'].push(r);
      } else if (day >= 8 && day <= 14) {
        weeklyGroups['Week 2'].push(r);
      } else if (day >= 15 && day <= 21) {
        weeklyGroups['Week 3'].push(r);
      } else if (day >= 22 && day <= 28) {
        weeklyGroups['Week 4'].push(r);
      } else if (day >= 29) {
        if (weeklyGroups['Week 5']) {
          weeklyGroups['Week 5'].push(r);
        } else {
          weeklyGroups['Week 4'].push(r);
        }
      }
    });
    
    // Convert to aggregated chart data list
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
    
    // Determine which week group the selected date belongs to
    const selectedParts = date.split('-');
    const selectedDay = parseInt(selectedParts[2]);
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
    // Monthly aggregation
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
    // Yearly aggregation
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
  
  return result;
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
  const wwVal = activeRec.ww_qty_total;
  const wVal = activeRec.w_qty_total;
  
  // KPI Numbers
  document.getElementById('ww-kpi-val').innerHTML = formatVal(wwVal, 0) + '<span class="kpi-unit">ลบ.ม.</span>';
  document.getElementById('water-kpi-val').innerHTML = formatVal(wVal, 0) + '<span class="kpi-unit">ลบ.ม.</span>';
  
  // Scaled contract values
  let wwMinTarget = STANDARDS.wwMinContract;
  let wMinTarget = STANDARDS.wMinContract;
  
  if (state.viewMode === 'weekly') {
    wwMinTarget = activeRec.ww_qty_min || (STANDARDS.wwMinContract * 7);
    wMinTarget = activeRec.w_qty_min || (STANDARDS.wMinContract * 7);
  } else if (state.viewMode === 'monthly') {
    // average days in month
    wwMinTarget = activeRec.ww_qty_min || (STANDARDS.wwMinContract * 30);
    wMinTarget = activeRec.w_qty_min || (STANDARDS.wMinContract * 30);
  } else if (state.viewMode === 'yearly') {
    wwMinTarget = activeRec.ww_qty_min || (STANDARDS.wwMinContract * 365);
    wMinTarget = activeRec.w_qty_min || (STANDARDS.wMinContract * 365);
  }
  
  const wwPct = wwVal && wwMinTarget ? ((wwVal / wwMinTarget) * 100).toFixed(1) : 0;
  const wPct = wVal && wMinTarget ? ((wVal / wMinTarget) * 100).toFixed(1) : 0;
  
  // Footer text
  const wwCompareText = document.getElementById('ww-compare-text');
  const wwTrendBadge = document.getElementById('ww-trend-badge');
  wwCompareText.textContent = `เกณฑ์ตามสัญญา (${formatVal(wwMinTarget, 0)} ลบ.ม.)`;
  if (wwVal >= wwMinTarget) {
    wwTrendBadge.className = 'trend-badge up';
    wwTrendBadge.innerHTML = `<i data-lucide="check-circle-2"></i> ${wwPct}%`;
  } else {
    wwTrendBadge.className = 'trend-badge down';
    wwTrendBadge.innerHTML = `<i data-lucide="alert-triangle"></i> ${wwPct}%`;
  }
  
  const wCompareText = document.getElementById('water-compare-text');
  const wTrendBadge = document.getElementById('water-trend-badge');
  wCompareText.textContent = `เกณฑ์ตามสัญญา (${formatVal(wMinTarget, 0)} ลบ.ม.)`;
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
  // Date Label
  const label = rec.dateLabel || ('ข้อมูลประจำวันที่ ' + formatShortDate(state.selectedDate));
  document.getElementById('report-date-label').textContent = label;
  
  // 1. ปริมาณน้ำดิบรวม
  document.getElementById('report-raw-total').textContent = formatVal(rec.raw_qty_total, 0) + ' ลบ.ม.';
  
  // 2. ปริมาณน้ำประปารวม
  document.getElementById('report-water-total').textContent = formatVal(rec.w_qty_total, 0) + ' ลบ.ม.';
  
  // 3. % น้ำสูญเสียเฉลี่ยสะสม
  document.getElementById('report-water-loss').textContent = formatVal(rec.water_loss_pct, 2) + ' %';
  
  // 4. ปริมาณน้ำเสีย
  document.getElementById('report-ww-total').textContent = formatVal(rec.ww_qty_total, 0) + ' ลบ.ม.';
  
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
  
  // 10.1 Wastewater Quantity Chart (Show only Total, breakdown in tooltip)
  const wwQtySeries = [
    {
      name: 'น้ำเสียรวมเข้าระบบ',
      type: 'column',
      data: chartData.map(c => c.ww_qty_total)
    },
    {
      name: 'เกณฑ์สัญญาขั้นต่ำ',
      type: 'line',
      data: chartData.map(c => c.ww_qty_min)
    }
  ];
  const wwQtyOptions = {
    series: wwQtySeries,
    chart: {
      height: 300,
      type: 'line',
      toolbar: { show: false }
    },
    colors: ['#3b82f6', '#ef4444'],
    stroke: {
      width: [0, 2],
      dashArray: [0, 5] // line series is dashed
    },
    plotOptions: {
      bar: { columnWidth: '45%', borderRadius: 3 }
    },
    dataLabels: { enabled: false }, // Turn off numbers on bars
    xaxis: { categories: categories },
    yaxis: {
      title: { text: 'ลบ.ม. / ช่วงเวลา' }
    },
    tooltip: {
      custom: function({series, seriesIndex, dataPointIndex, w}) {
        const item = chartData[dataPointIndex];
        return '<div class="custom-tooltip">' +
          '<div><b>ช่วงเวลา:</b> ' + item.x + '</div>' +
          '<div style="color:#2563eb"><b>น้ำเสียเข้าระบบรวม:</b> ' + formatVal(item.ww_qty_total, 0) + ' ลบ.ม.</div>' +
          '<div>Plant 1: ' + formatVal(item.ww_qty_p1, 0) + ' ลบ.ม.</div>' +
          '<div>Plant 2: ' + formatVal(item.ww_qty_p2, 0) + ' ลบ.ม.</div>' +
          '<div style="color:#ef4444; border-top: 1px solid #e2e8f0; margin-top:4px; padding-top:4px;">เกณฑ์ขั้นต่ำสัญญา: ' + formatVal(item.ww_qty_min, 0) + ' ลบ.ม.</div>' +
          '</div>';
      }
    }
  };
  renderChart('chart-ww-qty', wwQtyOptions);

  // 10.2 COD Collecting Sump vs Standard
  const codSumpSeries = [{
    name: 'COD Collecting Sump',
    data: chartData.map(c => c.cod_sump)
  }];
  const codSumpOptions = {
    series: codSumpSeries,
    chart: {
      height: 280,
      type: 'bar',
      toolbar: { show: false }
    },
    colors: ['#d97706'],
    plotOptions: {
      bar: { columnWidth: '40%', borderRadius: 3 }
    },
    dataLabels: { enabled: false },
    xaxis: { categories: categories },
    yaxis: { title: { text: 'COD (mg/L)' } },
    annotations: {
      yaxis: [{
        y: STANDARDS.codSumpMax,
        borderColor: '#dc2626',
        borderWidth: 2,
        strokeDashArray: 5,
        label: {
          borderColor: '#dc2626',
          style: { color: '#fff', background: '#dc2626' },
          text: `เกณฑ์สูงสุด ${STANDARDS.codSumpMax} mg/L`
        }
      }]
    }
  };
  renderChart('chart-cod-sump', codSumpOptions);

  // 10.3 COD Post Aeration Lab only vs 120 standard
  const codPostSeries = [{
    name: 'COD Post Aeration (Lab)',
    data: chartData.map(c => c.cod_post)
  }];
  const codPostOptions = {
    series: codPostSeries,
    chart: {
      height: 280,
      type: 'bar',
      toolbar: { show: false }
    },
    colors: ['#b45309'],
    plotOptions: {
      bar: { columnWidth: '40%', borderRadius: 3 }
    },
    dataLabels: { enabled: false },
    xaxis: { categories: categories },
    yaxis: { title: { text: 'COD (mg/L)' } },
    annotations: {
      yaxis: [{
        y: STANDARDS.codPostMax,
        borderColor: '#dc2626',
        borderWidth: 2,
        strokeDashArray: 5,
        label: {
          borderColor: '#dc2626',
          style: { color: '#fff', background: '#dc2626' },
          text: `เกณฑ์มาตรฐาน ${STANDARDS.codPostMax} mg/L`
        }
      }]
    }
  };
  renderChart('chart-cod-post', codPostOptions);

  // 10.4 Water Quantity (Distribution vs Contract)
  const wQtySeries = [
    {
      name: 'น้ำประปาจ่ายรวม',
      type: 'column',
      data: chartData.map(c => c.w_qty_total)
    },
    {
      name: 'เกณฑ์สัญญาขั้นต่ำ',
      type: 'line',
      data: chartData.map(c => c.w_qty_min)
    }
  ];
  const wQtyOptions = {
    series: wQtySeries,
    chart: {
      height: 300,
      type: 'line',
      toolbar: { show: false }
    },
    colors: ['#0284c7', '#ef4444'],
    stroke: {
      width: [0, 2],
      dashArray: [0, 5]
    },
    plotOptions: {
      bar: { columnWidth: '45%', borderRadius: 3 }
    },
    dataLabels: { enabled: false },
    xaxis: { categories: categories },
    yaxis: { title: { text: 'ลบ.ม. / ช่วงเวลา' } },
    tooltip: {
      custom: function({series, seriesIndex, dataPointIndex, w}) {
        const item = chartData[dataPointIndex];
        return '<div class="custom-tooltip">' +
          '<div><b>ช่วงเวลา:</b> ' + item.x + '</div>' +
          '<div style="color:#0284c7"><b>น้ำจ่ายรวม:</b> ' + formatVal(item.w_qty_total, 0) + ' ลบ.ม.</div>' +
          '<div>Plant 100: ' + formatVal(item.w_qty_p100, 0) + ' ลบ.ม.</div>' +
          '<div>Plant 150: ' + formatVal(item.w_qty_p150, 0) + ' ลบ.ม.</div>' +
          '<div style="color:#ef4444; border-top: 1px solid #e2e8f0; margin-top:4px; padding-top:4px;">เกณฑ์ขั้นต่ำสัญญา: ' + formatVal(item.w_qty_min, 0) + ' ลบ.ม.</div>' +
          '</div>';
      }
    }
  };
  renderChart('chart-water-qty', wQtyOptions);

  // 10.5 Raw Water Intake (Only Total column, breakdown in tooltip)
  const rawIntakeSeries = [{
    name: 'น้ำดิบเข้าระบบรวม',
    data: chartData.map(c => c.raw_qty_total)
  }];
  const rawIntakeOptions = {
    series: rawIntakeSeries,
    chart: {
      height: 280,
      type: 'bar',
      toolbar: { show: false }
    },
    colors: ['#0d9488'],
    plotOptions: {
      bar: { columnWidth: '40%', borderRadius: 3 }
    },
    dataLabels: { enabled: false },
    xaxis: { categories: categories },
    yaxis: { title: { text: 'ปริมาณน้ำดิบ (ลบ.ม.)' } },
    tooltip: {
      custom: function({series, seriesIndex, dataPointIndex, w}) {
        const item = chartData[dataPointIndex];
        return '<div class="custom-tooltip">' +
          '<div><b>ช่วงเวลา:</b> ' + item.x + '</div>' +
          '<div style="color:#0d9488"><b>ปริมาณน้ำดิบรวม:</b> ' + formatVal(item.raw_qty_total, 0) + ' ลบ.ม.</div>' +
          '<div>แพลนท์ 1: ' + formatVal(item.raw_qty_p1, 0) + ' ลบ.ม.</div>' +
          '<div>แพลนท์ 2: ' + formatVal(item.raw_qty_p2, 0) + ' ลบ.ม.</div>' +
          '<div>แพลนท์ 3: ' + formatVal(item.raw_qty_p3, 0) + ' ลบ.ม.</div>' +
          '</div>';
      }
    }
  };
  renderChart('chart-raw-intake', rawIntakeOptions);

  // 10.6 Raw Water pH with Max/Min highlight area (Line Chart)
  const phSeries = [{
    name: 'pH น้ำดิบ',
    data: chartData.map(c => c.ph_raw)
  }];
  const phOptions = {
    series: phSeries,
    chart: {
      height: 280,
      type: 'line',
      toolbar: { show: false }
    },
    colors: ['#0284c7'],
    stroke: { width: 3 },
    dataLabels: { enabled: false },
    xaxis: { categories: categories },
    yaxis: {
      min: 4,
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
  renderChart('chart-ph-raw', phOptions);
}

function renderChart(containerId, options) {
  if (charts[containerId]) {
    charts[containerId].updateOptions(options);
  } else {
    const el = document.getElementById(containerId);
    if (el) {
      charts[containerId] = new ApexCharts(el, options);
      charts[containerId].render();
    }
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
