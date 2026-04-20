// ══════════════════════════════════════════════
//  PORTAL DATA PENEMPATAN LUAR NEGERI SMK
//  v3 — One-to-Many DB, NPSN Login, Class Sort
// ══════════════════════════════════════════════

// ── DB Structure ──────────────────────────────
// localStorage key: 'smk_db'
// {
//   schools: {
//     [npsn]: { npsn, namaSekolah, createdAt },
//     ...
//   },
//   students: [
//     { id, npsn, namaSekolah, namaMurid, konsentrasi, kelas,
//       sudahPelatihan, namaFasilitator, sudahPenempatan,
//       negaraPenempatan, tanggalPenempatan, timestamp },
//     ...
//   ]
// }

const DB_KEY = 'smk_db_v3';
const KELAS_ORDER = { 'X': 1, 'XI': 2, 'XII': 3, 'XIII': 4 };

// ── Active school session ──────────────────────
let activeSchool = null; // { npsn, namaSekolah }

// ── Step wizard state ─────────────────────────
let currentStep = 1;
let selections  = {}; // kelas, pelatihan, penempatan

// ── DB Helpers ────────────────────────────────
function getDB() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || { schools: {}, students: [] }; }
  catch { return { schools: {}, students: [] }; }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getSchool(npsn) {
  return getDB().schools[npsn] || null;
}

function registerSchool(npsn, namaSekolah) {
  const db = getDB();
  db.schools[npsn] = { npsn, namaSekolah, createdAt: new Date().toISOString() };
  saveDB(db);
}

function getStudentsBySchool(npsn) {
  const db = getDB();
  return db.students
    .filter(s => s.npsn === npsn)
    .sort((a, b) => {
      // Sort by kelas ascending (X < XI < XII < XIII)
      const ka = KELAS_ORDER[a.kelas] || 99;
      const kb = KELAS_ORDER[b.kelas] || 99;
      if (ka !== kb) return ka - kb;
      // Then alphabetically by name
      return a.namaMurid.localeCompare(b.namaMurid, 'id');
    });
}

function getAllStudentsSorted() {
  const db = getDB();
  return db.students.sort((a, b) => {
    // Sort by school, then kelas, then name
    if (a.namaSekolah !== b.namaSekolah) return a.namaSekolah.localeCompare(b.namaSekolah, 'id');
    const ka = KELAS_ORDER[a.kelas] || 99;
    const kb = KELAS_ORDER[b.kelas] || 99;
    if (ka !== kb) return ka - kb;
    return a.namaMurid.localeCompare(b.namaMurid, 'id');
  });
}

function addStudent(record) {
  const db = getDB();
  db.students.push(record);
  saveDB(db);
}

function deleteStudentById(id) {
  const db = getDB();
  db.students = db.students.filter(s => s.id !== id);
  saveDB(db);
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ── Toast ─────────────────────────────────────
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Page Navigation ───────────────────────────
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ══════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════
function loginSekolah() {
  const npsn = document.getElementById('login-npsn').value.trim();
  const errEl = document.getElementById('login-error');
  const namaBox = document.getElementById('login-namabox');

  errEl.textContent = '';

  if (!/^\d{8}$/.test(npsn)) {
    errEl.textContent = '⚠ NPSN harus 8 digit angka.';
    return;
  }

  const existing = getSchool(npsn);

  if (existing) {
    // School already registered — log in directly
    activeSchool = existing;
    namaBox.style.display = 'none';
    enterDashboard();
  } else {
    // New school — need name first
    if (namaBox.style.display === 'none') {
      namaBox.style.display = 'block';
      document.getElementById('login-nama').focus();
      return;
    }
    const nama = document.getElementById('login-nama').value.trim();
    if (!nama) {
      errEl.textContent = '⚠ Nama sekolah wajib diisi.';
      document.getElementById('login-nama').focus();
      return;
    }
    registerSchool(npsn, nama);
    activeSchool = { npsn, namaSekolah: nama };
    namaBox.style.display = 'none';
    enterDashboard();
  }
}

function enterDashboard() {
  // Reset login form
  document.getElementById('login-npsn').value = '';
  document.getElementById('login-nama').value = '';
  document.getElementById('login-error').textContent = '';
  document.getElementById('login-namabox').style.display = 'none';

  renderDashboard();
  goPage('page-dashboard');
}

function gantiSekolah() {
  if (!confirm('Keluar dari sesi sekolah ini?')) return;
  activeSchool = null;
  goPage('page-home');
}

// ══════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════
function renderDashboard() {
  if (!activeSchool) return;

  document.getElementById('dash-npsn-tag').textContent = 'NPSN ' + activeSchool.npsn;
  document.getElementById('dash-school-name').textContent = activeSchool.namaSekolah;

  const students = getStudentsBySchool(activeSchool.npsn);
  document.getElementById('dash-student-count').textContent =
    `${students.length} murid terdaftar`;

  // Class summary
  const byKelas = {};
  students.forEach(s => {
    if (!byKelas[s.kelas]) byKelas[s.kelas] = { total: 0, pelatihan: 0, penempatan: 0 };
    byKelas[s.kelas].total++;
    if (s.sudahPelatihan === 'Sudah') byKelas[s.kelas].pelatihan++;
    if (s.sudahPenempatan === 'Sudah') byKelas[s.kelas].penempatan++;
  });

  const kelasKeys = Object.keys(byKelas).sort((a, b) => (KELAS_ORDER[a] || 99) - (KELAS_ORDER[b] || 99));

  const summary = document.getElementById('class-summary');

  if (kelasKeys.length === 0) {
    summary.innerHTML = `<div class="class-summary-title">RINGKASAN PER KELAS</div>
      <div style="color:var(--muted);font-size:0.88rem;padding:16px 0;">Belum ada data murid. Klik "Tambah Murid" untuk memulai.</div>`;
    return;
  }

  summary.innerHTML = `<div class="class-summary-title">RINGKASAN PER KELAS</div>` +
    kelasKeys.map(k => {
      const d = byKelas[k];
      return `
        <div class="class-row">
          <div class="class-badge">Kls<br>${k}</div>
          <div class="class-info">
            <strong>${d.total} Murid</strong>
            <span>Kelas ${k}</span>
          </div>
          <div class="class-stats">
            <div class="cstat ok">
              <span class="cstat-num">${d.pelatihan}</span>
              Pelatihan
            </div>
            <div class="cstat wait">
              <span class="cstat-num">${d.penempatan}</span>
              Penempatan
            </div>
          </div>
        </div>`;
    }).join('');
}

// ══════════════════════════════════════════════
//  WIZARD
// ══════════════════════════════════════════════
function getStepSequence() {
  // Steps: 1=Murid, 2=Konsentrasi, 3=Kelas, 4=Pelatihan,
  //        5=Fasilitator(conditional), 6=Penempatan,
  //        7=Negara(conditional), 8=Tanggal(conditional), 9=Review
  const seq = [1, 2, 3, 4];
  if (selections.pelatihan === 'Sudah') seq.push(5);
  seq.push(6);
  if (selections.penempatan === 'Sudah') { seq.push(7); seq.push(8); }
  seq.push(9);
  return seq;
}

function startWizard() {
  if (!activeSchool) { goPage('page-home'); return; }

  currentStep = 1;
  selections = {};

  ['f-murid', 'f-konsentrasi', 'f-fasilitator', 'f-negara', 'f-tanggal']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.querySelectorAll('.big-choice, .yn-btn, .pill').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.field-error').forEach(el => el.classList.remove('show'));

  // Show school banner in wizard
  document.getElementById('wiz-school-banner').textContent =
    `✏️ Menambah murid untuk: ${activeSchool.namaSekolah} (${activeSchool.npsn})`;

  goPage('page-wizard');
  showStep(1);
}

function cancelWizard() {
  if (confirm('Batalkan pengisian data murid?')) {
    goPage('page-dashboard');
    renderDashboard();
  }
}

function showStep(step) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  const el = document.querySelector(`.step[data-step="${step}"]`);
  if (el) el.classList.add('active');

  const seq = getStepSequence();
  const idx = seq.indexOf(step);
  const total = seq.length;

  document.getElementById('progressBar').style.width = `${(idx / (total - 1)) * 100}%`;
  document.getElementById('stepCounter').textContent = `${idx + 1} / ${total}`;

  const backBtn = document.getElementById('wiz-back-btn');
  backBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';

  if (step === 9) buildReview();

  setTimeout(() => {
    const input = el && el.querySelector('input');
    if (input && input.type !== 'date') input.focus();
  }, 350);
}

function nextStep(fromStep) {
  if (!validateStep(fromStep)) return;
  const seq = getStepSequence();
  const idx = seq.indexOf(fromStep);
  if (idx < seq.length - 1) {
    currentStep = seq[idx + 1];
    showStep(currentStep);
  }
}

function prevStep() {
  const seq = getStepSequence();
  const idx = seq.indexOf(currentStep);
  if (idx > 0) {
    currentStep = seq[idx - 1];
    showStep(currentStep);
  } else {
    cancelWizard();
  }
}

function enterNext(event, step) {
  if (event.key === 'Enter') nextStep(step);
}

// ── Validation ────────────────────────────────
function showErr(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3500); }
}

function fVal(id) { return (document.getElementById(id)?.value || '').trim(); }

function validateStep(step) {
  switch (step) {
    case 1: if (!fVal('f-murid'))       { showErr('err-murid');       return false; } break;
    case 2: if (!fVal('f-konsentrasi')) { showErr('err-konsentrasi'); return false; } break;
    case 3: if (!selections.kelas)      { showErr('err-kelas');        return false; } break;
    case 4: if (!selections.pelatihan)  { showErr('err-pelatihan');   return false; } break;
    case 5: if (!fVal('f-fasilitator')) { showErr('err-fasilitator'); return false; } break;
    case 6: if (!selections.penempatan) { showErr('err-penempatan');  return false; } break;
    case 7: if (!fVal('f-negara'))      { showErr('err-negara');      return false; } break;
    case 8: if (!fVal('f-tanggal'))     { showErr('err-tanggal');     return false; } break;
  }
  return true;
}

// ── Selections ────────────────────────────────
function selectBig(field, value, btn) {
  selections[field] = value;
  btn.parentElement.querySelectorAll(`[data-field="${field}"]`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function setPill(inputId, value, btn) {
  document.getElementById(inputId).value = value;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
  btn.classList.add('selected');
}

// ── Review ────────────────────────────────────
function buildReview() {
  const rows = [
    ['🏫 NPSN',              activeSchool?.npsn || '—'],
    ['🏛️ Sekolah',           activeSchool?.namaSekolah || '—'],
    ['👤 Nama Murid',        fVal('f-murid')],
    ['🔧 Konsentrasi',       fVal('f-konsentrasi')],
    ['📚 Kelas',             selections.kelas || '—'],
    ['🌏 Pelatihan LN',      selections.pelatihan || '—'],
    ['👨‍🏫 Fasilitator',      selections.pelatihan === 'Sudah' ? (fVal('f-fasilitator') || '—') : 'Tidak diisi'],
    ['🎓 Dapat Penempatan',  selections.penempatan || '—'],
    ['✈️ Negara',            selections.penempatan === 'Sudah' ? (fVal('f-negara') || '—') : 'Tidak diisi'],
    ['📅 Tgl Penempatan',    selections.penempatan === 'Sudah' ? (formatDate(fVal('f-tanggal')) || '—') : 'Tidak diisi'],
  ];

  document.getElementById('reviewCard').innerHTML = rows.map(([label, value]) => {
    let display = esc(value);
    if (value === 'Sudah') display = `<span class="rev-badge rev-ok">✅ Sudah</span>`;
    else if (value === 'Belum') display = `<span class="rev-badge rev-no">⏳ Belum</span>`;
    else if (value === 'Tidak diisi') display = `<span style="color:#aaa;font-style:italic">Tidak diisi</span>`;
    return `<div class="review-row"><span class="rev-label">${label}</span><span class="rev-value">${display}</span></div>`;
  }).join('');
}

// ── Submit ────────────────────────────────────
function submitData() {
  const record = {
    id: genId(),
    timestamp: new Date().toISOString(),
    npsn: activeSchool.npsn,
    namaSekolah: activeSchool.namaSekolah,
    namaMurid: fVal('f-murid'),
    konsentrasi: fVal('f-konsentrasi'),
    kelas: selections.kelas,
    sudahPelatihan: selections.pelatihan,
    namaFasilitator: selections.pelatihan === 'Sudah' ? fVal('f-fasilitator') : '',
    sudahPenempatan: selections.penempatan,
    negaraPenempatan: selections.penempatan === 'Sudah' ? fVal('f-negara') : '',
    tanggalPenempatan: selections.penempatan === 'Sudah' ? fVal('f-tanggal') : '',
  };

  addStudent(record);

  document.getElementById('success-name').textContent =
    `${record.namaMurid} — ${record.namaSekolah} (Kelas ${record.kelas})`;
  goPage('page-success');
}

// ══════════════════════════════════════════════
//  DATA TABLE (grouped by kelas)
// ══════════════════════════════════════════════
function renderTable() {
  if (!activeSchool) return;

  // Update school tag
  document.getElementById('data-school-tag').textContent =
    `${activeSchool.namaSekolah} — NPSN ${activeSchool.npsn}`;

  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  let students = getStudentsBySchool(activeSchool.npsn);

  if (q) students = students.filter(s =>
    s.namaMurid.toLowerCase().includes(q) ||
    s.konsentrasi.toLowerCase().includes(q)
  );

  document.getElementById('dataCount').textContent = `${students.length} murid`;

  const container = document.getElementById('grouped-tables');
  const empty = document.getElementById('emptyState');

  if (!students.length) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  // Group by kelas (already sorted)
  const groups = {};
  students.forEach(s => {
    if (!groups[s.kelas]) groups[s.kelas] = [];
    groups[s.kelas].push(s);
  });

  const kelasOrder = Object.keys(groups).sort((a, b) => (KELAS_ORDER[a] || 99) - (KELAS_ORDER[b] || 99));

  container.innerHTML = kelasOrder.map(kelas => {
    const rows = groups[kelas];
    let rowNum = 0;
    const tableRows = rows.map(r => {
      rowNum++;
      return `
        <tr>
          <td>${rowNum}</td>
          <td><strong>${esc(r.namaMurid)}</strong></td>
          <td>${esc(r.konsentrasi)}</td>
          <td><span class="badge-${r.sudahPelatihan === 'Sudah' ? 'ok' : 'wait'}">${esc(r.sudahPelatihan)}</span></td>
          <td>${r.namaFasilitator ? esc(r.namaFasilitator) : '<span style="color:#bbb">—</span>'}</td>
          <td><span class="badge-${r.sudahPenempatan === 'Sudah' ? 'ok' : 'wait'}">${esc(r.sudahPenempatan)}</span></td>
          <td>${r.negaraPenempatan ? esc(r.negaraPenempatan) : '<span style="color:#bbb">—</span>'}</td>
          <td>${formatDate(r.tanggalPenempatan)}</td>
          <td><button class="btn-del-row" onclick="deleteRow('${r.id}')">🗑 Hapus</button></td>
        </tr>`;
    }).join('');

    return `
      <div class="kelas-group">
        <div class="kelas-group-header">
          <span class="kelas-group-badge">Kelas ${kelas}</span>
          <span class="kelas-group-count">${rows.length} murid</span>
        </div>
        <div class="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>No</th><th>Nama Murid</th><th>Konsentrasi</th>
                <th>Pelatihan</th><th>Fasilitator</th>
                <th>Penempatan</th><th>Negara</th><th>Tgl Penempatan</th><th></th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');
}

function deleteRow(id) {
  if (!confirm('Hapus data murid ini?')) return;
  deleteStudentById(id);
  renderTable();
  renderDashboard();
  toast('🗑 Data dihapus.', 'err');
}

// ══════════════════════════════════════════════
//  STATS & EXPORT
// ══════════════════════════════════════════════
function renderStats() {
  if (!activeSchool) return;

  document.getElementById('export-school-tag').textContent =
    `${activeSchool.namaSekolah} — NPSN ${activeSchool.npsn}`;

  const students = getStudentsBySchool(activeSchool.npsn);
  const sudahPelatihan  = students.filter(s => s.sudahPelatihan === 'Sudah').length;
  const sudahPenempatan = students.filter(s => s.sudahPenempatan === 'Sudah').length;
  const negaraSet = new Set(students.filter(s => s.negaraPenempatan).map(s => s.negaraPenempatan));

  document.getElementById('stats-row').innerHTML = [
    [students.length, 'Total Murid'],
    [sudahPelatihan, 'Sudah Pelatihan'],
    [students.length - sudahPelatihan, 'Belum Pelatihan'],
    [sudahPenempatan, 'Sudah Penempatan'],
    [students.length - sudahPenempatan, 'Belum Penempatan'],
    [negaraSet.size, 'Negara Tujuan'],
  ].map(([n, l]) => `<div class="stat-block"><div class="stat-num">${n}</div><div class="stat-lbl">${l}</div></div>`).join('');
}

function exportCSV() {
  if (!activeSchool) return;
  const students = getStudentsBySchool(activeSchool.npsn);
  if (!students.length) { toast('Tidak ada data untuk diexport.', 'err'); return; }

  const headers = ['No', 'NPSN', 'Nama Sekolah', 'Nama Murid', 'Konsentrasi Keahlian',
    'Kelas', 'Sudah Pelatihan LN', 'Nama Fasilitator',
    'Sudah Mendapat Penempatan', 'Negara Penempatan', 'Tanggal Penempatan', 'Timestamp'];

  const rows = students.map((s, i) => [
    i + 1, s.npsn, s.namaSekolah, s.namaMurid, s.konsentrasi, s.kelas,
    s.sudahPelatihan, s.namaFasilitator || '',
    s.sudahPenempatan, s.negaraPenempatan || '', s.tanggalPenempatan || '', s.timestamp
  ]);

  const csv = [headers, ...rows].map(row =>
    row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  dlFile('\uFEFF' + csv, `data-${activeSchool.npsn}.csv`, 'text/csv');
  toast('✅ CSV berhasil diunduh!');
}

function exportJSON() {
  if (!activeSchool) return;
  const students = getStudentsBySchool(activeSchool.npsn);
  if (!students.length) { toast('Tidak ada data untuk diexport.', 'err'); return; }

  const payload = {
    sekolah: activeSchool,
    exportedAt: new Date().toISOString(),
    murid: students
  };
  dlFile(JSON.stringify(payload, null, 2), `data-${activeSchool.npsn}.json`, 'application/json');
  toast('✅ JSON berhasil diunduh!');
}

function clearSchoolData() {
  if (!activeSchool) return;
  const students = getStudentsBySchool(activeSchool.npsn);
  if (!students.length) { toast('Tidak ada data.', 'err'); return; }
  if (!confirm(`Hapus semua ${students.length} data murid dari ${activeSchool.namaSekolah}? Tindakan ini tidak bisa dibatalkan.`)) return;

  const db = getDB();
  db.students = db.students.filter(s => s.npsn !== activeSchool.npsn);
  saveDB(db);

  renderStats();
  renderDashboard();
  toast('🗑 Semua data murid sekolah ini dihapus.', 'err');
}

function dlFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Utils ─────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
