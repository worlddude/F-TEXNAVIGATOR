# Butikskort — sådan gør du (trin for trin)

Kortet er nu **tegnet i kode** efter din rigtige butiksplan (ingen billedfil),
så hver reol er en rigtig klikbar firkant med en etikette. Det bor ét sted:
**`Claude/store-map.js`**. Både app'en (`index.html`) og add-app'en
(`add/index.html`) bruger den samme fil, så de er altid enige om reolerne.

Farverne følger legenden på din tegning:

| Farve | Sektion | `fill` |
|-------|---------|--------|
| Lyseblå | Køl (mælk, æg, pålæg, fisk …) | `COL.koel` |
| Fersken | Vin & alkohol | `COL.vin` |
| Pink | "Kolo" — ikke-kølet (slik, bleer, chips …) | `COL.kolo` |
| Mørkeblå | Frost (is, frostvarer …) | `COL.frost` |
| Grøn | Kasser & bager i fronten (ikke reoler) | zone |
| Mørk | Kun personale | zone |

Alt uden for de farvede sektioner er ikke med (din del af butikken) — det kan
tilføjes senere.

---

## Kort-koordinater
Kortet er **2016 bredt × 1080 højt** (samme mål som din tegning, så tal passer
nogenlunde 1:1 med billedet). `x:0` = helt til venstre, `x:2016` = helt til
højre. `y:0` = toppen.

---

## Del 1 · Ret en reol
Alle reoler ligger i listen `STORE_AISLES` i toppen af `store-map.js`.
Hver reol er én linje:

```js
{ id: 'chips1', name: 'Chips', short: 'Chips', x: 907, y: 668, w: 24, h: 132, fill: COL.kolo },
```

| Felt | Betyder |
|------|---------|
| `id` | Kort unik nøgle der gemmes på varen (fx `chips1`, `broed`, `vin`) |
| `name` | Fuldt navn — vises i varekortet og i vælgeren |
| `short` | (valgfri) kortere tekst der vises OVENPÅ reolen på kortet |
| `x`, `y` | Øverste venstre hjørne |
| `w`, `h` | Bredde og højde. Er `h` meget større end `w`, roteres teksten automatisk |
| `fill` | Farve: `COL.koel`, `COL.vin`, `COL.kolo` eller `COL.frost` |

**Sådan flytter/retter du:** åbn `Claude/index.html` i en browser ved siden af,
ret tallene i `store-map.js`, genindlæs siden, gentag til det passer.

**Sektions-baggrunde** (de bløde farvede felter bag reolerne) ligger i listen
`SECTIONS`. **Grøn front + personale-zoner** ligger i `ZONES`.

---

## Del 2 · Tilføj side-foto til en reol (efterhånden)
Du har kun taget foto af chips-reolen indtil videre. Det er fint — reoler virker
på kortet uden foto (de kan vælges og fremhæves, de kan bare ikke "vende om" til
et side-foto endnu). Sådan tilføjer du et foto, når du har taget det:

1. Tag billedet af reolen fra siden.
2. Læg det i Supabase `Ailes`-bucket'en.
3. Tilføj `photo` + `shelfH` til reolens linje:
   ```js
   { id: 'broed', name: 'Brød', x: 1014, y: 250, w: 44, h: 278, fill: COL.kolo,
     photo: 'https://…/Ailes/dit-billede.png',
     shelfH: { t: 15, l: 5, w: 30, h: 70 } },
   ```
   - `photo` = link til side-billedet.
   - `shelfH` = den blå markering *inde på* fotoet, i **procent**: `t`=top,
     `l`=venstre, `w`=bredde, `h`=højde. Juster til den peger på den rigtige hylde.
4. Test: vælg en vare på reolen → kortet zoomer ind → tryk på kortet → det vender
   om og viser dit foto med markeringen.

---

## Del 3 · Hvad brugeren oplever
**Add-app** — når personalet tilføjer en vare: tryk på **"Vælg reol på kort"** →
kortet åbner (træk for at se hele butikken) → tryk på reolen → `id`'et gemmes.
"Sektion / række" er stadig der til fx "A" (valgfrit).

**App** — når personalet finder en vare: vælg/scan en vare → kortet zoomer ind på
den rigtige reol med en lysende ramme → tryk på kortet for side-foto (hvis der er et).

---

## Huskeliste
- [ ] Ret reol-navne/placeringer i `STORE_AISLES` så de matcher butikken præcist
- [ ] Tag side-foto af hver reol og læg i `Ailes`-bucket
- [ ] Tilføj `photo` + `shelfH` til hver reol efterhånden
- [ ] Tilføj de sidste afdelinger (uden for de farvede felter) når I er klar
