# Organizer Backoffice UX Todo

Questa checklist raccoglie il lavoro ancora necessario per portare il backend organizer di Passreserve.com a una UX molto piu semplice, continua e operativa.

## Gia completato

- [x] Riduzione della top nav organizer a `Overview / Schedule / Events / Registrations / Settings`
- [x] Uscita di `Billing` dalla navigazione primaria
- [x] Consolidamento della vecchia area `Dates` dentro la nuova superficie `Schedule`
- [x] Redirect di compatibilita da `/{slug}/admin/occurrences` a `/{slug}/admin/calendar`
- [x] Raggruppamento iniziale delle date per giorno nella nuova `Schedule`
- [x] Introduzione delle viste `Month / Week / List` nella nuova `Schedule`
- [x] Introduzione di un workbench laterale nella `Schedule` per ridurre lo scroll tra focus date e form
- [x] Shortcut da `Events` verso `Schedule` e `Registrations`
- [x] Introduzione di un workspace master-detail per `Events`
- [x] Compressione iniziale della pagina `Registrations` con disclosure per dettagli lunghi
- [x] Introduzione di una modalita compatta per la coda `Registrations`
- [x] Introduzione di focus operativi `all / open / payments / history` nella coda `Registrations`

## Priorita 1

- [ ] Trasformare `Schedule` in una vera superficie interattiva
  - [x] Aggiungere switch `Month / Week / List`
  - [x] Evidenziare visivamente `draft / published / low capacity / payments blocked`
  - [x] Aprire il dettaglio data in side panel o pane laterale invece di obbligare a scorrere fino al form
  - [x] Rendere immediato il passaggio da una data a `participants`, `edit`, `public state`
- [ ] Rendere `Overview` piu task-first
  - [x] Ridurre ulteriormente il peso della shell introduttiva
  - [x] Portare sopra solo cio che richiede azione oggi
  - [x] Esporre CTA rapide verso `Schedule`, `Registrations`, `Billing` solo quando servono davvero

## Priorita 2

- [ ] Rifare `Events` in logica master-detail
  - [x] Lista eventi persistente
  - [x] Pannello dettaglio evento selezionato
  - [x] Organizzare il dettaglio in sottosezioni chiare: `Basics / Tickets / Schedule / Publish`
  - [x] Ridurre la percezione di "pagina form molto lunga"
- [ ] Rendere `Registrations` piu veloce da leggere in uso reale
  - [x] Introdurre una vista compatta
  - [x] Valutare o aggiungere una vera vista tabellare
  - [x] Aggiungere una modalita `event day / check-in`
  - [x] Spostare il dettaglio lungo in drawer o panel laterale
  - [x] Tenere visibili inline solo status, ticket, importi, restrizioni, azione principale

## Priorita 3

- [ ] Rifare `Settings` in blocchi piu chiari
  - [x] `Organization`
  - [x] `Notifications`
  - [x] `Account`
  - [x] `Billing`
- [ ] Semplificare ulteriormente l'editing bilingua
  - [x] Mostrare prima una sola lingua
  - [x] Aggiungere `Add English` / `Add Italian`
  - [x] Mantenere il fallback attuale se una lingua manca

## Cleanup tecnico

- [x] Rimuovere o archiviare i componenti organizer legacy non piu parte del flusso principale
  - [x] `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/dashboard/operations-dashboard-experience.js`
  - [x] `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/calendar/operations-calendar-experience.js`
  - [x] `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/occurrences/occurrence-management-experience.js`
  - [x] `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/registrations/registration-operations-experience.js`
  - [x] `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/events/event-catalog-experience.js`
  - [x] `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/payments/payment-operations-experience.js`
- [x] Allineare i copy rimanenti a `Schedule` invece di `Dates` dove la route primaria non e piu quella vecchia
- [x] Fare una passata finale responsive sul backend organizer da mobile e tablet

## Definition of done

- [ ] Un organizer capisce in meno di 10 secondi dove:
  - [ ] definire un evento
  - [ ] programmare una data
  - [ ] vedere i partecipanti
  - [ ] gestire un pagamento
- [ ] Le superfici primarie non duplicano piu overview, metriche e CTA inutili
- [ ] Il flusso mentale diventa lineare: `Event -> Schedule -> Registrations`
- [x] `npm run verify` verde
- [x] Push su GitHub
- [x] Deploy Vercel verificato
