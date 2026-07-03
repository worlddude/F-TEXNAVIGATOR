/*  ============================================================
 *  STORE-MAP  —  delt butikskort for Locator + ItemADD
 *  ------------------------------------------------------------
 *  ÉT sted der beskriver butikkens reoler. Bruges både af
 *  hoved-appen (Claude/index.html) og add-appen (Claude/add/index.html).
 *
 *  --> SÅDAN TILFØJER/RETTER DU EN REOL:
 *      Rediger listen STORE_AISLES herunder. Hver reol er én linje:
 *        { id:'Chips', name:'Chips & Snacks', x:430, y:190, w:70, h:280, fill:'#... ' }
 *      - id   : kort nøgle der gemmes på varen (skal være unik)
 *      - name : dansk navn der vises på kortet
 *      - x,y,w,h : placering på kortet i "viewBox"-koordinater (0–1000 bred, 0–660 høj)
 *      - fill : farve på reolen (valgfri)
 *      - photo/shelfH : valgfrit — foto af reolen set fra siden + markering (bruges kun i hoved-appen)
 *
 *  Du behøver IKKE at oprette alle reoler på én gang. Kortet viser
 *  præcis de reoler der står i listen — tilføj dem efterhånden som
 *  du fotograferer dem.
 *  ============================================================ */
(function (global) {
  'use strict';

  const VIEW_W = 1000, VIEW_H = 660;

  // Ét foto af en reol vi allerede har taget (chips-reolen fra siden).
  // Nye reoler genbruger det indtil du har taget deres eget foto.
  const PLACEHOLDER_SHELF = 'https://lpcygniycyffeswzrnms.supabase.co/storage/v1/object/public/Ailes/7ffd5ea6-e742-41e6-9ddf-edce279185c5.png';

  /* ---- REOLERNE (rediger frit) ------------------------------- */
  const STORE_AISLES = [
    // Perimeter — langs væggene
    { id: 'frugt', name: 'Frugt & Grønt',   x: 40,  y: 70,  w: 150, h: 190, fill: '#1f7a4d' },
    { id: 'Brød',  name: 'Brød & Kager',    x: 40,  y: 285, w: 150, h: 140, fill: '#8a5a1f', photo: PLACEHOLDER_SHELF, shelfH: { t: 20, l: 10, w: 40, h: 60 } },
    { id: 'koel',  name: 'Køl & Mejeri',    x: 810, y: 70,  w: 150, h: 210, fill: '#1f5f8a' },
    { id: 'frost', name: 'Frost',           x: 810, y: 305, w: 150, h: 190, fill: '#2a6f9e' },
    { id: 'Vin',   name: 'Vin & Spiritus',  x: 560, y: 70,  w: 240, h: 95,  fill: '#7a2f4d', photo: PLACEHOLDER_SHELF, shelfH: { t: 15, l: 5, w: 30, h: 70 } },

    // Midter-gondoler (lodrette reoler)
    { id: 'kolo',   name: 'Kolonial',       x: 250, y: 190, w: 70, h: 280, fill: '#3d5a80' },
    { id: 'drikke', name: 'Drikkevarer',    x: 335, y: 190, w: 70, h: 280, fill: '#3d5a80' },
    { id: 'Chips',  name: 'Chips & Snacks', x: 420, y: 190, w: 70, h: 280, fill: '#3d8eff', photo: PLACEHOLDER_SHELF, shelfH: { t: 12, l: 1.5, w: 27, h: 77 } },
    { id: 'slik',   name: 'Slik & Kager',   x: 505, y: 190, w: 70, h: 280, fill: '#3d5a80' },
    { id: 'A3',     name: 'Snacks',         x: 590, y: 190, w: 70, h: 280, fill: '#3d8eff', photo: PLACEHOLDER_SHELF, shelfH: { t: 12, l: 1.5, w: 27, h: 77 } },
    { id: 'hus',    name: 'Husholdning',    x: 675, y: 190, w: 70, h: 280, fill: '#3d5a80' },
  ];

  /* ---- Ikke-klikbare zoner (indgang, kasser osv.) ------------ */
  const ZONES = [
    { name: 'Kasser',  x: 250, y: 520, w: 240, h: 90, fill: '#2a2f3a' },
    { name: 'Indgang', x: 560, y: 520, w: 185, h: 90, fill: '#20242e' },
  ];

  const byId = id => STORE_AISLES.find(a => a.id === id) || null;

  // Slå op ud fra reol-id ELLER navn (så gamle vare-data stadig matcher)
  function lookup(shelf, category) {
    if (shelf) {
      const a = byId(shelf) || STORE_AISLES.find(x => x.name.toLowerCase() === String(shelf).toLowerCase());
      if (a) return a;
    }
    if (category) {
      const c = String(category).toLowerCase();
      return STORE_AISLES.find(x => x.name.toLowerCase().includes(c) || c.includes(x.id.toLowerCase())) || null;
    }
    return null;
  }

  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

  // Én reol/zone som SVG-gruppe. Lodrette reoler får roteret tekst.
  function shapeMarkup(a, opts) {
    const vertical = a.h > a.w * 1.35;
    const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
    const fill = a.fill || '#3d5a80';
    const label = esc(a.name);
    const clickable = opts.clickable ? ' aisle-clickable' : '';
    const text = vertical
      ? `<text x="${cx}" y="${cy}" transform="rotate(-90 ${cx} ${cy})" class="aisle-label">${label}</text>`
      : `<text x="${cx}" y="${cy}" class="aisle-label">${label}</text>`;
    return `<g class="aisle${clickable}"${a.id ? ` data-aisle="${esc(a.id)}"` : ''}>` +
      `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="10" class="aisle-rectshape" style="fill:${fill}"/>` +
      text + `</g>`;
  }

  // Byg hele SVG-markuppen. highlightId => reol der skal fremhæves.
  function svgMarkup(o) {
    o = o || {};
    const clickable = !!o.clickable;
    const aisles = STORE_AISLES.map(a => shapeMarkup(a, { clickable })).join('');
    const zones = ZONES.map(z => shapeMarkup(z, { clickable: false })).join('');
    return `<svg class="store-map-svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sm-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#141821"/><stop offset="1" stop-color="#0d1016"/>
        </linearGradient>
        <filter id="sm-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <style>
        .store-map-svg{display:block;width:100%;height:100%;font-family:'Syne',system-ui,sans-serif}
        .sm-wall{fill:none;stroke:#3a4152;stroke-width:4}
        .aisle-rectshape{stroke:rgba(255,255,255,.14);stroke-width:1.5;filter:brightness(.92)}
        .aisle-label{fill:#eef2f7;font-size:19px;font-weight:800;text-anchor:middle;dominant-baseline:middle;letter-spacing:.02em;paint-order:stroke;stroke:rgba(0,0,0,.45);stroke-width:3px;pointer-events:none}
        .aisle-clickable{cursor:pointer}
        .aisle-clickable .aisle-rectshape{transition:filter .15s}
        .aisle-clickable:hover .aisle-rectshape{filter:brightness(1.18)}
        .zone-label{fill:#9aa4b5;font-size:16px;font-weight:700;text-anchor:middle;dominant-baseline:middle}
        .aisle-hl{fill:rgba(61,142,255,.16);stroke:#3d8eff;stroke-width:4;rx:10;filter:url(#sm-glow)}
        .sm-selected .aisle-rectshape{stroke:#eef2f7;stroke-width:3.5}
      </style>
      <rect x="0" y="0" width="${VIEW_W}" height="${VIEW_H}" fill="url(#sm-floor)"/>
      <rect x="20" y="20" width="${VIEW_W - 40}" height="${VIEW_H - 40}" rx="18" class="sm-wall"/>
      ${zones}
      ${aisles}
      <rect class="aisle-hl" x="0" y="0" width="0" height="0" rx="10" style="display:none" data-role="highlight"/>
    </svg>`;
  }

  /* ---- Montér kortet i en container -------------------------- */
  // container: DOM-element. opts: { clickable, onPick(id, aisle), highlightId }
  // returnerer { svg, highlight(id), clearHighlight(), select(id) }
  function mount(container, opts) {
    opts = opts || {};
    container.innerHTML = svgMarkup({ clickable: !!opts.clickable });
    const svg = container.querySelector('svg');
    const hl = svg.querySelector('[data-role="highlight"]');

    function highlight(id) {
      const a = byId(id);
      if (!a) { clearHighlight(); return; }
      hl.setAttribute('x', a.x - 6); hl.setAttribute('y', a.y - 6);
      hl.setAttribute('width', a.w + 12); hl.setAttribute('height', a.h + 12);
      hl.style.display = '';
    }
    function clearHighlight() { hl.style.display = 'none'; }
    function select(id) {
      svg.querySelectorAll('.aisle').forEach(g => g.classList.toggle('sm-selected', g.getAttribute('data-aisle') === id));
      highlight(id);
    }

    if (opts.clickable && typeof opts.onPick === 'function') {
      svg.addEventListener('click', e => {
        const g = e.target.closest('[data-aisle]');
        if (!g) return;
        const id = g.getAttribute('data-aisle');
        select(id);
        opts.onPick(id, byId(id));
      });
    }
    if (opts.highlightId) highlight(opts.highlightId);
    return { svg, highlight, clearHighlight, select };
  }

  global.StoreMap = {
    VIEW_W, VIEW_H, AISLES: STORE_AISLES, byId, lookup, svgMarkup, mount, PLACEHOLDER_SHELF
  };
})(typeof window !== 'undefined' ? window : this);
