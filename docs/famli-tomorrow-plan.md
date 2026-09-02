# Famli Morgen — technisch plan

## 1. Bestaande data

Famli Morgen is een presentatielaag. Geen tweede agenda.

| Vraag | Bron |
| --- | --- |
| Waar is het kind? | `occurrences` + `custodianForChild` |
| Afspraken | `events` (niet `overdracht`) |
| Brengen/halen | `event.dropoffMemberId` / `pickupMemberId` + `wieBrengt` / `wieHaalt` |
| Wissel | `handovers` op die datum |
| Spullen | persistente `packingItems` + event/handover `packingList` + `PACKING_TEMPLATES` |
| Taken | `tasks` / `routineOccurrences` via `dutiesForMemberOn` / kind-due |
| Nodig | `neededItems` (`forgetNot`) |
| Privacy | `applyPrivacy` in `getSnapshot` |

## 2. Hergebruikte components

- `PackingToggle` / `PackingSuggestionToggle` / `PackingAddRow`
- `childCustodyLabel`, `childTimelineForDate`
- `todayPackingGroups` / `inferPackingContext`
- `NotificationPrefsForm`-patroon (uitbreiden, niet vervangen)
- Bestaande activity-log summaries
- Design tokens: `famli-card`, `famli-section-title`, `famli-btn`, 44px targets

Niet dupliceren: Smart Handover, Today-dashboardkolommen, packing persistence.

## 3. Context engine

`lib/context/family-day.ts`

```
buildFamilyDayContext(snapshot, date, now) → FamilyDayContext
```

Eén pass over snapshot-collecties (geen N+1). Output:

- `date`, `kind` (`today` \| `tomorrow`)
- `children[]`: stay, timeline, handover, packing, open tasks
- `packing[]`: unieke afvinkbare items
- `tasks[]`
- `alerts[]`: max 3, priority `info` \| `attention` \| `important`
- `ready`: alles geregeld

Zelfde functie voor Vandaag-signalen, Morgen-pagina, in-app brief.

Week: `weekGlance` blijft de hook voor P1 Famli Week; niet bouwen in deze PR.

## 4. Schema

Geen nieuwe tabellen.

- `notification_prefs` JSON: extra sleutel `famliMorgen` `{ enabled, time, inApp, email }`
- Optioneel: notificatie-type `famli_morgen` (text, geen strikte enum in 0008)

Migratie: geen destructieve SQL. Geen `0019` nodig als prefs JSON-additief blijft.

## 5. Authorization / RLS

- Engine draait op de al gefilterde snapshot (`applyPrivacy`).
- Mutaties: bestaande `edit_tasks` / `edit_calendar` / `edit_custody`.
- Brief: alleen kinderen/events die de ontvanger mag zien; e-mail alleen tellingen.
- Geen service-role in clientflows. Cron gebruikt server secret + bestaande snapshot-privacy.

## 6. Smart-signal rules (deterministisch, max 3)

1. Sport/school-event zonder brenger → “Wie brengt {kind} naar {titel}?”
2. Template-item (hockeystick, gymtas, …) ontbreekt op packing → “De {item} moet morgen mee.”
3. Verblijf onbekend → “We weten nog niet waar {kind} morgen is.”
4. Needed-item locatie botst met verblijf (bij_mama vs bij papa) → amber, alleen als nuttig
5. Open one-off taak due op die dag → “Nog regelen: {titel}”

Geen lawine: skip als `ready`; rood alleen bij onbekend verblijf + event die dag.

## 7. Notification flow

Avondbrief (gebundeld):

- Titel: “Famli Morgen”
- Body in-app: “Morgen staan er N dingen op de planning. Er moeten nog M dingen geregeld worden.”
- Link: `/vandaag?dag=morgen`
- E-mail (architectuur): alleen tellingen + link; **geen** kindnamen. Versturen is P1 zolang er geen mailprovider is.
- Push: niet faken.
- Dedup: bestaande 24u-window op type + entity.

Cron: `GET/POST /api/cron/famli-morgen` + optionele `CRON_SECRET`; Vercel hourly, match op uur in de gezins-timezone. `entity_id` is een datum-UUID. Supabase-cron heeft `SUPABASE_SERVICE_ROLE_KEY` nodig. E-mail versturen en Famli Week blijven P1.

## 8. UX

Desktop/mobile zelfde `DayBrief`:

- Toggle Vandaag | Morgen
- Per kind: verblijf, tijdlijn, wie brengt/haalt
- Wat moet mee (grote checkboxes)
- Nog regelen
- Let even op (max 3) + quick actions
- Empty: “Morgen is rustig.” / “Morgen staat klaar ✓”

Geen AI-look (geen glow, sparkles, chat).

## 9. Tests

- Scenario A–E in `tests/life/family-day.test.ts`
- Timezone: `calendarDateInTimeZone`
- Privacy: contact-only / partner ziet geen extra kinderen
- Packing persistence ongewijzigd hergebruikt
- Brief-copy zonder namen

## 10. Risico’s

- `toISODate(new Date())` is server-lokaal; zonder TZ-helper schuift “morgen” rond middernacht.
- Cron op demo/memory is proces-lokaal.
- E-mail zonder provider blijft architectuur + copy.
- PR #30 (kindprofiel packing) zit mogelijk niet op main; niet herbouwen.
- Geen destructieve data-cleanup bij dubbele packing-labels: uniek tonen.
