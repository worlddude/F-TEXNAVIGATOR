
/* -------------------------
   CONFIG - REPLACE THESE
   ------------------------- */
const SUPABASE_URL = 'https://lpcygniycyffeswzrnms.supabase.co/'; // <-- REPLACE
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwY3lnbml5Y3lmZmVzd3pybm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODA5NDIsImV4cCI6MjA3MjY1Njk0Mn0.4bVTsLEwvjyPllLU1-U2vcw3yHkzqj69TZOfuJvSvDQ';           // <-- REPLACE
const SUPABASE_BUCKET = 'item_images'; // change if you named it differently

// ✅ Initialize Supabase client (v2 UMD build)
const { createClient } = Supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* -------------------------
   DOM & UI code (mostly your original)
   ------------------------- */
// DOM Elements
const video = document.getElementById('video');
const mapImg = document.getElementById('map');
const mapContainer = document.getElementById('mapContainer');
const mainDiv = document.querySelector('.main');
const itemCard = document.getElementById('itemCard');
const itemNameDisplay = document.getElementById('itemNameDisplay');
const barcodeDisplay = document.getElementById('barcodeDisplay');
const dateDisplay = document.getElementById('dateDisplay');
const shelfDisplay = document.getElementById('shelfDisplay');
const categoryDisplay = document.getElementById('categoryDisplay'); // NEW
const addForm = document.getElementById('addForm');
const saveBtn = document.getElementById('saveBtn');
const itemNameInput = document.getElementById('itemName');
const itemCategoryInput = document.getElementById('itemCategory'); // NEW
const itemShelfInput = document.getElementById('itemShelf');
const itemSectionInput = document.getElementById('itemSection');
const itemBarcodeInput = document.getElementById('itemBarcode');
const listPage = document.getElementById('listPage');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const categoryDatalist = document.getElementById('categoryList'); // datalist element

const torchBtn = document.getElementById('torchBtn');
const detectBadge = document.getElementById('detectBadge');

const tabs = document.querySelectorAll(".tabs button");

const photoPreview = document.getElementById('photoPreview');
const itemPhotoInput = document.getElementById('itemPhotoInput');
const itemPhotoData = document.getElementById('itemPhotoData');
const itemPhotoDisplay = document.getElementById('itemPhotoDisplay');

// DB
let barcodeDB = {};
let currentCode = null;

// categories set (used to populate datalist)
let categoriesSet = new Set();

/* ... camera/torch/detection variables kept unchanged ... */
// Camera / Torch
let currentStream = null;
let torchOn = false;

// Detection confirmation
const CONFIRMATION_THRESHOLD = 3;
let lastDetectedCode = null;
let consecutiveDetectCount = 0;
let acceptCooldown = false; // prevents double-accepts while handling

// paging for list
const PAGE_SIZE = 100;
let lastRenderStart = 0;
let lastRenderedItems = [];

/* -------------------------
   Utility functions (original)
   ------------------------- */
function switchTab(tab) {
  tabs.forEach(btn => btn.classList.remove("active"));
  tab.classList.add("active");

  // hide everything first
  mapContainer.style.display = "none";
  mapImg.style.display = "none"; // keep for compatibility
  video.style.display = "none";
  addForm.style.display = "none";
  listPage.style.display = "none";
  itemCard.classList.add("hidden");
  mainDiv.classList.remove("add-tab");

  // hide detect badge and torch by default
  detectBadge.style.display = "none";
  torchBtn.style.display = "none";

  if(tab.id === "tab-map"){
    // show our map container (with pan/zoom)
    mapContainer.style.display = "flex";
    // keep img visible inside container (for a11y)
    mapImg.style.display = "block";
    itemCard.classList.remove("hidden");
    stopCamera();
  } else if(tab.id === "tab-scan"){
    video.style.display = "block";
    itemCard.classList.add("hidden");
    startCamera();
    torchBtn.style.display = "block";
  } else if(tab.id === "tab-add"){
    // List tab
    listPage.style.display = "flex";
    mainDiv.classList.add("add-tab");
    stopCamera();
    const all = getAllItemsArray();
    lastRenderStart = 0;
    renderList(all, lastRenderStart);
  }
}

// Tab click listeners
document.getElementById('tab-map').addEventListener('click', e => switchTab(e.target));
document.getElementById('tab-scan').addEventListener('click', e => switchTab(e.target));
document.getElementById('tab-add').addEventListener('click', e => switchTab(e.target));

function getAllItemsArray() {
  return Object.entries(barcodeDB).map(([barcode, item]) => ({
    barcode,
    name: item.name || '',
    category: item.category || '', // NEW
    shelf: item.shelf || '',
    section: item.section || '',
    photo: item.photo || item.photoPath || ''
  }));
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/* -------------------------
   Category datalist helper (NEW)
   - populates the <datalist> with unique categories from categoriesSet
   ------------------------- */
function updateCategoryDatalist() {
  // clear existing options
  categoryDatalist.innerHTML = '';
  const arr = Array.from(categoriesSet).filter(c => c && String(c).trim() !== '');
  arr.sort((a,b)=> a.localeCompare(b, undefined, {sensitivity:'base'}));
  for(const c of arr){
    const opt = document.createElement('option');
    opt.value = c;
    categoryDatalist.appendChild(opt);
  }
}

/* -------------------------
   NEW helper: open item in Scan tab for editing
   (unchanged except it now handles category too)
   ------------------------- */
function openItemForEdit(barcode) {
  const item = barcodeDB[barcode];

  // Manually set the UI to look like Scan tab but DON'T start the camera.
  tabs.forEach(btn => btn.classList.remove('active'));
  document.getElementById('tab-scan').classList.add('active');

  // hide other views
  mapContainer.style.display = "none";
  mapImg.style.display = "none";
  video.style.display = "none";
  listPage.style.display = "none";
  detectBadge.style.display = "none";
  torchBtn.style.display = "none";

  // Show item card + add form for editing
  itemCard.classList.remove('hidden');
  addForm.style.display = 'flex';

  // Populate form fields
  itemBarcodeInput.value = barcode || '';
  itemNameInput.value = (item && item.name) ? item.name : '';
  itemCategoryInput.value = (item && item.category) ? item.category : ''; // NEW
  itemShelfInput.value = (item && item.shelf) ? item.shelf : '';
  itemSectionInput.value = (item && item.section) ? item.section : '';

  // Populate display area
  itemNameDisplay.textContent = (item && item.name) ? item.name : '-';
  barcodeDisplay.textContent = 'Barcode: ' + (barcode || '-');
  dateDisplay.textContent = 'Date of location: ' + new Date().toLocaleDateString();
  shelfDisplay.textContent = 'Shelf / Section nr: ' + ((item && item.shelf) || '-') + ' / ' + ((item && item.section) || '-');
  categoryDisplay.textContent = 'Category: ' + ((item && item.category) || '-'); // NEW

  // Photo handling: show existing photo if present
  if (item && (item.photo || item.photoPath)) {
    const src = item.photo || item.photoPath;
    itemPhotoDisplay.src = src;
    itemPhotoDisplay.style.display = 'block';

    // set preview to URL (user can replace). Do NOT fetch and convert to dataURL here
    photoPreview.src = src;
    photoPreview.style.display = 'block';
    itemPhotoData.value = ''; // leave empty (remote image)
  } else {
    itemPhotoDisplay.style.display = 'none';
    photoPreview.style.display = 'none';
    itemPhotoData.value = '';
    photoPreview.src = '';
    itemPhotoDisplay.src = '';
  }

  // Change save button text for edit
  saveBtn.textContent = '💾 Save changes';
}

/* -------------------------
   renderList (updated: long-press overlay + non-blocking touch)
   - Small visual indicator overlay that fills opacity from 0 -> 1 while holding
   - Do NOT call e.preventDefault() on touchstart so short taps still trigger map click
   - CSS already disables text selection / callout; that plus overlay avoids copy menu
   ------------------------- */
function renderList(items, startIndex = 0) {
  lastRenderedItems = items;
  lastRenderStart = startIndex;
  listPage.innerHTML = '';
  const end = Math.min(startIndex + PAGE_SIZE, items.length);
  if(items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No items found.';
    listPage.appendChild(empty);
    return;
  }

  for(let i = startIndex; i < end; i++){
    const it = items[i];
    const div = document.createElement('div');
    div.className = 'list-item';
    div.setAttribute('data-barcode', it.barcode);

    const thumbSrc = it.photo ? escapeHtml(it.photo) : '';
    const thumbHTML = thumbSrc ? `<img class="list-thumb" src="${thumbSrc}" alt="thumb" />` : `<div class="list-thumb" style="display:flex;align-items:center;justify-content:center;color:#888;font-size:12px;">No<br>Img</div>`;

    div.innerHTML = `${thumbHTML}
                     <div style="flex:1;">
                       <h3>${escapeHtml(it.name || '-')}</h3>
                       <p>Category: ${escapeHtml(it.category || '-')}</p>
                       <p>Barcode: ${escapeHtml(it.barcode)}</p>
                       <p>Shelf / Section: ${escapeHtml(it.shelf || '-') } / ${escapeHtml(it.section || '-')}</p>
                     </div>`;

    // add press overlay element (NEW)
    const overlay = document.createElement('div');
    overlay.className = 'press-overlay';
    div.appendChild(overlay);

    // click to view on map (restored - works on touch too because we do NOT preventDefault on touchstart)
    div.addEventListener('click', ()=> {
      const barcode = div.dataset.barcode;
      const item = barcodeDB[barcode];
      if(item){
        if(item.photo){
          itemPhotoDisplay.src = item.photo;
          itemPhotoDisplay.style.display = 'block';
        } else if(item.photoPath){
          itemPhotoDisplay.src = item.photoPath;
          itemPhotoDisplay.style.display = 'block';
        } else {
          itemPhotoDisplay.style.display = 'none';
        }

        itemNameDisplay.textContent = item.name || '-';
        barcodeDisplay.textContent = 'Barcode: ' + barcode;
        dateDisplay.textContent = 'Date of location: ' + new Date().toLocaleDateString();
        shelfDisplay.textContent = 'Shelf / Section nr: ' + (item.shelf || '-') + ' / ' + (item.section || '-');
        categoryDisplay.textContent = 'Category: ' + (item.category || '-'); // NEW
        switchTab(document.getElementById('tab-map'));
      } else {
        alert('Item not found');
      }
    });

    /* -------------------------
       ADD: long-press support for editing with visual progress overlay
       - hold (mouse or touch) for > 2500ms to open item for edit
       - touchstart is passive-friendly (we don't call preventDefault), so short taps still work
       - overlay opacity is animated via requestAnimationFrame to provide smooth progress
       ------------------------- */
    (function(localDiv, barcode, overlayEl) {
      let longPressTimer = null;
      const LONG_PRESS_MS = 1250;
      let pressingStart = null;
      let raf = null;

      function updateOverlayProgress() {
        if (!pressingStart) return;
        const elapsed = Date.now() - pressingStart;
        const clamped = Math.max(0, Math.min(1, elapsed / LONG_PRESS_MS));
        overlayEl.style.opacity = String(0.12 + clamped * 0.88); // grow from faint to full
        if (clamped >= 1) return; // done
        raf = requestAnimationFrame(updateOverlayProgress);
      }

      function startLongPress(e) {
        clearLongPress();
        pressingStart = Date.now();
        overlayEl.style.transition = 'opacity 60ms linear';
        // start visual progress loop
        raf = requestAnimationFrame(updateOverlayProgress);

        longPressTimer = setTimeout(() => {
          longPressTimer = null;
          pressingStart = null;
          cancelAnimationFrame(raf);
          overlayEl.style.opacity = '0';
          // open for edit in scan tab without starting camera
          openItemForEdit(barcode);
        }, LONG_PRESS_MS);
      }
      function clearLongPress() {
        if(longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (raf) {
          cancelAnimationFrame(raf);
          raf = null;
        }
        pressingStart = null;
        // fade overlay out smoothly
        overlayEl.style.transition = 'opacity 180ms linear';
        overlayEl.style.opacity = '0';
      }

      // Mouse
      localDiv.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        startLongPress(e);
      });
      localDiv.addEventListener('mouseup', clearLongPress);
      localDiv.addEventListener('mouseleave', clearLongPress);

      // Touch (we do NOT call preventDefault here so short taps still trigger click)
      localDiv.addEventListener('touchstart', (e) => {
        // if multiple touches, ignore
        if (e.touches && e.touches.length > 1) return;
        startLongPress(e);
      }, { passive: true }); // passive true to avoid blocking tap/click generation
      localDiv.addEventListener('touchend', clearLongPress);
      localDiv.addEventListener('touchcancel', clearLongPress);

      // prevent context menu & selection fallback
      localDiv.addEventListener('contextmenu', (e) => { e.preventDefault(); });
      localDiv.addEventListener('selectstart', (e) => { e.preventDefault(); });

      // pointer events fallback
      localDiv.addEventListener('pointercancel', clearLongPress);
      localDiv.addEventListener('pointerup', clearLongPress);
    })(div, it.barcode, overlay);

    listPage.appendChild(div);
  }

  if(end < items.length) {
    const btn = document.createElement('button');
    btn.className = 'load-more';
    btn.textContent = 'Load more';
    btn.addEventListener('click', () => {
      renderList(items, end);
    });
    listPage.appendChild(btn);
  }
}

function escapeHtml(str){
  if(!str) return '';
  return String(str).replace(/[&<>\"']/g, function(s){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s];
  });
}

function performSearch() {
  const qRaw = searchInput.value.trim();
  const q = qRaw.toLowerCase();
  const all = getAllItemsArray();
  if(q === ''){
    renderList(all, 0);
    return;
  }

  const results = [];
  for(const it of all){
    const name = (it.name || '').toLowerCase();
    const barcode = (it.barcode || '').toLowerCase();
    const category = (it.category || '').toLowerCase(); // NEW
    let score = 10000;

    // Strong matches first
    if(name === q) score = -1000;
    else if(barcode === q) score = -900;
    else if(category === q) score = -950; // category exact match slightly less than name exact
    else if(name.startsWith(q)) score = -100 + name.indexOf(q);
    else if(category.startsWith(q)) score = -120 + category.indexOf(q); // category prefix
    else if(barcode.startsWith(q)) score = -50 + barcode.indexOf(q);
    else if(name.includes(q)) score = 10 + name.indexOf(q);
    else if(category.includes(q)) score = 5 + category.indexOf(q); // category contains
    else if(barcode.includes(q)) score = 20 + barcode.indexOf(q);
    else if((it.shelf || '').toLowerCase().includes(q) || (it.section || '').toLowerCase().includes(q)) score = 200;
    else {
      // fuzzy name
      const levName = levenshtein(q, name);
      const maxAllowed = Math.max(2, Math.floor(name.length * 0.25));
      if(name && levName <= maxAllowed) score = 50 + levName;
      else {
        const levBarcode = levenshtein(q, barcode);
        const maxAllowedBar = Math.max(1, Math.floor(barcode.length * 0.15));
        if(barcode && levBarcode <= maxAllowedBar) score = 60 + levBarcode;
        else {
          // fuzzy category
          const levCategory = levenshtein(q, category);
          const maxAllowedCat = Math.max(1, Math.floor(category.length * 0.25));
          if(category && levCategory <= maxAllowedCat) score = 70 + levCategory;
        }
      }
    }

    if(score < 10000) results.push({it, score});
  }

  if(results.length === 0){
    for(const it of all){
      const hay = ((it.name||'') + ' ' + (it.barcode||'') + ' ' + (it.shelf||'') + ' ' + (it.section||'') + ' ' + (it.category||'')).toLowerCase();
      if(hay.includes(q)) {
        results.push({it, score: 500 + hay.indexOf(q)});
      }
    }
  }

  results.sort((a,b)=> a.score - b.score);
  const items = results.map(r=>r.it);
  renderList(items, 0);
}

searchForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  switchTab(document.getElementById('tab-add'));
  performSearch();
});

let debounceTimer = null;
searchInput.addEventListener('input', ()=>{
  switchTab(document.getElementById('tab-add'));
  if(debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(()=>{
    performSearch();
    debounceTimer = null;
  }, 150);
});

searchInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){
    e.preventDefault();
    switchTab(document.getElementById('tab-add'));
    performSearch();
  }
});

/* -------------------------
   Client side image helpers for Supabase
   ------------------------- */
// convert dataURL to Blob (for upload)
function dataURLtoBlob(dataURL) {
  const parts = dataURL.split(',');
  const meta = parts[0];
  const base64 = parts[1];
  const mime = meta.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const len = binary.length;
  const u8arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8arr[i] = binary.charCodeAt(i);
  return new Blob([u8arr], { type: mime });
}

/* ---------- Supabase image upload ----------
   Upload a dataURL (compressed image) to the public bucket
   and return the public URL.
*/
async function uploadImageToSupabase(barcode, dataURL) {
  if (!dataURL) return null;
  try {
    const blob = dataURLtoBlob(dataURL);
    // filename: barcode + timestamp
    const filename = `${barcode}/${Date.now()}.jpg`;
    const path = filename; // store path relative to bucket root

    // upload
    const { data, error: uploadErr } = await supabaseClient
      .storage
      .from(SUPABASE_BUCKET)
      .upload(path, blob, { cacheControl: '3600', upsert: true });

    if (uploadErr) throw uploadErr;

    // get public URL
    const { data: publicData } = supabaseClient
      .storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(path);

    return publicData.publicUrl; // full URL to the uploaded file
  } catch (err) {
    console.error('Supabase upload error', err);
    throw err;
  }
}

/* ---------- Save metadata row to Supabase ----------
   Upsert (insert or update) the item by  (barcode).
*/
async function saveItemToSupabase(barcode, item) {
  // item: { name, category, shelf, section, image_url }
  try {
    const row = {
      barcode: barcode,
      name: item.name || null,
      category: item.category || null, // NEW
      shelf: item.shelf || null,
      section: item.section || null,
      image_url: item.image_url || null
    };
    const { data, error } = await supabaseClient
      .from('items')
      .upsert(row, { onConflict: 'barcode' });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('saveItemToSupabase error', err);
    throw err;
  }
}

/* ---------- Load items from Supabase into barcodeDB ----------
   Fetch all rows from items and convert into the same shape
   your existing code expects: barcodeDB[] = { name, shelf, section, photo: image_url, category }
*/
async function loadDatabaseFromSupabase() {
  try {
    const { data, error } = await supabaseClient
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // convert to your local map
    barcodeDB = {};
    categoriesSet = new Set(); // reset categories
    for (const row of data) {
      barcodeDB[row.barcode] = {
        name: row.name || '',
        category: row.category || '', // NEW
        shelf: row.shelf || '',
        section: row.section || '',
        photo: row.image_url || ''
      };
      if (row.category) categoriesSet.add(row.category);
    }

    // update datalist options
    updateCategoryDatalist();
  } catch (err) {
    console.warn('Failed to load items from Supabase:', err);
    barcodeDB = {};
    categoriesSet = new Set();
    updateCategoryDatalist();
  }
}

/* -------------------------
   Existing camera + scanning + utility code (kept)
   ------------------------- */
// helper: capture current video frame to data URL
function captureFrameDataURL() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.warn('Failed to capture frame:', e);
    return null;
  }
}

// when a file is selected, read it into hidden data input & preview
itemPhotoInput.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const data = ev.target.result;
    itemPhotoData.value = data;
    photoPreview.src = data;
    photoPreview.style.display = 'block';
  };
  reader.readAsDataURL(f);
});

// Barcode scanner with multi-detection confirmation
function startScanner() {
  lastDetectedCode = null;
  consecutiveDetectCount = 0;
  acceptCooldown = false;
  detectBadge.textContent = `0/${CONFIRMATION_THRESHOLD}`;

  Quagga.init({
    inputStream: { name: 'Live', type: 'LiveStream', target: video },
    decoder: { readers: ['ean_reader','upc_reader','code_128_reader'] },
    locate: true
  }, err => {
    if(err) {
      console.error(err);
      return;
    }
    Quagga.start();
  });

  Quagga.onDetected(result => {
    if (!result || !result.codeResult) return;
    const code = result.codeResult.code;
    if (acceptCooldown) return;

    if (lastDetectedCode === code) consecutiveDetectCount++;
    else { lastDetectedCode = code; consecutiveDetectCount = 1; }

    if (consecutiveDetectCount >= CONFIRMATION_THRESHOLD) {
      acceptCooldown = true;
      lastDetectedCode = null;
      consecutiveDetectCount = 0;
      detectBadge.textContent = `0/${CONFIRMATION_THRESHOLD}`;

      currentCode = code;
      const item = barcodeDB[code];
      if(item){
        if(item.photo){
          itemPhotoDisplay.src = item.photo;
          itemPhotoDisplay.style.display = 'block';
        } else if(item.photoPath){
          itemPhotoDisplay.src = item.photoPath;
          itemPhotoDisplay.style.display = 'block';
        } else {
          itemPhotoDisplay.style.display = 'none';
        }

        itemNameDisplay.textContent = item.name;
        barcodeDisplay.textContent = "Barcode: " + code;
        dateDisplay.textContent = "Date of location: " + new Date().toLocaleDateString();
        shelfDisplay.textContent = "Shelf / Section nr: " + item.shelf + " / " + item.section;
        categoryDisplay.textContent = "Category: " + (item.category || '-'); // NEW
        switchTab(document.getElementById('tab-map'));
      } else {
        itemNameDisplay.textContent = "❌ Not found in database";
        barcodeDisplay.textContent = "Barcode: " + code;
        dateDisplay.textContent = "Date of location: -";
        shelfDisplay.textContent = "";
        categoryDisplay.textContent = "Category: -"; // NEW
        itemBarcodeInput.value = code;

        // capture frame for preview
        const dataURL = captureFrameDataURL();
        if(dataURL){
          itemPhotoData.value = dataURL;
          photoPreview.src = dataURL;
          photoPreview.style.display = 'block';
        } else {
          itemPhotoData.value = '';
          photoPreview.style.display = 'none';
        }

        // Ensure save button text is the "add new" label
        saveBtn.textContent = '💾 Save Item';

        video.style.display = "none";
        addForm.style.display = "flex";
        itemCard.classList.remove("hidden");
        stopCamera();
      }

      setTimeout(()=> { acceptCooldown = false; }, 700);
    }
  });
}

function stopCamera() {
  acceptCooldown = false;
  lastDetectedCode = null;
  consecutiveDetectCount = 0;
  detectBadge.style.display = "none";
  torchBtn.style.display = "none";

  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  if (video.srcObject) {
    try { video.srcObject.getTracks().forEach(t => t.stop()); } catch(e){}
    video.srcObject = null;
  }
  if (window.Quagga) {
    try { Quagga.stop(); } catch (e) {}
  }
}

async function startCamera() {
  acceptCooldown = false;
  lastDetectedCode = null;
  consecutiveDetectCount = 0;
  detectBadge.textContent = `0/${CONFIRMATION_THRESHOLD}`;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    currentStream = stream;
    video.srcObject = stream;
    video.play().catch(()=>{});
    torchOn = false;
    startScanner();
  } catch (err) {
    alert('Error accessing camera: ' + err.message);
  }
}

// Torch control
async function toggleTorch() {
  if (!currentStream) {
    alert('Camera not started');
    return;
  }
  const track = currentStream.getVideoTracks()[0];
  if (!track) {
    alert('No video track available');
    return;
  }
  const capabilities = track.getCapabilities ? track.getCapabilities() : {};
  if (!capabilities || !capabilities.torch) {
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      torchOn = !torchOn;
      torchBtn.textContent = torchOn ? '🔦' : '🔦';
    } catch (err) {
      alert('Torch not supported on this device/browser.');
    }
    return;
  }
  try {
    await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
    torchOn = !torchOn;
    torchBtn.style.background = torchOn ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.45)';
    torchBtn.style.color = torchOn ? '#111' : 'white';
  } catch (err) {
    console.warn('Torch toggle failed:', err);
    alert('Failed to toggle torch: ' + err.message);
  }
}

torchBtn.addEventListener('click', toggleTorch);

/* -------------------------
   Image resize helper (keeps from your file)
   ------------------------- */
async function resizeDataURL(dataURL, maxWidth = 1024, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(jpegDataUrl);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for resize'));
    img.crossOrigin = 'anonymous';
    img.src = dataURL;
  });
}

/* -------------------------
   Save handler (Supabase flow)
   - MINOR change: handle category (required) and preserve existing photo URL if any
   - NEW: if category is new, it's added to categoriesSet and datalist updated
   ------------------------- */
saveBtn.addEventListener("click", async () => {
  try {
    const name = itemNameInput.value.trim();
    const category = itemCategoryInput.value.trim(); // NEW
    const shelf = itemShelfInput.value.trim();
    const section = itemSectionInput.value.trim();
    const barcode = itemBarcodeInput.value.trim();
    if (!name || !shelf || !section || !barcode || !category) {
      alert("Please fill all fields (Category is required)");
      return;
    }

    // Step 1: get photo (dataURL) if present
    const inlinePhoto = itemPhotoData.value || null;

    // Step 2: compress/resize it first (reduces upload size)
    let uploadDataURL = null;
    if (inlinePhoto) {
      try {
        uploadDataURL = await resizeDataURL(inlinePhoto, 1024, 0.75);
      } catch (err) {
        console.warn('Resize failed — falling back to original photo', err);
        uploadDataURL = inlinePhoto;
      }
    }

    // Step 3: If we have image data, upload to Supabase Storage
    let finalPhotoUrl = null;
    if (uploadDataURL) {
      try {
        finalPhotoUrl = await uploadImageToSupabase(barcode, uploadDataURL);
      } catch (err) {
        console.error('Image upload failed:', err);
        alert('Image upload failed: ' + (err.message || err));
        return;
      }
    } else {
      // <-- NEW: preserve existing photo URL if user didn't provide a new image
      if (barcodeDB[barcode] && barcodeDB[barcode].photo) {
        finalPhotoUrl = barcodeDB[barcode].photo;
      } else {
        finalPhotoUrl = null;
      }
    }

    // Step 4: Build item object and save to Supabase table
    const itemToSave = {
      name,
      category, // NEW
      shelf,
      section,
      image_url: finalPhotoUrl // or null
    };

    await saveItemToSupabase(barcode, itemToSave);

    // Step 4.5: if category is new, add to set and update datalist
    if (category) {
      categoriesSet.add(category);
      updateCategoryDatalist();
    }

    // Step 5: reload DB and update UI
    await loadDatabaseFromSupabase();
    const saved = barcodeDB[barcode];
    if (saved && saved.photo) {
      itemPhotoDisplay.src = saved.photo;
      itemPhotoDisplay.style.display = 'block';
    } else {
      itemPhotoDisplay.style.display = 'none';
    }
    itemNameDisplay.textContent = saved?.name || name;
    shelfDisplay.textContent = "Shelf / Section nr: " + (saved?.shelf || shelf) + " / " + (saved?.section || section);
    categoryDisplay.textContent = "Category: " + (saved?.category || category || '-'); // NEW

    addForm.style.display = "none";
    switchTab(document.getElementById('tab-map'));
    alert('Item saved successfully.');

  } catch (err) {
    console.error('Save failed:', err);
    alert('Save failed: ' + (err.message || err));
  }
});

/* -------------------------
   Init on page load
   ------------------------- */
mapContainer.style.display = "flex"; // show map by default (matches original behavior)
window.addEventListener('load', async ()=>{
  try {
    await loadDatabaseFromSupabase();
  } catch(e) {
    console.warn('Initial load failed', e);
  }

  /* MINIMAL ADDITION: ensure image fills the map container vertically and is centered.
     This explicitly sets the inline sizing and clears transform so the top & bottom align
     with the map section on initial load. No other behavior was changed. */
  try {
    // enforce CSS sizing just in case
    mapImg.style.height = '100%';
    mapImg.style.width = 'auto';
    mapImg.style.objectFit = 'contain';
    // reset any transforms so image isn't translated/scaled from previous state
    mapImg.style.transform = 'none';
    // center via container flex alignment (already set in CSS), but also ensure inline centering
    mapImg.style.display = 'block';
    // If the image is already loaded, these settings will take effect immediately.
    // If it's still loading, the 'load' listener below will also apply them.
  } catch (err) {
    console.warn('Failed to apply map sizing on load', err);
  }
});

/* also apply the same sizing when the image actually finishes loading (cover race conditions) */
mapImg.addEventListener('load', () => {
  try {
    mapImg.style.height = '100%';
    mapImg.style.width = 'auto';
    mapImg.style.objectFit = 'contain';
    mapImg.style.transform = 'none';
    mapImg.style.display = 'block';
  } catch (err) {
    console.warn('Failed to apply map sizing on image load', err);
  }
});

/* -------------------------
   Modal enlargement feature (minimal, non-invasive)
   ------------------------- */
const photoModal = document.getElementById('photoModal');
const modalPhoto = document.getElementById('modalPhoto');

// Click on the small item photo (in the map/item card) to open modal.
// Only open if the image has a non-empty src.
itemPhotoDisplay.addEventListener('click', () => {
  try {
    if (itemPhotoDisplay && itemPhotoDisplay.src) {
      modalPhoto.src = itemPhotoDisplay.src;
      photoModal.style.display = 'flex';
    }
  } catch (err) {
    // don't break other features if something goes wrong
    console.warn('Failed to open photo modal', err);
  }
});

// Clicking the modal closes it and clears the src to release memory.
photoModal.addEventListener('click', () => {
  try {
    photoModal.style.display = 'none';
    modalPhoto.src = '';
  } catch (err) {
    console.warn('Failed to close photo modal', err);
  }
});

/* -------------------------
   MAP pan / zoom implementation (UNCHANGED - left in place)
   You said "forget zooming/panning" — so I did not modify or remove this block,
   but the image sizing at load will ensure the image starts filling top-to-bottom.
   If you want the pan/zoom code removed entirely I can remove it, but you said
   to change only the absolute necessary bits — so I left the rest untouched.
   ------------------------- */

let scale = 1;
const minScale = 0.1;
const maxScale = 6;
let panX = 0;
let panY = 0;

let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let lastPanX = 0;
let lastPanY = 0;

// for touch pinch
let lastTouchDist = null;
let lastTouchCenter = null;

function applyTransform() {
  mapImg.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

mapContainer.addEventListener('wheel', function(e) {
  if (mapContainer.style.display === 'none') return;
  e.preventDefault();
  const rect = mapImg.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const delta = -e.deltaY;
  const zoomFactor = Math.exp(delta * 0.0015);
  let newScale = clamp(scale * zoomFactor, minScale, maxScale);
  const scaleRatio = newScale / scale;
  panX = (panX - mx) * scaleRatio + mx;
  panY = (panY - my) * scaleRatio + my;
  scale = newScale;
  applyTransform();
}, { passive: false });

mapContainer.addEventListener('pointerdown', function(e) {
  if (e.pointerType === 'touch') return;
  isPanning = true;
  panStartX = e.clientX;
  panStartY = e.clientY;
  lastPanX = panX;
  lastPanY = panY;
  mapContainer.setPointerCapture(e.pointerId);
});

mapContainer.addEventListener('pointermove', function(e) {
  if (!isPanning) return;
  const dx = e.clientX - panStartX;
  const dy = e.clientY - panStartY;
  panX = lastPanX + dx;
  panY = lastPanY + dy;
  applyTransform();
});

mapContainer.addEventListener('pointerup', function(e) {
  isPanning = false;
  try { mapContainer.releasePointerCapture(e.pointerId); } catch(_) {}
});
mapContainer.addEventListener('pointercancel', function(e) {
  isPanning = false;
  try { mapContainer.releasePointerCapture(e.pointerId); } catch(_) {}
});

mapContainer.addEventListener('touchstart', function(e) {
  if (!e.touches) return;
  if (e.touches.length === 1) {
    lastTouchDist = null;
    const t = e.touches[0];
    isPanning = true;
    panStartX = t.clientX;
    panStartY = t.clientY;
    lastPanX = panX;
    lastPanY = panY;
  } else if (e.touches.length === 2) {
    isPanning = false;
    const t0 = e.touches[0];
    const t1 = e.touches[1];
    lastTouchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    lastTouchCenter = {
      x: (t0.clientX + t1.clientX) / 2,
      y: (t0.clientY + t1.clientY) / 2
    };
  }
}, { passive: false });

mapContainer.addEventListener('touchmove', function(e) {
  if (!e.touches) return;
  if (e.touches.length === 1 && isPanning) {
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - panStartX;
    const dy = t.clientY - panStartY;
    panX = lastPanX + dx;
    panY = lastPanY + dy;
    applyTransform();
  } else if (e.touches.length === 2) {
    e.preventDefault();
    const t0 = e.touches[0];
    const t1 = e.touches[1];
    const curDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    const curCenter = {
      x: (t0.clientX + t1.clientX) / 2,
      y: (t0.clientY + t1.clientY) / 2
    };
    if (lastTouchDist) {
      const zoomFactor = curDist / lastTouchDist;
      const newScale = clamp(scale * zoomFactor, minScale, maxScale);
      const rect = mapImg.getBoundingClientRect();
      const cx = curCenter.x - rect.left;
      const cy = curCenter.y - rect.top;
      const scaleRatio = newScale / scale;
      panX = (panX - cx) * scaleRatio + cx;
      panY = (panY - cy) * scaleRatio + cy;
      scale = newScale;
      applyTransform();
    }
    lastTouchDist = curDist;
    lastTouchCenter = curCenter;
  }
}, { passive: false });

mapContainer.addEventListener('touchend', function(e) {
  if (!e.touches || e.touches.length === 0) {
    isPanning = false;
    lastTouchDist = null;
    lastTouchCenter = null;
  } else if (e.touches.length === 1) {
    const t = e.touches[0];
    isPanning = true;
    panStartX = t.clientX;
    panStartY = t.clientY;
    lastPanX = panX;
    lastPanY = panY;
    lastTouchDist = null;
  }
}, { passive: false });

window.addEventListener('wheel', function(e) {
  if (e.ctrlKey && !mapContainer.contains(e.target)) {
    e.preventDefault();
  }
}, { passive: false });

/* -------------------------
   END map pan/zoom code
   ------------------------- */

