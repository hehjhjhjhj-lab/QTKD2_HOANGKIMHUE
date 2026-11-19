// ==============================================================================
// HOANG KIM HUE PROJECT - 5-STEP WEB AI AGENT DATA ANALYTICS (app.js)
// Tác giả: Hoàng Kim Huệ | Lead AI & Data Intelligence Specialist
// Kiến trúc: Quy trình hoạt động 5 bước của Web AI Agent phân tích dữ liệu
// ==============================================================================

// Global States
window.currentDataset = [];
window.rawDataset = [];
window.datasetMetadata = {
    fileName: "",
    rowCount: 0,
    columns: [],
    numericColumns: [],
    categoricalColumns: [],
    primaryMetric: null,
    categoryMetric: null,
    idMetric: null,
    totalSum: 0,
    averageVal: 0,
    anomaliesCount: 0,
    sampleRows: [],
    userQuery: ""
};

// Session Memory for Chat
window.sessionMemory = [];

// ==============================================================================
// 1. NAVIGATION & FORMATTING HELPERS
// ==============================================================================

const PROTECTED_TABS = ['tab-step1', 'tab-step23', 'tab-step4', 'tab-step5', 'tab-copilot', 'tab-export'];

function switchNavTab(paneId, btn) {
    if (paneId === 'tab-workflow') paneId = 'tab-intro';

    // Require account login before processing data
    if (PROTECTED_TABS.includes(paneId) && typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) {
        openAuthModal('login', () => switchNavTab(paneId), 'Vui lòng đăng nhập tài khoản trước khi sử dụng tính năng xử lý & phân tích dữ liệu.');
        return;
    }

    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.neo-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));

    const targetPane = document.getElementById(paneId);
    if (targetPane) {
        targetPane.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const btnMap = {
        'tab-intro': 0,
        'tab-step1': 1,
        'tab-step23': 2,
        'tab-step4': 3,
        'tab-step5': 4,
        'tab-copilot': 5,
        'tab-export': 6,
        'tab-feedback': 7
    };

    if (btn) {
        btn.classList.add('active');
    } else {
        const idx = btnMap[paneId] !== undefined ? btnMap[paneId] : 0;
        const buttons = document.querySelectorAll('.neo-tab-btn');
        if (buttons[idx]) buttons[idx].classList.add('active');
    }

    // Sync floating bottom pill nav
    const bottomMap = {
        'tab-intro': 'bottom-nav-intro',
        'tab-step1': 'bottom-nav-data',
        'tab-step23': 'bottom-nav-data',
        'tab-step4': 'bottom-nav-data',
        'tab-step5': 'bottom-nav-data',
        'tab-export': 'bottom-nav-report',
        'tab-copilot': 'bottom-nav-copilot',
        'tab-feedback': 'bottom-nav-feedback'
    };
    const bEl = document.getElementById(bottomMap[paneId] || 'bottom-nav-intro');
    if (bEl) bEl.classList.add('active');

    if (paneId === 'tab-step23' && typeof renderStep2CleanedTable === 'function') {
        renderStep2CleanedTable();
    }
    if (paneId === 'tab-step4') {
        if (typeof populateStep4Controls === 'function') populateStep4Controls();
        renderStudioDashboard();
        renderStep4Insights();
    }
    if (paneId === 'tab-export' && typeof renderFinalExecutiveReport === 'function') {
        renderFinalExecutiveReport();
    }
    if (paneId === 'tab-feedback' && typeof renderFeedbackSection === 'function') {
        renderFeedbackSection();
    }

    try { history.replaceState(null, null, '#' + paneId); } catch(e) {}
}

function switchTab(paneId, evt) {
    if (evt && evt.preventDefault) evt.preventDefault();
    if (paneId === 'tab-workflow') paneId = 'tab-intro';
    if (PROTECTED_TABS.includes(paneId) && typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) {
        openAuthModal('login', () => switchTab(paneId), 'Vui lòng đăng nhập tài khoản để tiếp tục xử lý & phân tích dữ liệu.');
        return;
    }
    const btnMap = {
        'tab-intro': 0,
        'tab-step1': 1,
        'tab-step23': 2,
        'tab-step4': 3,
        'tab-step5': 4,
        'tab-copilot': 5,
        'tab-export': 6,
        'tab-feedback': 7
    };
    const idx = btnMap[paneId] !== undefined ? btnMap[paneId] : 0;
    const buttons = document.querySelectorAll('.neo-tab-btn');
    switchNavTab(paneId, buttons[idx]);
}

function formatSmartNumber(val, colName) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    const num = Number(val);
    const colLower = (colName || '').toLowerCase();

    if (colLower.includes('pct') || colLower.includes('rate') || colLower.includes('tỷ lệ') || colLower.includes('%')) {
        return num.toFixed(1) + "%";
    }

    if (colLower.includes('score') || colLower.includes('điểm') || (num <= 100 && num >= 0 && Number.isInteger(num))) {
        return num.toString() + " đ";
    }

    if (Math.abs(num) >= 1000000000) return (num / 1000000000).toFixed(2) + " Tỷ";
    if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + " Tr";
    if (Math.abs(num) >= 1000) return Math.round(num).toLocaleString('vi-VN');
    
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
}

// ==============================================================================
// 2. MASTER NUMBER & CSV PARSING ENGINE
// ==============================================================================

function smartParseNumber(val) {
    if (val === null || val === undefined) return NaN;
    if (typeof val === 'number') return isNaN(val) ? NaN : val;
    let s = String(val).trim();
    if (!s || s === '-' || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'null') return NaN;

    let isNegative = false;
    if (s.startsWith('(') && s.endsWith(')')) {
        isNegative = true;
        s = s.slice(1, -1).trim();
    } else if (s.startsWith('-')) {
        isNegative = true;
        s = s.slice(1).trim();
    }

    let multiplier = 1;
    const sLower = s.toLowerCase();
    if (sLower.includes('tỷ') || sLower.includes('ty') || sLower.includes('billion')) {
        multiplier = 1000000000;
        s = s.replace(/tỷ|ty|billion/gi, '').trim();
    } else if (sLower.includes('triệu') || sLower.includes('trieu') || sLower.includes('million') || sLower.includes('tr')) {
        multiplier = 1000000;
        s = s.replace(/triệu|trieu|million|tr/gi, '').trim();
    } else if (sLower.includes('k') || sLower.includes('nghìn') || sLower.includes('nghin')) {
        multiplier = 1000;
        s = s.replace(/nghìn|nghin|k/gi, '').trim();
    }

    s = s.replace(/[^0-9.,]/g, '').trim();
    if (!s) return NaN;

    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');

    if (lastDot !== -1 && lastComma !== -1) {
        if (lastComma > lastDot) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
    } else if (lastDot !== -1) {
        const dotCount = (s.match(/\./g) || []).length;
        if (dotCount > 1) {
            s = s.replace(/\./g, '');
        } else {
            const parts = s.split('.');
            if (parts[1].length === 3 && parts[0].length >= 1) {
                s = parts[0] + parts[1];
            }
        }
    } else if (lastComma !== -1) {
        const commaCount = (s.match(/,/g) || []).length;
        if (commaCount > 1) {
            s = s.replace(/,/g, '');
        } else {
            const parts = s.split(',');
            if (parts[1].length === 3) {
                s = parts[0] + parts[1];
            } else {
                s = s.replace(',', '.');
            }
        }
    }

    const num = parseFloat(s);
    if (isNaN(num)) return NaN;
    const finalVal = num * multiplier;
    return isNegative ? -finalVal : finalVal;
}

function detectDelimiter(text) {
    const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return ',';
    const firstLine = lines[0];
    const delims = [',', ';', '\t', '|'];
    let bestDelim = ',';
    let maxCount = 0;
    delims.forEach(d => {
        let count = 0;
        let inQuotes = false;
        for (let i = 0; i < firstLine.length; i++) {
            const c = firstLine[i];
            if (c === '"' || c === "'") inQuotes = !inQuotes;
            else if (c === d && !inQuotes) count++;
        }
        if (count > maxCount) {
            maxCount = count;
            bestDelim = d;
        }
    });
    return bestDelim;
}

function parseCSVAdvanced(text) {
    if (!text) return [];
    text = text.replace(/^\uFEFF/, '').trim();
    if (!text) return [];

    const delim = detectDelimiter(text);
    const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return [];

    function parseLine(line, delimiter) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    const headers = parseLine(lines[0], delim).map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i], delim);
        if (values.length > 0 && values.some(v => v.trim() !== '')) {
            const obj = {};
            headers.forEach((h, idx) => {
                if (h) obj[h] = (values[idx] || '').trim();
            });
            rows.push(obj);
        }
    }
    return rows;
}

// ==============================================================================
// 3. THE 5-STEP AI AGENT WORKFLOW CONTROLLER
// ==============================================================================

/**
 * BƯỚC 1: Tiếp nhận Dữ liệu & Yêu cầu (User Upload & Query)
 * Trích xuất metadata, lấy mẫu 5-10 dòng làm ngữ cảnh cho AI
 */
function handleUniversalUpload(file) {
    if (!file) return;
    if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) {
        openAuthModal('login', () => handleUniversalUpload(file), 'Vui lòng đăng nhập tài khoản trước khi tải lên và xử lý tệp dữ liệu.');
        return;
    }

    const fileName = file.name.toLowerCase();

    // Excel support (.xlsx, .xls)
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        if (typeof XLSX === 'undefined') {
            alert('Thư viện đọc Excel (SheetJS) chưa tải xong hoặc mạng gián đoạn. Vui lòng thử lại hoặc lưu tệp dạng .CSV!');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.SheetNames[0];
                const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });
                executeStep1_Ingestion(rawRows, file.name);
            } catch(err) {
                alert('Lỗi đọc tệp Excel: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    // CSV, JSON, TXT
    const reader = new FileReader();
    reader.onload = function(e) {
        let rows = [];
        try {
            if (fileName.endsWith('.json')) {
                rows = JSON.parse(e.target.result);
                if (!Array.isArray(rows)) rows = [rows];
            } else {
                rows = parseCSVAdvanced(e.target.result);
            }
        } catch(err) {
            alert('Lỗi phân tích tệp dữ liệu: ' + err.message);
            return;
        }

        if (rows.length === 0) {
            alert('Tệp rỗng hoặc không có dữ liệu hợp lệ.');
            return;
        }

        executeStep1_Ingestion(rows, file.name);
    };
    reader.readAsText(file, 'UTF-8');
}

function executeStep1_Ingestion(rawRows, fileName) {
    window.rawDataset = rawRows;
    const firstRow = rawRows[0];
    const columns = Object.keys(firstRow);

    // Profile types
    const numericColumns = [];
    const categoricalColumns = [];
    let idMetric = null;

    columns.forEach(col => {
        let numericCount = 0;
        const uniqueVals = new Set();

        rawRows.slice(0, 50).forEach(r => {
            const val = r[col];
            const parsed = smartParseNumber(val);
            if (!isNaN(parsed)) numericCount++;
            if (val !== undefined && val !== null && String(val).trim() !== '') {
                uniqueVals.add(String(val).trim());
            }
        });

        const isNumeric = numericCount >= Math.min(rawRows.length, 50) * 0.6;
        if (isNumeric) {
            numericColumns.push(col);
        } else {
            const colLower = col.toLowerCase();
            if (!idMetric && (colLower.includes('id') || colLower.includes('mã') || colLower.includes('tên') || colLower.includes('name') || colLower.includes('title'))) {
                idMetric = col;
            }
            if (uniqueVals.size <= 35 && uniqueVals.size > 1) {
                categoricalColumns.push(col);
            }
        }
    });

    if (!idMetric && columns.length > 0) idMetric = columns[0];

    // Primary metrics
    let primaryMetric = null;
    if (numericColumns.length > 0) {
        primaryMetric = numericColumns.find(c => {
            const l = c.toLowerCase();
            return l.includes('revenue') || l.includes('doanh thu') || l.includes('sales') || l.includes('profit') || l.includes('lợi nhuận') || l.includes('score') || l.includes('amount') || l.includes('tiền');
        }) || numericColumns[0];
    }
    let categoryMetric = categoricalColumns.length > 0 ? categoricalColumns[0] : null;

    // Extract 5-10 sample rows for AI Context Window (tiết kiệm token, bảo mật)
    const sampleRows = rawRows.slice(0, 8);

    window.datasetMetadata = {
        fileName: fileName || "Du_lieu_tai_len",
        rowCount: rawRows.length,
        columns: columns,
        numericColumns: numericColumns,
        categoricalColumns: categoricalColumns,
        primaryMetric: primaryMetric,
        categoryMetric: categoryMetric,
        idMetric: idMetric,
        totalSum: 0,
        averageVal: 0,
        anomaliesCount: 0,
        sampleRows: sampleRows,
        userQuery: document.getElementById('userGoalInput') ? document.getElementById('userGoalInput').value.trim() : ""
    };

    // Render Step 1 Metadata UI Preview
    renderStep1Preview();

    // Auto-advance to Step 2, 3, 4, 5
    runFull5StepWorkflow();
}

function renderStep1Preview() {
    const metaBox = document.getElementById('step1MetadataBox');
    if (!metaBox) return;

    const meta = window.datasetMetadata;
    metaBox.style.display = 'block';

    let html = `
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:14px; margin-top:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
                <span style="font-weight:900; color:#1E293B;">📋 METADATA TRÍCH XUẤT TỰ ĐỘNG (BƯỚC 1):</span>
                <span class="tag-pill purple">${meta.fileName} • ${meta.rowCount} dòng • ${meta.columns.length} cột</span>
            </div>
            <div style="font-size:12.5px; color:#475569; margin-bottom:10px;">
                <b>Cột Số Liệu:</b> ${meta.numericColumns.join(', ') || 'Không có'} | 
                <b>Cột Phân Loại:</b> ${meta.categoricalColumns.join(', ') || 'Không có'} | 
                <b>Khóa Thực Thể:</b> ${meta.idMetric}
            </div>
            <div style="font-size:11.5px; font-weight:800; color:#0F172A; margin-bottom:4px;">🔍 Mẫu 5-8 dòng được chọn làm Ngữ cảnh (Context) cho AI:</div>
            <div style="overflow-x:auto; background:#FFF; border:1px solid #CBD5E1; border-radius:8px;">
                <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
                    <thead style="background:#F1F5F9;">
                        <tr>${meta.columns.map(c => `<th style="padding:6px 10px; text-align:left; border-bottom:1px solid #CBD5E1;">${c}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${meta.sampleRows.map(r => `<tr>${meta.columns.map(c => `<td style="padding:6px 10px; border-bottom:1px solid #F1F5F9;">${r[c] !== undefined ? r[c] : ''}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    metaBox.innerHTML = html;
}

/**
 * BƯỚC 2: Lập Kế Hoạch & Sinh Mã (Planning & Code Generation - Python / SQL)
 * BƯỚC 3: Thực Thi & Tự Sửa Lỗi Trong Sandbox (Execution & Self-Reflection in Docker/E2B)
 * BƯỚC 4: Trực Quan Hóa & Phân Tích (Visualization & Natural Business Insights)
 * BƯỚC 5: Hiển Thị & Tương Tác (Interactive Table, Memory Chat & Export)
 */
window._manuallyDeletedRowNums = new Set();

function useQuickCleanPrompt(text) {
    const inp = document.getElementById('customCleanPrompt');
    if (inp) {
        inp.value = text;
        applyCustomCleaning();
    }
}

function deleteCleanedRow(origRowNum) {
    if (!window._manuallyDeletedRowNums) window._manuallyDeletedRowNums = new Set();
    window._manuallyDeletedRowNums.add(Number(origRowNum));
    runFull5StepWorkflow(true);
    showNotification(`🗑️ Đã xóa dòng #${origRowNum} khỏi dữ liệu sạch & cập nhật lại Báo cáo!`);
}

function applyCustomCleaning() {
    if (!window.rawDataset || window.rawDataset.length === 0) {
        showNotification('⚠️ Chưa có dữ liệu! Vui lòng nạp tệp ở Bước 1 trước khi làm sạch.');
        return;
    }
    runFull5StepWorkflow(true);
}

function resetCustomCleaning() {
    window._manuallyDeletedRowNums = new Set();
    const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = v; };
    setChk('cleanOptDedup', true);
    setChk('cleanOptTrim', true);
    setChk('cleanOptDropCanceled', false);
    setChk('cleanOptDropNonPositive', false);
    setChk('cleanOptDropOutliers', false);

    const miss = document.getElementById('cleanOptMissing');
    if (miss) miss.value = 'default';
    const cas = document.getElementById('cleanOptCase');
    if (cas) cas.value = 'keep';
    const prm = document.getElementById('customCleanPrompt');
    if (prm) prm.value = '';

    if (window.rawDataset && window.rawDataset.length > 0) {
        if (window.datasetMetadata && Array.isArray(window.datasetMetadata._origColumns)) {
            window.datasetMetadata.columns = window.datasetMetadata._origColumns.slice();
        }
        runFull5StepWorkflow(true);
        showNotification('🔄 Đã khôi phục toàn bộ dòng gốc và quy tắc làm sạch mặc định!');
    }
}

function toTitleCaseVi(str) {
    return String(str).toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
}

function normalizeTextNoAccent(str) {
    return String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .trim();
}

function parseThresholdWithUnit(numStr, unitStr) {
    let val = smartParseNumber(numStr);
    if (isNaN(val)) return NaN;
    const u = normalizeTextNoAccent(unitStr || '');
    if (u === 'ty' || u === 'b' || u === 'billion') val *= 1e9;
    else if (u === 'trieu' || u === 'tr' || u === 'm' || u === 'million') val *= 1e6;
    else if (u === 'nghin' || u === 'ngan' || u === 'k') val *= 1e3;
    return val;
}

function resolveTargetNumericColumn(clause, activeCols, meta) {
    const cNorm = normalizeTextNoAccent(clause);
    const numCols = (meta.numericColumns || []).filter(c => activeCols.includes(c));
    // Direct column name match first
    for (const col of numCols) {
        const colNorm = normalizeTextNoAccent(col);
        if (colNorm && cNorm.includes(colNorm)) return col;
    }
    // Vietnamese alias matching
    const aliasMap = [
        { words: ['doanh thu', 'doanh so', 'tien', 'gia tri', 'don hang', 'revenue', 'amount', 'sales'], keys: ['revenue', 'amount', 'doanh_thu', 'total', 'sales', 'price'] },
        { words: ['loi nhuan', 'lai', 'profit'], keys: ['profit', 'loi_nhuan', 'lai'] },
        { words: ['chi phi', 'gia von', 'cost', 'cogs'], keys: ['cost', 'cogs', 'chi_phi'] },
        { words: ['tang truong', 'growth'], keys: ['growth', 'tang_truong'] },
        { words: ['diem', 'score'], keys: ['score', 'diem'] },
        { words: ['so luong', 'qty', 'quantity'], keys: ['qty', 'quantity', 'so_luong'] }
    ];
    for (const group of aliasMap) {
        if (group.words.some(w => cNorm.includes(w))) {
            const match = numCols.find(c => group.keys.some(k => c.toLowerCase().includes(k)));
            if (match) return match;
        }
    }
    return (meta.primaryMetric && activeCols.includes(meta.primaryMetric)) ? meta.primaryMetric : (numCols[0] || null);
}

function runFull5StepWorkflow(stayOnStep2) {
    if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) {
        openAuthModal('login', () => runFull5StepWorkflow(stayOnStep2), 'Vui lòng đăng nhập tài khoản trước khi chạy phân tích dữ liệu.');
        return;
    }

    const meta = window.datasetMetadata;
    const rawRows = window.rawDataset;
    if (!rawRows || rawRows.length === 0) return;

    if (!window._manuallyDeletedRowNums) window._manuallyDeletedRowNums = new Set();

    // When a brand-new file is loaded (not staying on step 2), reset manual deletes & column backup
    if (!stayOnStep2) {
        window._manuallyDeletedRowNums = new Set();
        meta._origColumns = (meta.columns || []).slice();
    } else if (!meta._origColumns) {
        meta._origColumns = (meta.columns || []).slice();
    }
    let activeCols = meta._origColumns.slice();

    const wfBox = document.getElementById('step2To5Container');
    if (wfBox) wfBox.style.display = 'block';

    // --- ĐỌC QUY TẮC LÀM SẠCH THEO YÊU CẦU CỦA KHÁCH HÀNG ---
    const promptText = (document.getElementById('customCleanPrompt')?.value || '').trim();

    let optDedup = document.getElementById('cleanOptDedup') ? document.getElementById('cleanOptDedup').checked : true;
    let optTrim = document.getElementById('cleanOptTrim') ? document.getElementById('cleanOptTrim').checked : true;
    let optDropCanceled = document.getElementById('cleanOptDropCanceled') ? document.getElementById('cleanOptDropCanceled').checked : false;
    let optDropNonPos = document.getElementById('cleanOptDropNonPositive') ? document.getElementById('cleanOptDropNonPositive').checked : false;
    let optDropOutliers = document.getElementById('cleanOptDropOutliers') ? document.getElementById('cleanOptDropOutliers').checked : false;
    let optMissing = document.getElementById('cleanOptMissing') ? document.getElementById('cleanOptMissing').value : 'default';
    let optCase = document.getElementById('cleanOptCase') ? document.getElementById('cleanOptCase').value : 'keep';

    const appliedRules = [];
    const deleteRowNums = new Set(window._manuallyDeletedRowNums);
    const numericRules = [];
    const removeKeywords = [];
    const keepKeywords = [];
    const replaceRules = [];

    // Hỗ trợ nhiều câu lệnh nối nhau bằng dấu ; hoặc xuống dòng
    const clauses = promptText
        ? promptText.split(/[;\n]+/).map(s => s.trim()).filter(Boolean)
        : [];

    clauses.forEach(clause => {
        const cLow = clause.toLowerCase();
        const cNorm = normalizeTextNoAccent(clause);
        let handled = false;

        // 1. Xóa N dòng đầu / N dòng cuối: "xóa 3 dòng đầu", "xóa 2 dòng cuối"
        const headTailMatch = cNorm.match(/(?:xoa|bo|loai)\s+(\d+)\s+(?:dong|hang|ban ghi)\s+(dau|cuoi)/);
        if (headTailMatch) {
            const cnt = parseInt(headTailMatch[1], 10);
            const where = headTailMatch[2];
            if (cnt > 0) {
                if (where === 'dau') {
                    for (let i = 1; i <= Math.min(cnt, rawRows.length); i++) deleteRowNums.add(i);
                    appliedRules.push(`Xóa ${cnt} dòng đầu`);
                } else {
                    for (let i = Math.max(1, rawRows.length - cnt + 1); i <= rawRows.length; i++) deleteRowNums.add(i);
                    appliedRules.push(`Xóa ${cnt} dòng cuối`);
                }
                handled = true;
            }
        }

        // 2. Xóa khoảng dòng: "xóa dòng 1 đến 5", "xóa dòng 2-6", "xóa từ dòng 3 tới 5"
        const rangeMatch = cNorm.match(/(?:xoa|bo|loai)[^0-9]*(?:dong|hang|so)\s*(\d+)\s*(?:den|toi|-|->)\s*(?:dong|hang|so)?\s*(\d+)/);
        if (!handled && rangeMatch) {
            const a = Math.min(parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10));
            const b = Math.max(parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10));
            for (let i = a; i <= b; i++) deleteRowNums.add(i);
            appliedRules.push(`Xóa dòng ${a} → ${b}`);
            handled = true;
        }

        // 3. Xóa theo danh sách số thứ tự dòng: "xóa dòng 1", "xóa dòng 1, 3, 5", "xóa hàng số 2 và 4"
        const rowNumListMatch = cNorm.match(/(?:xoa|bo|loai)\s+(?:cac\s+|nhung\s+)?(?:dong|hang)\s*(?:so|thu|#)?\s*([\d,\s]+(?:va\s*\d+)*)$/);
        if (!handled && rowNumListMatch) {
            const nums = rowNumListMatch[1].match(/\d+/g) || [];
            if (nums.length > 0) {
                nums.forEach(n => deleteRowNums.add(parseInt(n, 10)));
                appliedRules.push(`Xóa dòng #${nums.join(', #')}`);
                handled = true;
            }
        }

        // 4. Xóa cột: "xóa cột region"
        const dropColMatch = clause.match(/(?:xóa|bỏ|loại(?:\s+bỏ)?)\s+cột\s+['"]?([a-zA-Z0-9_\u00C0-\u1EF9\s]+?)['"]?$/i);
        if (!handled && dropColMatch && dropColMatch[1]) {
            const targetColNorm = normalizeTextNoAccent(dropColMatch[1]);
            const foundCol = activeCols.find(c => normalizeTextNoAccent(c) === targetColNorm || normalizeTextNoAccent(c).includes(targetColNorm));
            if (foundCol && activeCols.length > 1) {
                activeCols = activeCols.filter(c => c !== foundCol);
                appliedRules.push(`Xóa cột "${foundCol}"`);
                handled = true;
            }
        }

        // 5. Đổi / thay thế giá trị: "đổi X thành Y" / "thay X bằng Y"
        const repMatch = clause.match(/(?:đổi|thay thế|thay)\s+['"]?([^'"]+?)['"]?\s+(?:thành|bằng|->)\s+['"]?([^'"]+)['"]?$/i);
        if (!handled && repMatch && repMatch[1] && repMatch[2]) {
            replaceRules.push({ from: repMatch[1].trim(), to: repMatch[2].trim() });
            appliedRules.push(`Đổi "${repMatch[1].trim()}" → "${repMatch[2].trim()}"`);
            handled = true;
        }

        // 6. Các từ khóa quy tắc chuẩn (hủy, ô trống, trung bình, ngoại lai, âm/<=0, chữ hoa/thường)
        if (!handled && /(huy|cancel)/.test(cNorm) && /(xoa|loai|bo)/.test(cNorm)) {
            optDropCanceled = true;
            const el = document.getElementById('cleanOptDropCanceled'); if (el) el.checked = true;
            handled = true;
        }
        if (!handled && /(xoa|loai|bo)/.test(cNorm) && /(trong|null|rong|thieu)/.test(cNorm)) {
            optMissing = 'drop';
            const el = document.getElementById('cleanOptMissing'); if (el) el.value = 'drop';
            handled = true;
        }
        if (!handled && /(trung binh|mean)/.test(cNorm)) {
            optMissing = 'mean';
            const el = document.getElementById('cleanOptMissing'); if (el) el.value = 'mean';
            handled = true;
        }
        if (!handled && /(ngoai lai|outlier|iqr)/.test(cNorm)) {
            optDropOutliers = true;
            const el = document.getElementById('cleanOptDropOutliers'); if (el) el.checked = true;
            handled = true;
        }
        if (!handled && /(in hoa|chu hoa)/.test(cNorm)) { optCase = 'upper'; handled = true; }
        else if (!handled && /(chu thuong)/.test(cNorm)) { optCase = 'lower'; handled = true; }
        else if (!handled && /(viet hoa chu dau)/.test(cNorm)) { optCase = 'title'; handled = true; }

        // 7. Điều kiện so sánh số (<= và >= PHẢI đứng trước < và >!)
        const numMatch = clause.match(/(xóa|loại bỏ|loại|bỏ|lọc|chỉ giữ|giữ lại|giữ)?[^0-9<>!=]*(nhỏ hơn hoặc bằng|bé hơn hoặc bằng|lớn hơn hoặc bằng|nhỏ hơn|bé hơn|dưới|lớn hơn|trên|khác|bằng|<=|>=|!=|<|>|=)\s*([+-]?[0-9][0-9.,]*)\s*(tỷ|ty|triệu|trieu|tr|nghìn|nghin|ngàn|ngan|k|m|b)?/i);
        if (!handled && numMatch && numMatch[2] && numMatch[3]) {
            const actionVerb = normalizeTextNoAccent(numMatch[1] || '');
            const opNorm = normalizeTextNoAccent(numMatch[2]);
            const threshold = parseThresholdWithUnit(numMatch[3], numMatch[4]);
            const colTarget = resolveTargetNumericColumn(clause, activeCols, meta);
            if (!isNaN(threshold) && colTarget) {
                const isRemoveAction = actionVerb.includes('xoa') || actionVerb.includes('loai') || actionVerb.includes('bo') || (!actionVerb.includes('giu') && !actionVerb.includes('loc') && cNorm.startsWith('xoa'));
                numericRules.push({ col: colTarget, op: opNorm, threshold, isRemoveAction });
                appliedRules.push(`${isRemoveAction ? 'Xóa dòng' : 'Giữ dòng'} ${colTarget} ${numMatch[2]} ${numMatch[3]}${numMatch[4] ? ' ' + numMatch[4] : ''}`);
                handled = true;
            }
        }

        // 8. Chỉ giữ dòng chứa từ khóa: "chỉ giữ Completed", "giữ lại Công nghệ"
        const keepMatch = clause.match(/(?:chỉ giữ|giữ lại|lọc lấy|lọc)\s+(?:các\s+|những\s+)?(?:dòng\s+|đơn\s+|bản ghi\s+)?(?:có\s+|chứa\s+)?(?:trạng thái\s+|danh mục\s+|sản phẩm\s+|khách hàng\s+|khu vực\s+|ngành\s+|nhóm\s+|tên\s+)?(?:là\s+|=?\s*)?['"]?([^'"]+)['"]?$/i);
        if (!handled && keepMatch && keepMatch[1]) {
            const kw = keepMatch[1].trim();
            if (kw.length > 0) {
                keepKeywords.push(kw);
                appliedRules.push(`Chỉ giữ dòng chứa "${kw}"`);
                handled = true;
            }
        }

        // 9. Xóa dòng chứa BẤT KỲ từ khóa / mã / trạng thái / sản phẩm / khách hàng nào:
        //    VD: "xóa dòng ENT-08", "xóa dòng có trạng thái Processing", "xóa Nam Hải", "loại bỏ Bán lẻ"
        const remKwMatch = clause.match(/(?:xóa|loại bỏ|loại|bỏ)\s+(?:tất cả\s+|hết\s+)?(?:các\s+|những\s+)?(?:dòng|hàng|đơn hàng|đơn|bản ghi|khách hàng|sản phẩm|công ty|mục)?\s*(?:có\s+|chứa\s+|mang\s+)?(?:trạng thái|tình trạng|danh mục|sản phẩm|dịch vụ|khách hàng|mã khách|mã đơn|khu vực|ngành|nhóm|tên|mã|cột)?\s*(?:là|bằng|=|:)?\s*['"]?([^'"]+)['"]?$/i);
        if (!handled && remKwMatch && remKwMatch[1]) {
            const kw = remKwMatch[1].trim();
            if (kw.length > 0 && !/^(dòng|hàng|đơn|bản ghi)$/i.test(kw)) {
                removeKeywords.push(kw);
                appliedRules.push(`Xóa dòng chứa "${kw}"`);
                handled = true;
            }
        }
    });

    meta.columns = activeCols;

    if (window._manuallyDeletedRowNums.size > 0) {
        appliedRules.push(`Xóa thủ công ${window._manuallyDeletedRowNums.size} dòng`);
    }

    const colMeans = {};
    if (optMissing === 'mean') {
        meta.numericColumns.forEach(nc => {
            let s = 0, c = 0;
            rawRows.forEach(r => {
                const p = smartParseNumber(r[nc]);
                if (!isNaN(p) && r[nc] !== '' && r[nc] !== null && r[nc] !== undefined) { s += p; c++; }
            });
            colMeans[nc] = c > 0 ? Math.round((s / c) * 100) / 100 : 0;
        });
    }

    // --- BƯỚC 2: THỰC THI LÀM SẠCH & CHUẨN HÓA DỮ LIỆU THỰC TẾ ---
    const seenSignatures = new Set();
    let duplicatesRemoved = 0;
    let rowsFilteredOut = 0;
    let cellsFixed = 0;
    let cleanedRawRows = [];

    rawRows.forEach((r, rawIdx) => {
        const origRowNum = rawIdx + 1;

        // 1. Xóa theo số thứ tự dòng (từ prompt "xóa dòng 1, 3" hoặc nút 🗑️ Xóa thủ công)
        if (deleteRowNums.has(origRowNum)) {
            rowsFilteredOut++;
            return;
        }

        // 2. Xóa dòng có ô trống nếu khách chọn
        if (optMissing === 'drop') {
            const hasEmpty = activeCols.some(col => r[col] === null || r[col] === undefined || String(r[col]).trim() === '');
            if (hasEmpty) { rowsFilteredOut++; return; }
        }

        const cleanedObj = { _orig_row_num: origRowNum };
        const sigParts = [];
        activeCols.forEach(col => {
            let v = r[col];
            const isNumCol = meta.numericColumns.includes(col);

            if (v === null || v === undefined || String(v).trim() === '') {
                cleanedObj[col] = isNumCol ? (optMissing === 'mean' ? (colMeans[col] || 0) : 0) : 'Không xác định';
                cellsFixed++;
            } else if (typeof v === 'string') {
                let txt = optTrim ? v.replace(/\s+/g, ' ').trim() : v;
                if (txt !== v) cellsFixed++;

                replaceRules.forEach(rr => {
                    if (normalizeTextNoAccent(txt) === normalizeTextNoAccent(rr.from)) {
                        txt = rr.to;
                        cellsFixed++;
                    }
                });

                if (isNumCol) {
                    const parsed = smartParseNumber(txt);
                    cleanedObj[col] = isNaN(parsed) ? (optMissing === 'mean' ? (colMeans[col] || 0) : 0) : parsed;
                    if (String(cleanedObj[col]) !== txt) cellsFixed++;
                } else {
                    if (optCase === 'upper') { const u = txt.toUpperCase(); if (u !== txt) cellsFixed++; txt = u; }
                    else if (optCase === 'lower') { const l = txt.toLowerCase(); if (l !== txt) cellsFixed++; txt = l; }
                    else if (optCase === 'title') { const t = toTitleCaseVi(txt); if (t !== txt) cellsFixed++; txt = t; }
                    cleanedObj[col] = txt;
                }
            } else {
                let finalVal = v;
                replaceRules.forEach(rr => {
                    if (normalizeTextNoAccent(finalVal) === normalizeTextNoAccent(rr.from)) {
                        finalVal = rr.to;
                        cellsFixed++;
                    }
                });
                cleanedObj[col] = finalVal;
            }
            sigParts.push(String(cleanedObj[col]));
        });

        // 3. Khử trùng lặp
        if (optDedup) {
            const sig = sigParts.join('||');
            if (seenSignatures.has(sig)) {
                duplicatesRemoved++;
                return;
            }
            seenSignatures.add(sig);
        }

        const rowValsNorm = activeCols.map(c => normalizeTextNoAccent(cleanedObj[c])).join(' | ');

        // 4. Loại bỏ đơn bị hủy (khớp cả canceled, cancelled, hủy, huỷ)
        if (optDropCanceled) {
            if (/(cancel|huy|tu choi)/.test(rowValsNorm)) {
                rowsFilteredOut++;
                return;
            }
        }

        // 5. Loại bỏ chỉ số chính <= 0
        if (optDropNonPos && meta.primaryMetric && activeCols.includes(meta.primaryMetric)) {
            if ((Number(cleanedObj[meta.primaryMetric]) || 0) <= 0) {
                rowsFilteredOut++;
                return;
            }
        }

        // 6. Áp dụng tất cả quy tắc lọc số của khách (có thể chỉ định đúng tên cột!)
        for (const nr of numericRules) {
            const val = Number(cleanedObj[nr.col]) || 0;
            const t = nr.threshold;
            let matched = false;
            if (nr.op === '<=' || nr.op === 'nho hon hoac bang' || nr.op === 'be hon hoac bang') matched = val <= t;
            else if (nr.op === '>=' || nr.op === 'lon hon hoac bang') matched = val >= t;
            else if (nr.op === '<' || nr.op === 'nho hon' || nr.op === 'be hon' || nr.op === 'duoi') matched = val < t;
            else if (nr.op === '>' || nr.op === 'lon hon' || nr.op === 'tren') matched = val > t;
            else if (nr.op === '=' || nr.op === 'bang') matched = val === t;
            else if (nr.op === '!=' || nr.op === 'khac') matched = val !== t;

            if (nr.isRemoveAction && matched) { rowsFilteredOut++; return; }
            if (!nr.isRemoveAction && !matched) { rowsFilteredOut++; return; }
        }

        // 7. Xóa dòng chứa từ khóa bất kỳ khách yêu cầu
        for (const rk of removeKeywords) {
            const rkNorm = normalizeTextNoAccent(rk);
            if (rkNorm && rowValsNorm.includes(rkNorm)) {
                rowsFilteredOut++;
                return;
            }
        }

        // 8. Chỉ giữ dòng chứa từ khóa khách yêu cầu
        for (const kk of keepKeywords) {
            const kkNorm = normalizeTextNoAccent(kk);
            if (kkNorm && !rowValsNorm.includes(kkNorm)) {
                rowsFilteredOut++;
                return;
            }
        }

        cleanedRawRows.push(cleanedObj);
    });

    // 9. Loại bỏ ngoại lai IQR
    let outliersRemoved = 0;
    if (optDropOutliers && meta.primaryMetric && cleanedRawRows.length >= 4) {
        const sortedVals = cleanedRawRows.map(r => Number(r[meta.primaryMetric]) || 0).sort((a, b) => a - b);
        const q1 = sortedVals[Math.floor(sortedVals.length * 0.25)];
        const q3 = sortedVals[Math.floor(sortedVals.length * 0.75)];
        const iqr = q3 - q1;
        const lowFence = q1 - 1.5 * iqr;
        const highFence = q3 + 1.5 * iqr;
        const beforeLen = cleanedRawRows.length;
        cleanedRawRows = cleanedRawRows.filter(r => {
            const v = Number(r[meta.primaryMetric]) || 0;
            return v >= lowFence && v <= highFence;
        });
        outliersRemoved = beforeLen - cleanedRawRows.length;
        rowsFilteredOut += outliersRemoved;
    }

    if (optDedup) appliedRules.unshift(`Khử trùng lặp (-${duplicatesRemoved})`);
    if (optTrim) appliedRules.push('Cắt khoảng trắng thừa');
    if (optMissing === 'drop') appliedRules.push('Xóa dòng có ô trống');
    else if (optMissing === 'mean') appliedRules.push('Điền trung bình ô số trống');
    if (optDropCanceled) appliedRules.push('Loại bỏ đơn bị hủy');
    if (optDropNonPos) appliedRules.push('Loại chỉ số ≤ 0');
    if (optDropOutliers) appliedRules.push(`Loại ngoại lai IQR (-${outliersRemoved})`);
    if (optCase !== 'keep') appliedRules.push(`Chuẩn hóa chữ (${optCase})`);

    const rulesBox = document.getElementById('cleanAppliedRulesBox');
    if (rulesBox) {
        rulesBox.innerHTML = appliedRules.map(r => `<span class="clean-badge-ok">✓ ${r}</span>`).join('');
    }

    const totalRemoved = duplicatesRemoved + rowsFilteredOut;
    meta.rawRowCount = rawRows.length;
    meta.duplicatesRemoved = totalRemoved;
    meta.cellsFixed = cellsFixed;
    meta.rowCount = cleanedRawRows.length;

    const term = document.getElementById('step3SandboxTerminal');
    if (term) {
        const reqSummary = promptText ? `"${promptText}"` : 'Áp dụng bộ quy tắc làm sạch tiêu chuẩn mặc định.';
        term.innerHTML = `
            <div class="step3-log-row">
                <span class="step3-log-badge info">TIẾP NHẬN</span>
                <span>Tệp <b>${meta.fileName}</b> gồm <b>${rawRows.length.toLocaleString('vi-VN')} bản ghi thô</b> (${activeCols.length} cột hoạt động).</span>
            </div>
            <div class="step3-log-row">
                <span class="step3-log-badge">YÊU CẦU KHÁCH</span>
                <span>${reqSummary}</span>
            </div>
            <div class="step3-log-row">
                <span class="step3-log-badge warn">XÓA &amp; KHỬ TRÙNG</span>
                <span>Đã loại bỏ tổng cộng <b>${totalRemoved} dòng</b> (${duplicatesRemoved} trùng lặp + ${rowsFilteredOut} dòng theo điều kiện lọc/xóa) và chuẩn hóa <b>${cellsFixed} ô</b>.</span>
            </div>
            <div class="step3-log-row">
                <span class="step3-log-badge ok">✓ ĐẠT CHUẨN 100%</span>
                <span>Còn lại <b>${cleanedRawRows.length.toLocaleString('vi-VN')}/${rawRows.length.toLocaleString('vi-VN')} bản ghi sạch</b> — Đã đồng bộ sang <b>Bước 4: Dashboard KPI</b>, <b>Bước 5</b> và <b>Báo Cáo Cuối Cùng</b>.</span>
            </div>`;
    }
    // --- BƯỚC 4: TÍNH TOÁN DỮ LIỆU ĐỂ TRỰC QUAN HÓA & PHÂN TÍCH ---
    let totalSum = 0;
    let validNumbers = 0;

    const processedRows = cleanedRawRows.map((r, idx) => {
        const item = { ...r };
        item._row_index = idx + 1;
        item._orig_row_num = r._orig_row_num || (idx + 1);
        item._id = item[meta.idMetric] || ('REC-' + (idx + 1).toString().padStart(3, '0'));
        item._name = item[meta.idMetric] || item._id;

        meta.numericColumns.forEach(numCol => {
            if (!activeCols.includes(numCol)) return;
            const p = smartParseNumber(item[numCol]);
            item[numCol] = isNaN(p) ? 0 : p;
            if (numCol === meta.primaryMetric && !isNaN(p)) {
                totalSum += p;
                validNumbers++;
            }
        });
        return item;
    });

    const averageVal = validNumbers > 0 ? (totalSum / validNumbers) : 0;

    let anomaliesCount = 0;
    processedRows.forEach(item => {
        const val = item[meta.primaryMetric] || 0;
        let isAnomaly = false;
        let aiNote = "";

        if (meta.primaryMetric && averageVal > 0) {
            if (val < averageVal * 0.4) {
                isAnomaly = true;
                aiNote = "Chỉ số thấp bất thường (< 40% trung bình). Cần rà soát nguyên nhân sụt giảm ngay!";
            } else if (val > averageVal * 2.2) {
                aiNote = "Top thực thể tăng trưởng vượt bậc (> 220% trung bình). Cần nhân rộng mô hình!";
            } else {
                aiNote = "Chỉ số vận hành ở mức bình thường và ổn định.";
            }
        } else {
            aiNote = "Dữ liệu hợp lệ, đã đối soát bởi AI Agent.";
        }

        Object.keys(item).forEach(k => {
            if (k.startsWith('_')) return;
            const v = normalizeTextNoAccent(item[k]);
            if (v.includes('nguy co') || v.includes('canh bao') || v.includes('high risk') || v.includes('danger') || v.includes('that bai') || v.includes('cancel') || v.includes('huy')) {
                isAnomaly = true;
                aiNote = "Phát hiện nhãn rủi ro / hủy đơn: Yêu cầu kích hoạt kịch bản can thiệp kịp thời!";
            }
        });

        if (isAnomaly) anomaliesCount++;
        item._is_anomaly = isAnomaly;
        item._ai_action = aiNote;
    });

    meta.totalSum = totalSum;
    meta.averageVal = averageVal;
    meta.anomaliesCount = anomaliesCount;
    window.currentDataset = processedRows;

    window.sessionMemory.push({
        role: "system",
        content: `Đã làm sạch tệp ${meta.fileName}: xóa ${totalRemoved} dòng, còn ${meta.rowCount}/${rawRows.length} dòng sạch, tổng ${meta.primaryMetric} = ${totalSum}.`
    });

    if (typeof renderStep2CleanedTable === 'function') renderStep2CleanedTable();
    if (typeof populateStep4Controls === 'function') populateStep4Controls();
    rebuildCategoryFilterDropdown();
    renderStudioDashboard();
    updateHeroCounters();
    updateHottestInsightCard();

    renderStep4Insights();
    if (typeof renderFinalExecutiveReport === 'function') renderFinalExecutiveReport();

    if (stayOnStep2 && promptText && totalRemoved === 0 && cellsFixed === 0 && activeCols.length === meta._origColumns.length) {
        showNotification(`⚠️ Không có dòng nào khớp điều kiện "${promptText}". Thử gõ cụ thể hơn (VD: "Xóa dòng 1" hoặc bấm nút 🗑️ ở từng dòng).`);
    } else {
        showNotification(`✅ Đã xóa ${totalRemoved} dòng & làm sạch còn ${cleanedRawRows.length}/${rawRows.length} dòng chuẩn!`);
    }
    if (!stayOnStep2) {
        switchTab('tab-step23');
    }
}

function renderStep2CleanedTable() {
    const meta = window.datasetMetadata || {};
    const data = window.currentDataset || [];

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setVal('cleanRawCount', (meta.rawRowCount || data.length).toLocaleString('vi-VN'));
    setVal('cleanDupCount', (meta.duplicatesRemoved || 0).toLocaleString('vi-VN'));
    setVal('cleanFixedCount', (meta.cellsFixed || 0).toLocaleString('vi-VN'));
    setVal('cleanFinalCount', data.length.toLocaleString('vi-VN'));

    const thead = document.getElementById('step2CleanedHead');
    const tbody = document.getElementById('step2CleanedBody');
    if (!thead || !tbody) return;

    if (data.length === 0) {
        thead.innerHTML = '<tr><th>#</th><th>Trạng Thái Làm Sạch</th><th>Thông Báo</th></tr>';
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:32px; color:#64748B;">Chưa có dữ liệu (hoặc toàn bộ dòng đã bị lọc). Bấm "🔄 Khôi Phục Mặc Định" hoặc nạp tệp ở Bước 1.</td></tr>';
        return;
    }

    const cols = (meta.columns || []).filter(c => !c.startsWith('_'));
    const q = (document.getElementById('step2CleanSearch')?.value || '').toLowerCase().trim();
    const filtered = data.filter(row => !q || cols.some(c => String(row[c] ?? '').toLowerCase().includes(q)));

    thead.innerHTML = `<tr><th style="width:56px;">Dòng</th><th style="width:82px;">Thao Tác</th><th>Chuẩn Hóa</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${cols.length + 3}" style="text-align:center; padding:24px; color:#64748B;">Không tìm thấy bản ghi sạch khớp với từ khóa "${q}".</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.slice(0, 100).map(r => {
        const rowNum = r._orig_row_num || r._row_index;
        return `
        <tr>
            <td style="font-weight:800; color:#64748B;">#${rowNum}</td>
            <td>
                <button type="button" onclick="deleteCleanedRow(${rowNum})" title="Xóa dòng #${rowNum}" style="background:#FEE2E2; color:#B91C1C; border:1px solid #FECACA; border-radius:999px; padding:3px 10px; font-size:11.5px; font-weight:700; cursor:pointer; white-space:nowrap;">🗑️ Xóa</button>
            </td>
            <td><span class="clean-badge-ok">✓ Đã làm sạch</span></td>
            ${cols.map(c => {
                const isNum = (meta.numericColumns || []).includes(c);
                const displayVal = isNum ? formatSmartNumber(r[c], c) : (r[c] !== undefined ? r[c] : '');
                return `<td style="${isNum ? 'font-weight:700;' : ''}">${displayVal}</td>`;
            }).join('')}
        </tr>`;
    }).join('');
}
function renderStep4Insights() {
    const box = document.getElementById('step4InsightsBox');
    if (!box) return;

    const meta = window.datasetMetadata;
    const data = window.currentDataset;

    let worst = data.find(d => d._is_anomaly);
    let best = data.slice().sort((a, b) => (b[meta.primaryMetric] || 0) - (a[meta.primaryMetric] || 0))[0];

    box.innerHTML = `
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:18px; margin-bottom:20px; box-shadow:0 4px 16px rgba(15,23,42,0.05);">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <span style="font-size:20px;">💡</span>
                <h4 style="font-size:16px; font-weight:900; color:#1F2937;">TỔNG HỢP NHẬN ĐỊNH KINH DOANH TỰ NHIÊN TỪ AI (BƯỚC 4):</h4>
            </div>
            <p style="font-size:13.5px; line-height:1.6; color:#374151; margin-bottom:10px;">
                Dựa trên phân tích <b>${meta.rowCount} bản ghi</b> từ tệp <b>${meta.fileName}</b>, tổng giá trị chỉ số chính <b>${meta.primaryMetric || 'đo lường'}</b> đạt <b>${formatSmartNumber(meta.totalSum, meta.primaryMetric)}</b> (bình quân ${formatSmartNumber(meta.averageVal, meta.primaryMetric)}/bản ghi).
            </p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div style="background:#DCFCE7; border:1px solid #E2E8F0; border-radius:10px; padding:10px;">
                    <b style="color:#166534; font-size:12px;">🌟 THỰC THỂ HÀNG ĐẦU:</b>
                    <div style="font-weight:800; font-size:14px; margin-top:2px;">${best ? best._name : 'Chưa xác định'} (${best && meta.primaryMetric ? formatSmartNumber(best[meta.primaryMetric], meta.primaryMetric) : ''})</div>
                    <div style="font-size:11.5px; color:#166534; margin-top:2px;">Dẫn đầu toàn bộ danh sách, đóng góp tỷ trọng lớn nhất.</div>
                </div>
                <div style="background:#FEE2E2; border:1px solid #E2E8F0; border-radius:10px; padding:10px;">
                    <b style="color:#991B1B; font-size:12px;">🚨 ĐIỂM NÓNG CẦN CAN THIỆP:</b>
                    <div style="font-weight:800; font-size:14px; margin-top:2px;">${worst ? worst._name : 'Không có bất thường'} (${worst && meta.primaryMetric ? formatSmartNumber(worst[meta.primaryMetric], meta.primaryMetric) : ''})</div>
                    <div style="font-size:11.5px; color:#991B1B; margin-top:2px;">${worst ? worst._ai_action : 'Hệ thống an toàn 100%'}</div>
                </div>
            </div>
        </div>
    `;
}

// ==============================================================================
// 4. STUDIO DASHBOARD & TABLE RENDERER (BƯỚC 5: TƯƠNG TÁC)
// ==============================================================================

function rebuildCategoryFilterDropdown() {
    const catSelect = document.getElementById('categoryFilter');
    if (!catSelect) return;

    const meta = window.datasetMetadata;
    const data = window.currentDataset;

    if (!meta.categoryMetric || data.length === 0) {
        catSelect.innerHTML = '<option value="ALL">Tất cả phân loại</option>';
        return;
    }

    const uniqueCategories = Array.from(new Set(data.map(d => d[meta.categoryMetric]).filter(Boolean))).sort();
    let opts = `<option value="ALL">Tất cả (${meta.categoryMetric}: ${uniqueCategories.length})</option>`;
    uniqueCategories.forEach(c => {
        opts += `<option value="${c}">${c}</option>`;
    });
    catSelect.innerHTML = opts;
}

function renderStudioDashboard() {
    const meta = window.datasetMetadata;
    const data = window.currentDataset;

    // 1. KPI Cards
    const elRows = document.getElementById('kpi_total_rows');
    const elCols = document.getElementById('kpi_total_cols');
    const elSum = document.getElementById('kpi_total_sum');
    const elAvg = document.getElementById('kpi_average_val');
    const elAnomalies = document.getElementById('kpi_anomalies_count');
    const elSumLabel = document.getElementById('kpi_sum_label');
    const elAvgLabel = document.getElementById('kpi_avg_label');

    if (elRows) elRows.innerText = data.length > 0 ? `${data.length.toLocaleString()} Dòng` : "0 Dòng";
    if (elCols) elCols.innerText = meta.columns.length > 0 ? `${meta.columns.length} Cột` : "0 Cột";
    
    if (elSumLabel && meta.primaryMetric) elSumLabel.innerText = `TỔNG ${meta.primaryMetric.toUpperCase()}`;
    if (elAvgLabel && meta.primaryMetric) elAvgLabel.innerText = `BÌNH QUÂN ${meta.primaryMetric.toUpperCase()}`;

    if (elSum) elSum.innerText = meta.primaryMetric ? formatSmartNumber(meta.totalSum, meta.primaryMetric) : "-";
    if (elAvg) elAvg.innerText = meta.primaryMetric ? formatSmartNumber(meta.averageVal, meta.primaryMetric) : "-";
    if (elAnomalies) elAnomalies.innerText = `${meta.anomaliesCount} Điểm Nóng`;

    // 2. Filter data
    const query = document.getElementById('searchQuery') ? document.getElementById('searchQuery').value.toLowerCase().trim() : '';
    const catVal = document.getElementById('categoryFilter') ? document.getElementById('categoryFilter').value : 'ALL';

    const filtered = data.filter(item => {
        if (catVal !== 'ALL' && meta.categoryMetric && String(item[meta.categoryMetric]) !== catVal) {
            return false;
        }
        if (query) {
            const rowStr = Object.values(item).join(' ').toLowerCase();
            if (!rowStr.includes(query)) return false;
        }
        return true;
    });

    const countBadge = document.getElementById('tableRowCountBadge');
    if (countBadge) {
        countBadge.innerText = `Hiển thị ${filtered.length} / ${data.length} bản ghi`;
    }

    renderDynamicTable(filtered);
    renderVisualCharts(filtered);
}

function renderDynamicTable(filteredData) {
    const thead = document.getElementById('dynamicTableHead');
    const tbody = document.getElementById('dynamicTableBody');
    if (!thead || !tbody) return;

    const meta = window.datasetMetadata;

    if (filteredData.length === 0) {
        thead.innerHTML = `<tr><th>#</th><th>Thông Báo</th></tr>`;
        tbody.innerHTML = `
            <tr>
                <td colspan="2" style="text-align:center; padding:40px 20px;">
                    <div style="font-size:36px; margin-bottom:10px;">📊</div>
                    <h4 style="font-size:16px; font-weight:800; color:#1F2937;">Chưa có dữ liệu để hiển thị</h4>
                    <p style="font-size:13.5px; color:#6B7280; margin-bottom:16px;">Vui lòng kéo thả tệp CSV / Excel hoặc nhấn nút 'Nạp Bộ Dữ Liệu Mẫu' để bắt đầu phân tích!</p>
                    <button class="btn-neo-secondary" style="background:#FFDE59; color:#000; padding:10px 20px; font-weight:800; font-size:13px;" onclick="loadSampleDataset()">⚡ Nạp Bộ Dữ Liệu Mẫu Thử Nghiệm</button>
                </td>
            </tr>
        `;
        return;
    }

    const displayCols = meta.columns.filter(c => !c.startsWith('_'));
    let headerHtml = '<tr><th style="width:60px;">STT</th>';
    displayCols.forEach(col => {
        const isNum = meta.numericColumns.includes(col);
        headerHtml += `<th style="${isNum ? 'text-align:right;' : 'text-align:left;'}">${col}</th>`;
    });
    headerHtml += '<th style="min-width:220px; text-align:left;">Chẩn Đoán & Khuyến Nghị AI Agent</th></tr>';
    thead.innerHTML = headerHtml;

    let rowsHtml = '';
    filteredData.forEach((row, idx) => {
        const isAnomaly = row._is_anomaly;
        const rowId = `data-row-${row._row_index}`;
        const rowBg = isAnomaly ? 'background:#FFF1F2;' : '';

        rowsHtml += `<tr id="${rowId}" style="${rowBg}">`;
        rowsHtml += `<td style="font-weight:800; color:#7C3AED;">${idx + 1}</td>`;

        displayCols.forEach(col => {
            const rawVal = row[col];
            const isNum = meta.numericColumns.includes(col);
            if (isNum) {
                const formatted = formatSmartNumber(rawVal, col);
                rowsHtml += `<td style="text-align:right; font-weight:700;">${formatted}</td>`;
            } else {
                let pillStyle = '';
                const valStr = String(rawVal || '');
                if (valStr.toLowerCase().includes('xuất sắc') || valStr.toLowerCase().includes('thấp')) pillStyle = 'background:#DCFCE7; color:#166534; border:1px solid #E2E8F0;';
                else if (valStr.toLowerCase().includes('cảnh báo') || valStr.toLowerCase().includes('nguy cơ') || valStr.toLowerCase().includes('cao')) pillStyle = 'background:#FEE2E2; color:#991B1B; border:1px solid #E2E8F0;';
                else if (valStr.toLowerCase().includes('tiềm năng') || valStr.toLowerCase().includes('trung bình')) pillStyle = 'background:#FEF08A; color:#854D0E; border:1px solid #E2E8F0;';

                if (pillStyle && valStr.length < 25) {
                    rowsHtml += `<td><span class="tag-pill" style="${pillStyle}">${valStr}</span></td>`;
                } else {
                    rowsHtml += `<td style="font-weight:600;">${valStr}</td>`;
                }
            }
        });

        rowsHtml += `
            <td style="font-size:12.5px; line-height:1.4;">
                <div style="display:flex; align-items:flex-start; gap:6px;">
                    <span>${isAnomaly ? '🚨' : '💡'}</span>
                    <span style="color:${isAnomaly ? '#991B1B' : '#334155'}; font-weight:${isAnomaly ? '700' : '500'};">${row._ai_action}</span>
                </div>
            </td>
        </tr>`;
    });

    tbody.innerHTML = rowsHtml;
}

// ==============================================================================
// 5. GENERATIVE VISUAL CHARTS
// ==============================================================================

function populateStep4Controls() {
    const meta = window.datasetMetadata || {};
    const mSel = document.getElementById('step4MetricSelect');
    const gSel = document.getElementById('step4GroupSelect');
    const activeCols = (meta.columns || []).filter(c => !c.startsWith('_'));
    const numCols = (meta.numericColumns || []).filter(c => activeCols.includes(c));
    const catCols = (meta.categoricalColumns || []).filter(c => activeCols.includes(c));

    if (mSel) {
        const curM = mSel.value;
        if (numCols.length === 0) {
            mSel.innerHTML = '<option value="">Chỉ số chính (chưa có cột số)</option>';
        } else {
            mSel.innerHTML = numCols.map(c => `<option value="${c}" ${c === (numCols.includes(curM) ? curM : meta.primaryMetric) ? 'selected' : ''}>Chỉ số: ${c}</option>`).join('');
        }
    }
    if (gSel) {
        const curG = gSel.value;
        const groupCandidates = catCols.length > 0 ? catCols : activeCols;
        if (groupCandidates.length === 0) {
            gSel.innerHTML = '<option value="">Nhóm phân loại (tự động)</option>';
        } else {
            const defG = groupCandidates.includes(curG) ? curG : (meta.categoryMetric && groupCandidates.includes(meta.categoryMetric) ? meta.categoryMetric : groupCandidates[0]);
            gSel.innerHTML = groupCandidates.map(c => `<option value="${c}" ${c === defG ? 'selected' : ''}>Phân nhóm: ${c}</option>`).join('');
        }
    }
}

function onStep4ControlChange() {
    const meta = window.datasetMetadata || {};
    const mVal = document.getElementById('step4MetricSelect')?.value;
    const gVal = document.getElementById('step4GroupSelect')?.value;
    if (mVal) {
        meta.primaryMetric = mVal;
        const data = window.currentDataset || [];
        const total = data.reduce((s, r) => s + (Number(r[mVal]) || 0), 0);
        meta.totalSum = total;
        meta.averageVal = data.length > 0 ? total / data.length : 0;
    }
    if (gVal) {
        meta.categoryMetric = gVal;
    }
    renderStudioDashboard();
    renderStep4Insights();
}

function renderVisualCharts(filteredData) {
    const chartBox1 = document.getElementById('chartBoxCategory');
    const chartBox2 = document.getElementById('chartBoxPerformance');
    const chartBox3 = document.getElementById('chartBoxTopEntities');
    const chartBox4 = document.getElementById('chartBoxDistribution');
    const anomBox = document.getElementById('step4AnomalyListBox');
    if (!chartBox1 || !chartBox2) return;

    const meta = window.datasetMetadata || {};
    const dataToPlot = (filteredData && filteredData.length > 0) ? filteredData : (window.currentDataset || []);

    if (dataToPlot.length === 0) {
        const emptyCard = (msg) => `<div style="padding:36px 16px; text-align:center; color:var(--paynext-text-muted); font-size:13.5px;">${msg}</div>`;
        chartBox1.innerHTML = emptyCard('📊 Chưa có dữ liệu. Vui lòng nạp tệp ở Bước 1 để hệ thống tự động dựng Dashboard biểu đồ.');
        chartBox2.innerHTML = emptyCard('🍩 Biểu đồ cơ cấu trạng thái & sức khỏe vận hành sẽ hiển thị tại đây.');
        if (chartBox3) chartBox3.innerHTML = emptyCard('🏆 Biểu đồ xếp hạng Top thực thể cao nhất sẽ hiển thị tại đây.');
        if (chartBox4) chartBox4.innerHTML = emptyCard('📐 Biểu đồ phân bố tần suất & thống kê mô tả sẽ hiển thị tại đây.');
        if (anomBox) anomBox.innerHTML = '';
        return;
    }

    const activeCols = (meta.columns || []).filter(c => !c.startsWith('_'));
    const metricCol = (meta.primaryMetric && activeCols.includes(meta.primaryMetric))
        ? meta.primaryMetric
        : ((meta.numericColumns || []).find(c => activeCols.includes(c)) || null);
    const groupCol = (meta.categoryMetric && activeCols.includes(meta.categoryMetric))
        ? meta.categoryMetric
        : ((meta.categoricalColumns || []).find(c => activeCols.includes(c)) || activeCols[0]);

    const fmtVal = (v) => metricCol ? formatSmartNumber(v, metricCol) : Number(v).toLocaleString('vi-VN');
    const shortLbl = (s, maxLen = 14) => String(s || 'Khác').length > maxLen ? String(s).slice(0, maxLen - 1) + '…' : String(s || 'Khác');

    // ------------------------------------------------------------------
    // CHART 1: SVG Vertical Column Chart by Category (`chartBoxCategory`)
    // ------------------------------------------------------------------
    const groupSums = {};
    const groupCounts = {};
    dataToPlot.forEach(d => {
        const k = String(d[groupCol] || 'Khác').trim() || 'Khác';
        const val = metricCol ? (Number(d[metricCol]) || 0) : 1;
        groupSums[k] = (groupSums[k] || 0) + val;
        groupCounts[k] = (groupCounts[k] || 0) + 1;
    });
    const sortedGroups = Object.entries(groupSums).sort((a, b) => b[1] - a[1]).slice(0, 7);
    const maxGrp = Math.max(...sortedGroups.map(x => x[1]), 1);
    const totalGrp = sortedGroups.reduce((s, x) => s + x[1], 0) || 1;
    const barPalette = ['#6D28D9', '#7C3AED', '#2563EB', '#0284C7', '#0D9488', '#8B5CF6', '#6366F1'];

    const colsHtml = sortedGroups.map(([grp, total], i) => {
        const hPct = Math.max(Math.round((total / maxGrp) * 140), 14);
        const share = ((total / totalGrp) * 100).toFixed(1);
        const col = barPalette[i % barPalette.length];
        return `
            <div style="flex:1; min-width:54px; display:flex; flex-direction:column; align-items:center;" title="${grp}: ${fmtVal(total)} (${groupCounts[grp]} bản ghi · ${share}%)">
                <div style="font-size:11px; font-weight:800; color:var(--paynext-text-main); margin-bottom:4px; text-align:center;">${fmtVal(total)}</div>
                <div style="width:68%; max-width:44px; height:${hPct}px; background:${col}; border-radius:8px 8px 0 0; transition:height 0.35s ease;"></div>
                <div style="font-size:11px; font-weight:600; color:var(--paynext-text-muted); margin-top:6px; text-align:center; line-height:1.25;">${shortLbl(grp, 12)}</div>
                <div style="font-size:10px; color:#7C3AED; font-weight:700;">${share}%</div>
            </div>`;
    }).join('');

    chartBox1.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; gap:8px; flex-wrap:wrap;">
            <div>
                <h4 style="font-size:15.5px; font-weight:800; color:var(--paynext-text-main);">📊 Biểu Đồ Cột: ${metricCol || 'Số lượng'} theo ${groupCol}</h4>
                <div style="font-size:12px; color:var(--paynext-text-muted);">Top ${sortedGroups.length} nhóm dẫn đầu · rê chuột lên cột để xem chi tiết</div>
            </div>
            <span class="tag-pill purple">${sortedGroups.length} Nhóm</span>
        </div>
        <div style="display:flex; align-items:flex-end; justify-content:space-around; gap:8px; height:195px; padding:12px 6px 8px; border-bottom:1px solid var(--paynext-border); overflow-x:auto;">
            ${colsHtml}
        </div>
    `;

    // ------------------------------------------------------------------
    // CHART 2: SVG Donut Chart of Status / Health (`chartBoxPerformance`)
    // ------------------------------------------------------------------
    const statusCol = (meta.categoricalColumns || []).find(c =>
        activeCols.includes(c) && /(status|trang_thai|trạng thái|risk|tinh_trang|tình trạng)/i.test(c)
    );
    const donutMap = {};
    if (statusCol) {
        dataToPlot.forEach(d => {
            const k = String(d[statusCol] || 'Khác').trim() || 'Khác';
            donutMap[k] = (donutMap[k] || 0) + 1;
        });
    } else {
        const anomCnt = dataToPlot.filter(d => d._is_anomaly).length;
        donutMap['Đạt chuẩn ổn định'] = dataToPlot.length - anomCnt;
        if (anomCnt > 0) donutMap['Điểm nóng bất thường'] = anomCnt;
    }

    const donutEntries = Object.entries(donutMap).sort((a, b) => b[1] - a[1]);
    const donutPalette = ['#6D28D9', '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#94A3B8'];
    const r = 56, circ = 2 * Math.PI * r;
    let off = 0;
    const arcsSvg = donutEntries.map(([lbl, cnt], i) => {
        const dash = (cnt / dataToPlot.length) * circ;
        const c = (/(cancel|hủy|huỷ|nguy cơ|bất thường|cảnh báo)/i.test(lbl)) ? '#EF4444' : donutPalette[i % donutPalette.length];
        const seg = `<circle cx="85" cy="85" r="${r}" fill="none" stroke="${c}" stroke-width="22" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-off}"><title>${lbl}: ${cnt} (${((cnt / dataToPlot.length) * 100).toFixed(1)}%)</title></circle>`;
        off += dash;
        return seg;
    }).join('');

    const legendCards = donutEntries.map(([lbl, cnt], i) => {
        const c = (/(cancel|hủy|huỷ|nguy cơ|bất thường|cảnh báo)/i.test(lbl)) ? '#EF4444' : donutPalette[i % donutPalette.length];
        const pct = ((cnt / dataToPlot.length) * 100).toFixed(1);
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#F8FAFC; border:1px solid var(--paynext-border); border-left:3.5px solid ${c}; border-radius:10px; font-size:12.5px;">
                <span style="font-weight:700; color:#1E293B;">${lbl}</span>
                <span style="font-weight:800; color:${c};">${cnt} <span style="color:#64748B; font-weight:600;">(${pct}%)</span></span>
            </div>`;
    }).join('');

    chartBox2.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; gap:8px;">
            <div>
                <h4 style="font-size:15.5px; font-weight:800; color:var(--paynext-text-main);">🍩 Cơ Cấu ${statusCol ? statusCol : 'Sức Khỏe Vận Hành'}</h4>
                <div style="font-size:12px; color:var(--paynext-text-muted);">Tỷ trọng phân bổ trên ${dataToPlot.length} bản ghi sạch</div>
            </div>
        </div>
        <div style="display:grid; grid-template-columns:175px 1fr; gap:18px; align-items:center;">
            <div style="position:relative; width:170px; height:170px; margin:0 auto;">
                <svg viewBox="0 0 170 170" style="width:170px; height:170px; transform:rotate(-90deg);">
                    <circle cx="85" cy="85" r="${r}" fill="none" stroke="#F1F5F9" stroke-width="22"/>
                    ${arcsSvg}
                </svg>
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center;">
                    <div style="font-size:24px; font-weight:900; color:var(--paynext-text-main); line-height:1;">${dataToPlot.length}</div>
                    <div style="font-size:10.5px; color:var(--paynext-text-muted); font-weight:700; margin-top:2px;">bản ghi</div>
                </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
                ${legendCards}
            </div>
        </div>
    `;

    // ------------------------------------------------------------------
    // CHART 3: Top 8 Entities / Records Ranking (`chartBoxTopEntities`)
    // ------------------------------------------------------------------
    if (chartBox3) {
        const sortedRows = metricCol
            ? dataToPlot.slice().sort((a, b) => (Number(b[metricCol]) || 0) - (Number(a[metricCol]) || 0)).slice(0, 7)
            : dataToPlot.slice(0, 7);
        const topMax = metricCol ? Math.max(Number(sortedRows[0]?.[metricCol]) || 1, 1) : 1;
        const totalAll = metricCol ? (dataToPlot.reduce((s, d) => s + (Number(d[metricCol]) || 0), 0) || 1) : dataToPlot.length;

        const topBarsHtml = sortedRows.map((row, idx) => {
            const val = metricCol ? (Number(row[metricCol]) || 0) : 1;
            const wPct = Math.max(Math.round((val / topMax) * 100), 5);
            const share = ((val / totalAll) * 100).toFixed(1);
            const name = row._name || row[groupCol] || `Dòng #${row._row_index}`;
            return `
                <div style="margin-bottom:11px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:12.5px; margin-bottom:4px; gap:8px;">
                        <span style="font-weight:700; color:var(--paynext-text-main);">${idx === 0 ? '🏆 ' : (idx + 1) + '. '}${shortLbl(name, 30)}</span>
                        <span style="font-weight:800; color:#5B21B6; white-space:nowrap;">${fmtVal(val)} <span style="color:#64748B; font-weight:600; font-size:11px;">(${share}%)</span></span>
                    </div>
                    <div style="height:10px; background:#F1F5F9; border-radius:999px; overflow:hidden;">
                        <div style="width:${wPct}%; height:100%; background:${idx === 0 ? 'linear-gradient(90deg, #4C1D95, #8B5CF6)' : 'linear-gradient(90deg, #3B82F6, #60A5FA)'}; border-radius:999px;"></div>
                    </div>
                </div>`;
        }).join('');

        chartBox3.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <div>
                    <h4 style="font-size:15.5px; font-weight:800; color:var(--paynext-text-main);">🏆 Top ${sortedRows.length} Bản Ghi Cao Nhất (${metricCol || 'Giá trị'})</h4>
                    <div style="font-size:12px; color:var(--paynext-text-muted);">Xếp hạng đóng góp cao nhất trong kỳ phân tích</div>
                </div>
            </div>
            ${topBarsHtml}
        `;
    }

    // ------------------------------------------------------------------
    // CHART 4: Frequency Histogram & Descriptive Stats (`chartBoxDistribution`)
    // ------------------------------------------------------------------
    if (chartBox4) {
        if (!metricCol) {
            chartBox4.innerHTML = '<div style="padding:30px; text-align:center; color:#64748B;">Tệp dữ liệu chưa có cột số để dựng phân bố thống kê.</div>';
        } else {
            const vals = dataToPlot.map(d => Number(d[metricCol]) || 0).sort((a, b) => a - b);
            const minV = vals[0] || 0;
            const maxV = vals[vals.length - 1] || 0;
            const mid = Math.floor(vals.length / 2);
            const medianV = vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
            const meanV = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);

            const span = Math.max(maxV - minV, 1);
            const binCount = 6;
            const step = span / binCount;
            const bins = Array(binCount).fill(0);
            vals.forEach(v => {
                let b = Math.floor((v - minV) / step);
                if (b >= binCount) b = binCount - 1;
                if (b < 0) b = 0;
                bins[b]++;
            });
            const maxB = Math.max(...bins, 1);

            const histBars = bins.map((cnt, i) => {
                const h = Math.max(Math.round((cnt / maxB) * 115), cnt > 0 ? 12 : 4);
                const startLbl = formatSmartNumber(minV + i * step, metricCol);
                const isPeak = cnt === maxB;
                return `
                    <div style="flex:1; display:flex; flex-direction:column; align-items:center;" title="Khoảng từ ${startLbl}: ${cnt} bản ghi">
                        <div style="font-size:11px; font-weight:800; color:${isPeak ? '#5B21B6' : '#64748B'}; margin-bottom:4px;">${cnt}</div>
                        <div style="width:74%; height:${h}px; background:${isPeak ? '#6D28D9' : '#93C5FD'}; border-radius:6px 6px 0 0;"></div>
                        <div style="font-size:10px; font-weight:600; color:var(--paynext-text-muted); margin-top:6px; text-align:center;">${shortLbl(startLbl, 9)}</div>
                    </div>`;
            }).join('');

            chartBox4.innerHTML = `
                <div style="margin-bottom:12px;">
                    <h4 style="font-size:15.5px; font-weight:800; color:var(--paynext-text-main);">📐 Phân Bố Tần Suất &amp; Thống Kê (${metricCol})</h4>
                    <div style="font-size:12px; color:var(--paynext-text-muted);">Mật độ phân bố 6 khoảng giá trị và các chỉ số thống kê chuẩn</div>
                </div>
                <div style="display:flex; align-items:flex-end; gap:6px; height:150px; padding-top:10px; border-bottom:1px solid var(--paynext-border); margin-bottom:14px;">
                    ${histBars}
                </div>
                <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; text-align:center;">
                    <div style="background:#F8FAFC; border:1px solid var(--paynext-border); padding:8px; border-radius:10px;">
                        <div style="font-size:10px; font-weight:700; color:#64748B;">THẤP NHẤT</div>
                        <div style="font-size:13px; font-weight:800; color:#0F172A;">${fmtVal(minV)}</div>
                    </div>
                    <div style="background:#F8FAFC; border:1px solid var(--paynext-border); padding:8px; border-radius:10px;">
                        <div style="font-size:10px; font-weight:700; color:#64748B;">TRUNG VỊ</div>
                        <div style="font-size:13px; font-weight:800; color:#0F172A;">${fmtVal(medianV)}</div>
                    </div>
                    <div style="background:#F5F3FF; border:1px solid #DDD6FE; padding:8px; border-radius:10px;">
                        <div style="font-size:10px; font-weight:700; color:#5B21B6;">TRUNG BÌNH</div>
                        <div style="font-size:13px; font-weight:800; color:#5B21B6;">${fmtVal(meanV)}</div>
                    </div>
                    <div style="background:#F0FDF4; border:1px solid #BBF7D0; padding:8px; border-radius:10px;">
                        <div style="font-size:10px; font-weight:700; color:#15803D;">CAO NHẤT</div>
                        <div style="font-size:13px; font-weight:800; color:#15803D;">${fmtVal(maxV)}</div>
                    </div>
                </div>
            `;
        }
    }

    // ------------------------------------------------------------------
    // ANOMALY SPOTLIGHT TABLE (`step4AnomalyListBox`)
    // ------------------------------------------------------------------
    if (anomBox) {
        const anomalies = dataToPlot.filter(d => d._is_anomaly);
        if (anomalies.length === 0) {
            anomBox.innerHTML = `
                <div class="neo-card" style="margin-bottom:0; background:#F0FDF4; border-color:#BBF7D0; padding:16px 20px;">
                    <b style="color:#15803D;">✅ Không phát hiện điểm nóng bất thường</b> — Toàn bộ ${dataToPlot.length} bản ghi đang nằm trong ngưỡng vận hành an toàn.
                </div>`;
        } else {
            const rows = anomalies.slice(0, 6).map(a => `
                <tr>
                    <td style="font-weight:700;">${a._name}</td>
                    <td style="font-weight:800; color:#DC2626;">${metricCol ? fmtVal(a[metricCol]) : '-'}</td>
                    <td style="font-size:12.5px; color:#475569;">${a._ai_action}</td>
                </tr>`).join('');
            anomBox.innerHTML = `
                <div class="neo-card" style="margin-bottom:0; padding:20px 22px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                        <div>
                            <h4 style="font-size:15.5px; font-weight:800; color:#B91C1C;">🚨 Danh Sách Điểm Nóng &amp; Bất Thường (${anomalies.length} bản ghi)</h4>
                            <div style="font-size:12px; color:var(--paynext-text-muted);">Các giao dịch có chỉ số thấp bất thường hoặc gắn nhãn rủi ro / hủy đơn</div>
                        </div>
                        <button class="btn-neo-secondary" style="padding:6px 14px; font-size:12px;" onclick="switchTab('tab-step23', event)">🧹 Lọc bỏ tại Bước 2</button>
                    </div>
                    <div class="table-container-neo">
                        <table class="neo-table">
                            <thead><tr><th>Thực Thể / Mã</th><th>Giá Trị (${metricCol || 'Chỉ số'})</th><th>Nhận Định &amp; Khuyến Nghị AI</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>`;
        }
    }
}
// ==============================================================================
// 6. HOTTEST INSIGHT SPOTLIGHT
// ==============================================================================

function renderHottestInsightEmpty() {
    const cardEl = document.querySelector('.hottest-show-card');
    if (!cardEl) return;

    cardEl.querySelector('.badge-number-one').innerText = 'CHỜ DỮ LIỆU';
    cardEl.querySelector('.spotlight-info h3').innerText = 'Chưa Có Điểm Nóng Phân Tích Cần Chú Ý';
    cardEl.querySelector('.spotlight-info p').innerHTML = 'Vui lòng tải lên tệp CSV/Excel bất kỳ hoặc nhấn nút <b>"⚡ Nạp Bộ Dữ Liệu Mẫu"</b> để AI Agent của <b>Hoàng Kim Huệ</b> tự động nhận diện thực thể có rủi ro hoặc tăng trưởng đột biến nhất.';
    cardEl.querySelector('.spotlight-meta').innerHTML = '<span>⏱️ Chờ nạp tệp dữ liệu...</span>';
    cardEl.querySelector('.spotlight-info div:last-child').innerHTML = '<span class="tag-pill yellow">Chờ Tải Tệp</span>';
}

function updateHottestInsightCard() {
    const data = window.currentDataset;
    const meta = window.datasetMetadata;

    if (data.length === 0) {
        renderHottestInsightEmpty();
    if (typeof renderFinalExecutiveReport === 'function') renderFinalExecutiveReport();
        return;
    }

    let worst = data.find(d => d._is_anomaly);
    if (!worst && meta.primaryMetric) {
        worst = data.slice().sort((a, b) => (a[meta.primaryMetric] || 0) - (b[meta.primaryMetric] || 0))[0];
    }
    if (!worst) worst = data[0];

    const cardEl = document.querySelector('.hottest-show-card');
    if (!cardEl) return;

    const metricText = meta.primaryMetric ? `${meta.primaryMetric}: ${formatSmartNumber(worst[meta.primaryMetric], meta.primaryMetric)}` : "";
    const nameText = worst._name || worst._id || "Bản ghi số " + worst._row_index;

    cardEl.querySelector('.badge-number-one').innerText = '#1 ĐIỂM NÓNG BÁO ĐỘNG';
    cardEl.querySelector('.spotlight-info h3').innerText = `${nameText} — Cảnh Báo Bất Thường Cần Can Thiệp`;
    cardEl.querySelector('.spotlight-info p').innerHTML = `Chỉ số ghi nhận: <b>${metricText}</b>. Đánh giá từ AI Agent của Hoàng Kim Huệ: <i>${worst._ai_action}</i>`;
    cardEl.querySelector('.spotlight-meta').innerHTML = `<span>👤 Chuyên gia giám sát: Hoàng Kim Huệ • ⏱️ Vị trí: Dòng thứ ${worst._row_index}</span>`;
    cardEl.querySelector('.spotlight-info div:last-child').innerHTML = `
        <span class="tag-pill red">Báo Động Cấp 1</span>
        <span class="tag-pill purple">${meta.fileName}</span>
        <span class="tag-pill yellow">Cần Xem Xét</span>
    `;

    const playBtn = cardEl.querySelector('.btn-spotlight-play');
    if (playBtn) {
        playBtn.onclick = (e) => {
            switchTab('tab-step5', e);
            const searchEl = document.getElementById('searchQuery');
            if (searchEl) searchEl.value = '';
            renderStudioDashboard();

            setTimeout(() => {
                const targetRow = document.getElementById(`data-row-${worst._row_index}`);
                if (targetRow) {
                    targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetRow.style.transition = 'all 0.3s ease';
                    targetRow.style.backgroundColor = '#FEF08A';
                    targetRow.style.outline = '3px solid #7C3AED';
                    setTimeout(() => {
                        targetRow.style.backgroundColor = worst._is_anomaly ? '#FFF1F2' : '';
                        targetRow.style.outline = '';
                    }, 4000);
                }
            }, 300);
        };
    }
}

// ==============================================================================
// 7. SAMPLE DATASET & CLEAR DATA
// ==============================================================================

function loadSampleDataset() {
    if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) {
        openAuthModal('login', () => loadSampleDataset(), 'Vui lòng đăng nhập tài khoản trước khi nạp và xử lý dữ liệu mẫu.');
        return;
    }
    if (!window.SAMPLE_DATASET || window.SAMPLE_DATASET.length === 0) {
        showNotification('⚠️ Không tìm thấy dữ liệu mẫu.');
        return;
    }
    executeStep1_Ingestion(window.SAMPLE_DATASET, "Doanh_Nghiep_Kinh_Doanh_Mau.csv");
}

function clearAllData() {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu đang phân tích để tải tệp mới?')) return;

    window.currentDataset = [];
    window.rawDataset = [];
    window.sessionMemory = [];
    window.datasetMetadata = {
        fileName: "",
        rowCount: 0,
        columns: [],
        numericColumns: [],
        categoricalColumns: [],
        primaryMetric: null,
        categoryMetric: null,
        idMetric: null,
        totalSum: 0,
        averageVal: 0,
        anomaliesCount: 0,
        sampleRows: [],
        userQuery: ""
    };

    const s1Box = document.getElementById('step1MetadataBox');
    if (s1Box) s1Box.style.display = 'none';
    const termEl = document.getElementById('step3SandboxTerminal');
    if (termEl) termEl.innerHTML = '<div class="step3-log-row"><span class="step3-log-badge info">SẴN SÀNG</span><span>Đang chờ nạp tệp dữ liệu từ <b>Bước 1</b> để tiến hành kiểm định tự động...</span></div>';
    const insEl = document.getElementById('step4InsightsBox');
    if (insEl) insEl.innerHTML = '';

    const searchEl = document.getElementById('searchQuery');
    if (searchEl) searchEl.value = '';
    const catEl = document.getElementById('categoryFilter');
    if (catEl) catEl.innerHTML = '<option value="ALL">Tất cả phân loại</option>';

    if (typeof renderStep2CleanedTable === 'function') renderStep2CleanedTable();
    renderStudioDashboard();
    updateHeroCounters();
    renderHottestInsightEmpty();
    if (typeof renderFinalExecutiveReport === 'function') renderFinalExecutiveReport();

    showNotification('🗑️ Đã xóa sạch dữ liệu. Vui lòng tải lên tệp mới hoặc bấm Nạp Dữ Liệu Mẫu!');
}

function updateHeroCounters() {
    const elLeadStat = document.getElementById('stat_leads_num');
    const elStoreStat = document.getElementById('stat_stores_num');
    const elTransStat = document.getElementById('stat_trans_num');

    const meta = window.datasetMetadata;
    const count = (window.currentDataset || []).length;

    if (elLeadStat) elLeadStat.innerText = count > 0 ? `${count} Bản Ghi` : '0 Bản Ghi';
    if (elStoreStat) elStoreStat.innerText = meta.columns.length > 0 ? `${meta.columns.length} Trường Dữ Liệu` : '0 Trường';
    if (elTransStat) elTransStat.innerText = count > 0 ? `${(count * meta.columns.length).toLocaleString()} Cells` : '5 Bước Tự Động';

    const elLeadSub = document.getElementById('stat_leads_sub');
    const elStoreSub = document.getElementById('stat_stores_sub');
    if (elLeadSub) elLeadSub.innerText = count > 0 ? `Đã làm sạch & chuẩn hóa` : 'Chờ nạp tệp phân tích...';
    if (elStoreSub) elStoreSub.innerText = count > 0 ? (meta.primaryMetric ? `Tổng ${meta.primaryMetric}: ${formatSmartNumber(meta.totalSum, meta.primaryMetric)}` : 'Đã định hình cấu trúc') : 'Chờ nạp tệp phân tích...';
}

function showNotification(msg) {
    let toast = document.getElementById('portalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'portalToast';
        toast.style.cssText = 'position:fixed; bottom:24px; right:24px; background:#FFDE59; color:#000; border:2.5px solid #000; box-shadow:4px 4px 0 #000; border-radius:14px; padding:14px 20px; font-weight:800; font-size:14px; z-index:9999; max-width:440px; display:flex; align-items:center; gap:10px; animation:popIn 0.2s ease;';
        document.body.appendChild(toast);
    }
    toast.innerHTML = msg;
    toast.style.display = 'flex';
    setTimeout(() => { toast.style.display = 'none'; }, 4500);
}

// ==============================================================================
// 8. LIVE AI COPILOT (WITH SESSION MEMORY & USER API KEY)
// ==============================================================================

function askPreset(promptText) {
    const input = document.getElementById('aiUserInput');
    if (input) {
        input.value = promptText;
        sendAiQuestion();
    }
}

async function sendAiQuestion() {
    const input = document.getElementById('aiUserInput');
    const chatBox = document.getElementById('aiChatBox');
    if (!input || !chatBox) return;

    const query = input.value.trim();
    if (!query) return;

    // Render User Message
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-msg user';
    userMsg.style.cssText = 'align-self:flex-end; max-width:80%; background:#FFE853; border:1px solid #E2E8F0; box-shadow:0 2px 8px rgba(15,23,42,0.05); border-radius:12px; padding:10px 16px; font-size:13.5px; font-weight:700; line-height:1.4;';
    userMsg.innerText = query;
    chatBox.appendChild(userMsg);
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // Render Loading Bubble
    const loadingId = 'loading-' + Date.now();
    const loadingMsg = document.createElement('div');
    loadingMsg.id = loadingId;
    loadingMsg.className = 'ai-msg bot';
    loadingMsg.style.cssText = 'align-self:flex-start; max-width:85%; background:#F3E8FF; border:1px solid #E2E8F0; box-shadow:0 2px 8px rgba(15,23,42,0.05); border-radius:12px; padding:10px 16px; font-size:13px; line-height:1.5;';
    loadingMsg.innerHTML = `<b>👑 Hoàng Kim Huệ Copilot:</b> <span style="color:#7C3AED;">Đang kết nối API Key và truy xuất Session Memory... ✦</span>`;
    chatBox.appendChild(loadingMsg);
    chatBox.scrollTop = chatBox.scrollHeight;

    const meta = window.datasetMetadata;
    const data = window.currentDataset;
    const count = data.length;

    let sampleSummary = "";
    if (count > 0) {
        const top3 = data.slice(0, 3).map(d => `${d._name}: ${meta.primaryMetric ? d[meta.primaryMetric] : ''}`).join(', ');
        sampleSummary = `
- Tên tệp dữ liệu: ${meta.fileName}
- Quy mô: ${count} bản ghi, ${meta.columns.length} cột thông tin (${meta.columns.join(', ')})
- Cột chỉ số chính: ${meta.primaryMetric} (Tổng: ${formatSmartNumber(meta.totalSum, meta.primaryMetric)}, Bình quân: ${formatSmartNumber(meta.averageVal, meta.primaryMetric)})
- Số điểm nóng cảnh báo: ${meta.anomaliesCount} bản ghi
- Mẫu thực thể tiêu biểu: ${top3}
`;
    } else {
        sampleSummary = "Hiện chưa có tệp dữ liệu nào được tải lên hệ thống.";
    }

    // Build session conversation
    window.sessionMemory.push({ role: "user", content: query });

    const systemPrompt = `Bạn là Trợ Lý Trí Tuệ Nhân Tạo Cao Cấp cho Dự Án "Hoang Kim Hue Project" của chuyên gia Hoàng Kim Huệ.
Hệ thống vận hành theo: "QUY TRÌNH HOẠT ĐỘNG 5 BƯỚC CỦA WEB AI AGENT PHÂN TÍCH DỮ LIỆU" (Bước 1: Tiếp nhận -> Bước 2: Lập kế hoạch & Sinh mã -> Bước 3: Thực thi sandbox & Tự sửa lỗi -> Bước 4: Trực quan hóa & Phân tích -> Bước 5: Hiển thị & Tương tác Session Memory).
Ngữ cảnh dữ liệu hiện tại:
${sampleSummary}
Hãy trả lời súc tích, chuyên nghiệp, thông minh bằng tiếng Việt, xưng hô là Trợ lý AI của Hoàng Kim Huệ, đưa ra giải thích số liệu và khuyến nghị chiến lược.`;

    let reply = "";

    try {
        const apiKey = window.SYSTEM_CONFIG ? window.SYSTEM_CONFIG.API_KEY : "AQ.Ab8RN6IV4VsXRh-yjZBccjHuGqK2bil_6k3FmBEBAX8HEiGCZA";
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: `${systemPrompt}\n\nNgười dùng hỏi: ${query}` }]
                }
            ],
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 600
            }
        };

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const resData = await res.json();
            if (resData.candidates && resData.candidates[0] && resData.candidates[0].content && resData.candidates[0].content.parts[0]) {
                reply = resData.candidates[0].content.parts[0].text;
            }
        }
    } catch(err) {
        console.warn("API direct call notice:", err);
    }

    if (!reply) {
        if (count === 0) {
            reply = `Chào bạn! Tôi là AI Copilot của <b>Hoàng Kim Huệ</b>. Hiện tại bạn chưa nạp dữ liệu nào. Hãy kéo thả tệp bất kỳ vào ô Bước 1 tại Studio hoặc bấm nút <b>"⚡ Nạp Bộ Dữ Liệu Mẫu"</b> để tôi bắt đầu phân tích theo quy trình 5 bước nhé!`;
        } else {
            reply = `Hệ thống AI Copilot của <b>Hoàng Kim Huệ</b> đã nhận diện câu hỏi: "<i>${query}</i>". Trong tệp "<b>${meta.fileName}</b>" hiện có <b>${count} bản ghi</b> với chỉ số chính <b>${meta.primaryMetric}</b> đạt tổng <b>${formatSmartNumber(meta.totalSum, meta.primaryMetric)}</b>. Hệ thống ghi nhận <b>${meta.anomaliesCount} điểm nóng</b> cần theo dõi sát sao!`;
        }
    }

    window.sessionMemory.push({ role: "model", content: reply });

    const botEl = document.getElementById(loadingId);
    if (botEl) {
        botEl.innerHTML = `<b>👑 Hoàng Kim Huệ Copilot:</b><br><div style="margin-top:6px; line-height:1.6;">${reply.replace(/\n/g, '<br>')}</div>`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ==============================================================================
// 9. HERO AUDIO & SIMULATOR CONTROLS
// ==============================================================================

let isPlaying = false;
let playTimer = null;
let currentSec = 165;
const totalSec = 300;

function togglePlayerWidget() {
    isPlaying = !isPlaying;
    const playBtn = document.querySelector('.btn-play-circle');
    if (playBtn) playBtn.innerText = isPlaying ? '⏸' : '▶';

    if (isPlaying) {
        const term = document.getElementById('simTerminal');
        if (term) {
            term.innerHTML = "[KHỞI ĐỘNG 5 BƯỚC AI AGENT] Đang chạy quy trình phân tích...\n";
            term.innerHTML += "[BƯỚC 1] Tiếp nhận dữ liệu & Trích xuất Metadata (5-10 dòng context)...\n";
            term.innerHTML += "[BƯỚC 2] Lập kế hoạch & Sinh mã Python/SQL tự động...\n";
            term.innerHTML += "[BƯỚC 3] Chạy Sandbox an toàn & Tự sửa lỗi (Self-Reflection)...\n";
            term.innerHTML += "[BƯỚC 4] Tạo biểu đồ & Tổng hợp nhận định kinh doanh...\n";
            term.innerHTML += "[BƯỚC 5] Cập nhật giao diện tương tác & Session Memory thành công!";
        }
        playTimer = setInterval(() => {
            if (currentSec < totalSec) {
                currentSec++;
                updatePlayerUI();
            } else {
                currentSec = 0;
            }
        }, 1000);
    } else {
        if (playTimer) clearInterval(playTimer);
    }
}

function updatePlayerUI() {
    const timeText = document.querySelector('.player-progress-wrap .time-text');
    const fillBar = document.querySelector('.player-progress-wrap .progress-fill');
    if (timeText) {
        const m = Math.floor(currentSec / 60);
        const s = currentSec % 60;
        timeText.innerText = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    }
    if (fillBar) {
        fillBar.style.width = ((currentSec / totalSec) * 100) + '%';
    }
}

// ==============================================================================
// 10. PRICING TOGGLE
// ==============================================================================

let isYearlyPlan = false;

function togglePricingPlan() {
    isYearlyPlan = !isYearlyPlan;
    const knob = document.querySelector('.toggle-knob');
    if (knob) knob.style.transform = isYearlyPlan ? 'translateX(12px)' : 'translateX(0)';

    const prices = document.querySelectorAll('.plan-price');
    if (prices.length >= 3) {
        if (isYearlyPlan) {
            prices[0].innerHTML = '0đ <span>/ vĩnh viễn</span>';
            prices[1].innerHTML = '50 Tr <span>/ năm (Tiết kiệm 10Tr)</span>';
            prices[2].innerHTML = '150 Tr <span>/ năm (Tiết kiệm 30Tr)</span>';
        } else {
            prices[0].innerHTML = '0đ <span>/ vĩnh viễn</span>';
            prices[1].innerHTML = '5 Tr <span>/ tháng</span>';
            prices[2].innerHTML = '15 Tr <span>/ tháng</span>';
        }
    }
}

// ==============================================================================
// 11. EXPORT CAPABILITIES
// ==============================================================================

function exportDatasetCSV() {
    const data = window.currentDataset;
    if (data.length === 0) {
        alert('Chưa có dữ liệu để xuất.');
        return;
    }
    const cols = window.datasetMetadata.columns.filter(c => !c.startsWith('_'));
    let csv = cols.join(',') + ',AI_Khuyen_Nghi\r\n';
    data.forEach(r => {
        const rowVals = cols.map(c => {
            let val = String(r[c] !== undefined ? r[c] : '');
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                val = '"' + val.replace(/"/g, '""') + '"';
            }
            return val;
        });
        rowVals.push('"' + (r._ai_action || '').replace(/"/g, '""') + '"');
        csv += rowVals.join(',') + '\r\n';
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Bao_Cao_AI_Hoang_Kim_Hue_${Date.now()}.csv`;
    link.click();
}

function exportDatasetJSON() {
    const data = window.currentDataset;
    if (data.length === 0) {
        alert('Chưa có dữ liệu để xuất.');
        return;
    }
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Du_Lieu_Phan_Tich_Hoang_Kim_Hue_${Date.now()}.json`;
    link.click();
}

// ==============================================================================
// 12. INITIALIZE APP
// ==============================================================================

function initApp() {
    if (typeof initAuthSystem === 'function') initAuthSystem();
    if (typeof renderStep2CleanedTable === 'function') renderStep2CleanedTable();
    renderStudioDashboard();
    renderHottestInsightEmpty();
    if (typeof renderFinalExecutiveReport === 'function') renderFinalExecutiveReport();
    if (typeof renderFeedbackSection === 'function') renderFeedbackSection();
    updateHeroCounters();
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== 'tab-workflow' && document.getElementById(hash)) {
        if (!PROTECTED_TABS.includes(hash) || isUserLoggedIn()) {
            switchNavTab(hash);
        }
    }
}

document.addEventListener('DOMContentLoaded', initApp);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initApp();
}


// ==============================================================================
// 13. FINAL EXECUTIVE BI REPORT ENGINE (EXACT 4-IMAGE LAYOUT, 100% REAL DATA)
// ==============================================================================

let reportLineMode = 'both'; // 'both' | 'revenue' | 'profit'
let reportProfitMargin = 0.32; // Default 32% biên lợi nhuận do người dùng chọn

function toggleReportTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    showNotification(isDark ? '🌙 Đã chuyển sang chế độ tối' : '☀️ Đã chuyển sang chế độ sáng');
}

function setReportLineMode(mode, btn) {
    reportLineMode = mode;
    document.querySelectorAll('.rep-line-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderFinalExecutiveReport();
}

function switchReportSubTab(subId, btn) {
    document.querySelectorAll('.report-subtab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const map = {
        'rep-all': ['rep-sec-kpis', 'rep-sec-charts', 'rep-sec-ranking', 'rep-sec-recs'],
        'rep-charts': ['rep-sec-charts'],
        'rep-ranking': ['rep-sec-ranking'],
        'rep-recs': ['rep-sec-recs']
    };
    const showList = map[subId] || map['rep-all'];
    ['rep-sec-kpis', 'rep-sec-charts', 'rep-sec-ranking', 'rep-sec-recs'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (showList.includes(id)) {
            el.style.display = id === 'rep-sec-kpis' ? 'grid' : 'block';
        } else {
            el.style.display = 'none';
        }
    });
}

function detectReportColumns(data, meta) {
    const cols = (meta.columns || []).filter(c => !c.startsWith('_'));
    const findCol = (patterns, candidates) => {
        const pool = candidates || cols;
        for (const p of patterns) {
            const match = pool.find(c => c.toLowerCase().includes(p));
            if (match) return match;
        }
        return null;
    };

    const numCols = meta.numericColumns || [];
    const catCols = meta.categoricalColumns || [];

    const revenueCol = findCol(['revenue', 'doanh_thu', 'doanh thu', 'amount', 'total', 'sales', 'tong_tien', 'thành tiền', 'thanh_tien', 'price', 'gia_tri', 'value'], numCols)
        || meta.primaryMetric || numCols[0] || null;

    const profitCol = findCol(['profit', 'loi_nhuan', 'lợi nhuận', 'margin_val', 'lai_gop', 'net_income'], numCols);
    const productCol = findCol(['product', 'san_pham', 'sản phẩm', 'service', 'dich_vu', 'dịch vụ', 'item', 'sku', 'sector', 'nganh', 'category', 'danh_muc', 'nhom'], catCols)
        || meta.categoryMetric || catCols[0] || null;

    const statusCol = findCol(['status', 'trang_thai', 'trạng thái', 'state', 'tinh_trang', 'tình trạng', 'risk_level'], catCols);
    const customerCol = findCol(['customer', 'khach_hang', 'khách hàng', 'client', 'buyer', 'user_id', 'ma_kh', 'entity_name', 'ten_kh', 'company'], cols)
        || meta.idMetric || null;
    const regionCol = findCol(['region', 'khu_vuc', 'khu vực', 'city', 'tinh', 'tỉnh', 'province', 'area', 'location', 'chi_nhanh', 'vung'], catCols);
    const dateCol = findCol(['date', 'ngay', 'ngày', 'time', 'thoi_gian', 'month', 'thang', 'period', 'created'], cols);

    return { revenueCol, profitCol, productCol, statusCol, customerCol, regionCol, dateCol };
}

function detectCurrencyFormatter(rawRows, revenueCol, maxVal) {
    let hasDollar = false;
    let hasVnd = false;
    if (revenueCol && rawRows && rawRows.length > 0) {
        const sample = rawRows.slice(0, 15).map(r => String(r[revenueCol] || '')).join(' ');
        if (sample.includes('$') || sample.toLowerCase().includes('usd')) hasDollar = true;
        if (sample.includes('₫') || sample.toLowerCase().includes('vnd') || sample.includes('đ')) hasVnd = true;
    }
    const useDollar = hasDollar || (!hasVnd && maxVal > 0 && maxVal < 500000);

    return {
        isDollar: useDollar,
        format: (num) => {
            if (num === null || num === undefined || isNaN(num)) return '-';
            const v = Number(num);
            if (useDollar) {
                return '$' + Math.round(v).toLocaleString('en-US');
            }
            if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + ' Tỷ';
            if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + ' Tr';
            return Math.round(v).toLocaleString('vi-VN') + ' đ';
        },
        formatExact: (num) => {
            if (num === null || num === undefined || isNaN(num)) return '-';
            const v = Number(num);
            if (useDollar) return '$' + Number(v.toFixed(1)).toLocaleString('en-US');
            return formatSmartNumber(v, revenueCol);
        },
        shortAxis: (num) => {
            const v = Number(num);
            if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1) + 'B';
            if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
            if (Math.abs(v) >= 1e3) return Math.round(v / 1e3) + 'k';
            return Math.round(v).toString();
        }
    };
}

function renderFinalExecutiveReport() {
    const emptyEl = document.getElementById('repEmptyState');
    const contentEl = document.getElementById('repMainContent');
    const data = window.currentDataset || [];
    const rawRows = window.rawDataset || [];
    const meta = window.datasetMetadata || {};

    if (!emptyEl || !contentEl) return;

    if (data.length === 0) {
        emptyEl.style.display = 'block';
        contentEl.style.display = 'none';
        return;
    }

    emptyEl.style.display = 'none';
    contentEl.style.display = 'block';

    const cols = detectReportColumns(data, meta);
    const revCol = cols.revenueCol;
    const values = data.map(r => revCol ? (Number(r[revCol]) || 0) : 0);
    const totalRevenue = values.reduce((a, b) => a + b, 0);
    const maxOrderVal = values.length ? Math.max(...values) : 0;
    const orderCount = data.length;
    const aov = orderCount > 0 ? totalRevenue / orderCount : 0;
    const fmt = detectCurrencyFormatter(rawRows, revCol, maxOrderVal);

    // Profit calculation (use actual profit col if available & positive, else margin 32%)
    let estimatedProfit = totalRevenue * reportProfitMargin;
    let profitSubLabel = `Biên lợi nhuận ${Math.round(reportProfitMargin * 100)}% do người dùng chọn`;
    if (cols.profitCol && cols.profitCol !== revCol) {
        const realProfitSum = data.reduce((s, r) => s + (Number(r[cols.profitCol]) || 0), 0);
        if (realProfitSum !== 0) {
            estimatedProfit = realProfitSum;
            const realMargin = totalRevenue > 0 ? ((realProfitSum / totalRevenue) * 100).toFixed(1) : '0.0';
            profitSubLabel = `Tính thực tế từ cột "${cols.profitCol}" (Biên ${realMargin}%)`;
        }
    }

    // Customers & repeat rate
    const custMap = {};
    data.forEach((r, idx) => {
        const c = cols.customerCol && r[cols.customerCol] ? String(r[cols.customerCol]).trim() : (r._name || `KH-${idx + 1}`);
        const amt = revCol ? (Number(r[revCol]) || 0) : 0;
        if (!custMap[c]) custMap[c] = { name: c, orders: 0, revenue: 0 };
        custMap[c].orders += 1;
        custMap[c].revenue += amt;
    });
    const custList = Object.values(custMap).sort((a, b) => b.revenue - a.revenue);
    const uniqueCustomers = custList.length;
    const repeatCustomers = custList.filter(c => c.orders >= 2).length;
    const repeatPct = uniqueCustomers > 0 ? ((repeatCustomers / uniqueCustomers) * 100).toFixed(1) : '0.0';
    const topCust = custList[0] || { name: 'N/A', orders: 0, revenue: 0 };

    // Date series for Line Chart
    const dateMap = {};
    const dateListRaw = [];
    data.forEach(r => {
        const rawD = cols.dateCol && r[cols.dateCol] ? String(r[cols.dateCol]).trim() : 'Khác';
        const dKey = rawD || 'Khác';
        if (dKey !== 'Khác') dateListRaw.push(dKey);
        const amt = revCol ? (Number(r[revCol]) || 0) : 0;
        const prof = (cols.profitCol && cols.profitCol !== revCol) ? (Number(r[cols.profitCol]) || 0) : (amt * reportProfitMargin);
        if (!dateMap[dKey]) dateMap[dKey] = { label: dKey, revenue: 0, profit: 0, count: 0 };
        dateMap[dKey].revenue += amt;
        dateMap[dKey].profit += prof;
        dateMap[dKey].count += 1;
    });
    const dateSeries = Object.values(dateMap).slice(-24);
    const periodText = dateListRaw.length >= 2
        ? `${dateListRaw[0]} — ${dateListRaw[dateListRaw.length - 1]}`
        : 'Đầu dữ liệu — Cuối dữ liệu';

    // Header & Hero Card (Image 1)
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const tsStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setTxt('repHeroRevenue', fmt.format(totalRevenue));
    setTxt('repHeroMeta', `${orderCount.toLocaleString('vi-VN')} đơn được tính · ${uniqueCustomers.toLocaleString('vi-VN')} khách hàng`);
    setTxt('repMetaFile', meta.fileName || 'Du_lieu_da_tai_len');
    setTxt('repMetaPeriod', periodText);
    setTxt('repMetaTime', tsStr);

    // 4 KPI Cards (Image 1)
    setTxt('repKpiProfit', fmt.format(estimatedProfit));
    setTxt('repKpiProfitSub', profitSubLabel);
    setTxt('repKpiOrders', orderCount.toLocaleString('vi-VN'));
    setTxt('repKpiAov', fmt.format(aov));
    setTxt('repKpiCustomers', uniqueCustomers.toLocaleString('vi-VN'));
    setTxt('repKpiCustomersSub', repeatCustomers > 0
        ? `${repeatPct}% khách mua từ 2 đơn`
        : `${uniqueCustomers} đối tượng duy nhất trong kỳ`);

    // ------------------------------------------------------------------
    // CHART 1: Line Chart - Nhịp doanh thu & lợi nhuận (Image 2)
    // ------------------------------------------------------------------
    const lineContainer = document.getElementById('repLineChartSvg');
    if (lineContainer) {
        const W = 640, H = 220;
        const padL = 52, padR = 24, padT = 24, padB = 34;
        const maxPoint = Math.max(...dateSeries.map(d => Math.max(d.revenue, d.profit)), 1);
        const yScale = v => padT + (1 - v / maxPoint) * (H - padT - padB);
        const stepX = dateSeries.length > 1 ? (W - padL - padR) / (dateSeries.length - 1) : 0;
        const xScale = i => dateSeries.length === 1 ? (padL + (W - padL - padR) / 2) : (padL + i * stepX);

        let gridSvg = '';
        [1, 0.66, 0.33, 0].forEach(ratio => {
            const y = padT + (1 - ratio) * (H - padT - padB);
            gridSvg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E2E8F0" stroke-width="1"/>`;
            gridSvg += `<text x="${padL - 10}" y="${y + 4}" font-size="11" fill="#64748B" text-anchor="end">${fmt.shortAxis(maxPoint * ratio)}</text>`;
        });

        let xLabelsSvg = '';
        const labelStep = Math.max(1, Math.ceil(dateSeries.length / 6));
        dateSeries.forEach((pt, i) => {
            if (i % labelStep === 0 || i === dateSeries.length - 1) {
                const shortLbl = pt.label.length > 12 ? pt.label.slice(0, 12) : pt.label;
                xLabelsSvg += `<text x="${xScale(i)}" y="${H - 8}" font-size="11" fill="#64748B" text-anchor="middle">${shortLbl}</text>`;
            }
        });

        let revSvg = '', profSvg = '';
        if (reportLineMode === 'both' || reportLineMode === 'revenue') {
            if (dateSeries.length > 1) {
                const pts = dateSeries.map((d, i) => `${xScale(i)},${yScale(d.revenue)}`).join(' ');
                const area = `${padL},${H - padB} ${pts} ${xScale(dateSeries.length - 1)},${H - padB}`;
                revSvg += `<polygon points="${area}" fill="rgba(30, 58, 138, 0.12)"/>`;
                revSvg += `<polyline points="${pts}" fill="none" stroke="#1E3A8A" stroke-width="2.5" stroke-linejoin="round"/>`;
            }
            dateSeries.forEach((d, i) => {
                revSvg += `<circle cx="${xScale(i)}" cy="${yScale(d.revenue)}" r="4.5" fill="#1E3A8A" stroke="#FFFFFF" stroke-width="2"><title>${d.label} · Doanh thu: ${fmt.format(d.revenue)}</title></circle>`;
            });
        }
        if (reportLineMode === 'both' || reportLineMode === 'profit') {
            if (dateSeries.length > 1) {
                const pts = dateSeries.map((d, i) => `${xScale(i)},${yScale(d.profit)}`).join(' ');
                profSvg += `<polyline points="${pts}" fill="none" stroke="#0284C7" stroke-width="2.2" stroke-dasharray="4 3" stroke-linejoin="round"/>`;
            }
            dateSeries.forEach((d, i) => {
                profSvg += `<circle cx="${xScale(i)}" cy="${yScale(d.profit)}" r="4" fill="#0284C7" stroke="#FFFFFF" stroke-width="1.8"><title>${d.label} · Lợi nhuận: ${fmt.format(d.profit)}</title></circle>`;
            });
        }

        lineContainer.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:${H}px; overflow:visible;">${gridSvg}${revSvg}${profSvg}${xLabelsSvg}</svg>`;
    }

    const peakDate = dateSeries.slice().sort((a, b) => b.revenue - a.revenue)[0] || { label: 'Khác', revenue: totalRevenue, profit: estimatedProfit };
    setTxt('repInsightLine', `Doanh thu cao nhất trong các mốc hiển thị là ${fmt.format(peakDate.revenue)} tại ${peakDate.label}, tương ứng lợi nhuận ước tính ${fmt.format(peakDate.profit)}.`);

    // ------------------------------------------------------------------
    // CHART 2: Donut Chart - Trạng thái đơn hàng (Image 2)
    // ------------------------------------------------------------------
    const statusMap = {};
    data.forEach(r => {
        const st = cols.statusCol && r[cols.statusCol] ? String(r[cols.statusCol]).trim() : (r._is_anomaly ? 'Cảnh báo' : 'Đạt chuẩn');
        statusMap[st] = (statusMap[st] || 0) + 1;
    });
    const statusEntries = Object.entries(statusMap).sort((a, b) => b[1] - a[1]);
    const donutColors = ['#1E3A8A', '#3B82F6', '#93C5FD', '#BFDBFE', '#6D28D9', '#CBD5E1'];
    const radius = 64, circ = 2 * Math.PI * radius;
    let offset = 0;
    let donutArcs = '';
    statusEntries.forEach(([label, count], i) => {
        const dash = (count / (orderCount || 1)) * circ;
        const col = donutColors[i % donutColors.length];
        donutArcs += `<circle cx="100" cy="100" r="${radius}" fill="none" stroke="${col}" stroke-width="26" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-offset}"><title>${label}: ${count} đơn</title></circle>`;
        offset += dash;
    });

    const donutContainer = document.getElementById('repDonutSvg');
    if (donutContainer) {
        donutContainer.innerHTML = `
            <svg viewBox="0 0 200 200" style="width:190px; height:190px; transform:rotate(-90deg); display:block; margin:0 auto;">
                <circle cx="100" cy="100" r="${radius}" fill="none" stroke="#F1F5F9" stroke-width="26"/>
                ${donutArcs}
            </svg>
            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center;">
                <div style="font-size:28px; font-weight:800; color:var(--paynext-text-main); line-height:1;">${orderCount}</div>
                <div style="font-size:11px; color:#64748B; font-weight:600; margin-top:3px;">đơn hàng trong kỳ</div>
            </div>`;
    }

    const legendEl = document.getElementById('repDonutLegend');
    if (legendEl) {
        legendEl.innerHTML = statusEntries.map(([lbl, cnt], i) =>
            `<span class="legend-pill"><span style="color:${donutColors[i % donutColors.length]};">●</span> ${lbl} · ${cnt}</span>`
        ).join('');
    }

    const goodCount = statusEntries.reduce((s, [lbl, cnt]) => {
        const l = lbl.toLowerCase();
        return (l.includes('complet') || l.includes('ship') || l.includes('xuất sắc') || l.includes('tiềm năng') || l.includes('ổn định') || l.includes('đạt chuẩn') || l.includes('hoàn tất')) ? s + cnt : s;
    }, 0);
    const goodPct = orderCount > 0 ? ((goodCount / orderCount) * 100).toFixed(1) : '0.0';
    setTxt('repDonutSub', `${orderCount} bản ghi trong kỳ · ${goodPct}% hoàn tất / đang giao / đạt chuẩn`);

    const topStatus = statusEntries[0] || ['N/A', 0];
    const topStatusPct = orderCount > 0 ? ((topStatus[1] / orderCount) * 100).toFixed(1).replace('.', ',') : '0,0';
    setTxt('repInsightDonut', `Trạng thái "${topStatus[0]}" có ${topStatus[1]} đơn, mức cao nhất, chiếm ${topStatusPct}% trong tổng số ${orderCount} đơn trên biểu đồ.`);

    // ------------------------------------------------------------------
    // CHART 3: Product Contribution Bars (Image 3)
    // ------------------------------------------------------------------
    const prodMap = {};
    data.forEach(r => {
        const p = cols.productCol && r[cols.productCol] ? String(r[cols.productCol]).trim() : (r._name || 'Chung');
        const amt = revCol ? (Number(r[revCol]) || 0) : 0;
        if (!prodMap[p]) prodMap[p] = { name: p, orders: 0, revenue: 0 };
        prodMap[p].orders += 1;
        prodMap[p].revenue += amt;
    });
    const prodList = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue);
    window._repProductList = prodList;
    window._repCurrencyFmt = fmt;

    const prodBarsEl = document.getElementById('repProductBars');
    if (prodBarsEl) {
        const top8 = prodList.slice(0, 8);
        const maxProdRev = top8[0]?.revenue || 1;
        prodBarsEl.innerHTML = top8.map(p => {
            const pctShare = totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) : '0.0';
            const barW = Math.max((p.revenue / maxProdRev) * 100, 3);
            return `
                <div style="margin-bottom:18px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-size:13.5px; font-weight:700; color:var(--paynext-text-main);">${p.name}</span>
                        <span style="font-size:13.5px; font-weight:800; color:var(--paynext-text-main);">${fmt.format(p.revenue)}</span>
                    </div>
                    <div style="width:100%; height:11px; background:#F1F5F9; border-radius:999px; overflow:hidden;">
                        <div style="width:${barW}%; height:100%; background:#5B8FD9; border-radius:999px;"></div>
                    </div>
                    <div style="margin-top:4px; font-size:12px; color:#64748B;">${p.orders} đơn · ${pctShare}% doanh thu</div>
                </div>`;
        }).join('');
    }
    const topP = prodList[0] || { name: 'N/A', orders: 0, revenue: 0 };
    const topPPct = totalRevenue > 0 ? ((topP.revenue / totalRevenue) * 100).toFixed(1).replace('.', ',') : '0,0';
    setTxt('repInsightProduct', `Sản phẩm "${topP.name}" đạt doanh thu cao nhất trong các nhóm hiển thị, với ${fmt.format(topP.revenue)} từ ${topP.orders} đơn. Số này chiếm ${topPPct}% doanh thu trong kỳ.`);

    // ------------------------------------------------------------------
    // CHART 4: Dynamic 6-Bin Order Value Histogram (Image 3)
    // ------------------------------------------------------------------
    const histEl = document.getElementById('repHistogram');
    const minV = values.length ? Math.min(...values) : 0;
    const maxV = values.length ? Math.max(...values) : 1;
    let binStep = maxV > 0 ? Math.ceil((maxV - Math.min(0, minV)) / 6) : 100;
    // Nice rounding for clean axis labels like $0, $150, $300, $450, $600, $750
    if (binStep >= 100 && binStep <= 180) binStep = 150;
    else if (binStep > 0) {
        const mag = Math.pow(10, Math.floor(Math.log10(binStep)));
        binStep = Math.ceil(binStep / (mag / 2)) * (mag / 2);
    }
    const bins = [0, 0, 0, 0, 0, 0];
    const binStarts = [0, 1, 2, 3, 4, 5].map(i => i * binStep);
    values.forEach(v => {
        let idx = binStep > 0 ? Math.floor(Math.max(0, v) / binStep) : 0;
        if (idx > 5) idx = 5;
        bins[idx] += 1;
    });
    const maxBinCount = Math.max(...bins, 1);
    const peakBinIdx = bins.indexOf(maxBinCount);

    if (histEl) {
        histEl.innerHTML = `<div style="display:flex; align-items:flex-end; justify-content:space-around; height:180px; padding-top:20px; border-bottom:1px solid var(--paynext-border);">` +
            bins.map((cnt, i) => {
                const barH = Math.max((cnt / maxBinCount) * 130, cnt > 0 ? 14 : 4);
                const bg = (i === peakBinIdx || i % 2 === 1) ? '#154471' : '#6A9CD4';
                const lbl = fmt.isDollar ? ('$' + binStarts[i].toLocaleString('en-US')) : fmt.shortAxis(binStarts[i]);
                return `
                    <div style="display:flex; flex-direction:column; align-items:center; flex:1; max-width:58px;">
                        <div style="font-size:12px; font-weight:700; color:var(--paynext-text-main); margin-bottom:4px;">${cnt}</div>
                        <div style="width:82%; height:${barH}px; background:${bg}; border-radius:7px 7px 0 0;"></div>
                        <div style="margin-top:8px; font-size:11.5px; font-weight:600; color:#64748B;">${lbl}</div>
                    </div>`;
            }).join('') + `</div>`;
    }
    const peakLow = fmt.format(binStarts[peakBinIdx]);
    const peakHigh = fmt.format(binStarts[peakBinIdx] + binStep);
    const peakBinPct = orderCount > 0 ? ((maxBinCount / orderCount) * 100).toFixed(1).replace('.', ',') : '0,0';
    setTxt('repInsightHistogram', `Khoảng giá trị đơn có nhiều đơn nhất là từ ${peakLow} đến ${peakHigh} (chưa gồm mức trên). Khoảng này có ${maxBinCount} đơn, chiếm ${peakBinPct}% số đơn trên biểu đồ.`);

    // ------------------------------------------------------------------
    // CHART 5: Region Breakdown (Image 4)
    // ------------------------------------------------------------------
    const regEl = document.getElementById('repRegionBox');
    if (cols.regionCol) {
        const regMap = {};
        data.forEach(r => {
            const rg = String(r[cols.regionCol] || 'Khác').trim();
            const amt = revCol ? (Number(r[revCol]) || 0) : 0;
            if (!regMap[rg]) regMap[rg] = { name: rg, orders: 0, revenue: 0 };
            regMap[rg].orders += 1;
            regMap[rg].revenue += amt;
        });
        const regList = Object.values(regMap).sort((a, b) => b.revenue - a.revenue);
        const maxReg = regList[0]?.revenue || 1;
        if (regEl) {
            regEl.innerHTML = regList.slice(0, 6).map(rg => `
                <div style="margin-bottom:14px;">
                    <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700; margin-bottom:5px;">
                        <span>${rg.name} (${rg.orders} đơn)</span>
                        <span>${fmt.format(rg.revenue)}</span>
                    </div>
                    <div style="height:10px; background:#F1F5F9; border-radius:999px; overflow:hidden;">
                        <div style="width:${Math.max((rg.revenue / maxReg) * 100, 4)}%; height:100%; background:#1E3A8A; border-radius:999px;"></div>
                    </div>
                </div>`).join('');
        }
        const topReg = regList[0];
        const topRegPct = totalRevenue > 0 ? ((topReg.revenue / totalRevenue) * 100).toFixed(1).replace('.', ',') : '0,0';
        setTxt('repInsightRegion', `Khu vực "${topReg.name}" dẫn đầu doanh thu với ${fmt.format(topReg.revenue)} (${topReg.orders} đơn), chiếm ${topRegPct}% tổng doanh thu.`);
    } else {
        if (regEl) {
            regEl.innerHTML = `<div style="text-align:center; padding:34px 12px; color:#64748B; font-size:13.5px;">Không có dữ liệu phù hợp hoặc chưa có cột tương ứng.</div>`;
        }
        setTxt('repInsightRegion', 'Bảng tính chưa có cột khu vực, nên chưa thể so sánh doanh thu theo khu vực.');
    }

    // ------------------------------------------------------------------
    // SECTION 6: Top Products Table (Image 4)
    // ------------------------------------------------------------------
    renderReportTopProductsTable();

    // ------------------------------------------------------------------
    // SECTION 7: 3 Strategic Executive Recommendations (Image 4)
    // ------------------------------------------------------------------
    const aovTarget = fmt.format(aov * 1.18);
    setTxt('repRec1Title', `Mở Rộng Sản Phẩm "${topP.name}"`);
    setTxt('repRec1Desc', `"${topP.name}" dẫn đầu với ${fmt.format(topP.revenue)} (${topP.orders} đơn). Ghép upsell cùng sản phẩm top giúp nâng AOV từ ${fmt.formatExact(aov)} lên ${aovTarget}.`);

    setTxt('repRec2Title', `Chăm Sóc Nhóm VIP (${repeatPct}% Mua Lại)`);
    setTxt('repRec2Desc', `Khách hàng dẫn đầu ${topCust.name} đóng góp ${fmt.format(topCust.revenue)} (${topCust.orders} đơn). Hiện có ${repeatCustomers}/${uniqueCustomers} khách mua lại.`);

    const canceledCnt = statusEntries.reduce((s, [lbl, cnt]) => {
        const l = lbl.toLowerCase();
        return (l.includes('cancel') || l.includes('hủy') || l.includes('nguy cơ') || l.includes('cảnh báo')) ? s + cnt : s;
    }, 0);
    const riskCnt = canceledCnt > 0 ? canceledCnt : (meta.anomaliesCount || 0);
    const riskPct = orderCount > 0 ? ((riskCnt / orderCount) * 100).toFixed(1) : '0.0';
    setTxt('repRec3Title', canceledCnt > 0 ? `Giảm Tỷ Lệ Hủy / Rủi Ro (${riskPct}%)` : `Tối Ưu Vận Hành & Biên Lãi (${riskPct}% Điểm Nóng)`);
    setTxt('repRec3Desc', riskCnt > 0
        ? `Ghi nhận ${riskCnt}/${orderCount} bản ghi bị hủy/rủi ro (${riskPct}%). Gửi xác nhận tự động qua Zalo/SMS ngay khi đặt giúp giữ lại phần lớn biên lợi nhuận ${Math.round(reportProfitMargin * 100)}%.`
        : `Hệ thống vận hành ổn định (0 đơn hủy). Duy trì quy trình đối soát tự động để bảo vệ biên lợi nhuận ${Math.round(reportProfitMargin * 100)}%.`);
}

function renderReportTopProductsTable() {
    const tbody = document.getElementById('repTopProductsTbody');
    if (!tbody) return;
    const list = window._repProductList || [];
    const fmt = window._repCurrencyFmt || { format: v => String(v) };
    const q = (document.getElementById('repProductSearch')?.value || '').toLowerCase().trim();
    const filtered = list.filter(p => !q || p.name.toLowerCase().includes(q));

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#64748B;">Không tìm thấy mục phù hợp.</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.slice(0, 15).map((p, i) => `
        <tr style="border-bottom:1px solid var(--paynext-border);">
            <td style="padding:13px 16px; font-weight:700; color:#64748B;">${String(i + 1).padStart(2, '0')}</td>
            <td style="padding:13px 16px; font-weight:700; color:var(--paynext-text-main);">${p.name}</td>
            <td style="padding:13px 16px; color:#475569;">${p.orders}</td>
            <td style="padding:13px 16px; font-weight:800; color:var(--paynext-text-main); text-align:right;">${fmt.format(p.revenue)}</td>
        </tr>`).join('');
}


// ==============================================================================
// 14. ACCOUNT AUTHENTICATION SYSTEM (BẮT BUỘC ĐĂNG NHẬP TRƯỚC KHI XỬ LÝ DỮ LIỆU)
// ==============================================================================

const AUTH_USERS_KEY = 'hkh_bi_users_v1';
const AUTH_SESSION_KEY = 'hkh_bi_current_user_v1';
let pendingAuthCallback = null;

function getStoredUsers() {
    let users = [];
    try {
        users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
    } catch (e) { users = []; }

    // Ensure default demo account exists
    if (!users.some(u => u.email.toLowerCase() === 'admin@hoangkimhue.vn')) {
        users.push({
            name: 'Hoàng Kim Huệ',
            email: 'admin@hoangkimhue.vn',
            password: '123456',
            role: 'Lead BI Analyst'
        });
        try { localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users)); } catch (e) {}
    }
    return users;
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null');
    } catch (e) { return null; }
}

function isUserLoggedIn() {
    return !!getCurrentUser();
}

function initAuthSystem() {
    getStoredUsers();
    updateAuthUI();
}

function updateAuthUI() {
    const area = document.getElementById('authNavArea');
    const user = getCurrentUser();
    if (!area) return;

    if (user) {
        const initial = (user.name || user.email || 'U').trim().charAt(0).toUpperCase();
        area.innerHTML = `
            <span class="user-auth-chip" title="${user.email}">
                <span class="user-avatar-dot">${initial}</span>
                <span>${user.name}</span>
            </span>
            <button class="btn-report-pill" onclick="logoutUser()">Đăng xuất</button>
        `;
        // Auto-fill feedback name if empty
        const fbNameEl = document.getElementById('fbCustomerName');
        if (fbNameEl && !fbNameEl.value) fbNameEl.value = user.name;
    } else {
        area.innerHTML = `
            <button class="btn-neo-primary" style="padding:7px 16px; font-size:12.5px;" onclick="openAuthModal('login')">🔐 Đăng Nhập</button>
        `;
    }
}

function openAuthModal(mode = 'login', onSuccess = null, noticeText = '') {
    pendingAuthCallback = typeof onSuccess === 'function' ? onSuccess : null;
    const modal = document.getElementById('authModal');
    const notice = document.getElementById('authModalNotice');
    if (notice && noticeText) {
        notice.innerText = noticeText;
    } else if (notice) {
        notice.innerText = 'Vui lòng đăng nhập tài khoản để tải tệp, làm sạch và phân tích dữ liệu bảo mật.';
    }
    switchAuthMode(mode);
    if (modal) modal.classList.add('open');
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('open');
    pendingAuthCallback = null;
}

function switchAuthMode(mode) {
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('authTabLogin');
    const tabReg = document.getElementById('authTabRegister');
    const errL = document.getElementById('loginErrorMsg');
    const errR = document.getElementById('regErrorMsg');
    if (errL) errL.style.display = 'none';
    if (errR) errR.style.display = 'none';

    if (mode === 'register') {
        if (loginForm) loginForm.style.display = 'none';
        if (regForm) regForm.style.display = 'block';
        if (tabLogin) tabLogin.classList.remove('active');
        if (tabReg) tabReg.classList.add('active');
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (regForm) regForm.style.display = 'none';
        if (tabLogin) tabLogin.classList.add('active');
        if (tabReg) tabReg.classList.remove('active');
    }
}

function fillDemoLogin(evt) {
    if (evt && evt.preventDefault) evt.preventDefault();
    const em = document.getElementById('loginEmail');
    const pw = document.getElementById('loginPassword');
    if (em) em.value = 'admin@hoangkimhue.vn';
    if (pw) pw.value = '123456';
}

function handleLoginSubmit(evt) {
    if (evt && evt.preventDefault) evt.preventDefault();
    const email = (document.getElementById('loginEmail')?.value || '').trim().toLowerCase();
    const password = (document.getElementById('loginPassword')?.value || '').trim();
    const errEl = document.getElementById('loginErrorMsg');

    const users = getStoredUsers();
    const found = users.find(u => u.email.toLowerCase() === email && u.password === password);
    if (!found) {
        if (errEl) {
            errEl.innerText = '❌ Email hoặc mật khẩu không chính xác. Bạn có thể bấm "Điền nhanh tài khoản dùng thử" hoặc sang tab Đăng Ký Mới.';
            errEl.style.display = 'block';
        }
        return;
    }

    try {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ name: found.name, email: found.email }));
    } catch (e) {}

    const cb = pendingAuthCallback;
    closeAuthModal();
    updateAuthUI();
    showNotification(`🔓 Đăng nhập thành công! Chào mừng ${found.name}.`);
    if (cb) cb();
}

function handleRegisterSubmit(evt) {
    if (evt && evt.preventDefault) evt.preventDefault();
    const name = (document.getElementById('regName')?.value || '').trim();
    const email = (document.getElementById('regEmail')?.value || '').trim().toLowerCase();
    const password = (document.getElementById('regPassword')?.value || '').trim();
    const errEl = document.getElementById('regErrorMsg');

    if (!name || !email || password.length < 4) {
        if (errEl) {
            errEl.innerText = '⚠️ Vui lòng nhập đầy đủ họ tên, email và mật khẩu từ 4 ký tự trở lên.';
            errEl.style.display = 'block';
        }
        return;
    }

    const users = getStoredUsers();
    if (users.some(u => u.email.toLowerCase() === email)) {
        if (errEl) {
            errEl.innerText = '⚠️ Email này đã được đăng ký. Vui lòng chuyển sang tab Đăng Nhập.';
            errEl.style.display = 'block';
        }
        return;
    }

    const newUser = { name, email, password, role: 'Khách hàng' };
    users.push(newUser);
    try {
        localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ name: newUser.name, email: newUser.email }));
    } catch (e) {}

    const cb = pendingAuthCallback;
    closeAuthModal();
    updateAuthUI();
    showNotification(`✨ Tạo tài khoản & đăng nhập thành công! Xin chào ${name}.`);
    if (cb) cb();
}

function logoutUser() {
    try { localStorage.removeItem(AUTH_SESSION_KEY); } catch (e) {}
    updateAuthUI();
    showNotification('👋 Đã đăng xuất tài khoản.');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 400);
}

// ==============================================================================
// 15. CUSTOMER FEEDBACK & 5-STAR RATING SYSTEM
// ==============================================================================

const FEEDBACK_STORAGE_KEY = 'hkh_bi_customer_feedback_v1';
let selectedFeedbackStars = 5;

const DEFAULT_REVIEWS = [
    {
        name: 'Trần Minh Khôi',
        role: 'Giám đốc Kinh doanh · Alpha Retail',
        stars: 5,
        aspects: ['✨ Giao diện dễ nhìn', '📊 Báo cáo trực quan'],
        comment: 'Giao diện rất dịu mắt và dễ thao tác. Đặc biệt phần Báo cáo cuối cùng hiển thị đủ biểu đồ doanh thu, trạng thái đơn hàng và 3 đề xuất hành động rất sát thực tế để trình ban giám đốc.',
        date: '18/11/2026'
    },
    {
        name: 'Lê Thảo Vy',
        role: 'Trưởng nhóm Vận hành · Nexus Logistics',
        stars: 5,
        aspects: ['🧹 Làm sạch dữ liệu chuẩn', '⚡ Xử lý nhanh mượt'],
        comment: 'Rất thích Bước 2 hiển thị trực tiếp bảng dữ liệu đã được làm sạch thay vì hiện code rối mắt. Tải file Excel lên là tự khử trùng lặp và chuẩn hóa số liệu ngay.',
        date: '17/11/2026'
    },
    {
        name: 'Phạm Quốc Bảo',
        role: 'Chuyên viên Tài chính · FinTech VN',
        stars: 5,
        aspects: ['🤖 AI Copilot thông minh', '📊 Báo cáo trực quan'],
        comment: 'Tính năng đăng nhập bảo mật trước khi xử lý dữ liệu rất chuyên nghiệp. Hỏi đáp AI Copilot bám sát số liệu vừa phân tích và xuất báo cáo PDF cực gọn.',
        date: '16/11/2026'
    }
];

function getStoredReviews() {
    try {
        const saved = JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) || 'null');
        if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch (e) {}
    return DEFAULT_REVIEWS.slice();
}

function setFeedbackStars(starCount) {
    selectedFeedbackStars = starCount;
    const btns = document.querySelectorAll('#starRatingPicker .star-btn');
    btns.forEach((b, idx) => {
        if (idx < starCount) b.classList.add('active');
        else b.classList.remove('active');
    });
    const labels = {
        1: '1/5 — Chưa hài lòng, cần cải thiện nhiều',
        2: '2/5 — Tạm ổn, còn vài điểm bất tiện',
        3: '3/5 — Bình thường, đáp ứng cơ bản',
        4: '4/5 — Rất tốt! Trải nghiệm mượt mà',
        5: '5/5 — Xuất sắc! Rất hài lòng'
    };
    const lbl = document.getElementById('starRatingLabel');
    if (lbl) lbl.innerText = labels[starCount] || labels[5];
}

function toggleFeedbackAspect(btn) {
    if (btn) btn.classList.toggle('selected');
}

function submitCustomerFeedback() {
    const nameEl = document.getElementById('fbCustomerName');
    const roleEl = document.getElementById('fbCustomerRole');
    const commentEl = document.getElementById('fbComment');

    const name = (nameEl?.value || '').trim();
    const role = (roleEl?.value || '').trim() || 'Khách hàng trải nghiệm';
    const comment = (commentEl?.value || '').trim();

    if (!name) {
        showNotification('⚠️ Vui lòng nhập họ và tên của bạn.');
        if (nameEl) nameEl.focus();
        return;
    }
    if (!comment) {
        showNotification('⚠️ Vui lòng viết vài dòng cảm nhận hoặc góp ý.');
        if (commentEl) commentEl.focus();
        return;
    }

    const aspects = Array.from(document.querySelectorAll('#feedbackAspectChips .aspect-chip.selected'))
        .map(el => el.innerText.trim());

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    const reviews = getStoredReviews();
    reviews.unshift({
        name,
        role,
        stars: selectedFeedbackStars,
        aspects,
        comment,
        date: dateStr
    });

    try {
        localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(reviews));
    } catch (e) {}

    if (commentEl) commentEl.value = '';
    renderFeedbackSection();
    showNotification('⭐ Cảm ơn bạn đã gửi đánh giá! Phản hồi của bạn đã được ghi nhận.');
}

function renderFeedbackSection() {
    const reviews = getStoredReviews();
    const total = reviews.length;
    const avg = total > 0 ? (reviews.reduce((s, r) => s + (Number(r.stars) || 5), 0) / total).toFixed(1) : '5.0';

    const avgEl = document.getElementById('fbAvgScore');
    const cntEl = document.getElementById('fbTotalCount');
    if (avgEl) avgEl.innerText = avg;
    if (cntEl) cntEl.innerText = `${total} lượt đánh giá`;

    // 5-star breakdown bars
    const barsEl = document.getElementById('fbRatingBars');
    if (barsEl) {
        barsEl.innerHTML = [5, 4, 3, 2, 1].map(star => {
            const count = reviews.filter(r => Number(r.stars) === star).length;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return `
                <div class="rating-bar-row">
                    <span style="width:42px;">${star} ★</span>
                    <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${pct}%;"></div></div>
                    <span style="width:32px; text-align:right;">${count}</span>
                </div>`;
        }).join('');
    }

    // Reviews feed
    const listEl = document.getElementById('feedbackReviewsList');
    if (listEl) {
        listEl.innerHTML = reviews.map(r => {
            const starsStr = '★'.repeat(r.stars || 5) + '☆'.repeat(5 - (r.stars || 5));
            const initial = (r.name || 'K').trim().charAt(0).toUpperCase();
            const chipsHtml = (r.aspects || []).map(a => `<span class="tag-pill purple" style="font-size:11px; padding:3px 10px;">${a}</span>`).join('');
            return `
                <div class="review-card-item">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px; flex-wrap:wrap;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span class="user-avatar-dot" style="width:34px; height:34px; font-size:14px;">${initial}</span>
                            <div>
                                <div style="font-weight:800; font-size:14px; color:var(--paynext-text-main);">${r.name}</div>
                                <div style="font-size:11.5px; color:var(--paynext-text-muted);">${r.role} · ${r.date}</div>
                            </div>
                        </div>
                        <div style="color:#F59E0B; font-size:15px; letter-spacing:1px;">${starsStr}</div>
                    </div>
                    <p style="font-size:13.5px; color:var(--paynext-text-main); line-height:1.55; margin-bottom:${chipsHtml ? '10px' : '0'};">${r.comment}</p>
                    ${chipsHtml ? `<div style="display:flex; gap:6px; flex-wrap:wrap;">${chipsHtml}</div>` : ''}
                </div>`;
        }).join('');
    }

    // Auto-fill customer name if logged in
    const user = getCurrentUser();
    const fbNameEl = document.getElementById('fbCustomerName');
    if (user && fbNameEl && !fbNameEl.value) fbNameEl.value = user.name;
}



// ==============================================================================
// 16. BOOTSTRAP APPLICATION (AFTER ALL CONST/LET DECLARATIONS)
// ==============================================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}