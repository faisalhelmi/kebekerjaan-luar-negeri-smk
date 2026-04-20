// ══════════════════════════════════════════════
//  PORTAL DATA PENEMPATAN LUAR NEGERI SMK
//  Wizard-style step navigation + data management
// ══════════════════════════════════════════════

const STORAGE_KEY = 'smk_penempatan_v2';

// ── State ──────────────────────────────────────
let currentStep = 1;
let selections = {}; // stores radio-style picks: kelas, pelatihan, penempatan

// computed step sequence based on answers
function getStepSequence() {
  const seq = [1, 2, 3, 4, 5, 6];
  if (selections.pelatihan === 'Sudah') seq.push(7);  // fasilitator
  seq.push(8); // sudah penempatan?
  if (selections.penempatan === 'Sudah') { seq.push(9); seq.push(10); } // negara + tanggal
  seq.push(11); // review
  return seq;
}

function getStepIndex(step) { return getStepSequence().indexOf(step); }
function getTotalSteps() { return getStepSequence().length; }

// ── Storage helpers ───────────────────────────
function getData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// ── Toast ─────────────────────────────────────
function toast(msg, type='ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Page navigation ───────────────────────────
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
}

// ── Start / Cancel wizard ─────────────────────
function startWizard() {
  currentStep = 1;
  selections = {};
  // Reset all inputs
  ['f-npsn','f-sekolah','f-murid','f-konsentrasi','f-fasilitator','f-negara','f-tanggal']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  document.querySelectorAll('.big-choice, .yn-btn, .pill').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.field-error').forEach(el => el.classList.remove('show'));
  goPage('page-wizard');
  showStep(1);
}

function cancelWizard() {
  if (confirm('Batalkan pengisian data?')) goPage('page-home');
}

// ── Show step ─────────────────────────────────
function showStep(step) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  const el = document.querySelector(`.step[data-step="${step}"]`);
  if (el) el.classList.add('active');

  const seq = getStepSequence();
  const idx = seq.indexOf(step);
  const total = seq.length;

  // Progress bar
  document.getElementById('progressBar').style.width = `${((idx) / (total - 1)) * 100}%`;

  // Step counter
  document.getElementById('stepCounter').textContent = `${idx + 1} / ${total}`;

  // Back button visibility
  const backBtn = document.getElementById('wiz-back-btn');
  backBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';

  // Build review if last step
  if (step === 11) buildReview();

  // Auto-focus input if present
  setTimeout(() => {
    const input = el && el.querySelector('input');
    if (input && input.type !== 'date') input.focus();
  }, 350);
}

// ── Navigation ────────────────────────────────
function nextStep(fromStep) {
  // Validate
  if (!validate(fromStep)) return;

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
    goPage('page-home');
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

function val(id) { return (document.getElementById(id)?.value || '').trim(); }

function validate(step) {
  switch(step) {
    case 1:
      if (!/^\d{8}$/.test(val('f-npsn'))) { showErr('err-npsn'); return false; }
      break;
    case 2:
      if (!val('f-sekolah')) { showErr('err-sekolah'); return false; }
      break;
    case 3:
      if (!val('f-murid')) { showErr('err-murid'); return false; }
      break;
    case 4:
      if (!val('f-konsentrasi')) { showErr('err-konsentrasi'); return false; }
      break;
    case 5:
      if (!selections.kelas) { showErr('err-kelas'); return false; }
      break;
    case 6:
      if (!selections.pelatihan) { showErr('err-pelatihan'); return false; }
      break;
    case 7:
      if (!val('f-fasilitator')) { showErr('err-fasilitator'); return false; }
      break;
    case 8:
      if (!selections.penempatan) { showErr('err-penempatan'); return false; }
      break;
    case 9:
      if (!val('f-negara')) { showErr('err-negara'); return false; }
      break;
    case 10:
      if (!val('f-tanggal')) { showErr('err-tanggal'); return false; }
      break;
  }
  return true;
}

// ── Button selections ─────────────────────────
function selectBig(field, value, btn) {
  selections[field] = value;
  // Deselect siblings in same group
  const parent = btn.parentElement;
  parent.querySelectorAll(`[data-field="${field}"]`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function setPill(inputId, value) {
  document.getElementById(inputId).value = value;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
  event.target.closest('.pill').classList.add('selected');
}

// ── Build review card ─────────────────────────
function buildReview() {
  const rows = [
    ['🏫 NPSN',             val('f-npsn')],
    ['🏛️ Sekolah',          val('f-sekolah')],
    ['👤 Nama Murid',       val('f-murid')],
    ['🔧 Konsentrasi',      val('f-konsentrasi')],
    ['📚 Kelas',            selections.kelas || '—'],
    ['🌏 Pelatihan LN',     selections.pelatihan || '—'],
    ['👨‍🏫 Fasilitator',     selections.pelatihan === 'Sudah' ? (val('f-fasilitator') || '—') : 'Tidak diisi'],
    ['🎓 Dapat Penempatan', selections.penempatan || '—'],
    ['✈️ Negara',           selections.penempatan === 'Sudah' ? (val('f-negara') || '—') : 'Tidak diisi'],
    ['📅 Tgl Penempatan',   selections.penempatan === 'Sudah' ? (formatDate(val('f-tanggal')) || '—') : 'Tidak diisi'],
  ];

  document.getElementById('reviewCard').innerHTML = rows.map(([label, value]) => {
    let display = value;
    if (value === 'Sudah') display = `<span class="rev-badge rev-ok">✅ Sudah</span>`;
    else if (value === 'Belum') display = `<span class="rev-badge rev-no">⏳ Belum</span>`;
    else if (value === 'Tidak diisi') display = `<span style="color:#aaa;font-style:italic;">Tidak diisi</span>`;
    return `<div class="review-row"><span class="rev-label">${label}</span><span class="rev-value">${display}</span></div>`;
  }).join('');
}

// ── Submit ────────────────────────────────────
function submitData() {
  const record = {
    id: genId(),
    timestamp: new Date().toISOString(),
    npsn: val('f-npsn'),
    sekolah: val('f-sekolah'),
    namaMurid: val('f-murid'),
    konsentrasi: val('f-konsentrasi'),
    kelas: selections.kelas,
    sudahPelatihan: selections.pelatihan,
    namaFasilitator: selections.pelatihan === 'Sudah' ? val('f-fasilitator') : '',
    sudahPenempatan: selections.penempatan,
    negaraPenempatan: selections.penempatan === 'Sudah' ? val('f-negara') : '',
    tanggalPenempatan: selections.penempatan === 'Sudah' ? val('f-tanggal') : '',
  };

  const data = getData();
  data.push(record);
  saveData(data);

  document.getElementById('success-name').textContent = `Data ${record.namaMurid} dari ${record.sekolah} berhasil disimpan.`;
  goPage('page-success');
}

// ── Table ─────────────────────────────────────
function renderTable() {
  const data = getData();
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const filtered = q
    ? data.filter(r => r.namaMurid.toLowerCase().includes(q) || r.sekolah.toLowerCase().includes(q))
    : data;

  const tbody = document.getElementById('tableBody');
  const empty = document.getElementById('emptyState');
  const tbl   = document.getElementById('dataTable');
  document.getElementById('dataCount').textContent = `${filtered.length} data`;

  if (!filtered.length) {
    tbody.innerHTML = '';
    tbl.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  tbl.style.display = 'table';
  empty.style.display = 'none';

  tbody.innerHTML = filtered.map((r, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${esc(r.npsn)}</strong></td>
      <td>${esc(r.sekolah)}</td>
      <td><strong>${esc(r.namaMurid)}</strong></td>
      <td>${esc(r.konsentrasi)}</td>
      <td><strong>${esc(r.kelas)}</strong></td>
      <td><span class="badge-${r.sudahPelatihan==='Sudah'?'ok':'wait'}">${esc(r.sudahPelatihan)}</span></td>
      <td>${r.namaFasilitator ? esc(r.namaFasilitator) : '<span style="color:#bbb">—</span>'}</td>
      <td><span class="badge-${r.sudahPenempatan==='Sudah'?'ok':'wait'}">${esc(r.sudahPenempatan)}</span></td>
      <td>${r.negaraPenempatan ? esc(r.negaraPenempatan) : '<span style="color:#bbb">—</span>'}</td>
      <td>${formatDate(r.tanggalPenempatan)}</td>
      <td><button class="btn-del-row" onclick="deleteRow('${r.id}')">🗑 Hapus</button></td>
    </tr>
  `).join('');
}

function deleteRow(id) {
  if (!confirm('Hapus data ini?')) return;
  saveData(getData().filter(r => r.id !== id));
  renderTable();
  toast('🗑 Data dihapus.', 'err');
}

// ── Stats ─────────────────────────────────────
function renderStats() {
  const data = getData();
  const sudahPelatihan  = data.filter(r => r.sudahPelatihan === 'Sudah').length;
  const sudahPenempatan = data.filter(r => r.sudahPenempatan === 'Sudah').length;
  const negaraSet  = new Set(data.filter(r=>r.negaraPenempatan).map(r=>r.negaraPenempatan));
  const sekolahSet = new Set(data.map(r=>r.sekolah));

  document.getElementById('stats-row').innerHTML = [
    [data.length,          'Total Data Murid'],
    [sekolahSet.size,      'Jumlah Sekolah'],
    [sudahPelatihan,       'Sudah Pelatihan'],
    [sudahPenempatan,      'Sudah Penempatan'],
    [negaraSet.size,       'Negara Tujuan'],
    [data.length - sudahPelatihan, 'Belum Pelatihan'],
  ].map(([n, l]) => `<div class="stat-block"><div class="stat-num">${n}</div><div class="stat-lbl">${l}</div></div>`).join('');
}

// ── Export ────────────────────────────────────
function exportCSV() {
  const data = getData();
  if (!data.length) { toast('Tidak ada data untuk diexport.', 'err'); return; }

  const headers = ['No','Timestamp','NPSN','Nama Sekolah','Nama Murid','Konsentrasi Keahlian',
    'Kelas','Sudah Pelatihan LN','Nama Fasilitator','Sudah Mendapat Penempatan',
    'Negara Penempatan','Tanggal Penempatan'];

  const rows = data.map((r,i) => [
    i+1, r.timestamp, r.npsn, r.sekolah, r.namaMurid, r.konsentrasi, r.kelas,
    r.sudahPelatihan, r.namaFasilitator||'', r.sudahPenempatan,
    r.negaraPenempatan||'', r.tanggalPenempatan||''
  ]);

  const csv = [headers,...rows].map(row =>
    row.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')
  ).join('\n');

  download('\uFEFF'+csv, 'data-penempatan-smk.csv', 'text/csv');
  toast('✅ CSV berhasil diunduh!');
}

function exportJSON() {
  const data = getData();
  if (!data.length) { toast('Tidak ada data untuk diexport.', 'err'); return; }
  download(JSON.stringify(data, null, 2), 'data-penempatan-smk.json', 'application/json');
  toast('✅ JSON berhasil diunduh!');
}

function download(content, filename, mime) {
  const blob = new Blob([content], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function clearAllData() {
  const data = getData();
  if (!data.length) { toast('Tidak ada data.', 'err'); return; }
  if (!confirm(`Hapus semua ${data.length} data? Tindakan ini tidak bisa dibatalkan.`)) return;
  localStorage.removeItem(STORAGE_KEY);
  renderStats();
  toast('🗑 Semua data dihapus.', 'err');
}

// ── Utils ─────────────────────────────────────
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'});
}
