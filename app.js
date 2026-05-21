/* ================================================
   GPA TRACKER – APPLICATION LOGIC
   Cấu trúc: 8 kỳ chính + 3 kỳ hè = 11 học kỳ
   HK1, HK2, Hè1, HK3, HK4, Hè2, HK5, HK6, Hè3, HK7, HK8
   ================================================ */

// ─── DATA STRUCTURE ───────────────────────────────────────────
const SEMESTER_DEFS = [
  { id: 0,  name: 'Học kỳ 1', label: 'HK1',  isSummer: false },
  { id: 1,  name: 'Học kỳ 2', label: 'HK2',  isSummer: false },
  { id: 2,  name: 'Kỳ hè 1',  label: 'Hè 1', isSummer: true  },
  { id: 3,  name: 'Học kỳ 3', label: 'HK3',  isSummer: false },
  { id: 4,  name: 'Học kỳ 4', label: 'HK4',  isSummer: false },
  { id: 5,  name: 'Kỳ hè 2',  label: 'Hè 2', isSummer: true  },
  { id: 6,  name: 'Học kỳ 5', label: 'HK5',  isSummer: false },
  { id: 7,  name: 'Học kỳ 6', label: 'HK6',  isSummer: false },
  { id: 8,  name: 'Kỳ hè 3',  label: 'Hè 3', isSummer: true  },
  { id: 9,  name: 'Học kỳ 7', label: 'HK7',  isSummer: false },
  { id: 10, name: 'Học kỳ 8', label: 'HK8',  isSummer: false },
];

// Dữ liệu chính – mảng 11 học kỳ, mỗi kỳ là mảng môn học
let db = SEMESTER_DEFS.map(() => []);

let activeSemIndex = null; // null = overview
let chartInstance   = null;
const STORAGE_KEY   = 'gpa_tracker_data_v2';

// ─── GRADE CONVERSION ─────────────────────────────────────────
// Thang điểm UTH: 8.5–10 → A/4.0, 8.0–8.4 → B+/3.5, 7.0–7.9 → B/3.0,
//                 6.0–6.9 → C+/2.5, 5.5–5.9 → C/2.0, 5.0–5.4 → D+/1.5,
//                 4.0–4.9 → D/1.0, 2.1–3.9 → F+/0, 0–2.0 → F/0
function scoreToGrade(score) {
  if (score === null || score === undefined || score === '') return { letter: '—', gpa4: null };
  const s = parseFloat(score);
  if (isNaN(s)) return { letter: '—', gpa4: null };
  if (s >= 8.5)  return { letter: 'A',  gpa4: 4.0 };
  if (s >= 8.0)  return { letter: 'B+', gpa4: 3.5 };
  if (s >= 7.0)  return { letter: 'B',  gpa4: 3.0 };
  if (s >= 6.0)  return { letter: 'C+', gpa4: 2.5 };
  if (s >= 5.5)  return { letter: 'C',  gpa4: 2.0 };
  if (s >= 5.0)  return { letter: 'D+', gpa4: 1.5 };
  if (s >= 4.0)  return { letter: 'D',  gpa4: 1.0 };
  if (s >= 2.1)  return { letter: 'F+', gpa4: 0.0 };
  return { letter: 'F', gpa4: 0.0 };
}

// ─── GPA RANK CLASSIFICATION ──────────────────────────────────
// Xuất sắc: 3.6–4.0 | Giỏi: 3.2–<3.6 | Khá: 2.5–<3.2
// Trung bình: 2.0–<2.5 | Yếu: 1.0–<2.0 | Kém: <1.0
function gpaRank(gpa) {
  if (gpa === null || gpa === undefined) return null;
  if (gpa >= 3.6) return { label: 'Xuất sắc',   color: '#10b981', bg: 'rgba(16,185,129,0.18)',  border: 'rgba(16,185,129,0.35)',  icon: '🏆' };
  if (gpa >= 3.2) return { label: 'Giỏi',        color: '#60a5fa', bg: 'rgba(59,130,246,0.18)',  border: 'rgba(59,130,246,0.35)',  icon: '⭐' };
  if (gpa >= 2.5) return { label: 'Khá',         color: '#a78bfa', bg: 'rgba(167,139,250,0.18)', border: 'rgba(167,139,250,0.35)', icon: '👍' };
  if (gpa >= 2.0) return { label: 'Trung bình',  color: '#fbbf24', bg: 'rgba(251,191,36,0.18)',  border: 'rgba(251,191,36,0.35)',  icon: '📊' };
  if (gpa >= 1.0) return { label: 'Trung bình yếu', color: '#fb923c', bg: 'rgba(249,115,22,0.18)',  border: 'rgba(249,115,22,0.35)',  icon: '⚠️' };
  return           { label: 'Kém',          color: '#f87171', bg: 'rgba(239,68,68,0.18)',   border: 'rgba(239,68,68,0.35)',   icon: '❌' };
}

function rankChipHTML(gpa) {
  const r = gpaRank(gpa);
  if (!r) return '';
  return `<span class="rank-chip" style="color:${r.color};background:${r.bg};border-color:${r.border}">${r.icon} ${r.label}</span>`;
}

function calcFinalScore(qt, gk, ck) {
  const hasQt = qt !== '' && qt !== null && !isNaN(parseFloat(qt));
  const hasGk = gk !== '' && gk !== null && !isNaN(parseFloat(gk));
  const hasCk = ck !== '' && ck !== null && !isNaN(parseFloat(ck));

  if (!hasCk) return null; // cuối kỳ bắt buộc

  const c = parseFloat(ck);
  if (hasQt && hasGk) {
    return parseFloat(qt) * 0.1 + parseFloat(gk) * 0.3 + c * 0.6;
  } else if (hasGk) {
    return parseFloat(gk) * 0.4 + c * 0.6;
  } else {
    return c;
  }
}

// ─── GPA CALCULATION ──────────────────────────────────────────
function calcSemGPA(subjects) {
  let totalPoints = 0, totalCredits = 0;
  subjects.forEach(s => {
    if (s.gpa4 !== null && s.credits > 0) {
      totalPoints  += s.gpa4 * s.credits;
      totalCredits += s.credits;
    }
  });
  if (totalCredits === 0) return { gpa: null, credits: 0 };
  return { gpa: totalPoints / totalCredits, credits: totalCredits };
}

function calcOverallGPA() {
  let totalPoints = 0, totalCredits = 0;
  db.forEach(subjects => {
    subjects.forEach(s => {
      if (s.gpa4 !== null && s.credits > 0) {
        totalPoints  += s.gpa4 * s.credits;
        totalCredits += s.credits;
      }
    });
  });
  if (totalCredits === 0) return { gpa: null, credits: 0 };
  return { gpa: totalPoints / totalCredits, credits: totalCredits };
}

function gpaColor(gpa) {
  if (gpa === null || gpa === undefined) return '#9090c0';
  if (gpa >= 3.6) return '#10b981'; // Xuất sắc
  if (gpa >= 3.2) return '#60a5fa'; // Giỏi
  if (gpa >= 2.5) return '#a78bfa'; // Khá
  if (gpa >= 2.0) return '#fbbf24'; // Trung bình
  if (gpa >= 1.0) return '#fb923c'; // Yếu
  return '#f87171'; // Kém
}

// ─── SUBJECT CRUD ─────────────────────────────────────────────
function createSubject() {
  return {
    id:      Date.now() + Math.random(),
    code:    '',
    name:    '',
    credits: 3,
    qt:      '',
    gk:      '',
    ck:      '',
    tk:      '',        // Điểm Tổng Kết nhập tay (ưu tiên hơn công thức)
    finalScore: null,
    letter:  '—',
    gpa4:    null,
  };
}

function updateSubjectCalc(sub) {
  // Ưu tiên tk (nhập tay) nếu có giá trị hợp lệ
  const hasTk = sub.tk != null && sub.tk !== '' && !isNaN(parseFloat(sub.tk));
  if (hasTk) {
    sub.finalScore = Math.round(parseFloat(sub.tk) * 10) / 10;
  } else {
    const raw = calcFinalScore(sub.qt, sub.gk, sub.ck);
    sub.finalScore = raw !== null ? Math.round(raw * 10) / 10 : null;
  }
  const { letter, gpa4 } = sub.finalScore !== null
    ? scoreToGrade(sub.finalScore)
    : { letter: '—', gpa4: null };
  sub.letter = letter;
  sub.gpa4   = gpa4;
}

// ─── STORAGE ──────────────────────────────────────────────────
function saveDB() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch(e) { /* ignore quota */ }
}

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 11) {
        db = parsed;
        // Tự động tính toán lại điểm chữ/GPA4 theo thang điểm UTH mới của tất cả môn đã lưu
        let hasChanges = false;
        db.forEach(sem => {
          sem.forEach(sub => {
            const oldLetter = sub.letter;
            const oldGpa4 = sub.gpa4;
            updateSubjectCalc(sub);
            if (sub.letter !== oldLetter || sub.gpa4 !== oldGpa4) {
              hasChanges = true;
            }
          });
        });
        if (hasChanges) {
          saveDB();
        }
      }
    }
  } catch(e) { /* ignore */ }
}

// ─── NAVIGATION ───────────────────────────────────────────────
function clearNavActive() {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
}

function showOverview() {
  clearNavActive();
  document.getElementById('nav-overview').classList.add('active');
  document.getElementById('page-overview').classList.add('active');
  document.getElementById('page-semester').classList.remove('active');
  activeSemIndex = null;
  renderOverview();
  closeSidebarMobile();
}

function showSemester(idx) {
  clearNavActive();
  const navEl = document.getElementById(`nav-sem-${idx}`);
  if (navEl) navEl.classList.add('active');

  document.getElementById('page-overview').classList.remove('active');
  document.getElementById('page-semester').classList.add('active');
  activeSemIndex = idx;
  renderSemesterPage(idx);
  closeSidebarMobile();
}

// ─── OVERVIEW RENDER ──────────────────────────────────────────
function renderOverview() {
  const overall = calcOverallGPA();

  // Badge
  const badge = document.getElementById('overall-gpa-value');
  badge.textContent = overall.gpa !== null ? overall.gpa.toFixed(2) : '—';
  badge.style.color = gpaColor(overall.gpa);

  // Stats grid
  const totalSubjects = db.reduce((a, sem) => a + sem.length, 0);
  const totalCredits  = overall.credits;
  const completedSems = db.filter(sem => sem.some(s => s.gpa4 !== null)).length;

  // Update overall rank badge
  const rankEl = document.getElementById('overall-gpa-rank');
  if (rankEl) rankEl.innerHTML = rankChipHTML(overall.gpa);

  const statsGrid = document.getElementById('stats-grid');
  const overallRank = gpaRank(overall.gpa);
  statsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(124,58,237,0.15)">🎓</div>
      <div class="stat-value" style="color:#a855f7">${overall.gpa !== null ? overall.gpa.toFixed(2) : '—'}</div>
      <div class="stat-label">GPA Tích Lũy (Thang 4)</div>
      ${overallRank ? `<div style="margin-top:8px">${rankChipHTML(overall.gpa)}</div>` : ''}
    </div>
    <div class="stat-card" style="--gradient:linear-gradient(90deg,#10b981,#34d399)">
      <div class="stat-icon" style="background:rgba(16,185,129,0.15)">📊</div>
      <div class="stat-value" style="color:#10b981">${totalCredits}</div>
      <div class="stat-label">Tổng Tín Chỉ Tích Lũy</div>
    </div>
    <div class="stat-card" style="--gradient:linear-gradient(90deg,#3b82f6,#60a5fa)">
      <div class="stat-icon" style="background:rgba(59,130,246,0.15)">📚</div>
      <div class="stat-value" style="color:#60a5fa">${totalSubjects}</div>
      <div class="stat-label">Tổng Số Môn Học</div>
    </div>
    <div class="stat-card" style="--gradient:linear-gradient(90deg,#f59e0b,#fbbf24)">
      <div class="stat-icon" style="background:rgba(245,158,11,0.15)">🏫</div>
      <div class="stat-value" style="color:#fbbf24">${completedSems}/11</div>
      <div class="stat-label">Học Kỳ Có Kết Quả</div>
    </div>
  `;

  // Semester summary cards
  const grid = document.getElementById('semester-summary-grid');
  grid.innerHTML = SEMESTER_DEFS.map(def => {
    const { gpa, credits } = calcSemGPA(db[def.id]);
    const subCount = db[def.id].length;
    return `
      <div class="sem-summary-card ${def.isSummer ? 'summer-card' : ''}" onclick="showSemester(${def.id})">
        <div class="sem-card-name">${def.isSummer ? '☀️ ' : ''}${def.name}</div>
        <div class="sem-card-gpa" style="color:${gpaColor(gpa)}">${gpa !== null ? gpa.toFixed(2) : '—'}</div>
        <div class="sem-card-rank">${rankChipHTML(gpa)}</div>
        <div class="sem-card-meta">${credits} TC • ${subCount} môn</div>
      </div>`;
  }).join('');

  // Chart
  renderChart();
}

// ─── CHART ────────────────────────────────────────────────────
function renderChart() {
  const canvas = document.getElementById('gpaChart');
  const ctx    = canvas.getContext('2d');

  const labels = SEMESTER_DEFS.map(d => d.label);
  const data   = SEMESTER_DEFS.map(d => {
    const { gpa } = calcSemGPA(db[d.id]);
    return gpa !== null ? parseFloat(gpa.toFixed(2)) : null;
  });

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  // Custom mini chart (no dependency)
  const dpr    = window.devicePixelRatio || 1;
  const rect   = canvas.parentElement.getBoundingClientRect();
  const W      = rect.width  || 600;
  const H      = 260;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  const pad = { top: 20, right: 24, bottom: 52, left: 44 };
  const cw  = W - pad.left - pad.right;
  const ch  = H - pad.top  - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  // Background grid
  const gridLines = [0, 1, 2, 3, 4];
  gridLines.forEach(v => {
    const y = pad.top + ch - (v / 4) * ch;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4,4]);
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cw, y);
    ctx.stroke();
    ctx.setLineDash([]);
    // y-label
    ctx.fillStyle = 'rgba(144,144,192,0.8)';
    ctx.font      = '11px Inter, system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(v.toFixed(1), pad.left - 8, y + 4);
  });

  const n   = labels.length;
  const xOf = i => pad.left + (i / (n - 1)) * cw;
  const yOf = v => v !== null ? pad.top + ch - (v / 4) * ch : null;

  // Fill area
  const validPts = data.map((v, i) => ({ x: xOf(i), y: yOf(v), v })).filter(p => p.y !== null);
  if (validPts.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(validPts[0].x, pad.top + ch);
    validPts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(validPts[validPts.length - 1].x, pad.top + ch);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    grad.addColorStop(0,   'rgba(124,58,237,0.3)');
    grad.addColorStop(1,   'rgba(124,58,237,0.0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Line
  if (validPts.length >= 2) {
    ctx.beginPath();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    validPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
  }

  // X labels + dots
  data.forEach((v, i) => {
    const x  = xOf(i);
    const isSummer = SEMESTER_DEFS[i].isSummer;
    const y  = yOf(v);

    // x-label
    ctx.fillStyle = isSummer ? '#fbbf24' : 'rgba(144,144,192,0.8)';
    ctx.font      = isSummer ? 'bold 10px Inter' : '10.5px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x, H - pad.bottom + 18);

    if (y !== null) {
      // Outer glow
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(124,58,237,0.2)';
      ctx.fill();
      // Dot
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle   = isSummer ? '#fbbf24' : '#a855f7';
      ctx.strokeStyle = isSummer ? '#fef3c7' : '#e9d5ff';
      ctx.lineWidth   = 1.5;
      ctx.fill();
      ctx.stroke();
      // Value label
      ctx.fillStyle   = '#f0f0ff';
      ctx.font        = 'bold 11px Inter';
      ctx.textAlign   = 'center';
      ctx.fillText(v.toFixed(2), x, y - 12);
    }
  });
}

// ─── SEMESTER PAGE RENDER ─────────────────────────────────────
function renderSemesterPage(idx) {
  const def      = SEMESTER_DEFS[idx];
  const subjects = db[idx];

  document.getElementById('sem-page-title').textContent    = def.name;
  document.getElementById('sem-page-subtitle').textContent = def.isSummer
    ? '☀️ Học kỳ hè – Môn học và điểm số'
    : `Năm ${Math.ceil((idx < 2 ? idx+1 : idx < 5 ? idx-1 : idx < 8 ? idx-3 : idx-5) / 2)} – ${def.name}`;

  const { gpa, credits } = calcSemGPA(subjects);
  const semBadge = document.getElementById('sem-gpa-value');
  semBadge.textContent = gpa !== null ? gpa.toFixed(2) : '—';
  semBadge.style.color = gpaColor(gpa);

  const semRankEl = document.getElementById('sem-gpa-rank');
  if (semRankEl) semRankEl.innerHTML = rankChipHTML(gpa);

  if (def.isSummer) {
    document.getElementById('sem-gpa-badge').style.borderColor = 'rgba(245,158,11,0.4)';
    document.getElementById('sem-gpa-badge').style.background  = 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(251,191,36,0.08))';
  } else {
    document.getElementById('sem-gpa-badge').style.borderColor = '';
    document.getElementById('sem-gpa-badge').style.background  = '';
  }

  // Sem stats
  const passed   = subjects.filter(s => s.gpa4 !== null && s.gpa4 >= 1.0).length;
  const failed   = subjects.filter(s => s.gpa4 !== null && s.gpa4 < 1.0).length;
  const totalSub = subjects.length;
  document.getElementById('sem-stats-row').innerHTML = `
    <div class="stat-card" style="--gradient:linear-gradient(90deg,#7c3aed,#a855f7)">
      <div class="stat-icon" style="background:rgba(124,58,237,0.15)">📋</div>
      <div class="stat-value" style="color:#a855f7">${totalSub}</div>
      <div class="stat-label">Số Môn</div>
    </div>
    <div class="stat-card" style="--gradient:linear-gradient(90deg,#10b981,#34d399)">
      <div class="stat-icon" style="background:rgba(16,185,129,0.15)">✅</div>
      <div class="stat-value" style="color:#10b981">${credits}</div>
      <div class="stat-label">Tín Chỉ TC</div>
    </div>
    <div class="stat-card" style="--gradient:linear-gradient(90deg,#3b82f6,#60a5fa)">
      <div class="stat-icon" style="background:rgba(59,130,246,0.15)">🎯</div>
      <div class="stat-value" style="color:#60a5fa">${passed}</div>
      <div class="stat-label">Môn Qua</div>
    </div>
    <div class="stat-card" style="--gradient:linear-gradient(90deg,#ef4444,#f87171)">
      <div class="stat-icon" style="background:rgba(239,68,68,0.15)">❌</div>
      <div class="stat-value" style="color:#f87171">${failed}</div>
      <div class="stat-label">Môn Rớt</div>
    </div>
  `;

  document.getElementById('sem-table-title').textContent = `${def.name} – Danh Sách Môn Học`;
  renderSubjectTable(idx);
}

// ─── SUBJECT TABLE ────────────────────────────────────────────
function renderSubjectTable(idx) {
  const subjects = db[idx];
  const tbody    = document.getElementById('subject-tbody');
  const tfoot    = document.getElementById('subject-tfoot');
  const empty    = document.getElementById('table-empty');
  const wrapper  = document.querySelector('.table-wrapper');

  if (subjects.length === 0) {
    wrapper.style.display = 'none';
    tfoot.innerHTML       = '';
    empty.style.display   = 'block';
    return;
  }

  wrapper.style.display = '';
  empty.style.display   = 'none';

  tbody.innerHTML = subjects.map((s, i) => `
    <tr data-id="${s.id}">
      <td class="td-stt">${i + 1}</td>
      <td><input class="cell-input code-input" type="text" value="${esc(s.code)}" placeholder="VD001" onchange="updateField(${idx},${i},'code',this.value)" /></td>
      <td><input class="cell-input name-input" type="text" value="${esc(s.name)}" placeholder="Tên môn học..." onchange="updateField(${idx},${i},'name',this.value)" /></td>
      <td class="td-center"><input class="cell-input credits-input" type="number" min="1" max="10" value="${s.credits}" onchange="updateField(${idx},${i},'credits',this.value)" /></td>
      <td class="td-center"><input class="cell-input score-input" type="number" min="0" max="10" step="0.1" value="${s.qt}" placeholder="—" onchange="updateScore(${idx},${i},'qt',this.value)" /></td>
      <td class="td-center"><input class="cell-input score-input" type="number" min="0" max="10" step="0.1" value="${s.gk}" placeholder="—" onchange="updateScore(${idx},${i},'gk',this.value)" /></td>
      <td class="td-center"><input class="cell-input score-input" type="number" min="0" max="10" step="0.1" value="${s.ck}" placeholder="—" onchange="updateScore(${idx},${i},'ck',this.value)" /></td>
      <td class="td-center">
        <input class="cell-input score-input" type="number" min="0" max="10" step="0.1"
          id="final-input-${idx}-${i}"
          value="${s.tk}"
          placeholder="${s.finalScore !== null ? s.finalScore.toFixed(1) : '—'}"
          onchange="updateFinalScore(${idx},${i},this.value)" />
      </td>
      <td class="td-center" id="grade-${idx}-${i}">
        ${s.letter !== '—' ? `<span class="grade-chip grade-${s.letter.replace('+','\\+')}">${s.letter}</span>` : '<span style="color:#5555a0">—</span>'}
      </td>
      <td class="td-center" id="gpa4-${idx}-${i}">
        ${s.gpa4 !== null ? `<span class="gpa-value" style="color:${gpaColor(s.gpa4)}">${s.gpa4.toFixed(1)}</span>` : '<span style="color:#5555a0">—</span>'}
      </td>
      <td>
        <button class="btn-delete" onclick="deleteSubject(${idx},${i})" title="Xóa môn học">
          <svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </td>
    </tr>
  `).join('');

  // Footer totals
  const { gpa, credits } = calcSemGPA(subjects);
  tfoot.innerHTML = `
    <tr>
      <td colspan="3" class="tfoot-label">Tổng kết học kỳ</td>
      <td class="tfoot-credits">${credits} TC</td>
      <td colspan="3"></td>
      <td class="td-center"><span class="tfoot-rank">${rankChipHTML(gpa)}</span></td>
      <td class="td-center" style="color:var(--text-secondary);font-size:12px">GPA</td>
      <td class="tfoot-gpa" style="color:${gpaColor(gpa)}">${gpa !== null ? gpa.toFixed(2) : '—'}</td>
      <td></td>
    </tr>
  `;
}

function esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── FIELD UPDATES ────────────────────────────────────────────
function updateField(semIdx, subIdx, field, value) {
  db[semIdx][subIdx][field] = field === 'credits' ? parseInt(value) || 0 : value;
  if (field === 'credits') refreshCalc(semIdx);
  saveDB();
}

function updateScore(semIdx, subIdx, field, value) {
  db[semIdx][subIdx][field] = value;
  updateSubjectCalc(db[semIdx][subIdx]);
  const sub = db[semIdx][subIdx];
  // Cap nhat placeholder o TK khi tk chua nhap thu cong
  const finalInput = document.getElementById(`final-input-${semIdx}-${subIdx}`);
  if (finalInput && (sub.tk == null || sub.tk === '')) {
    finalInput.placeholder = sub.finalScore !== null ? sub.finalScore.toFixed(1) : '—';
  }
  const gradeCell = document.getElementById(`grade-${semIdx}-${subIdx}`);
  const gpa4Cell  = document.getElementById(`gpa4-${semIdx}-${subIdx}`);
  if (gradeCell) gradeCell.innerHTML = sub.letter !== '—'
    ? `<span class="grade-chip grade-${sub.letter.replace('+' ,'\\+')}">${sub.letter}</span>`
    : '<span style="color:#5555a0">—</span>';
  if (gpa4Cell)  gpa4Cell.innerHTML  = sub.gpa4 !== null
    ? `<span class="gpa-value" style="color:${gpaColor(sub.gpa4)}">${sub.gpa4.toFixed(1)}</span>`
    : '<span style="color:#5555a0">—</span>';
  refreshCalc(semIdx);
  saveDB();
}

// Xu ly nhap thu cong Diem TK (uu tien hon cong thuc qt/gk/ck)
function updateFinalScore(semIdx, subIdx, value) {
  db[semIdx][subIdx].tk = value;
  updateSubjectCalc(db[semIdx][subIdx]);
  const sub = db[semIdx][subIdx];
  const gradeCell = document.getElementById(`grade-${semIdx}-${subIdx}`);
  const gpa4Cell  = document.getElementById(`gpa4-${semIdx}-${subIdx}`);
  if (gradeCell) gradeCell.innerHTML = sub.letter !== '—'
    ? `<span class="grade-chip grade-${sub.letter.replace('+' ,'\\+')}">${sub.letter}</span>`
    : '<span style="color:#5555a0">—</span>';
  if (gpa4Cell)  gpa4Cell.innerHTML  = sub.gpa4 !== null
    ? `<span class="gpa-value" style="color:${gpaColor(sub.gpa4)}">${sub.gpa4.toFixed(1)}</span>`
    : '<span style="color:#5555a0">—</span>';
  refreshCalc(semIdx);
  saveDB();
}

function refreshCalc(idx) {
  const { gpa, credits } = calcSemGPA(db[idx]);
  const semBadge = document.getElementById('sem-gpa-value');
  if (semBadge && activeSemIndex === idx) {
    semBadge.textContent = gpa !== null ? gpa.toFixed(2) : '—';
    semBadge.style.color = gpaColor(gpa);
    const semRankEl = document.getElementById('sem-gpa-rank');
    if (semRankEl) semRankEl.innerHTML = rankChipHTML(gpa);
  }
  // Update tfoot
  const tfoot = document.getElementById('subject-tfoot');
  if (tfoot) {
    const existing = tfoot.querySelector('.tfoot-gpa');
    if (existing) {
      existing.textContent  = gpa !== null ? gpa.toFixed(2) : '—';
      existing.style.color  = gpaColor(gpa);
    }
    const rankEl = tfoot.querySelector('.tfoot-rank');
    if (rankEl) rankEl.innerHTML = rankChipHTML(gpa);
    const credEl = tfoot.querySelector('.tfoot-credits');
    if (credEl) credEl.textContent = credits + ' TC';
  }
  // Update sem stats
  renderSemStatsRow(idx);
}

function renderSemStatsRow(idx) {
  const subjects  = db[idx];
  const { credits } = calcSemGPA(subjects);
  const passed    = subjects.filter(s => s.gpa4 !== null && s.gpa4 >= 1.0).length;
  const failed    = subjects.filter(s => s.gpa4 !== null && s.gpa4 < 1.0).length;
  const row       = document.getElementById('sem-stats-row');
  if (!row) return;
  const vals = row.querySelectorAll('.stat-value');
  if (vals.length >= 4) {
    vals[0].textContent = subjects.length;
    vals[1].textContent = credits;
    vals[2].textContent = passed;
    vals[3].textContent = failed;
  }
}

function addSubject() {
  const idx = activeSemIndex;
  if (idx === null) return;
  db[idx].push(createSubject());
  saveDB();
  renderSubjectTable(idx);
  renderSemStatsRow(idx);
  // Scroll to bottom
  setTimeout(() => {
    const tbody = document.getElementById('subject-tbody');
    if (tbody) tbody.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
}

function deleteSubject(semIdx, subIdx) {
  db[semIdx].splice(subIdx, 1);
  saveDB();
  renderSubjectTable(semIdx);
  refreshCalc(semIdx);
  showToast('Đã xóa môn học', 'info');
}

// ─── MOBILE SIDEBAR ───────────────────────────────────────────
function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick   = closeSidebarMobile;
    document.body.appendChild(overlay);
  }
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

function closeSidebarMobile() {
  document.getElementById('sidebar').classList.remove('open');
  const overlay = document.querySelector('.sidebar-overlay');
  if (overlay) overlay.classList.remove('active');
}

// ─── TOAST ────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ─── EXCEL EXPORT ─────────────────────────────────────────────
function exportExcel() {
  const wb = XLSX.utils.book_new();

  // Sheet tổng quan
  const overviewData = [
    ['GPA TRACKER – TỔNG QUAN'],
    [],
    ['Học kỳ', 'Loại', 'Số môn', 'Tín chỉ', 'GPA (4.0)'],
  ];
  SEMESTER_DEFS.forEach(def => {
    const { gpa, credits } = calcSemGPA(db[def.id]);
    overviewData.push([
      def.name,
      def.isSummer ? 'Kỳ hè' : 'Kỳ chính',
      db[def.id].length,
      credits,
      gpa !== null ? gpa.toFixed(2) : '—',
    ]);
  });
  const overall = calcOverallGPA();
  overviewData.push([], ['TỔNG CỘNG', '', db.reduce((a,s) => a+s.length,0), overall.credits, overall.gpa !== null ? overall.gpa.toFixed(2) : '—']);

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  wsOverview['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Tổng Quan');

  // Mỗi học kỳ một sheet
  SEMESTER_DEFS.forEach(def => {
    const rows = [
      [`${def.name.toUpperCase()} – DANH SÁCH MÔN HỌC`],
      [],
      ['STT', 'Mã MH', 'Tên Môn Học', 'Số TC', 'Điểm QT', 'Điểm GK', 'Điểm CK', 'Điểm TK', 'Điểm Chữ', 'GPA (4.0)'],
    ];
    db[def.id].forEach((s, i) => {
      rows.push([
        i + 1,
        s.code    || '',
        s.name    || '',
        s.credits || 0,
        s.qt !== '' ? s.qt : '',
        s.gk !== '' ? s.gk : '',
        s.ck !== '' ? s.ck : '',
        s.finalScore !== null ? s.finalScore : '',
        s.letter  || '—',
        s.gpa4    !== null ? s.gpa4 : '',
      ]);
    });
    const { gpa, credits } = calcSemGPA(db[def.id]);
    rows.push([], ['', '', 'GPA Học Kỳ:', credits + ' TC', '', '', '', '', '', gpa !== null ? gpa.toFixed(2) : '—']);

    const ws  = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      {wch:5},{wch:10},{wch:36},{wch:7},{wch:9},{wch:9},{wch:9},{wch:9},{wch:10},{wch:10}
    ];
    XLSX.utils.book_append_sheet(wb, ws, def.label);
  });

  XLSX.writeFile(wb, `GPA_Tracker_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast('✅ Xuất file Excel thành công!', 'success');
}

// ─── EXCEL IMPORT ─────────────────────────────────────────────
function importExcel() {
  document.getElementById('excel-file-input').click();
}

function handleFileImport(event) {
  const file   = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb   = XLSX.read(data, { type: 'array' });

      let importedCount = 0;

      SEMESTER_DEFS.forEach(def => {
        const ws = wb.Sheets[def.label];
        if (!ws) return;
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        // Find header row (row index 2 = row 3)
        const headerRowIdx = rows.findIndex(r =>
          String(r[0]).trim() === 'STT' || String(r[2]).includes('Tên Môn')
        );
        if (headerRowIdx < 0) return;

        const newSubs = [];
        for (let i = headerRowIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          const stt = String(r[0]).trim();
          if (!stt || isNaN(parseInt(stt))) continue; // skip footer/empty
          const sub = createSubject();
          sub.code    = String(r[1] || '').trim();
          sub.name    = String(r[2] || '').trim();
          sub.credits = parseInt(r[3]) || 0;
          sub.qt      = r[4] !== '' && r[4] !== undefined ? String(r[4]) : '';
          sub.gk      = r[5] !== '' && r[5] !== undefined ? String(r[5]) : '';
          sub.ck      = r[6] !== '' && r[6] !== undefined ? String(r[6]) : '';
          sub.tk      = r[7] !== '' && r[7] !== undefined ? String(r[7]) : '';
          updateSubjectCalc(sub);
          newSubs.push(sub);
          importedCount++;
        }

        if (newSubs.length > 0) {
          db[def.id] = newSubs;
        }
      });

      saveDB();

      if (activeSemIndex !== null) {
        renderSemesterPage(activeSemIndex);
      } else {
        renderOverview();
      }

      showToast(`✅ Nhập thành công ${importedCount} môn học!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('❌ Lỗi đọc file Excel. Hãy dùng file đã xuất từ app này.', 'error');
    }
    // Reset input
    event.target.value = '';
  };

  reader.readAsArrayBuffer(file);
}

// ─── RESIZE HANDLER ───────────────────────────────────────────
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!activeSemIndex && document.getElementById('page-overview').classList.contains('active')) {
      renderChart();
    }
  }, 200);
});

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadDB();
  showOverview();
});
