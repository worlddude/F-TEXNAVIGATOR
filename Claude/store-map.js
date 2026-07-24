/*  ============================================================
 *  STORE-MAP  —  delt butikskort for Locator + ItemADD
 *  ------------------------------------------------------------
 *  Kortet = et rigtigt luftfoto af butikken (BG_IMAGE) med
 *  klikbare, gennemsigtige "reol-felter" lagt ovenpå hylder,
 *  frysere og køleskabe. Personale-områder gøres mørke.
 *
 *  Bruges af både hoved-appen (index.html) og add-appen (add/index.html).
 *
 *  >>> VIGTIGT — BAGGRUNDSBILLEDET <<<
 *  Læg dit luftfoto i Supabase 'Ailes'-bucket'en (som de andre
 *  billeder) og sæt den offentlige URL i BG_IMAGE herunder.
 *  Indtil da vises reol-felterne på en mørk baggrund.
 *
 *  >>> SÅDAN FLYTTER DU ET REOL-FELT <<<
 *  Ret x/y/w/h i STORE_AISLES. Koordinaterne er i et 1000×560-net
 *  der ligger PRÆCIST ovenpå billedet (0,0 = øverste venstre hjørne
 *  af billedet, 1000,560 = nederste højre). Så x:500 = midt på billedet.
 *  ============================================================ */
(function (global) {
  'use strict';

  // Koordinat-nettet = luftfotoets pixels (1672×941), så x/y kan aflæses
  // direkte på billedet.
  const VIEW_W = 1672, VIEW_H = 941;

  // Luftfotoet ligger i Claude/-mappen sammen med denne fil. Stien regnes ud
  // fra scriptets egen URL, så den virker fra både index.html og add/index.html.
  const SCRIPT_BASE = (function () {
    try {
      const s = document.currentScript && document.currentScript.src;
      return s ? s.slice(0, s.lastIndexOf('/') + 1) : '';
    } catch (e) { return ''; }
  })();
  const BG_IMAGE = SCRIPT_BASE + 'b1f8af4f-dbb6-46b5-b5d1-4454b6f16a02.png';

  const PLACEHOLDER_SHELF = 'https://lpcygniycyffeswzrnms.supabase.co/storage/v1/object/public/Ailes/7ffd5ea6-e742-41e6-9ddf-edce279185c5.png';

  // Farver pr. sektion (kun til at kende reol-felterne fra hinanden)
  const COL = {
    koel:  '#5aa9ff',   // køl
    vin:   '#ff9d52',   // vin & alkohol
    kolo:  '#ff6ad5',   // kolo / ikke-kølet
    frost: '#7b7bff',   // frost
    green: '#5fd36a',   // frugt & grønt / front
  };

  /* ---- REOL-FELTER (klikbare, lagt oven på hylderne i fotoet) ----
   * Koordinater i 1672×941-nettet (= fotoets pixels).
   * Hver fysisk reol-række har TO sider — de er tegnet som to halvdele
   * side om side (fx bleer|asiatisk = venstre og højre side af samme reol). */
  const STORE_AISLES = [
    /* Vin & alkohol (øverst) */
    { id: 'vin_vaeg', name: 'Vin (væg)',      short: 'Vin (væg)', x: 820, y: 45, w: 140, h: 50, fill: COL.vin },
    { id: 'vin',      name: 'Vin & spiritus', short: 'Vin & spiritus', x: 821, y: 100, w: 133, h: 85, fill: COL.vin },

    /* Køl øverst: æg, pålæg, ost, mejeri */
    { id: 'koel_aeg',    name: 'Køl: æg & pålæg', short: 'Æg & pålæg', x: 990, y: 48, w: 200, h: 32, fill: COL.koel },
    { id: 'ost',         name: 'Ost (osteby)',    short: 'Ost',       x: 995, y: 92, w: 150, h: 42, fill: COL.koel },
    { id: 'tilbud_koel', name: 'Tilbudskasse',    short: 'Tilbud',    x: 1150, y: 92, w: 40, h: 42, fill: COL.koel },
    { id: 'mejeri',      name: 'Køl: mælk, smør & snacks', short: 'Mælk & smør', x: 1206, y: 52, w: 28, h: 135, fill: COL.koel },

    /* Kolo midterblok — 4 reoler à 2 sider (venstre|højre) */
    { id: 'bleer',      name: 'Bleer & babymad', short: 'Bleer/baby', x: 690, y: 200, w: 30, h: 278, fill: COL.kolo },
    { id: 'asiatisk',   name: 'Asiatisk',        short: 'Asiatisk',  x: 720, y: 200, w: 30, h: 278, fill: COL.kolo },
    { id: 'slik1',      name: 'Slik (venstre side)', short: 'Slik',  x: 764, y: 200, w: 30, h: 278, fill: COL.kolo },
    { id: 'slik2',      name: 'Slik (højre side)',   short: 'Slik',  x: 794, y: 200, w: 30, h: 278, fill: COL.kolo },
    { id: 'broed',      name: 'Brød',            short: 'Brød',      x: 838, y: 200, w: 30, h: 278, fill: COL.kolo },
    { id: 'krydderier', name: 'Krydderier',      short: 'Krydderi',  x: 868, y: 200, w: 30, h: 278, fill: COL.kolo },
    { id: 'kiks',       name: 'Kiks & kager',    short: 'Kiks',      x: 912, y: 200, w: 28, h: 278, fill: COL.kolo },
    { id: 'saft',       name: 'Saft & juice',    short: 'Saft',      x: 940, y: 200, w: 28, h: 278, fill: COL.kolo },

    /* Frost (mørkeblå): fryse-rækker */
    { id: 'tilbud_frost1', name: 'Tilbudskasse (frost)', short: 'Tilbud', x: 970, y: 205, w: 16, h: 270, fill: COL.frost },
    { id: 'frost_kylling', name: 'Frost: kylling & kød', short: 'Kylling & kød', x: 988, y: 205, w: 196, h: 42, fill: COL.frost },
    { id: 'frost_pommes',  name: 'Frost: pommes & bær',  short: 'Pommes & bær',  x: 988, y: 258, w: 196, h: 42, fill: COL.frost },
    { id: 'frost_is',      name: 'Frost: is & supper',   short: 'Is & supper',   x: 988, y: 311, w: 196, h: 42, fill: COL.frost },
    { id: 'frost_pizza',   name: 'Frost: pizza & færdigret', short: 'Pizza & færdigret', x: 988, y: 372, w: 196, h: 42, fill: COL.frost },
    { id: 'frost_broed',   name: 'Frost: brød, boller & is', short: 'Brød & is', x: 988, y: 425, w: 196, h: 42, fill: COL.frost },
    { id: 'tilbud_frost2', name: 'Tilbudskasse (frost)', short: 'Tilbud', x: 1188, y: 205, w: 24, h: 150, fill: COL.frost },

    /* Fisk */
    { id: 'koel_fisk',  name: 'Køl: fisk',  short: 'Fisk (køl)',  x: 985, y: 488, w: 105, h: 48, fill: COL.koel },
    { id: 'frost_fisk', name: 'Frost: fisk', short: 'Fisk (frost)', x: 1098, y: 488, w: 95, h: 48, fill: COL.frost },

    /* Kolo nederste blok — 5 reoler à 2 sider + øl */
    { id: 'hundefoder',  name: 'Hundefoder', short: 'Hund',     x: 616, y: 578, w: 18, h: 118, fill: COL.kolo },
    { id: 'kattefoder',  name: 'Kattefoder', short: 'Kat',      x: 634, y: 578, w: 18, h: 118, fill: COL.kolo },
    { id: 'kemi',        name: 'Kemi',       short: 'Kemi',     x: 658, y: 578, w: 18, h: 118, fill: COL.kolo },
    { id: 'opvask',      name: 'Opvask',     short: 'Opvask',   x: 676, y: 578, w: 18, h: 118, fill: COL.kolo },
    { id: 'tandboerste', name: 'Tandbørster & poser', short: 'Tandbørste', x: 700, y: 578, w: 18, h: 118, fill: COL.kolo },
    { id: 'hygiejne',    name: 'Bind & hygiejne', short: 'Hygiejne', x: 718, y: 578, w: 18, h: 118, fill: COL.kolo },
    { id: 'chips1',      name: 'Chips (venstre side)', short: 'Chips', x: 742, y: 578, w: 18, h: 118, fill: COL.kolo, photo: PLACEHOLDER_SHELF, shelfH: { t: 12, l: 1.5, w: 27, h: 77 } },
    { id: 'chips2',      name: 'Chips (højre side)', short: 'Chips', x: 760, y: 578, w: 18, h: 118, fill: COL.kolo },
    { id: 'sodavand1',   name: 'Sodavand (venstre side)', short: 'Sodavand', x: 784, y: 578, w: 18, h: 118, fill: COL.kolo },
    { id: 'sodavand2',   name: 'Sodavand (højre side)', short: 'Sodavand', x: 802, y: 578, w: 18, h: 118, fill: COL.kolo },
    { id: 'oel',         name: 'Øl', short: 'Øl', x: 826, y: 578, w: 26, h: 118, fill: COL.kolo },

    /* Nederste strimler */
    { id: 'koel_drikke',   name: 'Køl: drikkevarer', short: 'Drikkevarer', x: 862, y: 652, w: 92, h: 24, fill: COL.koel },
    { id: 'toiletpapir',   name: 'Toiletpapir & køkkenruller', short: 'Toiletpapir', x: 616, y: 712, w: 88, h: 22, fill: COL.kolo },
    { id: 'koel_sodavand', name: 'Køl: sodavand & alkohol', short: 'Sodavand & alk.', x: 708, y: 712, w: 124, h: 22, fill: COL.koel },
    { id: 'halvliter',     name: '½L sodavand', short: '½L sodavand', x: 836, y: 712, w: 80, h: 22, fill: COL.kolo },
  ];

  /* ---- Personale-områder (mørkt overlay oven på fotoet) ------ */
  const STAFF = [
    { name: 'Kun personale', x: 1237, y: 25, w: 435, h: 675, cx: 1455, cy: 360 },  // lager/baglokaler (højre)
    { name: 'Kun personale', x: 425, y: 697, w: 550, h: 244, cx: 700, cy: 815 },   // kontorer/kantine (bund)
    { name: 'Kun personale', x: 975, y: 690, w: 697, h: 251, cx: 1320, cy: 815 },  // varegård (nederst til højre)
  ];

  let bgImage = BG_IMAGE;

  // Udskift reol-listen under kørsel (bruges når kortet er redigeret i
  // add-appens kort-editor og gemt i Supabase-tabellen map_config).
  // Muterer arrayet i stedet for at erstatte det, så alle referencer følger med.
  function setAisles(list) {
    if (!Array.isArray(list)) return;
    STORE_AISLES.length = 0;
    list.forEach(a => { if (a && a.id) STORE_AISLES.push(a); });
  }

  const byId = id => STORE_AISLES.find(a => a.id === id) || null;

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

  function fontFor(w, h, vertical) {
    const thickness = vertical ? w : h;
    return Math.max(7, Math.min(13, Math.round(thickness * 0.6)));
  }

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
      `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="3" class="aisle-rectshape" style="fill:${a.fill || COL.kolo}"/>` +
      text + `</g>`;
  }

  function staffMarkup(z) {
    return `<g class="staff"><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="6" class="staff-overlay"/>` +
      `<text x="${z.cx}" y="${z.cy}" class="staff-label">${esc(z.name)}</text></g>`;
  }

  function svgMarkup(o) {
    o = o || {};
    const clickable = !!o.clickable;
    const bg = o.bgImage || bgImage;
    // noPhoto: tegn IKKE luftfotoet inde i SVG'en. Et raster-<image> i en SVG
    // bliver rasteriseret i SVG'ens interne opløsning og skaleret => sløret.
    // I stedet lægger mount() et rigtigt <img> bagved, som browseren gen-sampler
    // skarpt fra kilden. Fald tilbage til SVG-billedet hvis noPhoto ikke er sat.
    const noPhoto = !!o.noPhoto;
    const staff = STAFF.map(staffMarkup).join('');
    const aisles = STORE_AISLES.map(a => aisleMarkup(a, clickable)).join('');
    return `<svg class="store-map-svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <filter id="sm-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <style>
        .store-map-svg{display:block;width:100%;height:100%;font-family:'Syne',system-ui,sans-serif}
        .sm-fallback{fill:#0d1016}
        .aisle-rectshape{fill-opacity:.46;stroke:rgba(255,255,255,.6);stroke-width:.8;stroke-opacity:.7}
        .aisle-label{fill:#ffffff;font-weight:800;text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:rgba(0,0,0,.72);stroke-width:2px;pointer-events:none}
        .aisle-clickable{cursor:pointer}
        .aisle-clickable .aisle-rectshape{transition:fill-opacity .15s}
        .aisle-clickable:hover .aisle-rectshape{fill-opacity:.72}
        .staff-overlay{fill:#080b11;opacity:.84}
        .staff-label{fill:#8c95a6;font-size:26px;font-weight:800;letter-spacing:.1em;text-anchor:middle;dominant-baseline:middle}
        .aisle-hl{fill:rgba(61,142,255,.28);stroke:#3d8eff;stroke-width:2.4;filter:url(#sm-glow)}
        .sm-selected .aisle-rectshape{fill-opacity:.82;stroke:#fff;stroke-width:1.6}
      </style>
      ${noPhoto ? '' : `<rect class="sm-fallback" x="0" y="0" width="${VIEW_W}" height="${VIEW_H}"/>
      <image href="${esc(bg)}" xlink:href="${esc(bg)}" x="0" y="0" width="${VIEW_W}" height="${VIEW_H}" preserveAspectRatio="none"/>`}
      ${staff}
      ${aisles}
      <rect class="aisle-hl" x="0" y="0" width="0" height="0" rx="4" style="display:none" data-role="highlight"/>
    </svg>`;
  }

  function mount(container, opts) {
    opts = opts || {};
    const bg = opts.bgImage || bgImage;
    // photoLayer: læg luftfotoet som et rigtigt <img> BAG et gennemsigtigt
    // SVG-overlay, så det forbliver skarpt ved zoom. Bruges KUN i hoved-appen,
    // hvor #map passer nøjagtigt til SVG'ens boks. Add-appen tegner kortet i
    // store, scrollbare beholdere (fx svg width:2600px), hvor et absolut <img>
    // ikke ville passe — der beholder vi det indlejrede SVG-<image>.
    if (opts.photoLayer) {
      if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
      container.innerHTML =
        '<img class="store-map-photo" alt="" draggable="false" src="' + esc(bg) + '" ' +
        'style="position:absolute;inset:0;width:100%;height:100%;object-fit:fill;' +
        'pointer-events:none;user-select:none;-webkit-user-drag:none;background:#0d1016">' +
        svgMarkup({ clickable: !!opts.clickable, bgImage: opts.bgImage, noPhoto: true });
    } else {
      container.innerHTML = svgMarkup({ clickable: !!opts.clickable, bgImage: opts.bgImage });
    }
    const svg = container.querySelector('svg');
    if (opts.photoLayer) svg.style.position = 'relative'; // tegn overlayet ovenpå fotoet
    const hl = svg.querySelector('[data-role="highlight"]');

    function highlight(id) {
      const a = byId(id);
      if (!a) { clearHighlight(); return; }
      hl.setAttribute('x', a.x - 4); hl.setAttribute('y', a.y - 4);
      hl.setAttribute('width', a.w + 8); hl.setAttribute('height', a.h + 8);
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
    VIEW_W, VIEW_H, COL, AISLES: STORE_AISLES, byId, lookup, svgMarkup, mount, setAisles, PLACEHOLDER_SHELF,
    get bgImage() { return bgImage; },
    set bgImage(v) { bgImage = v; },
  };
})(typeof window !== 'undefined' ? window : this);
