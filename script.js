// ─── Config ─────────────────────────────────────────────────────
const SUPABASE_URL = 'https://lpcygniycyffeswzrnms.supabase.co/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwY3lnbml5Y3lmZmVzd3pybm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODA5NDIsImV4cCI6MjA3MjY1Njk0Mn0.4bVTsLEwvjyPllLU1-U2vcw3yHkzqj69TZOfuJvSvDQ';
const SUPABASE_BUCKET = 'item_images';

const { createClient } = Supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── DOM Elements ───────────────────────────────────────────────
const els = {
  video: document.getElementById('video'),
  mapImg: document.getElementById('map'),
  mapContainer: document.getElementById('mapContainer'),
  main: document.querySelector('.main'),
  itemCard: document.getElementById('itemCard'),
  displays: {
    name: document.getElementById('itemNameDisplay'),
    barcode: document.getElementById('barcodeDisplay'),
    date: document.getElementById('dateDisplay'),
    shelf: document.getElementById('shelfDisplay'),
    category: document.getElementById('categoryDisplay')
  },
  addForm: document.getElementById('addForm'),
  saveBtn: document.getElementById('saveBtn'),
  inputs: {
    name: document.getElementById('itemName'),
    category: document.getElementById('itemCategory'),
    shelf: document.getElementById('itemShelf'),
    section: document.getElementById('itemSection'),
    barcode: document.getElementById('itemBarcode'),
    photo: document.getElementById('itemPhotoInput'),
    photoData: document.getElementById('itemPhotoData')
  },
  listPage: document.getElementById('listPage'),
  searchForm: document.getElementById('searchForm'),
  searchInput: document.getElementById('searchInput'),
  categoryDatalist: document.getElementById('categoryList'),
  torchBtn: document.getElementById('torchBtn'),
  detectBadge: document.getElementById('detectBadge'),
  tabs: document.querySelectorAll('.tabs button'),
  photoPreview: document.getElementById('photoPreview'),
  itemPhotoDisplay: document.getElementById('itemPhotoDisplay'),
  photoModal: document.getElementById('photoModal'),
  modalPhoto: document.getElementById('modalPhoto')
};

// ─── Globals ────────────────────────────────────────────────────
let barcodeDB = {};
let categoriesSet = new Set();
let currentStream = null;
let currentCode = null;
let torchOn = false;
let acceptCooldown = false;
let lastDetectedCode = null;
let consecutiveDetectCount = 0;
const CONFIRMATION_THRESHOLD = 3;
const PAGE_SIZE = 100;

// ─── Utility / Helpers ──────────────────────────────────────────
const hideAllViews = () => {
  ['mapContainer', 'mapImg', 'video', 'addForm', 'listPage']
    .forEach(k => els[k].style.display = 'none');
  els.detectBadge.style.display = els.torchBtn.style.display = 'none';
  els.itemCard.classList.add('hidden');
  els.main.classList.remove('add-tab');
};
const showItemPhoto = src => {
  if (src) {
    els.itemPhotoDisplay.src = src;
    els.itemPhotoDisplay.style.display = 'block';
  } else {
    els.itemPhotoDisplay.style.display = 'none';
  }
};
const showItemDetails = (item, barcode) => {
  const d = els.displays;
  d.name.textContent = item?.name || '-';
  d.barcode.textContent = 'Barcode: ' + (barcode || '-');
  d.date.textContent = 'Date of location: ' + new Date().toLocaleDateString();
  d.shelf.textContent = `Shelf / Section nr: ${item?.shelf || '-'} / ${item?.section || '-'}`;
  d.category.textContent = 'Category: ' + (item?.category || '-');
};
const resetScannerState = () => {
  acceptCooldown = false;
  lastDetectedCode = null;
  consecutiveDetectCount = 0;
  els.detectBadge.textContent = `0/${CONFIRMATION_THRESHOLD}`;
};
const applyMapSizing = () => {
  Object.assign(els.mapImg.style, {
    height: '100%', width: 'auto', objectFit: 'contain',
    transform: 'none', display: 'block'
  });
};
const escapeHtml = s =>
  s ? String(s).replace(/[&<>\"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])) : '';

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++)
    for (let j = 1; j <= a.length; j++)
      m[i][j] = b[i - 1] === a[j - 1]
        ? m[i - 1][j - 1]
        : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
  return m[b.length][a.length];
}

// ─── Tabs ───────────────────────────────────────────────────────
function switchTab(tab) {
  els.tabs.forEach(b => b.classList.remove('active'));
  tab.classList.add('active');
  hideAllViews();

  if (tab.id === 'tab-map') {
    els.mapContainer.style.display = 'flex';
    els.mapImg.style.display = 'block';
    els.itemCard.classList.remove('hidden');
    stopCamera();
  } else if (tab.id === 'tab-scan') {
    els.video.style.display = 'block';
    els.itemCard.classList.add('hidden');
    startCamera();
    els.torchBtn.style.display = 'block';
  } else if (tab.id === 'tab-add') {
    els.listPage.style.display = 'flex';
    els.main.classList.add('add-tab');
    stopCamera();
    renderList(getAllItemsArray(), 0);
  }
}
['tab-map', 'tab-scan', 'tab-add'].forEach(id =>
  document.getElementById(id).addEventListener('click', e => switchTab(e.target))
);

// ─── Category Datalist ──────────────────────────────────────────
function updateCategoryDatalist() {
  els.categoryDatalist.innerHTML = '';
  [...categoriesSet]
    .filter(c => c && c.trim())
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      els.categoryDatalist.appendChild(opt);
    });
}

// ─── Data helpers ───────────────────────────────────────────────
const getAllItemsArray = () =>
  Object.entries(barcodeDB).map(([barcode, it]) => ({
    barcode,
    name: it.name || '', category: it.category || '',
    shelf: it.shelf || '', section: it.section || '',
    photo: it.photo || it.photoPath || ''
  }));

// ─── Search ─────────────────────────────────────────────────────
function performSearch() {
  const q = els.searchInput.value.trim().toLowerCase();
  const all = getAllItemsArray();
  if (!q) return renderList(all, 0);

  const results = [];
  for (const it of all) {
    const fields = [it.name, it.barcode, it.category].map(s => (s || '').toLowerCase());
    let [name, barcode, category] = fields;
    let score = 1e4;
    if (name === q) score = -1000;
    else if (barcode === q) score = -900;
    else if (category === q) score = -950;
    else if (name.startsWith(q)) score = -100;
    else if (category.startsWith(q)) score = -120;
    else if (barcode.startsWith(q)) score = -50;
    else if ([name, barcode, category].some(f => f.includes(q))) score = 20;
    else {
      const lv = [name, barcode, category].map(v => levenshtein(q, v));
      if (Math.min(...lv) < 4) score = 50 + Math.min(...lv);
    }
    if (score < 1e4) results.push({ it, score });
  }
  results.sort((a, b) => a.score - b.score);
  renderList(results.map(r => r.it), 0);
}
els.searchForm.addEventListener('submit', e => { e.preventDefault(); switchTab(document.getElementById('tab-add')); performSearch(); });
let debounce; els.searchInput.addEventListener('input', () => {
  switchTab(document.getElementById('tab-add'));
  clearTimeout(debounce);
  debounce = setTimeout(performSearch, 150);
});

// ─── List Rendering ─────────────────────────────────────────────
function renderList(items, start = 0) {
  els.listPage.innerHTML = '';
  const end = Math.min(start + PAGE_SIZE, items.length);
  if (!items.length) return els.listPage.innerHTML = '<div class="empty">No items found.</div>';

  for (let i = start; i < end; i++) {
    const it = items[i];
    const div = document.createElement('div');
    div.className = 'list-item';
    div.dataset.barcode = it.barcode;
    div.innerHTML = `
      ${it.photo ? `<img class="list-thumb" src="${escapeHtml(it.photo)}"/>` :
        `<div class="list-thumb no-img">No<br>Img</div>`}
      <div class="info">
        <h3>${escapeHtml(it.name || '-')}</h3>
        <p>Category: ${escapeHtml(it.category || '-')}</p>
        <p>Barcode: ${escapeHtml(it.barcode)}</p>
        <p>Shelf / Section: ${escapeHtml(it.shelf || '-') } / ${escapeHtml(it.section || '-')}</p>
      </div>
    `;
    div.addEventListener('click', () => {
      const item = barcodeDB[it.barcode];
      if (!item) return alert('Item not found');
      showItemPhoto(item.photo || item.photoPath);
      showItemDetails(item, it.barcode);
      switchTab(document.getElementById('tab-map'));
    });
    els.listPage.appendChild(div);
  }
  if (end < items.length) {
    const btn = document.createElement('button');
    btn.className = 'load-more'; btn.textContent = 'Load more';
    btn.onclick = () => renderList(items, end);
    els.listPage.appendChild(btn);
  }
}

// ─── Supabase Sync ─────────────────────────────────────────────
async function uploadImageToSupabase(barcode, dataURL) {
  const blob = await (await fetch(dataURL)).blob();
  const path = `${barcode}/${Date.now()}.jpg`;
  const { data, error } = await supabaseClient.storage.from(SUPABASE_BUCKET)
    .upload(path, blob, { cacheControl: '3600', upsert: true });
  if (error) throw error;
  return supabaseClient.storage.from(SUPABASE_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function saveItemToSupabase(barcode, item) {
  const { error } = await supabaseClient.from('items').upsert({
    barcode, ...item
  }, { onConflict: 'barcode' });
  if (error) throw error;
}

async function loadDatabaseFromSupabase() {
  const { data, error } = await supabaseClient.from('items').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  barcodeDB = {}; categoriesSet.clear();
  for (const r of data) {
    barcodeDB[r.barcode] = { name: r.name, category: r.category, shelf: r.shelf, section: r.section, photo: r.image_url };
    if (r.category) categoriesSet.add(r.category);
  }
  updateCategoryDatalist();
}

// ─── Camera / Scanner ───────────────────────────────────────────
async function startCamera() {
  resetScannerState();
  try {
    currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    els.video.srcObject = currentStream;
    await els.video.play();
    torchOn = false;
    startScanner();
  } catch (e) { alert('Camera error: ' + e.message); }
}
function stopCamera() {
  resetScannerState();
  [els.detectBadge, els.torchBtn].forEach(el => el.style.display = 'none');
  if (currentStream) currentStream.getTracks().forEach(t => t.stop());
  if (window.Quagga) try { Quagga.stop(); } catch {}
  currentStream = null; els.video.srcObject = null;
}

function startScanner() {
  Quagga.init({
    inputStream: { name: 'Live', type: 'LiveStream', target: els.video },
    decoder: { readers: ['ean_reader', 'upc_reader', 'code_128_reader'] },
    locate: true
  }, err => { if (err) return console.error(err); Quagga.start(); });

  Quagga.onDetected(res => {
    const code = res?.codeResult?.code;
    if (!code || acceptCooldown) return;
    if (lastDetectedCode === code) consecutiveDetectCount++; else { lastDetectedCode = code; consecutiveDetectCount = 1; }
    els.detectBadge.textContent = `${consecutiveDetectCount}/${CONFIRMATION_THRESHOLD}`;
    if (consecutiveDetectCount >= CONFIRMATION_THRESHOLD) {
      acceptCooldown = true; resetScannerState();
      const item = barcodeDB[code];
      if (item) {
        showItemPhoto(item.photo || item.photoPath);
        showItemDetails(item, code);
        switchTab(document.getElementById('tab-map'));
      } else {
        showItemDetails({ name: '❌ Not found', category: '-', shelf: '-', section: '-' }, code);
        els.inputs.barcode.value = code;
        const frame = captureFrameDataURL();
        if (frame) {
          els.inputs.photoData.value = frame;
          els.photoPreview.src = frame;
          els.photoPreview.style.display = 'block';
        }
        els.saveBtn.textContent = '💾 Save Item';
        els.video.style.display = 'none';
        els.addForm.style.display = 'flex';
        els.itemCard.classList.remove('hidden');
        stopCamera();
      }
      setTimeout(() => acceptCooldown = false, 700);
    }
  });
}

function captureFrameDataURL() {
  const c = document.createElement('canvas');
  c.width = els.video.videoWidth || 640;
  c.height = els.video.videoHeight || 480;
  c.getContext('2d').drawImage(els.video, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

// ─── Save Logic ─────────────────────────────────────────────────
els.saveBtn.addEventListener('click', async () => {
  const { name, category, shelf, section, barcode, photoData } = Object.fromEntries(
    Object.entries(els.inputs).map(([k, el]) => [k, el.value.trim()])
  );
  if (!name || !shelf || !section || !barcode || !category)
    return alert('Please fill all fields.');

  let photoUrl = null;
  if (photoData) {
    try { photoUrl = await uploadImageToSupabase(barcode, photoData); }
    catch (err) { return alert('Image upload failed: ' + err.message); }
  } else if (barcodeDB[barcode]?.photo) photoUrl = barcodeDB[barcode].photo;

  await saveItemToSupabase(barcode, { name, category, shelf, section, image_url: photoUrl });
  categoriesSet.add(category); updateCategoryDatalist();
  await loadDatabaseFromSupabase();

  showItemPhoto(photoUrl);
  showItemDetails(barcodeDB[barcode], barcode);
  els.addForm.style.display = 'none';
  switchTab(document.getElementById('tab-map'));
  alert('Item saved.');
});

// ─── Misc Setup ─────────────────────────────────────────────────
window.addEventListener('load', async () => {
  await loadDatabaseFromSupabase().catch(console.warn);
  applyMapSizing();
});
els.mapImg.addEventListener('load', applyMapSizing);
els.itemPhotoDisplay.addEventListener('click', () => {
  els.modalPhoto.src = els.itemPhotoDisplay.src;
  els.photoModal.style.display = 'flex';
});
els.photoModal.addEventListener('click', () => {
  els.photoModal.style.display = 'none'; els.modalPhoto.src = '';
});
els.torchBtn.addEventListener('click', async () => {
  if (!currentStream) return alert('Camera not started');
  const track = currentStream.getVideoTracks()[0];
  try {
    await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
    torchOn = !torchOn;
    els.torchBtn.style.background = torchOn ? '#fff' : 'rgba(0,0,0,0.45)';
    els.torchBtn.style.color = torchOn ? '#111' : '#fff';
  } catch { alert('Torch not supported'); }
});
