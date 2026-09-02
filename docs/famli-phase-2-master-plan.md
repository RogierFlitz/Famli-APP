# Famli Phase 2 — masterplan

Status: audit + roadmap. **Geen implementatie in deze PR.** Niet mergen zonder review.

Bron van waarheid: codebase op `main` na PR #28–#32 (Today-dashboard, persistente packing, Famli Morgen).

Kernbelofte:

> Famli onthoudt wat er speelt, wie iets doet en wat je niet mag vergeten.

Iedere volgende PR moet deze test doorstaan: **neemt dit mentale belasting weg?** Zo nee: niet bouwen.

---

## A. Wat bestaat nu?

### Featurematrix

Legenda bestaat: **ja** / **deels** / **nee**. Productiewaardig: **ja** = live-klaar voor die slice; **deels** = werkt in demo + code, maar kanaal/migratie/OAuth/e-mail ontbreekt; **nee** = stub of afwezig.

| Feature | Bestaat? | E2E? | Persistent? | Mobile? | Notificaties? | Context? | Automatisering? | RLS/security? | Productiewaardig? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vandaag | ja | ja | snapshot | ja | indirect | deels (4 querylagen) | nee | ja | deels |
| Famli Morgen | ja | ja | snapshot + packing | ja | in-app brief | ja (`buildFamilyDayContext`) | cron uurlijks | ja (gefilterde snapshot) | deels |
| Agenda | ja | ja | `events` | ja | in-app event | deels | pull-sync | ja | deels |
| Kinderen / profielen | ja | ja | `children` + life | ja | activity | ja (kind als object) | nee | per-kind access | deels |
| Verblijf / jaaroverzicht | ja | ja | `custody_*` | ja | schedule types | ja | generate occurrences | ja | deels |
| Wissels / overdracht | ja | ja | `handovers.ready_status` | ja | handover channel | ja (Smart Handover) | generate from schema | ja | deels |
| Packing / wat moet mee | ja | ja | `packing_items` | ja | nee | templates + events | suggesties | ja | deels |
| Brengen & halen | deels | toewijzen ja | `dropoff/pickup` op event | ja | nee | ja | signal ontbrekende chauffeur | `edit_calendar` | deels |
| Taken / Regelen | ja | ja | `tasks` | ja | in-app | kind/due | nee | ja | deels |
| Routines / zorg | ja | ja | `tasks` + occurrences | ja | in-app | packing op routine | occurrences genereren | care-caps | deels |
| Child activities (sport) | ja | ja | `child_activities` → 12 wkn events | ja | sport | brengen/halen velden | auto-events | ja | deels |
| Boodschappen | ja | ja* | `shopping_*` | ja | nee | categorie | nee | ja | deels |
| Kosten / verrekenen | ja | ja | expenses/splits | ja | in-app | kind + splits | recurring backend zonder UI | ja | deels |
| School / sport als actie | deels | deels | school + clubs + events | ja | studiedag in urgent | packing-templates | child activity | ja | deels |
| Reizen / vakanties | ja | deels | travel + vacations | ja | types | kind | NL-vakanties “later” | ja | deels |
| Documenten | ja | ja | storage + `documents` | ja | nee | kind/categorie | nee | viewer-filter | deels |
| In-app notificaties | ja | ja | `notifications` | ja | in-app | prefs JSON | 24u-dedup | user-scoped | deels |
| Daily brief | ja | in-app | prefs + notif | ja | in-app | family-day | cron | cron + privacy | deels |
| Weekbrief | nee | — | `weekGlance` hook alleen | — | — | tellingen | — | — | nee |
| Activity feed | ja | ja | `activity_log` | ja | activity channel | samenvattingen | nee | ja | deels |
| Search | ja | ja | snapshot-scan | ja | nee | plat, niet gegroepeerd | nee | doc-filter | deels |
| Quick Add (+) | ja | ja | per actie | ja | sommige acties | groepen Snel/Plannen/Regelen | import-stub | server actions | deels |
| Google / Microsoft / ICS | deels | OAuth+export | connections + feed tokens | settings | nee | busy/full/hidden | stale sync bij agenda | tokens encrypted | deels |
| Onboarding | ja | ja | family/children/schema | ja | geen invite-mail | 7 stappen | geen sport/school stap | ja | deels |
| Rollen / helpers / guest | ja | ja | members + guest tokens | ja | change requests | contact-only | nee | capabilities + RLS | deels |
| Contextberichten | ja | ja | `context_messages` | ja | activity | per resource | nee | ja | deels |
| Verzoeken | ja | ja | `change_requests` | ja | in-app | types + payload | apply on accept | ja | deels |
| Admin | ja | ja | `admin_staff` | desktop | n.v.t. | metadata only | charts 7d | least privilege | deels |
| Homepage | ja | ja | n.v.t. | ja | n.v.t. | uitkomsttaal | n.v.t. | public | ja |
| Contactformulier | nee | nee | — | — | — | — | — | — | nee |
| Product analytics | stub | nee | no-op `trackProductEvent` | — | — | privacy-safe namen | — | geen PII | nee |
| E-mail (product) | deels | reset ja | Supabase Auth | — | prefs ongebruikt | brief-copy klaar | cron geen send | — | deels |
| Cron | 1 job | Morgen-brief | notifications | n.v.t. | in-app | timezone slot | hourly Vercel | `CRON_SECRET` | deels |
| Design system | ja | ja | tokens + `famli-*` | ja | n.v.t. | n.v.t. | n.v.t. | n.v.t. | ja |
| Legal pages | nee | marketingcopy | — | — | — | — | — | — | nee |
| Account verwijderen | nee (disabled) | export ja | export HTML/JSON | ja | — | snapshot | — | privacy-respecting export | deels |
| Algemene chat | nee (bewust) | — | — | — | — | context messages i.p.v. | — | — | n.v.t. |
| Inbox “wat vraagt aandacht” | deels | `urgentActions` **niet gerenderd** | afgeleid | — | bell + fragments | 6 soorten | nee | snapshot | nee als hub |
| Push | prefs only | nee | push=false hardcoded | — | fake verboden | — | — | — | nee |
| Kinderaccount | nee | — | — | — | — | — | — | — | nee |
| Maaltijden | nee | — | — | — | — | — | — | — | nee |
| Stripe / betalen | nee | planvelden | `families.plan` | instellingen copy | — | — | — | — | nee |

\*Boodschappen E2E faalt als migratie `0009` niet is gedraaid (`ShoppingNotActivated`).

### Centrale context-engine

**Bestaat al voor één dag:** `lib/context/family-day.ts` → `buildFamilyDayContext(snapshot, date, now)`.

Gebruikt voor Morgen-UI, een alert-strip op Vandaag, en de in-app brief.

**Nog geen** `buildFamilyContext` / `buildChildContext`. Vandaag berekent dezelfde feiten opnieuw via:

| Laag | Bestand | Wat |
| --- | --- | --- |
| Family day | `lib/context/family-day.ts` | stay, timeline, packing, taken, alerts, ready |
| Smart today | `lib/queries/smart-today.ts` | schedule, packing-strings, weekGlance, badges, tomorrowPreview |
| Vandaag helpers | `lib/queries/vandaag.ts` | child sections, `attentionCount` ← `urgentActions` |
| Kinderen-overzicht | `lib/queries/children-overview.ts` | kindkaarten op Vandaag én Kinderen |
| Packing | `lib/queries/packing.ts` | persistente groepen + suggesties |

Dat is de grootste technische overlap van Phase 2.

---

## B. Wat is al production-ready? (slice)

Klaar genoeg om met echte gezinnen te gebruiken **als** Supabase-migraties + env kloppen:

- Auth: signup, login, logout, wachtwoordreset (Supabase)
- Kind als object + profiel
- Agenda (Famli-events)
- Verblijfsschema → occurrences → wissels
- Smart Handover + persistente packing-checkboxes
- Taken, routines, boodschappen, kosten+verrekenen, documenten
- Verzoeken + guest links (met service role)
- Rollen / contact-only / per-kind access / `applyPrivacy`
- Famli Morgen in de app + timezone-daggrenzen
- Activity feed (menselijke zinnen, geen JSON)
- Admin metadata (geen privé-inhoud)
- Homepage-positionering
- Design system + app-shell + Quick Add

---

## C. Wat is half gebouwd?

- **Vandaag** toont Morgen-engine alleen als toggle/alert; de 3-koloms dashboard is een tweede compositie.
- **Brengen/halen:** toewijzen + signal “Wie brengt?”; geen gevraagd / bevestigd / afgerond.
- **Routines vs child activities vs events:** drie manieren om “elke donderdag hockey” te zetten.
- **Daily brief:** in-app + cron + e-mailvoorkeur; **geen mailprovider**.
- **Notificatieprefs:** e-mail/push UI; delivery alleen in-app.
- **Kalenderkoppeling:** OAuth + ICS-export; geen default two-way; geen “dit event is Katelynn’s hockey”-mapping.
- **Search:** werkt, plat, max 12 hits.
- **Onboarding:** 7 stappen, geen school/sport, geen invite-e-mail, risico op magere Vandaag als gebruiker skip’t.
- **Analytics:** eventnamen bestaan, `trackProductEvent` is no-op.
- **Admin stats:** users/families/onboarding/calendar; geen brief-enabled, week-1/4 retention als productevents.
- **Account:** export ja; verwijderen/verlaten gezin nee.
- **`urgentActions`:** berekend, nergens als inbox getoond (alleen count “Alles geregeld”).

---

## D. Wat ontbreekt?

- Famli Inbox als actiecentrum
- Transport-workflow (REQUESTED/CONFIRMED)
- Weekbrief
- E-mailverzending (brief, invites, contact)
- Push
- Contactformulier + `CONTACT_EMAIL`
- Legal: `/privacy`, `/voorwaarden`, cookies
- Groepssearch
- School/sport templates als eersteklas UX
- Externe agenda → kind-mapping met bevestiging
- Progressive onboarding-suggesties (max 1)
- Kinderaccount
- Maaltijden
- Stripe
- `buildFamilyContext` / `buildChildContext`
- Inbox-parser (“iets onthouden”)

---

## E. Overlappende features (niet dupliceren)

1. **Packing:** `packing_items` (canoniek) + `event.packingList` + `handover.packingList` + routine `packingItems` + `smart-today.packingForDate` strings. Toekomst: engine leest persistent + templates; strings alleen seed/fallback.
2. **Dagbeeld:** family-day vs smart-today vs children-overview vs vandaag.ts.
3. **Herhaling:** `createRoutine` vs `addChildActivity` (12 weken events) vs losse agenda-events.
4. **Aandacht:** `urgentActions` vs Morgen-alerts vs Regelen-tabbladen vs notification bell vs Vandaag change-card.
5. **Reizen:** `travel_plans` vs custody `vacations`.
6. **Quick Add:** “Afspraak” en “Taak” staan in meerdere groepen.
7. **Docs vs code:** `docs/product-strategy.md` §C is **verouderd** (packing read-only, activity UI weg, gereed niet persistent). Dit masterplan vervangt die zwakke-puntenlijst.

---

## F. Top 10 customer-value gaps

Gescoord 0–2 × 8 assen (max 16). Drempel: 0–7 niet bouwen · 8–11 P2 · 12–14 P1 · 15–16 P0.

| # | Gap | Score | Waarom het pijn doet |
| --- | --- | --- | --- |
| 1 | Geen Inbox “wat is niet geregeld?” | **16** | Ouder zoekt nog steeds over Vandaag, Regelen, Agenda, bel |
| 2 | Geen e-mail/push; brief blijft in de app | **16** | Famli herinnert niet als de app dicht is → verliest van WhatsApp |
| 3 | Vandaag herberekent context 4× | **14** | Inconsistent “geregeld”; traag/foutgevoelig |
| 4 | Brengen/halen zonder bevestiging | **15** | “Wie rijdt?” blijft in WhatsApp |
| 5 | Routines niet één waarheid | **14** | Gezin voert hockey elke week opnieuw of dubbel in |
| 6 | Onboarding landt soms mager | **14** | Geen “aha” op dag 1 |
| 7 | School/sport is deels opslag | **13** | Gymtas/formulier niet automatisch actie |
| 8 | Search niet op onderwerp gegroepeerd | **12** | Contextvoordeel onzichtbaar |
| 9 | Geen weekbrief | **13** | Zondagavond-stress blijft |
| 10 | Analytics no-op | **12** | We weten niet of belofte landt |

Niet in top 10 (bewust later): maaltijden, kinderaccount, chat, GPS.

---

## G. Top 5 differentiators (beschermen, niet verdunnen)

1. **Kind + huishouden + verblijf als graaf** — niet een gedeelde kalender.
2. **Vandaag/Morgen als command center** — waar / wat / wie / wat mee / wat nog.
3. **Wissel + packing + overdracht** als één moment (niet drie apps).
4. **Warme co-ouder flows** (verzoeken, guest, rollen) zonder court-OS.
5. **Privacy/RLS/capabilities** als product, niet als bijlage.

---

## H. P0 / P1 / P2 (aangepast na audit)

Afwijking t.o.v. de briefing: packing, handover en Famli Morgen **bestaan al**. Die gaan van “nieuw bouwen” naar **betrouwbaar maken en aansluiten**.

### P0 — mentale last wegnemen deze maand

1. **Context-consumenten unificeren** — Vandaag, Morgen, brief, (toekomstige) Inbox lezen `buildFamilyDayContext`; uitbreiden met `buildAttentionInbox` afgeleid van dezelfde regels. Geen tweede engine.
2. **Famli Inbox** — presentatielaag over bestaande data (`urgentActions` + family-day alerts + open packing + pending requests + unassigned transport + open splits). Categorieën: Nu / Vandaag / Binnenkort / Wacht op iemand / Afgerond (afgerond = verdwenen).
3. **Brengen/halen workflow** — statussen menselijk: Nog regelen → gevraagd → brengt ✓. Hergebruik change requests of minimale velden op event; geen chat.
4. **E-mailinfrastructuur + daily brief send** — privacy-safe counts (copy bestaat). Provider + `CONTACT_EMAIL` + invites.
5. **Onboarding afronden naar volle Vandaag** — minstens één kind + optioneel sport/school-routine zodat dag 1 niet leeg is; progressive prompt max 1.

### P1

6. Routine-templates (School, Sport, Gym, Zwem, Wissel) bovenop bestaande routines/child activities — **één pad**, de ander deprecaten in UX.
7. Weekbrief (zondag) op `weekGlance` + family-day over 7 dagen.
8. Smart signals: conflict “twee locaties 17:00” (nieuw); rest bestaat in family-day — Inbox hergebruikt.
9. Search groeperen (Kind / Agenda / Taken / Docs / Kosten).
10. School/sport → actie (studiedag, gymdag, formulier) via templates + taken.
11. Analytics-provider (privacy-safe events die al benoemd zijn).
12. Activity-feed filters (Kinderen / Planning / Taken / Kosten) — feed bestaat.
13. Legal pages + account leave/delete proces.
14. Externe agenda-suggestie “hoort bij kind/sport” met bevestiging.

### P2

15. “Iets onthouden” parser (AI stelt voor, mens bevestigt).
16. Kinderaccount (read-only subset).
17. Push als infrastructuur er is.
18. Maaltijd → boodschap (geen receptenplatform).
19. Recurring expenses UI.
20. Two-way calendar default.

---

## I. Bewust niet bouwen

Algemene chat, WhatsApp-kloon, GPS, court evidence, ToneMeter, sociale feed, receptenplatform, gamification, autonome AI-planner, family social network.

AI mag later **voorstellen**, nooit verblijf/kosten/rechten zelf wijzigen.

---

## J. Databasewijzigingen (verwacht, per latere PR)

| PR-thema | Schema | Opmerking |
| --- | --- | --- |
| Inbox | **geen** nieuwe tabel | Afleiden |
| Context unificatie | geen | Alleen code |
| Transport workflow | mogelijk `events.transport_status` of change_request type | Alleen als payload ontoereikend is |
| Routines/templates | mogelijk `routine_templates` of JSON op task | Kleiner houden: packing templates bestaan al |
| E-mail | geen | env + provider |
| Weekbrief | prefs JSON `famliWeek` naast `famliMorgen` | Zelfde patroon, geen tabel |
| Agenda-mapping | kleine tabel `event_context_maps` (familie, pattern → childId/club) | P1 |
| Analytics | geen PII-tabellen; eventueel `product_events` counts | of externe tool |
| Contact | `contact_messages` of alleen mail | rate limit server-side |
| Legal | statische routes | geen DB |

Geen destructieve cleanup van dubbele children/packing.

---

## K. Security / privacy impact

- Inbox en briefs **alleen** op `applyPrivacy(snapshot)` + capabilities. Nooit “alle gezinsdata” in e-mail.
- E-mail: tellingen + link, geen kindnamen (Famli Morgen copy bestaat).
- Transport-verzoek: zelfde rechten als `edit_calendar` / change request.
- Guest/oma: Inbox toont alleen zichtbare kinderen/events.
- Admin: geen inbox-inhoud, geen documentbytes.
- Cron: `CRON_SECRET` + service role; documenteren in `.env.example`.
- Contact: `CONTACT_EMAIL` server-only, nooit in client bundle; rate limit.

---

## L. E-mail / notificatie-infrastructuur

Nu:

- In-app: ja, types + prefs + bell + 24u-dedup.
- E-mail: alleen Supabase `resetPasswordForEmail`.
- Push: prefs `push: false`; niet faken.
- Cron: `/api/cron/famli-morgen` hourly, match op uur in profiel-timezone.
- Brief-copy in-app + e-mailtekst zonder namen: `lib/context/family-day.ts`.

Nodig:

1. Provider (Resend of gelijk) + `EMAIL_FROM`.
2. `CRON_SECRET` in Vercel + `.env.example`.
3. Invite-mail met bestaande invite-URL.
4. Bundelregel: geen vijf pings; brief + urgente verzoeken.
5. Weekbrief: zelfde bundelpatroon.
6. Push: later (Web Push of native) — P2.

Categorieën (prefs uitbreiden, niet 10 losse cronjobs): Agenda, Taak, Transport, Overdracht, Packing, School, Kosten, Verzoeken, Daily brief, Week brief.

---

## M. Analyticsplan (privacy-safe)

Bestaande stubs: `tomorrow_viewed`, `packing_item_checked`, `smart_signal_resolved`, `tomorrow_all_ready`, `daily_brief_enabled`.

Toevoegen (geen titels/namen):

`signup_started`, `family_created`, `child_added`, `partner_invited`, `calendar_connected`, `first_event_created`, `first_task_created`, `packing_used`, `handover_completed`, `inbox_opened`, `inbox_item_resolved`, `brief_enabled`, `week_brief_enabled`, `week_1_active`, `week_4_active`.

Implementatie: eerst echte sink (PostHog/self-host of server log table met alleen event name + family hash + dag). Admin dashboard leest aggregaten, geen payloads.

---

## N. Launch-readiness gaps

| Gebied | Gat |
| --- | --- |
| Auth | OK met Supabase; e-mailconfirm projectconfig |
| Account | verwijderen/verlaten ontbreekt; export bestaat |
| Legal | geen privacy/voorwaarden/cookies-routes |
| Contact | geen formulier; `CONTACT_EMAIL` nergens |
| Security | RLS + tests sterk; secrets/OAuth/guest role operationeel |
| Ops | geen error monitoring product-side; cron failure onzichtbaar |
| Migraties | 0001–0018; `docs/production-readiness.md` stopt bij 0004 — **lijst actualiseren** |
| Backups | Supabase project default; documenteren |
| Env | `.env.example` mist `CRON_SECRET`, `CONTACT_EMAIL`, mailprovider |
| Pricing | planvelden; geen Stripe — OK voor launch |

---

## O. Voorgestelde PR-volgorde (klein, één doel)

Niet alles tegelijk. Elke PR: eigen branch `cursor/<naam>-8532`, niet auto-mergen.

| PR | Doel | User value | Hangt af van |
| --- | --- | --- | --- |
| **0 (deze)** | Masterplan-doc | Richting | — |
| **1** | Vandaag leest `buildFamilyDayContext` i.p.v. parallelle packing/schedule-logica waar veilig | Zelfde waarheid op Vandaag en Morgen | — |
| **2** | Famli Inbox (afgeleid, `/regelen` of `/vandaag` sectie, geen mega-pagina) | “Wat is niet geregeld?” in 5 seconden | 1 |
| **3** | Brengen/halen: Ik kan / vraag / bevestig | WhatsApp voor rijden overbodig | 2 |
| **4** | E-mail provider + daily brief send + contactformulier | Famli werkt als de app dicht is | — |
| **5** | Routine-templates + één create-pad | Hockey één keer instellen | 1 |
| **6** | Weekbrief prefs + cron | Zondagavond-overzicht | 4 |
| **7** | Search groepen + activity filters | Onderwerp vinden | — |
| **8** | Onboarding 2.0: volle Vandaag + 1 progressive prompt | Dag-1 waarde | 5 helpt |
| **9** | Analytics sink + admin metrics (brief, retention proxy) | Weten of het landt | 4 |
| **10** | Legal + account leave/delete + production-readiness doc bijwerken | Launch | — |

Smart signals: **niet** als aparte greenfield-PR als Inbox + family-day alerts hetzelfde zijn. Alleen nieuwe regel (dubbele locatie) in PR 2 of 3.

---

## P. Handmatige stappen later (Supabase / Vercel / OAuth)

- Supabase: migraties 0001–0018 in volgorde; bucket `family-documents`; Auth site URL; eventueel e-mailconfirm.
- Vercel: `NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, later `CONTACT_EMAIL`, `EMAIL_FROM`, provider keys.
- Cron: Vercel Hobby/Pro cron voor `/api/cron/famli-morgen` (staat in `vercel.json`); weekbrief-pad later.
- OAuth: Google/Microsoft redirect URLs; `CALENDAR_TOKEN_ENCRYPTION_KEY`.
- Admin: `ADMIN_BOOTSTRAP_SECRET` of eerste `admin_staff` row.
- DNS/Auth: custom domain = Site URL updaten.
- Monitoring: Sentry of gelijk (niet in app nu).

Geen Stripe tot pricing-besluit.

---

## Retention (waarom openen ze Famli?)

| Horizon | Waarom |
| --- | --- |
| Vanavond | Morgen-brief: waar zijn de kids, wie rijdt, wat mee |
| Morgen | Inbox + Vandaag: open packing/transport verdwijnt als het geregeld is |
| Volgende week | Weekbrief + routines die zichzelf voorbereiden |
| Zes maanden | Kindprofiel, schema, mappings, packing-gewoontes — opnieuw uitleggen is duurder dan blijven |

Niet: “er zijn veel schermen.”

---

## Pricing (onderzoek, niet bouwen)

**Free moet Famli voelbaar maken:** Vandaag, Morgen in de app, packing, wissels, 1–2 huishoudens, taken, boodschappen, basisrechten.

**Premium (later):** e-mail/weekbrief, extra helpers, documentruimte, agenda-mapping, extra automatisering.

Gratis mag niet leeg aanvoelen. Brief in de app blijft free; e-mailbrief is een kandidaat-premium.

---

## North star voor reviewers

> Kan Famli dit voor het gezin onthouden, verbinden of voorbereiden, zodat de gebruiker het niet zelf hoeft te doen?

Zo nee: het hoort waarschijnlijk niet in Phase 2.
