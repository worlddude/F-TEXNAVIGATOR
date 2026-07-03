/*  ============================================================
 *  STORE-MAP  —  delt butikskort for Locator + ItemADD
 *  ------------------------------------------------------------
 *  ÉT sted der beskriver butikkens reoler. Bruges både af
 *  hoved-appen (Claude/index.html) og add-appen (Claude/add/index.html).
 *
 *  Kortet er tegnet efter den rigtige butiksplan. Farverne følger
 *  legenden på din tegning:
 *    - lyseblå  = køl (mælk, æg, pålæg ...)
 *    - fersken  = vin & alkohol
 *    - pink     = "kolo" (ikke-kølede varer: slik, bleer, chips ...)
 *    - mørkeblå = frost (is, frostvarer ...)
 *    - grøn     = kasser & bager i fronten (ikke reoler)
 *    - mørk/grå = kun personale
 *
 *  --> SÅDAN TILFØJER/RETTER DU EN REOL:
 *      Rediger listen STORE_AISLES herunder. Hver reol er én linje:
 *        { id:'chips1', name:'Chips', x:907, y:668, w:24, h:132, fill:COL.kolo }
 *      - id    : kort unik nøgle der gemmes på varen
 *      - name  : dansk navn (vises i varekortet / vælgeren)
 *      - short : (valgfri) kortere tekst der vises OVENPÅ reolen på kortet
 *      - x,y,w,h : placering i viewBox-koordinater (0–2016 bred, 0–1080 høj)
 *      - fill  : farve (brug COL.koel / COL.vin / COL.kolo / COL.frost)
 *      - photo/shelfH : valgfrit side-foto af reolen (bruges i hoved-appen)
 *  ============================================================ */
(function (global) {
  'use strict';

  const VIEW_W = 2016, VIEW_H = 1080;

  // Ét foto af en reol vi allerede har taget (chips-reolen fra siden).
  const PLACEHOLDER_SHELF = 'https://lpcygniycyffeswzrnms.supabase.co/storage/v1/object/public/Ailes/7ffd5ea6-e742-41e6-9ddf-edce279185c5.png';

  // Farver pr. sektion (fra legenden på tegningen)
  const COL = {
    koel:  '#8fb4e8',   // køl (lyseblå)
    vin:   '#e6b48c',   // vin & alkohol (fersken)
    kolo:  '#e79ad6',   // kolo / ikke-kølet (pink)
    frost: '#5a5ad0',   // frost (mørkeblå)
    green: '#a6d878',   // front / kasser / bager (grøn)
    staff: '#23262d',   // kun personale (mørk)
  };

  /* ---- REOLERNE (klikbare) ----------------------------------- */
  const STORE_AISLES = [
    /* --- VIN & ALKOHOL (fersken, øverst) --- */
    { id: 'vin_vaeg_top',  name: 'Vin (væg)',        short: 'Vin (væg)', x: 990,  y: 60,  w: 160, h: 22,  fill: COL.vin },
    { id: 'vin_vaeg_v',    name: 'Vin (væg)',        short: 'Vin',       x: 958,  y: 60,  w: 26,  h: 150, fill: COL.vin },
    { id: 'vin',           name: 'Vin & spiritus',   short: 'Vin & spiritus', x: 990, y: 88, w: 160, h: 122, fill: COL.vin },

    /* --- KØL øverst (lyseblå): æg, pålæg, ost, mejeri --- */
    { id: 'koel_aeg',      name: 'Køl: æg & pålæg',  short: 'Æg & pålæg', x: 1163, y: 58, w: 238, h: 26,  fill: COL.koel },
    { id: 'ost',           name: 'Ost (osteby)',     short: 'Ost',       x: 1178, y: 94, w: 168, h: 48,  fill: COL.koel },
    { id: 'tilbud_koel',   name: 'Tilbudskasse',     short: 'Tilbud',    x: 1352, y: 92, w: 48,  h: 62,  fill: COL.koel },
    { id: 'mejeri',        name: 'Køl: mælk, smør & snacks', short: 'Mælk & smør', x: 1406, y: 58, w: 44, h: 182, fill: COL.koel },

    /* --- KOLO stor blok (pink): slik, brød, bleer ... --- */
    { id: 'bleer',         name: 'Bleer & babymad',  short: 'Bleer/baby', x: 832,  y: 250, w: 32, h: 278, fill: COL.kolo },
    { id: 'asiatisk',      name: 'Asiatisk',         short: 'Asiatisk',  x: 872,  y: 250, w: 38, h: 278, fill: COL.kolo },
    { id: 'slik1',         name: 'Slik',             short: 'Slik',      x: 918,  y: 250, w: 40, h: 278, fill: COL.kolo },
    { id: 'slik2',         name: 'Slik',             short: 'Slik',      x: 966,  y: 250, w: 40, h: 278, fill: COL.kolo },
    { id: 'broed',         name: 'Brød',             short: 'Brød',      x: 1014, y: 250, w: 44, h: 278, fill: COL.kolo },
    { id: 'krydderier',    name: 'Krydderier',       short: 'Krydderi',  x: 1066, y: 250, w: 30, h: 278, fill: COL.kolo },
    { id: 'kiks',          name: 'Kiks & kager',     short: 'Kiks/kager', x: 1104, y: 250, w: 28, h: 278, fill: COL.kolo },
    { id: 'saft',          name: 'Saft & juice',     short: 'Saft/juice', x: 1138, y: 250, w: 28, h: 278, fill: COL.kolo },

    /* --- FROST (mørkeblå): frostvarer --- */
    { id: 'tilbud_frost1', name: 'Tilbudskasse (frost)', short: 'Tilbud', x: 1170, y: 255, w: 22, h: 288, fill: COL.frost },
    { id: 'frost_kylling', name: 'Frost: kylling & kød', short: 'Kylling & kød', x: 1192, y: 300, w: 205, h: 46, fill: COL.frost },
    { id: 'frost_pommes',  name: 'Frost: pommes & bær',  short: 'Pommes & bær',  x: 1192, y: 352, w: 205, h: 42, fill: COL.frost },
    { id: 'frost_is',      name: 'Frost: is & supper',   short: 'Is & supper',   x: 1192, y: 398, w: 205, h: 42, fill: COL.frost },
    { id: 'frost_pizza',   name: 'Frost: pizza & færdigret', short: 'Pizza & færdigret', x: 1192, y: 462, w: 205, h: 42, fill: COL.frost },
    { id: 'frost_broed',   name: 'Frost: brød, boller & is', short: 'Brød & is', x: 1192, y: 506, w: 205, h: 42, fill: COL.frost },
    { id: 'tilbud_frost2', name: 'Tilbudskasse (frost)', short: 'Tilbud', x: 1402, y: 300, w: 52, h: 122, fill: COL.frost },

    /* --- FISK --- */
    { id: 'koel_fisk',     name: 'Køl: fisk',  short: 'Fisk (køl)',  x: 1178, y: 560, w: 130, h: 52, fill: COL.koel },
    { id: 'frost_fisk',    name: 'Frost: fisk', short: 'Fisk (frost)', x: 1328, y: 560, w: 120, h: 52, fill: COL.frost },

    /* --- KOLO nederste blok (pink): dyrefoder, kemi, chips, sodavand, øl --- */
    { id: 'hundefoder',    name: 'Hundefoder',   short: 'Hund',      x: 745,  y: 668, w: 24, h: 132, fill: COL.kolo },
    { id: 'kattefoder',    name: 'Kattefoder',   short: 'Kat',       x: 772,  y: 668, w: 24, h: 132, fill: COL.kolo },
    { id: 'kemi',          name: 'Kemi',         short: 'Kemi',      x: 799,  y: 668, w: 24, h: 132, fill: COL.kolo },
    { id: 'opvask',        name: 'Opvask',       short: 'Opvask',    x: 826,  y: 668, w: 24, h: 132, fill: COL.kolo },
    { id: 'tandboerste',   name: 'Tandbørster & poser', short: 'Tandbørste', x: 853, y: 668, w: 24, h: 132, fill: COL.kolo },
    { id: 'hygiejne',      name: 'Bind & hygiejne', short: 'Hygiejne', x: 880, y: 668, w: 24, h: 132, fill: COL.kolo },
    { id: 'chips1',        name: 'Chips',        short: 'Chips',     x: 907,  y: 668, w: 24, h: 132, fill: COL.kolo, photo: PLACEHOLDER_SHELF, shelfH: { t: 12, l: 1.5, w: 27, h: 77 } },
    { id: 'chips2',        name: 'Chips',        short: 'Chips',     x: 934,  y: 668, w: 24, h: 132, fill: COL.kolo },
    { id: 'sodavand1',     name: 'Sodavand',     short: 'Sodavand',  x: 961,  y: 668, w: 24, h: 132, fill: COL.kolo },
    { id: 'sodavand2',     name: 'Sodavand',     short: 'Sodavand',  x: 988,  y: 668, w: 24, h: 132, fill: COL.kolo },
    { id: 'oel',           name: 'Øl',           short: 'Øl',        x: 1015, y: 668, w: 24, h: 132, fill: COL.kolo },

    /* --- Nederste strimler (køl-drikke, sodavand, ½L, toiletpapir) --- */
    { id: 'koel_drikke',   name: 'Køl: drikkevarer', short: 'Drikkevarer', x: 1043, y: 756, w: 108, h: 24, fill: COL.koel },
    { id: 'toiletpapir',   name: 'Toiletpapir & køkkenruller', short: 'Toiletpapir', x: 745, y: 822, w: 104, h: 24, fill: COL.kolo },
    { id: 'koel_sodavand', name: 'Køl: sodavand & alkohol', short: 'Sodavand & alk.', x: 853, y: 822, w: 150, h: 24, fill: COL.koel },
    { id: 'halvliter',     name: '½L sodavand',  short: '½L sodavand', x: 1007, y: 822, w: 96, h: 24, fill: COL.kolo },
  ];

  /* ---- Sektions-baggrunde (bløde farvede felter bag reolerne) --- */
  const SECTIONS = [
    { x: 950,  y: 52,  w: 205, h: 185, fill: COL.vin },
    { x: 1158, y: 52,  w: 245, h: 192, fill: COL.koel },
    { x: 1404, y: 52,  w: 50,  h: 192, fill: COL.koel },
    { x: 820,  y: 234, w: 360, h: 312, fill: COL.kolo },
    { x: 1150, y: 246, w: 314, h: 306, fill: COL.frost },
    { x: 740,  y: 654, w: 322, h: 160, fill: COL.kolo },
  ];

  /* ---- Zoner: grøn front + personale (ikke klikbare) --------- */
  const ZONES = [
    { kind: 'green', name: 'Kasser & bager (front)', short: 'Kasser & bager',
      points: '150,278 548,304 548,812 214,812 96,470 96,300', cx: 320, cy: 560 },
    { kind: 'staff', name: 'Kun personale', short: 'Kun personale',
      x: 1470, y: 46, w: 500, h: 742, cx: 1720, cy: 410 },
    { kind: 'staff', name: 'Kun personale', short: 'Kun personale',
      x: 448, y: 852, w: 710, h: 204, cx: 803, cy: 958 },
  ];

  // Butikkens gulv/omrids (lyst felt bag det hele)
  const HALL = { x: 418, y: 40, w: 1052, h: 806 };

  const byId = id => STORE_AISLES.find(a => a.id === id) || null;

  // Slå op ud fra reol-id ELLER navn (så gamle vare-data stadig matcher)
  function lookup(shelf, category) {
    if (shelf) {
      const s = String(shelf).toLowerCase();
      const a = byId(shelf) || STORE_AISLES.find(x => x.name.toLowerCase() === s);
      if (a) return a;
    }
    if (category) {
      const c = String(category).toLowerCase();
      return STORE_AISLES.find(x => x.name.toLowerCase().includes(c) || c.includes(x.id.toLowerCase())) || null;
    }
    return null;
  }

  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

  // Passende skriftstørrelse ud fra reolens tykkelse
  function fontFor(w, h, vertical) {
    const thickness = vertical ? w : h;
    return Math.max(11, Math.min(19, Math.round(thickness * 0.52)));
  }

  // Én klikbar reol som SVG-gruppe. Lodrette reoler får roteret tekst.
  function aisleMarkup(a, clickable) {
    const vertical = a.h > a.w * 1.35;
    const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
    const fs = fontFor(a.w, a.h, vertical);
    const label = esc(a.short || a.name);
    const cls = clickable ? 'aisle aisle-clickable' : 'aisle';
    const text = vertical
      ? `<text x="${cx}" y="${cy}" font-size="${fs}" transform="rotate(-90 ${cx} ${cy})" class="aisle-label">${label}</text>`
      : `<text x="${cx}" y="${cy}" font-size="${fs}" class="aisle-label">${label}</text>`;
    return `<g class="${cls}" data-aisle="${esc(a.id)}">` +
      `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="6" class="aisle-rectshape" style="fill:${a.fill || COL.kolo}"/>` +
      text + `</g>`;
  }

  function zoneMarkup(z) {
    const isStaff = z.kind === 'staff';
    const fill = isStaff ? COL.staff : COL.green;
    const labelCls = isStaff ? 'zone-label zone-label-staff' : 'zone-label';
    const shape = z.points
      ? `<polygon points="${z.points}" class="zone-shape" style="fill:${fill}"/>`
      : `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="10" class="zone-shape" style="fill:${fill}"/>`;
    return `<g class="zone">${shape}<text x="${z.cx}" y="${z.cy}" class="${labelCls}">${esc(z.short || z.name)}</text></g>`;
  }

  function svgMarkup(o) {
    o = o || {};
    const clickable = !!o.clickable;
    const sections = SECTIONS.map(s =>
      `<rect x="${s.x - 8}" y="${s.y - 8}" width="${s.w + 16}" height="${s.h + 16}" rx="16" style="fill:${s.fill};opacity:.16"/>`).join('');
    const zones = ZONES.map(zoneMarkup).join('');
    const aisles = STORE_AISLES.map(a => aisleMarkup(a, clickable)).join('');
    return `<svg class="store-map-svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sm-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#151a23"/><stop offset="1" stop-color="#0e121a"/>
        </linearGradient>
        <filter id="sm-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <style>
        .store-map-svg{display:block;width:100%;height:100%;font-family:'Syne',system-ui,sans-serif}
        .sm-bg{fill:#0d1016}
        .sm-hall{fill:url(#sm-floor);stroke:#39414f;stroke-width:3}
        .aisle-rectshape{stroke:rgba(255,255,255,.16);stroke-width:1.2;filter:brightness(.94)}
        .aisle-label{fill:#f4f7fb;font-weight:800;text-anchor:middle;dominant-baseline:middle;letter-spacing:.01em;paint-order:stroke;stroke:rgba(0,0,0,.55);stroke-width:2.4px;pointer-events:none}
        .aisle-clickable{cursor:pointer}
        .aisle-clickable .aisle-rectshape{transition:filter .15s}
        .aisle-clickable:hover .aisle-rectshape{filter:brightness(1.2)}
        .zone-shape{stroke:rgba(255,255,255,.08);stroke-width:2}
        .zone-label{fill:#14310a;font-size:26px;font-weight:800;text-anchor:middle;dominant-baseline:middle}
        .zone-label-staff{fill:#6b7280;font-size:24px;letter-spacing:.12em}
        .aisle-hl{fill:rgba(61,142,255,.18);stroke:#3d8eff;stroke-width:5;filter:url(#sm-glow)}
        .sm-selected .aisle-rectshape{stroke:#ffffff;stroke-width:3}
      </style>
      <rect class="sm-bg" x="0" y="0" width="${VIEW_W}" height="${VIEW_H}"/>
      <rect class="sm-hall" x="${HALL.x}" y="${HALL.y}" width="${HALL.w}" height="${HALL.h}" rx="20"/>
      ${zones}
      ${sections}
      ${aisles}
      <rect class="aisle-hl" x="0" y="0" width="0" height="0" rx="8" style="display:none" data-role="highlight"/>
    </svg>`;
  }

  /* ---- Montér kortet i en container -------------------------- */
  function mount(container, opts) {
    opts = opts || {};
    container.innerHTML = svgMarkup({ clickable: !!opts.clickable });
    const svg = container.querySelector('svg');
    const hl = svg.querySelector('[data-role="highlight"]');

    function highlight(id) {
      const a = byId(id);
      if (!a) { clearHighlight(); return; }
      hl.setAttribute('x', a.x - 7); hl.setAttribute('y', a.y - 7);
      hl.setAttribute('width', a.w + 14); hl.setAttribute('height', a.h + 14);
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
    VIEW_W, VIEW_H, COL, AISLES: STORE_AISLES, byId, lookup, svgMarkup, mount, PLACEHOLDER_SHELF
  };
})(typeof window !== 'undefined' ? window : this);
