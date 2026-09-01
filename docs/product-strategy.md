# Famli — concurrentie, CVP en productstrategie

Status: onderzoek + audit. Geen betaalmodel in deze ronde. Niet mergen naar main zonder review.

Kernbelofte (uitkomst, niet featurelijst):

> Famli onthoudt wat er speelt, wie iets doet en wat je niet mag vergeten.

Homepage-lijn (al live in `components/marketing/hero-section.tsx`):

> Je hoeft thuis niet meer alles zelf te onthouden.

---

## A. Concurrentiematrix

Scores: **0** ontbreekt · **1** basic · **2** goed · **3** sterk / onderscheidend.

Indirecte kolom = typische stapel Google/Apple Calendar + WhatsApp + Todoist + AnyList/Bring + Splitwise + Notes.

| Capability | Famli | Cozi | FamilyWall | TimeTree | OFW | AppClose | 2houses | TalkingParents | Indirect |
|---|---|---|---|---|---|---|---|---|---|
| Gedeelde agenda | 2 | 2 | 2 | **3** | 2 | 2 | 2 | 1 | 2 |
| Weekplanning / overzicht | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 0 | 1 |
| Kind als object (profiel) | **3** | 1 | 1 | 0 | 2 | 1 | **3** | 0 | 0 |
| School → actie | 2 | 1 | 1 | 0 | 1 | 1 | 2 | 0 | 0 |
| Sport + meenemen | 2 | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 0 |
| Taken / regelen | 2 | 2 | 2 | 1 | 1 | 2 | 2 | 0 | 2 |
| Boodschappen | 2 | **3** | 2 | 0 | 0 | 0 | 0 | 0 | **3** |
| Kosten + verrekenen | 2 | 0 | 2 | 0 | **3** | **3** | **3** | 1 | **3** |
| Documenten met context | 2 | 0 | 2 | 0 | **3** | 2 | 2 | 2 | 1 |
| Co-ouderschap (warm) | **3** | 1 | 1 | 0 | 1 | 2 | 2 | 0 | 0 |
| Verblijf / wissels | **3** | 0 | 0 | 0 | **3** | 2 | **3** | 0 | 0 |
| Brengen / halen | **3** | 1 | 1 | 1 | 1 | 2 | 2 | 0 | 0 |
| Overdracht checklist | **3** | 0 | 0 | 0 | 1 | 1 | 2 | 0 | 0 |
| Verzoeken / workflows | 2 | 0 | 0 | 0 | **3** | **3** | 2 | 1 | 0 |
| Rollen / helpers | 2 | 1 | **3** | 1 | **3** | 2 | 2 | 1 | 0 |
| Search | 2 | 1 | 1 | 2 | 1 | 1 | 1 | 0 | 2 |
| Notificaties (betrouwbaar) | 1 | 2 | 2 | 2 | **3** | 2 | 2 | **3** | 2 |
| Automatisering / routines | 2 | 1 | 2 | 1 | 1 | 1 | 2 | 0 | 1 |
| Maaltijden | 0 | **3** | **3** | 0 | 0 | 0 | 0 | 0 | 1 |
| Gerechtelijke audittrail | 0 | 0 | 0 | 0 | **3** | 2 | 1 | **3** | 0 |
| Privacy / RLS | **3** | 1 | 1 | 1 | **3** | 2 | 2 | **3** | 1 |
| Mobile UX | 2 | 2 | 2 | **3** | 1 | 2 | 2 | 1 | **3** |
| Mentale belasting (Today) | **3** | 1 | 1 | 1 | 1 | 1 | 2 | 0 | 0 |
| Context koppelen | **3** | 1 | 1 | 1 | 2 | 2 | 2 | 0 | 0 |

### Scoregroepen (gemiddelde, 0–3)

| Groep | Famli | Cozi | FamilyWall | TimeTree | OFW | AppClose | 2houses | TalkingParents | Indirect |
|---|---|---|---|---|---|---|---|---|---|
| A Dagelijkse planning | 2.4 | 2.0 | 2.0 | 2.2 | 1.2 | 1.8 | 1.8 | 0.4 | 1.6 |
| B Co-ouderschap | **2.8** | 0.4 | 0.4 | 0.2 | **2.6** | 2.4 | 2.4 | 1.6 | 0.2 |
| C Mentale belasting | **2.8** | 1.2 | 1.2 | 1.0 | 1.0 | 1.4 | 1.8 | 0.2 | 0.4 |
| D Automatisering | 1.8 | 1.2 | 1.6 | 1.2 | 1.0 | 1.2 | 1.6 | 0.4 | 1.0 |
| E Samenwerking | 2.2 | 1.2 | 1.6 | 1.4 | 2.4 | 2.4 | 2.0 | 1.2 | 1.0 |
| F Informatiecontext | **2.8** | 0.8 | 1.2 | 0.6 | 2.0 | 1.6 | 2.2 | 0.4 | 0.2 |
| G Privacy / rechten | **2.8** | 1.0 | 1.4 | 1.0 | **3.0** | 2.2 | 2.0 | **3.0** | 1.0 |
| H Mobiele UX | 2.2 | 2.2 | 2.2 | **2.8** | 1.2 | 2.2 | 2.0 | 1.2 | **2.8** |
| I Retention | 1.6 | 2.2 | 1.8 | 2.0 | 2.4 | 2.0 | 1.8 | 2.2 | 2.4 |
| J Commerciële positie | 1.4 | 2.0 | 1.8 | 2.0 | 2.6 | 2.2 | 1.8 | 2.4 | 2.2 |

Leeswijzer: Famli wint al op **context, Today, wissels, overdracht**. Famli verliest op **retention-kanalen (push/e-mail), native mobile polish, gerechtelijke records, maaltijden**. Dat is bewust — zie “niet bouwen”.

### Concurrenten in één zin

| Speler | Kernbelofte | Doelgroep | Prijs (2026, indicatief) | Switching cost |
|---|---|---|---|---|
| Cozi | Eén familiekalender + lijsten + recepten | Intacte gezinnen VS | Free (30 dagen) · Gold ~$39/jr · Max ~$80/jr | Recepten + gewoontes, maar product voelt gedateerd |
| FamilyWall | Familiehub + locator + maaltijd + budget | Visuele gezinnen | Premium ~$45/jr | Foto’s/locator; feature-bloat |
| TimeTree | Gedeelde agenda + event-chat | Stellen / kleine groepen | Premium ~$27–45/jr | Meerdere kalenders, weinig OS |
| Maple | Chores + lists + “family OS” | Gezinnen met kinderen | Maple+ ~$40/jr | Routines/chores |
| OurFamilyWizard | Court-ready co-parenting | High-conflict, VS | ~$110–300 **per ouder**/jr | Juridisch dossier |
| AppClose | Lichtere co-parenting | Budget / dagelijks | ~$8/mnd per ouder (was jaren gratis) | Chat + expenses |
| 2houses | Twee huishoudens, één hub | Coöperatief co-ouderschap EU | ~$99–170/jr per gezin | Info-bank + saldo |
| TalkingParents | Onveranderbare communicatie | Litigation | $7–32/mnd per ouder | Call/chat records |
| Google/Apple/Outlook | Kalender die “gewoon werkt” | Iedereen | Gratis | Systeemdefault |
| WhatsApp | “Even appen” | Iedereen | Gratis | Sociale default |
| Todoist / MS To Do | Persoonlijke taken | Individuen | Pro ~$4–7/mnd | Habit |
| AnyList / Bring! | Winkelwagen | Huishoudens | AnyList household $15/jr | Lijstgewoonte |
| Splitwise | Wie is wat schuldig | Groepen / exen | Pro ~$40/jr | Saldo-historie |
| Notion | Zelf een wiki bouwen | Power users | Per seat | Templates, geen operatie |

Famli’s gat: **warme co-ouder OS voor NL/EU**, niet court-app, niet Amerikaanse family calendar met ads.

---

## B. Top 10 sterke punten van Famli (nu)

1. **Kind als kernobject** — profiel, school, sport, nodig, kosten, documenten, agenda in één relatie.
2. **Vandaag als operationeel beeld** — verblijf, nu/straks, brengen/halen, packing, regelen, morgen, weekglance (`lib/queries/smart-today.ts`).
3. **Verblijfsschema + wissels** — 2-2-3, week-om-week, vaste dagen; handovers gegenereerd (`lib/custody/generate.ts`).
4. **Smart handover** — packing, zorg, needed, updates in één overdrachtsmoment.
5. **Brengen/halen gekoppeld aan afspraak** — `dropoffMemberId` / `pickupMemberId`, zichtbaar op Today en agenda.
6. **Verzoeken** — wissel, extra dag, ophalen, vakantie, taak overnemen; guest links voor opa/oppas.
7. **Rechtenmodel** — owner/ouder/guardian/viewer, presets practical/involved, contact-only, per-kind overrides.
8. **Kosten met kind + verrekenen + bon** — geen Splitwise-kloon, wel gezinscontext.
9. **Privacy-by-design in admin** — metrics zonder paspoort/taken; auditlog.
10. **Homepage-positionering klopt al** — uitkomsttaal, geen feature-salad.

---

## C. Top 10 zwakke punten (nu)

1. **Notificaties zijn alleen in-app** — prefs voor e-mail/push bestaan, delivery niet. Zonder kanaal geen “Famli voorkomt verrassingen”.
2. **Retention-loops zijn zwak** — geen dag-/weekbrief naar inbox, geen push rond meenemen/wissel.
3. **Packing is read-only strings** — geen afvinken, geen templates per sport/school, geen herinnering “bitje mee”.
4. **Brengen/halen heeft geen status** — geen gevraagd / bevestigd / afgerond.
5. **Activity log is data zonder UI** — gebruikers zien niet “Emma wijzigde hockey”.
6. **Kalenderintegratie is pull + OAuth-optioneel** — geen twee-weg als default; stale sync bij agenda-open.
7. **Search is plat** — geen groepen Kinderen/Agenda/Taken/Documenten/Kosten.
8. **School/sport is opslag, deels actie** — studiedag/gym zitten in events, maar geen “gymtas-elke-maandag” template-UX.
9. **Product analytics ontbreekt** — geen privacybewuste funnel (signup → kind → partner → dag-2).
10. **E-mail-invites en parser** — invite-URL’s bestaan; app stuurt geen mail. Import-jobs zijn stub.

---

## D. Top 10 concurrentiekansen

Zie §37 voor uitwerking. Kort:

1. Betrouwbare Today + packing-check (vs Cozi lijsten zonder context)
2. Overdracht als productmoment (vs OFW koud, vs WhatsApp chaos)
3. Brengen/halen met bevestiging (vs kalender “event”)
4. Dag-/weekbrief (vs “open de app als je eraan denkt”)
5. Activity feed (vs “heb jij dit aangepast?”)
6. Routines → afspraak + mee + reminder (vs Maple chores zonder custody)
7. Verzoeken die planning écht bijwerken (vs chat)
8. Kosten mét kind/categorie/bon, warm (vs Splitwise/OFW)
9. Helpers met fijnmazige rechten (vs FamilyWall alles-of-niets)
10. Search die context groepeert (vs TimeTree event-search)

---

## E. Top 5 differentiators (waar Famli #1 moet zijn)

1. **Context** — kind ↔ afspraak ↔ huishouden ↔ taak ↔ spullen ↔ ouder.
2. **Dagelijkse rust** — binnen 5 seconden: waar / wat / wie / mee / nog / straks.
3. **Niet vergeten** — packing + needed + brief, vóór het misgaat.
4. **Samen regelen** — verantwoordelijkheid + verzoeken, geen dump-inbox.
5. **Meerdere huishoudens, warm** — co-ouderschap zonder ToneMeter-rechtbank.

Niet #1 hoeven zijn: maaltijden, locator, gerechtelijke records, recepten, chores-gamification.

---

## F. Customer value proposition

**Primaire CVP:** Famli onthoudt wat er speelt, wie iets doet en wat je niet mag vergeten.

**Functioneel:** minder vergeten, minder dubbel plannen, minder zoeken, minder losse apps, duidelijk wie wat doet, duidelijk waar kinderen zijn.

**Emotioneel:** rust, minder achteraan, vertrouwen dat het geregeld is.

**Gezinswaarde:** iedereen weet wat speelt, verantwoordelijkheid verdeeld, minder discussie, kinderen centraal, betere overdracht.

Feature-filter: als het niet minstens twee van {mentale last, vergeten voorkomen, context, dagelijkse relevantie} raakt → niet bouwen.

---

## G. Homepage-belofte

Behoud en verscherp (niet herschrijven naar featurelijst):

- H1: *Je hoeft thuis niet meer alles zelf te onthouden.*
- Support: *Famli weet wat er speelt, wie iets doet en wat je niet mag vergeten.*
- Problemen: Wie haalt haar op? Gymtas? Hockey? Bij wie vrijdag? Cadeau? Schoolbrief?
- Tagline-optie: *Alles wat je gezin moet onthouden. Op één plek.*

Niet verkopen: “agenda + taken + boodschappen”.

---

## H. P0 / P1 / P2 roadmap

### P0 — dagelijks betrouwbaar (eerst dit)

| Item | Status | Volgende stap |
|---|---|---|
| Vandaag operationeel | Sterk na UI-polish | Packing afvinken; lege secties blijven verborgen |
| Agenda + kindkleur + bring/haal | Goed | Bevestigingsstatus op bring/haal |
| Kinderen + verblijf | Sterk | — |
| Regelen | Goed | Duidelijker “wacht op iemand” |
| Notificaties | In-app only | E-mailbrief + later push; bundelen |
| Duplicate / data bugs | Doorlopend | Geen mega-refactor |
| Agenda-integraties | Partial | OAuth-docs + betrouwbare stale-sync |
| Overdracht persist | Check-in ja, “gereed” nee | Gereed + packing ticks opslaan |

### P1 — voorsprong

- Meeneemassistent + sport/school templates
- Routines die afspraak/mee/reminder genereren (basis bestaat)
- Verzoeken: planning auto-update overal consistent
- Daily brief (in-app, daarna e-mail)
- Weekglance (nu al op Vandaag) → optionele weekbrief
- Activity feed UI
- Search groeperen
- Kosten: recurring UI (repo bestaat)
- School/sport als actie (gymdag → gymtas)
- Product analytics (events, geen inhoud)
- Contactformulier support (zonder gezinsdata)

### P2 — later

- Gezinsinbox (rule-based, geen autonome AI)
- Kinderaccount
- Maaltijd → boodschappen (alleen als Today er beter van wordt)
- Push
- Slimme suggesties
- Native apps

---

## I. Bewust NIET bouwen

- Court-ready messaging, ToneMeter, recorded calls
- Live locator / geofencing (FamilyWall-val)
- Receptenbox als kern (Cozi-val)
- Chore charts met sterren voor kleuters
- Notion-achtige vrije databases
- Chat die WhatsApp vervangt
- Autonome AI die planning wijzigt zonder bevestiging
- 20 kleuren, CRM, fintech-dashboard
- Feature-parity met OFW “omdat advocaten het vragen”

---

## J. Security / privacy

- RLS + `applyPrivacy()` + capabilities blijven de poort.
- Activity feed: **nooit** `before`/`after` JSON tonen (kan PII bevatten).
- Analytics: alleen funnelevents (`signup_completed`), nooit titels van taken/kinderen in vendors.
- Admin blijft metadata-only; elevated inzage blijft request + audit.
- Documenten/bonnen blijven private storage.
- E-mailbriefs: minimale inhoud (“Hockey 17:00 — details in Famli”), geen medische tekst in mail.
- Geen kindaccounts tot er een eigen, beperkte surface is.

---

## K. Technische afhankelijkheden

- Next.js App Router + Supabase (of demo memory-store).
- Notificatie-e-mail: provider (Resend o.i.d.) + `profiles.notification_prefs`.
- Push: Web Push later; prefs-schema bestaat al.
- Kalender: `GOOGLE_CLIENT_*`, `MICROSOFT_CLIENT_*`, ICS feed token.
- Shopping: migratie `0009`.
- Activity: tabel `activity_log` bestaat; UI ontbreekt.
- Packing ticks / bring-status: **nieuwe persistentielaag** nodig.
- Stripe: niet in deze roadmap-implementatie.

---

## L. Voorgestelde PR-volgorde

1. Dit document (geen productgedrag).
2. **Activity feed** op Vandaag — “Wat is er veranderd?” (data bestaat).
3. **Packing afvinken** + persistente overdracht-gereed.
4. **Brengen/halen status** (gevraagd / bevestigd / afgerond).
5. **Search groeperen**.
6. **Daily brief** in-app (hergebruik smart-today).
7. **E-mailbrief** (opt-in, gebundeld).
8. **Sport/school templates** → packing.
9. **Analytics funnel** (privacy-safe).
10. **Support contact** + admin koppeling.

Elke PR: user value, schema, security, tests, tsc, lint, build. Niet auto-mergen.

---

## 5. Audit huidige Famli (samenvatting)

| Onderdeel | Bestaat | E2E | Prod | Mobile | Notif | Auto | Per kind | Rechten | Admin |
|---|---|---|---|---|---|---|---|---|---|
| Vandaag | ja | ja | deels | ja | deels | ja | ja | ja | nee |
| Agenda | ja | ja | deels | ja | deels | deels | ja | ja | nee |
| Agenda-integraties | ja | deels | deels | deels | nee | deels | nee | ja | deels |
| Regelen | ja | ja | deels | ja | ja | deels | ja | ja | nee |
| Routines | ja | ja | deels | ja | ja | ja | ja | ja | nee |
| Boodschappen | ja | ja | deels | ja | nee | nee | nee | ja | nee |
| Kosten | ja | ja | deels | ja | ja | deels | ja | ja | nee |
| Kinderen / profiel | ja | ja | deels | ja | deels | deels | ja | ja | deels |
| School / sport | ja | deels | deels | ja | deels | nee | ja | ja | nee |
| Reizen | ja | deels | deels | deels | deels | nee | ja | ja | nee |
| Documenten | ja | ja | deels | ja | deels | nee | ja | ja | nee |
| Instellingen / rollen | ja | ja | deels | ja | deels | nee | deels | ja | deels |
| Verblijf / wissels | ja | ja | deels | ja | deels | ja | ja | ja | nee |
| Brengen/halen | ja | ja | deels | ja | nee | deels | ja | ja | nee |
| Packing / needed | ja | ja | deels | ja | deels | ja | ja | ja | nee |
| Verzoeken | ja | ja | deels | ja | ja | deels | ja | ja | nee |
| Search | ja | ja | ja | ja | nee | nee | ja | deels | nee |
| Notificaties | deels | deels | deels | ja | in-app | nee | ja | ja | deels |
| Onboarding / invites | ja | ja | deels | ja | deels | deels | deels | deels | deels |
| Admin | ja | ja | deels | deels | nee | deels | nee | ja | — |
| Homepage | ja | ja | ja | ja | — | — | — | — | nee |
| Contactformulier | nee | — | — | — | — | — | — | — | nee |
| Analytics funnel | nee | — | — | — | — | — | — | — | deels counts |
| Activity feed UI | data | nee | deels | — | — | — | — | — | last-seen |
| Daily/week brief | in Today | deels | deels | ja | nee | deels | ja | ja | nee |
| Kinderaccount | nee | — | — | — | — | — | — | — | — |
| Maaltijden | nee | — | — | — | — | — | — | — | — |
| Inbox / NL capture | stub | nee | nee | — | — | — | — | — | — |
| Quick add | ja | ja | deels | ja | deels | nee | ja | ja | nee |
| Privacy / RLS | ja | deels* | deels | ja | — | — | ja | ja | ja |

\*Live RLS hangt van migraties af; tests draaien vooral op demo-snapshot.

---

## 36. Feature value test (selectie)

Score 0–2 per vraag: mentale last, voorkomt probleem, tijd, minder communicatie, dagelijks relevant, unieke context, beter dan WhatsApp/Calendar.

| Feature | Som /14 | Besluit |
|---|---|---|
| Packing afvinken + reminder | 13 | P0 |
| Overdracht-overzicht | 13 | P0 |
| Daily brief | 12 | P1 |
| Activity feed | 11 | P1 (snel: data bestaat) |
| Bring/haal bevestigen | 12 | P0 |
| E-mail notificaties gebundeld | 11 | P0/P1 |
| Search groepen | 9 | P1 |
| Maaltijdplanner | 5 | Niet nu |
| Locator | 4 | Niet bouwen |
| Court chat | 3 | Niet bouwen |
| Kinderaccount | 7 | P2 |
| Gezinsinbox rule-based | 8 | P2 |

---

## 37. Top 10 productkansen (detail)

### 1. Packing als kern — “Wat moet mee?”
- **Probleem:** gymtas/bitje/medicijn blijft in WhatsApp.
- **Concurrent:** Cozi lists (zonder kind/afspraak); geen echte winnaar.
- **Nu:** strings op event/routine/handover, getoond op Vandaag, niet afvinkbaar.
- **Oplossing:** checklist per context, templates (hockey, gym, wissel), reminder.
- **Waarom beter:** gekoppeld aan kind + verblijf + tijdstip.
- **Impact:** medium (persist). **Risico:** laag. **P0.**

### 2. Overdracht als moment
- **Probleem:** mondelinge overdracht faalt.
- **Concurrent:** 2houses info-bank; OFW koud.
- **Nu:** smart handover + check-in; “gereed” niet persistent.
- **Oplossing:** één scherm mee/delen/ophalen/notitie, persist.
- **P0.**

### 3. Brengen/halen status
- **Probleem:** “dacht dat jij haalde”.
- **Concurrent:** kalenders hebben geen ownership-flow.
- **Nu:** toegewezen persoon, geen bevestiging.
- **Oplossing:** nog / gevraagd / bevestigd / afgerond + verzoek.
- **P0.**

### 4. Daily / week brief
- **Probleem:** app alleen open als je eraan denkt.
- **Concurrent:** Cozi change-mail (Gold); OFW reminders.
- **Nu:** Morgen + deze week op Vandaag; geen mail.
- **Oplossing:** in-app brief, daarna opt-in e-mail zonder spam.
- **P1** (in-app) / **P0** als retention hapert.

### 5. Activity feed
- **Probleem:** “heb jij hockey verzet?”
- **Concurrent:** TimeTree event-chat; OFW message log.
- **Nu:** `activity_log` tabel + seed; geen UI.
- **Oplossing:** menselijke zinnen, geen JSON, op Vandaag.
- **P1**, lage impact.

### 6. Routines → generatie
- **Probleem:** wekelijkse sport opnieuw intypen.
- **Concurrent:** FamilyWall timetables; Maple chores.
- **Nu:** routines + occurrences + packingItems.
- **Oplossing:** templates + duidelijke UX, niet nieuw domein.
- **P1.**

### 7. Verzoeken sluiten de lus
- **Probleem:** geaccepteerde wissel niet overal voelbaar.
- **Concurrent:** AppClose/OFW.
- **Nu:** change requests + custody override.
- **Oplossing:** Today/agenda/kind altijd dezelfde bron; notificatie.
- **P1.**

### 8. Kosten gezinsvriendelijk
- **Probleem:** Splitwise is housemate, OFW is advocaat.
- **Nu:** headline, splits, settle, bon.
- **Oplossing:** recurring UI, kind altijd zichtbaar.
- **P1.**

### 9. Notificaties die niet spammen
- **Probleem:** zonder push/mail geen “vóór het misgaat”.
- **Concurrent:** iedereen met OS-notificaties.
- **Nu:** bell + prefs.
- **Oplossing:** bundels Straks / Mee / Overdracht / Wijziging.
- **P0/P1.**

### 10. Search + analytics + support
- **Probleem:** groeien zonder te zien waar onboarding hapert.
- **Nu:** platte search; admin counts; geen contactform.
- **P1.**

---

## 29–30. Retention en switching cost

**Waarom morgen openen?** Vandaag + packing + “wie haalt om 15:15”.  
**Volgende week?** Wissel, sportreeks, weekglance.  
**Over 6 maanden?** Kindprofiel, school, routines, kostenhistorie, documenten — context die je niet opnieuw wilt invoeren.

Positieve switching cost = **opgebouwde gezinscontext**, niet export-blokkade. Export blijft een recht.

Loop: routine → agenda-item → reminder → meeneemitem → openen → bevestigen → activity → relevantie.

---

## 34. Commercieel (aanbeveling, niet implementeren)

| Laag | Inhoud | Rationale |
|---|---|---|
| **Free** | 2 kinderen, 2 ouders, Vandaag, agenda, regelen, packing, wissels, boodschappen, basis kosten | Moet dagelijks waardevol zijn of ze blijven in WhatsApp |
| **Trial 14–30 dagen** | Family-features (sync, extra leden, documentenruimte) | Cozi/AppClose-achtige gewoonte |
| **Family (huishouden, niet per ouder)** | Kalendersync, >2 kinderen, helpers, documenten, briefs per mail | OFW rekent per ouder — Famli rekent per gezin, warmer |
| **Niet in Free locked** | Verblijf, Today, packing | Anders is Free waardeloos |

Richtprijs-onderzoek: Cozi Gold ~€35–40/jr is anker voor “family organizer”; OFW €200+/jr is anker voor “niet zijn”. Famli hoort **dichter bij Cozi/2houses-gezinsprijs**, met co-ouderdiepte als reden om te upgraden — niet ads of 30-dagen-kalender.

---

## 35. Moat

Niet: featurecount.  
Wel: **Famli kent de samenhang.** Hoe meer gebruik, hoe beter het weet wie bij wie hoort, waar kinderen zijn, welke routines en spullen bij welk moment horen, en wie iets doet. Die graaf is traag te kopiëren en maakt elke nieuwe surface (brief, packing, overdracht) slimmer zonder nieuwe invoer.
