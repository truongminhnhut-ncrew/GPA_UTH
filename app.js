```js
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

let activeSemIndex = null;
let chartInstance   = null;
const STORAGE_KEY   = 'gpa_tracker_data_v2';

// ─── GRADE CONVERSION ─────────────────────────────────────────
function scoreToGrade(score) {
  if (score === null || score === undefined || score === '') {
    return { letter: '—', gpa4: null };
  }

  const s = parseFloat(score);

  if (isNaN(s)) return { letter: '—', gpa4: null };

  if (s >= 8.5) return { letter: 'A',  gpa4: 4.0 };
  if (s >= 8.0) return { letter: 'B+', gpa4: 3.5 };
  if (s >= 7.0) return { letter: 'B',  gpa4: 3.0 };
  if (s >= 6.5) return { letter: 'C+', gpa4: 2.5 };
  if (s >= 5.5) return { letter: 'C',  gpa4: 2.0 };
  if (s >= 5.0) return { letter: 'D+', gpa4: 1.5 };
  if (s >= 4.0) return { letter: 'D',  gpa4: 1.0 };

  return { letter: 'F', gpa4: 0.0 };
}

// ─── GPA RANK CLASSIFICATION ──────────────────────────────────
function gpaRank(gpa) {
  if (gpa === null || gpa === undefined) return null;

  if (gpa >= 3.6) {
    return {
      label: 'Xuất sắc',
      color: '#10b981',
      bg: 'rgba(16,185,129,0.18)',
      border: 'rgba(16,185,129,0.35)',
      icon: '🏆'
    };
  }

  if (gpa >= 3.2) {
    return {
      label: 'Giỏi',
      color: '#60a5fa',
      bg: 'rgba(59,130,246,0.18)',
      border: 'rgba(59,130,246,0.35)',
      icon: '⭐'
    };
  }

  if (gpa >= 2.5) {
    return {
      label: 'Khá',
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.18)',
      border: 'rgba(167,139,250,0.35)',
      icon: '👍'
    };
  }

  if (gpa >= 2.0) {
    return {
      label: 'Trung bình',
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.18)',
      border: 'rgba(251,191,36,0.35)',
      icon: '📊'
    };
  }

  if (gpa >= 1.0) {
    return {
      label: 'Yếu',
      color: '#fb923c',
      bg: 'rgba(249,115,22,0.18)',
      border: 'rgba(249,115,22,0.35)',
      icon: '⚠️'
    };
  }

  return {
    label: 'Kém',
    color: '#f87171',
    bg: 'rgba(239,68,68,0.18)',
    border: 'rgba(239,68,68,0.35)',
    icon: '❌'
  };
}

function rankChipHTML(gpa) {
  const r = gpaRank(gpa);

  if (!r) return '';

  return `
    <span class="rank-chip"
      style="
        color:${r.color};
        background:${r.bg};
        border-color:${r.border}
      ">
      ${r.icon} ${r.label}
    </span>
  `;
}

function calcFinalScore(qt, gk, ck) {
  const hasQt = qt !== '' && qt !== null && !isNaN(parseFloat(qt));
  const hasGk = gk !== '' && gk !== null && !isNaN(parseFloat(gk));
  const hasCk = ck !== '' && ck !== null && !isNaN(parseFloat(ck));

  if (!hasCk) return null;

  const c = parseFloat(ck);

  if (hasQt && hasGk) {
    return parseFloat(qt) * 0.1 +
           parseFloat(gk) * 0.3 +
           c * 0.6;
  }

  if (hasGk) {
    return parseFloat(gk) * 0.4 + c * 0.6;
  }

  return c;
}

// ─── GPA CALCULATION ──────────────────────────────────────────
function calcSemGPA(subjects) {
  let totalPoints  = 0;
  let totalCredits = 0;

  subjects.forEach(s => {
    if (s.gpa4 !== null && s.credits > 0) {
      totalPoints  += s.gpa4 * s.credits;
      totalCredits += s.credits;
    }
  });

  if (totalCredits === 0) {
    return { gpa: null, credits: 0 };
  }

  return {
    gpa: totalPoints / totalCredits,
    credits: totalCredits
  };
}

function calcOverallGPA() {
  let totalPoints  = 0;
  let totalCredits = 0;

  db.forEach(subjects => {
    subjects.forEach(s => {
      if (s.gpa4 !== null && s.credits > 0) {
        totalPoints  += s.gpa4 * s.credits;
        totalCredits += s.credits;
      }
    });
  });

  if (totalCredits === 0) {
    return { gpa: null, credits: 0 };
  }

  return {
    gpa: totalPoints / totalCredits,
    credits: totalCredits
  };
}

function gpaColor(gpa) {
  if (gpa === null || gpa === undefined) return '#9090c0';

  if (gpa >= 3.6) return '#10b981';
  if (gpa >= 3.2) return '#60a5fa';
  if (gpa >= 2.5) return '#a78bfa';
  if (gpa >= 2.0) return '#fbbf24';
  if (gpa >= 1.0) return '#fb923c';

  return '#f87171';
}

// ─── SUBJECT CRUD ─────────────────────────────────────────────
function createSubject() {
  return {
    id: Date.now() + Math.random(),

    code: '',
    name: '',

    credits: 3,

    qt: '',
    gk: '',
    ck: '',

    tk: '', // NEW

    finalScore: null,

    letter: '—',
    gpa4: null,
  };
}

function updateSubjectCalc(sub) {
  let fs = null;

  // Ưu tiên điểm tổng kết nhập tay
  if (
    sub.tk !== '' &&
    sub.tk !== null &&
    !isNaN(parseFloat(sub.tk))
  ) {
    fs = parseFloat(sub.tk);
  } else {
    fs = calcFinalScore(sub.qt, sub.gk, sub.ck);
  }

  sub.finalScore = fs !== null
    ? Math.round(fs * 10) / 10
    : null;

  const { letter, gpa4 } =
    sub.finalScore !== null
      ? scoreToGrade(sub.finalScore)
      : { letter: '—', gpa4: null };

  sub.letter = letter;
  sub.gpa4   = gpa4;
}

// ─── STORAGE ──────────────────────────────────────────────────
function saveDB() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {}
}

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw);

      if (
        Array.isArray(parsed) &&
        parsed.length === 11
      ) {
        db = parsed;
      }
    }
  } catch (e) {}
}

// ─── FIELD UPDATES ────────────────────────────────────────────
function updateField(semIdx, subIdx, field, value) {
  db[semIdx][subIdx][field] =
    field === 'credits'
      ? parseInt(value) || 0
      : value;

  if (field === 'credits') {
    refreshCalc(semIdx);
  }

  saveDB();
}

function updateScore(semIdx, subIdx, field, value) {
  db[semIdx][subIdx][field] = value;

  // Nếu nhập QT/GK/CK thì clear TK manual
  db[semIdx][subIdx].tk = '';

  updateSubjectCalc(db[semIdx][subIdx]);

  const sub = db[semIdx][subIdx];

  renderResultCells(semIdx, subIdx, sub);

  refreshCalc(semIdx);

  saveDB();
}

function updateFinalScore(semIdx, subIdx, value) {
  db[semIdx][subIdx].tk = value;

  updateSubjectCalc(db[semIdx][subIdx]);

  const sub = db[semIdx][subIdx];

  renderResultCells(semIdx, subIdx, sub);

  refreshCalc(semIdx);

  saveDB();
}

function renderResultCells(semIdx, subIdx, sub) {
  const gradeCell = document.getElementById(
    `grade-${semIdx}-${subIdx}`
  );

  const gpa4Cell = document.getElementById(
    `gpa4-${semIdx}-${subIdx}`
  );

  if (gradeCell) {
    gradeCell.innerHTML =
      sub.letter !== '—'
        ? `
          <span class="grade-chip grade-${sub.letter.replace('+','\\+')}">
            ${sub.letter}
          </span>
        `
        : '<span style="color:#5555a0">—</span>';
  }

  if (gpa4Cell) {
    gpa4Cell.innerHTML =
      sub.gpa4 !== null
        ? `
          <span
            class="gpa-value"
            style="color:${gpaColor(sub.gpa4)}">
            ${sub.gpa4.toFixed(1)}
          </span>
        `
        : '<span style="color:#5555a0">—</span>';
  }
}

// ─── SUBJECT TABLE ────────────────────────────────────────────
function renderSubjectTable(idx) {
  const subjects = db[idx];

  const tbody = document.getElementById('subject-tbody');

  tbody.innerHTML = subjects.map((s, i) => `
    <tr data-id="${s.id}">
      <td>${i + 1}</td>

      <td>
        <input
          class="cell-input"
          type="text"
          value="${esc(s.code)}"
          onchange="updateField(${idx},${i},'code',this.value)"
        />
      </td>

      <td>
        <input
          class="cell-input"
          type="text"
          value="${esc(s.name)}"
          onchange="updateField(${idx},${i},'name',this.value)"
        />
      </td>

      <td>
        <input
          class="cell-input"
          type="number"
          min="1"
          max="10"
          value="${s.credits}"
          onchange="updateField(${idx},${i},'credits',this.value)"
        />
      </td>

      <td>
        <input
          class="cell-input score-input"
          type="number"
          min="0"
          max="10"
          step="0.1"
          value="${s.qt}"
          onchange="updateScore(${idx},${i},'qt',this.value)"
        />
      </td>

      <td>
        <input
          class="cell-input score-input"
          type="number"
          min="0"
          max="10"
          step="0.1"
          value="${s.gk}"
          onchange="updateScore(${idx},${i},'gk',this.value)"
        />
      </td>

      <td>
        <input
          class="cell-input score-input"
          type="number"
          min="0"
          max="10"
          step="0.1"
          value="${s.ck}"
          onchange="updateScore(${idx},${i},'ck',this.value)"
        />
      </td>

      <!-- TK INPUT -->
      <td class="td-center">
        <input
          class="cell-input score-input"
          type="number"
          min="0"
          max="10"
          step="0.1"
          value="${s.tk ?? ''}"
          placeholder="${
            s.finalScore !== null
              ? s.finalScore.toFixed(1)
              : '—'
          }"
          onchange="updateFinalScore(${idx},${i},this.value)"
        />
      </td>

      <!-- GRADE -->
      <td class="td-center" id="grade-${idx}-${i}">
        ${
          s.letter !== '—'
            ? `
            <span class="grade-chip grade-${s.letter.replace('+','\\+')}">
              ${s.letter}
            </span>
          `
            : '<span style="color:#5555a0">—</span>'
        }
      </td>

      <!-- GPA -->
      <td class="td-center" id="gpa4-${idx}-${i}">
        ${
          s.gpa4 !== null
            ? `
            <span
              class="gpa-value"
              style="color:${gpaColor(s.gpa4)}">
              ${s.gpa4.toFixed(1)}
            </span>
          `
            : '<span style="color:#5555a0">—</span>'
        }
      </td>

      <td>
        <button
          class="btn-delete"
          onclick="deleteSubject(${idx},${i})">
          Xóa
        </button>
      </td>
    </tr>
  `).join('');
}

// ─── UTIL ─────────────────────────────────────────────────────
function esc(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadDB();
  showOverview();
});
```
