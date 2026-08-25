# Famli

Family management-app. Kernbelofte: **Samen ouders. Alles geregeld.**

De productcode staat in [`Famli`](./Famli) en raakt Flitz OS niet.

## Design system

Merkidentiteit leeft centraal in `lib/brand/tokens.ts` (kleuren, typografie, spacing, radius, shadows, copy) en `app/globals.css` (CSS-variabelen + componentklassen). Logo en app-icon: `components/brand/logo.tsx`. Typografie: Open Runde (afgeronde Inter) in `app/fonts/`.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase Auth, Postgres en Storage (productie)
- In-memory repository met realistische demo-data (lokaal, zelfde interface)

## Starten

```bash
cd Famli
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Zonder Supabase-credentials werkt Famli met een lokale repository. Op `/login` kun je inloggen als **Emma (mama)** of **Rogier (papa)** om de UX met realistische data te beoordelen. Nieuwe accounts via `/signup` starten de onboarding.

## Supabase koppelen

1. Maak een Supabase-project.
2. Voer `supabase/migrations/0001_init.sql` uit in de SQL editor (schema, RLS, storage bucket `family-documents`).
3. Kopieer `.env.example` naar `.env.local` en vul in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

4. Auth: e-mail + wachtwoord inschakelen. Nieuwe users krijgen via trigger een `profiles`-rij.
5. Storage: bucket `family-documents` (de migration maakt die aan). Padconvention: `{family_id}/...`

Daarna schakelt `getRepository()` automatisch over van de geheugenstore naar Supabase. Feature-code blijft hetzelfde.

### Nog niet in deze omgeving in te stellen

- Google Calendar OAuth client
- Microsoft Graph (Outlook) OAuth client
- Apple ICS publicatie
- Stripe-prijzen / webhook

De kalenderproviders zitten modulair in `lib/calendar/providers` maar roepen geen nep-API’s aan.

## Architectuur

- `lib/brand` — naam, slogans, kleuren, type, chrome
- `lib/domain` — types, labels, plannen (FREE / PLUS / FAMILY)
- `lib/data` — `FamilyRepository`; memory + Supabase
- `lib/custody` — 2-2-3, week-op-week-af, vaste dagen, custom
- `lib/costs` — saldo (“jij krijgt” / “jij moet betalen”)
- `lib/ai/query-context.ts` — serialiseerbare context voor een latere assistant, geen chatbot
- `app/(app)` — Vandaag, Agenda, Regelen, Kosten, Kinderen
- RLS: iedere query is scoped op `family_id` via `is_family_member()`

Wijzigingen aan planning en kosten worden gelogd. Financiële rijen worden niet hard gedelete (`voided_at`).
