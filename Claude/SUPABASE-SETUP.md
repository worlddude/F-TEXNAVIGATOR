# Supabase sikkerhed & skalering — opsætning

Alt herunder køres i **Supabase Dashboard → SQL Editor** (medmindre andet står).
Rækkefølgen er vigtig: **kør trin 1–3 først, slå først RLS til i trin 4 til sidst**,
ellers kan add-appen ikke skrive imens.

---

## 1. Migration: nye kolonner + `updated_at`

Minimal og begrundet:

- `brand` — add-appen indsamler allerede brand (fra OpenFoodFacts), men kolonnen
  mangler, så værdien blev smidt væk. Koden sender den automatisk med, når
  kolonnen findes.
- `updated_at` — så I kan se hvornår en placering sidst blev rettet
  (`created_at` ændrer sig ikke ved upsert). Vedligeholdes af en trigger.
- Bevidst udeladt: pris (ændrer sig konstant), lagerstatus (kræver integration),
  thumbnail-kolonne (se anbefalinger i oversigten).

```sql
alter table public.items add column if not exists brand text;
alter table public.items add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();
```

Valgfrit (synonymer til søgning — kun hvis I får brug for det):

```sql
-- alter table public.items add column if not exists search_terms text;
```

## 2. Indekser til søgning og sortering

Appen søger nu server-side med `ilike '%ord%'` og sorterer på (category, name).
`pg_trgm`-GIN-indekser gør substring-søgning hurtig; b-tree dækker sorteringen.

```sql
create extension if not exists pg_trgm;

create index if not exists items_name_trgm     on public.items using gin (name gin_trgm_ops);
create index if not exists items_category_trgm on public.items using gin (category gin_trgm_ops);
create index if not exists items_category_name on public.items (category, name);
create index if not exists items_created_at    on public.items (created_at desc);

-- barcode skal være unik (kræves også af upsert onConflict:'barcode').
-- Springes over hvis den allerede er primary key / unik:
-- alter table public.items add constraint items_barcode_key unique (barcode);
```

## 3. Datarydning: gamle base64-billeder i `image_url`

Den gamle add-app gemte hele billedet som base64-tekst direkte i
`image_url`-kolonnen (potentielt flere MB pr. række — det gjorde liste-visningen
tung). Det er rettet i koden (billeder uploades nu til `item_images`-bucketten),
men eksisterende rækker kan stadig have det. Find dem:

```sql
select barcode, name, length(image_url) as bytes
from public.items
where image_url like 'data:%'
order by bytes desc;
```

Nulstil dem (og tag evt. nye fotos med add-appen bagefter):

```sql
update public.items set image_url = null where image_url like 'data:%';
```

## 4. RLS på `items` (kør til sidst!)

**Risikoen i klartekst:** anon-nøglen ligger i HTML'en og er offentlig — det er
den designet til. Men uden Row Level Security giver den fuld adgang: hvem som
helst der åbner udviklerværktøjerne kan **læse, overskrive og slette hele
varetabellen** med ét fetch-kald. Med RLS + policies herunder kan anon-nøglen
kun læse; kun brugere der er logget ind kan skrive.

```sql
alter table public.items enable row level security;

-- Alle (appen) må læse
create policy "public read items"
  on public.items for select
  to anon, authenticated
  using (true);

-- Kun indloggede (admin i add-appen) må skrive
create policy "authenticated insert items"
  on public.items for insert
  to authenticated
  with check (true);

create policy "authenticated update items"
  on public.items for update
  to authenticated
  using (true) with check (true);

create policy "authenticated delete items"
  on public.items for delete
  to authenticated
  using (true);
```

**Storage skal også låses** (ellers kan anon stadig uploade/overskrive billeder).
Kør i SQL Editor — policies på `storage.objects`:

```sql
-- Fjern evt. eksisterende åbne skrive-policies for bucketten først:
-- (se dem under Storage → Policies i dashboardet)

create policy "public read item images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'item_images');

create policy "authenticated upload item images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'item_images');

create policy "authenticated update item images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'item_images');
```

### Klik-guide i dashboardet

1. **Authentication → Users → Add user** → opret admin-brugeren
   (e-mail + adgangskode). Slå "Auto Confirm User" til.
2. **SQL Editor** → kør trin 1–3, derefter trin 4.
3. **Table Editor → items** → tjek at skjoldet/"RLS enabled" vises.

### Hvad ændrer sig i add-appen?

**Ingenting i koden — det er allerede forberedt.** Første gang Supabase afviser
en skrivning med en RLS-fejl, viser add-appen automatisk en login-boks
("Log ind som admin"). Efter login gemmes sessionen i browseren, og der skal
ikke logges ind igen på den enhed. Hoved-appen (Locator) er ren læsning og
påvirkes slet ikke.

---

## 5. Gemini-nøglen: eksponering + Edge Function-proxy

**Eksponering:** `Claude/index.html` indeholder en rigtig Google Gemini-nøgle.
Siden sendes til browseren og repoet ligger på GitHub — nøglen er altså
offentlig, og enhver kan bruge den og brænde jeres kvote/regning af.

**Gør følgende:**

1. **Rotér nøglen nu**: [Google AI Studio](https://aistudio.google.com/app/apikey)
   → slet den gamle nøgle, opret en ny. Sæt den IKKE ind i HTML'en igen.
2. Installer Supabase CLI og deploy proxy-funktionen herunder:

```bash
supabase functions new itemgpt
# indsæt koden herunder i supabase/functions/itemgpt/index.ts
supabase secrets set GEMINI_API_KEY=DIN_NYE_NØGLE
supabase functions deploy itemgpt
```

`supabase/functions/itemgpt/index.ts`:

```ts
// Supabase Edge Function: ItemGPT-proxy.
// Klienten sender { query, catalog } — nøglen forlader aldrig serveren.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  try {
    const { query, catalog } = await req.json();
    if (!query || !Array.isArray(catalog)) {
      return new Response(JSON.stringify({ error: 'query og catalog er påkrævet' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Begræns payload også server-side
    const items = catalog.slice(0, 300).map((i: any) => ({
      barcode: String(i.barcode ?? ''), name: String(i.name ?? ''), category: String(i.category ?? ''),
    }));

    const prompt = `Du er en indkøbsassistent. Her er et udvalg af butikkens varekatalog: ${JSON.stringify(items)}. Brugeren spørger: "${String(query).slice(0, 300)}". Find de varer der passer bedst til brugerens ønske (tænk på synonymer, sprog og behov). Returner KUN et JSON array med stregkoderne på de matchende varer. Hvis intet matcher, returner []. Ingen forklaring, kun JSON.`;

    const key = Deno.env.get('GEMINI_API_KEY');
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    );

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err.error?.message ?? 'Gemini-fejl' }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    let barcodes: string[] = [];
    try { barcodes = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch (_) { /* [] */ }
    if (!Array.isArray(barcodes)) barcodes = [];

    return new Response(JSON.stringify({ barcodes: barcodes.map(String) }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
```

3. Skift klienten om i `Claude/index.html` (øverst i scriptet):

```js
const GEMINI_PROXY_URL = SB_URL + 'functions/v1/itemgpt';
const GEMINI_KEY = ''; // slet den gamle nøgle helt
```

Klientkoden vælger automatisk proxyen, når `GEMINI_PROXY_URL` er sat.

---

## 6. ItemGPT ved 2000+ varer (allerede delvist løst)

Før sendte appen **hele kataloget** til Gemini ved hver søgning. Nu:

1. Brugerens søgeord token-matches server-side (`ilike` på name/category).
2. Payloaden er hårdt begrænset til 300 varer (`GPT_MAX`).
3. Resultater slås op i databasen med `in (barcodes)` — intet krav om at hele
   kataloget er indlæst i appen.

Næste skridt, hvis der bliver behov for ægte semantisk søgning ("noget til
morgenmad" skal finde havregryn): Supabase har `pgvector` indbygget — generér
embeddings pr. vare (fx ved insert via en Edge Function) og lad ItemGPT-funktionen
lave et vektor-opslag i stedet for at sende et katalog med. Det skalerer til
titusinder af varer med konstant payload.
