# Butikskort — sådan gør du (trin for trin)

Kortet er nu **tegnet i kode** (ingen billedfil), så hver reol er en rigtig
klikbar firkant med en dansk etikette. Det bor ét sted: **`Claude/store-map.js`**.
Både app'en (`index.html`) og add-app'en (`add/index.html`) bruger den samme fil,
så de er altid enige om reolerne.

Du behøver **ikke** lave alle reoler på én gang. Kortet viser præcis de reoler,
der står i listen — tilføj dem efterhånden.

---

## Del 1 · Få kortet til at ligne DIN butik

Alt ligger i toppen af `Claude/store-map.js` i listen `STORE_AISLES`.
Hver reol er én linje:

```js
{ id: 'Chips', name: 'Chips & Snacks', x: 420, y: 190, w: 70, h: 280, fill: '#3d8eff' },
```

| Felt | Betyder | Tip |
|------|---------|-----|
| `id` | Kort nøgle der gemmes på varen | Vælg noget kort og unikt (fx `Chips`, `Vin`, `A3`) — den vises ikke, men skal være ens overalt |
| `name` | Dansk navn på kortet | Det brugeren ser |
| `x`, `y` | Øverste venstre hjørne | Kortet er **1000 bredt × 660 højt**. `x:0` = helt til venstre, `x:1000` = helt til højre |
| `w`, `h` | Bredde og højde | Lodrette reoler (`h` meget større end `w`) får automatisk roteret tekst |
| `fill` | Farve | Valgfri. Fx `#3d8eff` (blå), `#1f7a4d` (grøn) |

**Sådan retter du kortet, så det passer:**
1. Åbn `Claude/store-map.js` i en editor.
2. Ret navnene i `STORE_AISLES` til dine rigtige afdelinger.
3. Flyt/størrelse reolerne ved at ændre `x/y/w/h`. Åbn `Claude/index.html` i en
   browser ved siden af og juster tallene, til det ligner butikken oppefra.
4. Ikke-klikbare ting (indgang, kasser) ligger i listen `ZONES` lige under.

> 💡 Vil du hellere have et **rigtigt/fotorealistisk** kort? Så skal du lave selve
> billedet i fx ChatGPT/Midjourney (det kan jeg ikke tegne) og sende det til mig —
> så lægger jeg de klikbare reoler oven på billedet i stedet. Men det kodede
> SVG-kort er nemmere at rette og klikker helt præcist.

---

## Del 2 · Tilføj reoler efterhånden (den rigtige rækkefølge)

Du sagde selv: du har kun taget billeder af chips-reolen fra siden. Det er helt
fint. Sådan bygger du resten op — **én reol ad gangen**, i den her rækkefølge:

**For hver ny reol:**

1. **Sæt reolen på kortet.** Tilføj en linje i `STORE_AISLES` med et nyt `id` og
   placering (`x/y/w/h`). Nu kan man allerede *vælge* den i add-app'en, og
   varer på den bliver fremhævet på kortet.
2. **Tag billedet af reolen fra siden** (som du gjorde med chips). Læg det i
   Supabase `Ailes`-bucket'en (samme sted som de andre).
3. **Kobl fotoet på reolen.** Tilføj `photo` + `shelfH` til reol-linjen:
   ```js
   { id: 'Vin', name: 'Vin & Spiritus', x: 560, y: 70, w: 240, h: 95,
     photo: 'https://…/Ailes/dit-billede.png',
     shelfH: { t: 15, l: 5, w: 30, h: 70 } },
   ```
   - `photo` = linket til side-billedet.
   - `shelfH` = den blå markering *inde på* fotoet, i **procent**: `t`=top,
     `l`=venstre, `w`=bredde, `h`=højde. Juster til den peger på den rigtige hylde.
4. **Test.** Åbn app'en, vælg en vare på reolen → kortet zoomer til den → tryk på
   kortet → det vender om og viser dit side-foto med markeringen.

> Reoler **uden** `photo` virker fint — de kan vælges og fremhæves på kortet,
> de kan bare ikke "vende om" til et side-foto endnu. Så du kan roligt oprette
> alle reoler først (Del 1) og tage fotos senere.

---

## Del 3 · Hvad brugeren oplever nu

**Add-app (`add/index.html`)** — når personalet tilføjer en vare:
- I stedet for at skrive et hylde-nummer trykker de på **"Vælg reol på kort"**.
- Kortet åbner, de trykker på reolen, og `id`'et gemmes på varen.
- Feltet "Sektion / række" er stadig der til fx "A" / "øverste hylde" (valgfrit).

**App (`index.html`)** — når personalet finder en vare:
- Vælg/scan en vare → kortet zoomer ind på den rigtige reol med en lysende ramme.
- Tryk på kortet → det vender om og viser side-fotoet af reolen (hvis der er et).

---

## Huskeliste
- [ ] Ret afdelingsnavne i `STORE_AISLES` så de passer til butikken
- [ ] Juster `x/y/w/h` så layoutet ligner butikken oppefra
- [ ] Tag side-foto af hver reol og læg i `Ailes`-bucket
- [ ] Tilføj `photo` + `shelfH` til hver reol efterhånden
- [ ] (Senere) fjern de reoler du ikke bruger, fra listen
