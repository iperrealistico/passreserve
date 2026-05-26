# Organizer Manual Registration Plan

Questa checklist descrive come integrare l'inserimento manuale di una registrazione organizer dentro il runtime attuale di Passreserve.com, senza creare un flusso parallelo.

## Obiettivo

- [x] Permettere all'organizer di creare una registrazione completa dal backoffice
- [x] Riutilizzare il piu possibile il motore attuale di registration, capacity, payments, audit, email e operations UI
- [x] Mantenere coerenza tra registrazioni pubbliche e registrazioni create manualmente

## Fasi di implementazione

- [x] Fase 1: estrarre un core condiviso per costruzione registration payload, attendee normalization e ticket totals, poi ricollegare il flusso pubblico a quel core senza cambiare comportamento
- [x] Fase 2: aggiungere il service layer organizer con schema input, validazioni condivise e `createOrganizerRegistration()`
- [x] Fase 3: aggiungere la server action organizer e la route base per la nuova creazione manuale
- [x] Fase 4: costruire lo step `Contesto` con preselezione evento/data e origine operativa
- [x] Fase 5: costruire lo step `Ticket e partecipanti` con quantity builder e card attendee dinamiche
- [x] Fase 6: costruire lo step `Pagamento e conferma` con le cinque modalita operative previste
- [x] Fase 7: integrare email, audit log, metadata `source/origin` e copy organizer/manual entry
- [x] Fase 8: integrare queue, filtri, badge, dettaglio registrazione ed export operativi
- [x] Fase 9: rifinire guardrail, dedupe warning, mobile UX e feedback states
- [x] Fase 10: completare review finale, submit end-to-end, success state e documentazione di closeout

## Baseline attuale

- [x] Esiste gia un flusso pubblico completo di registrazione con hold, conferma e pagamento
- [x] Esiste gia la coda organizer per registrazioni, pagamenti, no-show, attended e cancellazioni
- [x] Esiste gia il supporto a piu partecipanti, ticket multipli e note alimentari
- [x] Esiste gia la registrazione di pagamenti manuali e sul posto
- [x] Esiste gia la cancellazione organizer di una registrazione
- [x] L'organizer puo ora creare una nuova registrazione dal backoffice
- [x] L'organizer puo ora inviare un payment link da una registrazione creata manualmente
- [x] La `Registration` traccia ora in modo esplicito la sorgente `PUBLIC / ORGANIZER_MANUAL / IMPORT`
- [ ] La cancellazione organizer non avvia oggi un rimborso automatico Stripe

## Decisioni di integrazione

- [x] Implementare la creazione manuale come vera `Registration`, non come attendee sciolto
- [x] Riutilizzare le primitive del flusso pubblico per ticket, pricing, attendees, capacity e status lifecycle
- [x] Evitare un secondo ramo logico separato per pricing, confirmations e payment math
- [x] Trattare le registrazioni manuali come first-class citizens in queue, exports, reminders e audit trail

## Entry points UX

- [x] Aggiungere CTA `Nuova registrazione` nella pagina `/{slug}/admin/registrations`
- [x] Aggiungere CTA rapida `Aggiungi walk-in` nella vista `event-day` quando una data e selezionata
- [ ] Usare drawer grande su desktop e route dedicata o full-screen sheet su mobile
- [x] Precompilare evento e data quando l'utente arriva da un filtro o da `event-day`

## Flusso UX

- [x] Step 1 `Contesto`: evento, data, lingua registrazione, origine richiesta (`walk-in`, `telefono`, `email`, `staff`)
- [x] Step 2 `Ticket e partecipanti`: quantita per ticket e generazione automatica delle card partecipante
- [x] Step 3 `Pagamento e conferma`: scelta chiara dello stato finale e del comportamento email
- [x] Step 4 `Review`: riepilogo finale con importi, stato, email previste e prossima azione
- [x] Mostrare un summary persistente con `subtotal`, `online`, `due at venue`, `stato finale` e `email previste`
- [x] Aggiungere shortcut `usa i dati del capogruppo` per velocizzare telefono, email e address
- [x] Nascondere o mostrare i campi dietary in base a `collectDietaryInfo`

## Modalita operative da supportare

- [x] `Richiedi conferma al cliente`
- [x] `Conferma ora, paga sul posto`
- [x] `Conferma ora, invia link pagamento`
- [x] `Conferma ora, deposito gia incassato offline`
- [x] `Conferma ora, tutto pagato`

## Service layer

- [x] Estrarre un core condiviso per costruzione items, totals, attendees e registration payload
- [x] Aggiungere `createOrganizerRegistration()`
- [x] Aggiungere `createOrganizerRegistrationAction()`
- [x] Riutilizzare le stesse validazioni di ticket, participant count e ticket assignment del flusso pubblico
- [x] Riutilizzare gli stessi controlli di capacity e booking window del flusso pubblico
- [x] Supportare creazione in stato `PENDING_CONFIRM`
- [x] Supportare creazione in stato `CONFIRMED_UNPAID`
- [x] Supportare creazione in stato `PENDING_PAYMENT` con payment link
- [x] Supportare creazione con deposito gia incassato offline
- [x] Supportare creazione con registrazione totalmente pagata

## Payment semantics

- [x] Mantenere separati `onlineCollectedCents` e `venueCollectedCents`
- [x] Se l'organizer registra un deposito offline, creare ledger `MANUAL` per la quota online
- [x] Se l'organizer registra il saldo on-site, creare ledger `VENUE` per la quota venue
- [x] Se l'organizer registra tutto come pagato, comporre correttamente entrambe le quote
- [x] Non alterare la semantica corrente di reconciliation, exports e payment views

## Data model

- [x] Valutare aggiunta campo `source` o `origin` su `Registration`
- [x] Se approvato, introdurre enum `PUBLIC`, `ORGANIZER_MANUAL`, `IMPORT`
- [x] Se approvato, esporre badge o filtro UI per l'origine della registrazione

## Email

- [x] Riutilizzare la pending confirmation email per il caso `Richiedi conferma al cliente`
- [x] Riutilizzare la confirmed email per il caso `Conferma ora, paga sul posto`
- [x] Aggiungere un template dedicato per `payment requested` da registrazione manuale
- [x] Inviare l'alert organizer con lo stesso schema delle registrazioni pubbliche
- [x] Rendere esplicito nelle email quando la registrazione e stata inserita dallo staff

## Audit e tracciabilita

- [x] Aggiungere audit event per `organizer_registration_created`
- [x] Aggiungere audit event per `organizer_registration_confirmation_requested`
- [x] Salvare metadata minimi sull'origine operativa (`walk-in`, `telefono`, `email`, `staff`)
- [x] Mantenere distinguibili creazione, pagamento manuale, venue payment e cancellazione

## Integrazione UI esistente

- [x] Mostrare le registrazioni manuali nella queue senza branch speciali
- [x] Farle apparire correttamente in `compact`, `table`, `detail` ed `event-day`
- [x] Includerle negli export PDF operativi e completi
- [x] Includerle nei conteggi dashboard, dietary summary e due-at-venue summary
- [x] Mantenere invariati i flussi successivi di `cancel`, `mark paid`, `mark attended`, `mark no-show`

## Guardrail

- [x] Vietare overbooking silenzioso in v1
- [ ] Se in futuro si vuole overbooking, richiedere toggle esplicito, motivazione e audit
- [x] Bloccare creazioni su occurrence non disponibile o fuori finestra vendite, salvo futura decisione contraria
- [x] Evitare duplicazione involontaria con warning su stesso evento, data ed email lead attendee
- [x] Tenere cancellazione e rimborso come azioni separate finche non esiste un refund flow affidabile

## Test

- [x] Test dedicati sul shared registration core
- [x] Test su creazione `PENDING_CONFIRM`
- [x] Test su creazione `CONFIRMED_UNPAID`
- [x] Test su creazione `PENDING_PAYMENT`
- [x] Test su creazione con deposito manuale gia incassato
- [x] Test su creazione full paid
- [x] Test su capacity e ticket assignment
- [x] Test su dietary data e attendee payload
- [x] Test su audit log e payment ledger
- [x] Test su email trigger attesi
- [x] Smoke test UI organizer su desktop
- [x] Smoke test UI organizer su mobile

## Definition of done

- [x] Un organizer puo creare una registrazione manuale completa senza uscire dal backoffice
- [x] La registrazione creata entra nella stessa coda operativa delle registrazioni pubbliche
- [x] I payment totals restano coerenti con il modello corrente `online / due at venue`
- [x] Il cliente puo ricevere conferma o payment link secondo la modalita scelta
- [x] La registrazione manuale supporta cancellazione, attended, no-show e venue reconciliation come le altre
- [x] Export, dashboard, reminders e reporting non si rompono
- [x] `npm run verify` passa
- [x] Verifica manuale organizer completata
- [ ] Push GitHub completato
- [ ] Deploy Vercel verificato
