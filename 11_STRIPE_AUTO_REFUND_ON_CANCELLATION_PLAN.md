# Stripe Auto Refund On Cancellation Plan

Questa checklist descrive come integrare il rimborso automatico Stripe quando una registrazione viene cancellata dal backoffice organizer o quando una occurrence viene cancellata in blocco.

## Obiettivo

- [ ] Permettere la cancellazione con rimborso automatico della quota online gia incassata
- [ ] Mantenere allineati stato registrazione, ledger pagamenti, webhook Stripe, audit log ed email
- [ ] Evitare doppi rimborsi, race condition e incoerenze nei report

## Fasi di implementazione

- [x] Fase 1. Fondazione refund intelligence: helper condivisi per eleggibilita, pending refund, Stripe capture/reference e summary backend riusabile nel payload organizer
- [x] Fase 2. Read model organizer: rendere il refund summary visibile nella UI admin/registrations e payments con copy/stati leggibili
- [x] Fase 3. Primitive Stripe refund: aggiungere `createStripeRefund()` con direct-charge account context e idempotency key stabile
- [x] Fase 4. Single registration service flow: orchestrare `cancel only` e `cancel + refund` per la singola registrazione
- [x] Fase 5. Webhook reconciliation: correlare refund request locali con `charge.refunded` e chiudere il ledger `PENDING -> REFUNDED`
- [x] Fase 6. Organizer UX singola registrazione: modal cancel/refund con summary importi, esiti e guardrail
- [x] Fase 7. Bulk occurrence cancellation: cancellazione occurrence con refund bulk eligibile e report finale aggregato
- [x] Fase 8. Email, audit e payments visibility: copy `refund initiated/completed`, audit log dedicati e visibilita nei dettagli pagamento
- [x] Fase 9. Error handling, retry e observability: failure states chiari, retry sicuri e tracciamento operativo
- [ ] Fase 10. End-to-end hardening e publish: test completi, smoke organizer, verify, deploy Vercel e validazione produzione

## Baseline attuale

- [x] La cancellazione organizer della registrazione esiste gia
- [x] La cancellazione organizer della occurrence esiste gia e puo cancellare registrazioni collegate
- [x] Il modello dati ha gia `refundedCents` su `Registration`
- [x] Il ledger `RegistrationPayment` supporta gia `kind = REFUND` e `status = REFUNDED`
- [x] I webhook Stripe registrano gia eventi `charge.refunded`
- [x] Le email di cancellazione hanno gia il placeholder `refund_state`
- [ ] La cancellazione organizer non avvia oggi nessuna chiamata Stripe di refund
- [ ] Non esiste una UI organizer per scegliere se rimborsare oppure no al momento della cancellazione
- [ ] Non esiste una gestione esplicita di refund `pending`
- [x] L'email di cancellazione non distingue ancora bene tra `refund initiated` e `refund completed`

## Decisioni prodotto

- [x] Distinguere chiaramente `Cancel only` da `Cancel + refund online amount`
- [x] Per singola registrazione, mostrare la scelta refund nel modal di cancellazione
- [x] Per cancellazione occurrence, mostrare una scelta bulk refund per tutte le registrazioni eleggibili
- [x] In v1 il default consigliato e `refund full online amount`
- [ ] In v1 il refund automatico riguarda solo la quota online Stripe, non eventuali incassi venue/manuali
- [ ] In v1 non rimborsare mai importi gia segnati come `VENUE` o `MANUAL`
- [ ] In v1 supportare full refund; partial refund come estensione successiva

## Regole di eleggibilita refund

- [ ] Refund possibile solo se `onlineCollectedCents > refundedCents`
- [ ] Refund possibile solo se esiste un riferimento Stripe valido alla transazione incassata
- [ ] Refund possibile solo se la registrazione non e gia completamente rimborsata
- [ ] Refund non necessario se la registrazione non ha incassi online
- [ ] Refund non necessario se il pagamento era solo venue/manual
- [x] Refund bulk occurrence deve saltare in sicurezza i casi non eleggibili e produrre un summary

## UX organizer

- [x] Sostituire il bottone `Cancel` con un flow piu esplicito
- [x] Aggiungere modal `Cancel registration`
- [x] Mostrare amount summary: `paid online`, `already refunded`, `refund now`, `due at venue`
- [x] Mostrare un toggle o radio: `Cancel only` / `Cancel and refund online amount`
- [x] Bloccare o spiegare il motivo se il refund non e disponibile
- [x] Mostrare outcome chiaro dopo l'azione: `cancelled`, `refund initiated`, `refund completed later via webhook`
- [x] In event-day e detail mode mantenere lo stesso comportamento, non due UX diverse

## UX per cancellazione occurrence

- [ ] Aggiungere modal di conferma per occurrence `CANCELLED`
- [x] Mostrare conteggio registrazioni coinvolte
- [x] Mostrare quante sono refund-eligible
- [x] Permettere `cancel only` oppure `cancel + auto refund eligible online payments`
- [x] Mostrare report finale con `cancelled`, `refund requested`, `skipped`, `failed`

## Service layer

- [x] Estrarre un helper per trovare l'ultimo pagamento Stripe rimborsabile della registrazione
- [x] Aggiungere `createStripeRefund()` in `lib/passreserve-payments.js`
- [x] Passare sempre `stripeAccount` corretto per direct charges su connected account
- [x] Usare idempotency key stabile per evitare doppi refund
- [x] Aggiungere un service `cancelOrganizerRegistration()` che possa orchestrare cancel + refund
- [x] Aggiungere un service bulk per `cancelOccurrenceRegistrationsWithRefunds()`

## Stripe API e semantics

- [x] Rimborsare tramite Refunds API usando il `payment_intent` o il riferimento piu affidabile disponibile
- [x] Per direct charges usare request options con `stripeAccountId` del connected account
- [ ] Gestire correttamente `already refunded`, `amount too large`, `account invalid`, `missing payment reference`
- [x] Non considerare il refund come completato fino al webhook o alla conferma affidabile della piattaforma
- [x] Lasciare la webhook route come source of truth finale per `refundedCents`

## Ledger e data model

- [x] Aggiungere una rappresentazione esplicita del refund richiesto ma non ancora finalizzato
- [x] Opzione A: usare `RegistrationPayment` con `kind = REFUND` e `status = PENDING`
- [ ] Opzione B: aggiungere un campo dedicato come `stripeRefundId` o metadata strutturati per correlazione
- [x] Salvare `stripeRefundId` quando Stripe accetta la richiesta
- [ ] Salvare requested amount, actor, motivo, timestamp e attempt count
- [ ] Mantenere `refundedCents` aggiornato solo dal source of truth finale

## Webhook e riconciliazione

- [x] Estendere il processamento webhook per correlare il refund con la refund request locale
- [x] Se esiste una refund `PENDING`, portarla a `REFUNDED`
- [x] Se arriva un refund esterno senza request locale, continuare comunque a registrarlo come oggi
- [x] Gestire partial refunds in modo cumulativo su `refundedCents`
- [x] Gestire idempotenza webhook senza doppie righe ledger

## Email e copy

- [x] Aggiungere uno stato copy `Refund initiated`
- [x] Aggiungere uno stato copy `Refund completed`
- [x] Aggiornare `refund_state` per distinguere `manual follow-up`, `initiated`, `completed`
- [x] Decidere se inviare una sola email di cancellazione o una seconda email quando il refund e confermato
- [ ] Aggiornare organizer notifications con il risultato refund

## Audit e observability

- [x] Aggiungere audit event `organizer_registration_cancelled_with_refund_requested`
- [x] Aggiungere audit event `organizer_occurrence_cancelled_with_refunds_requested`
- [x] Aggiungere audit event per refund failure
- [x] Rendere visibile il refund state nella pagina organizer payments
- [x] Rendere visibile il refund state nella detail registration

## Error handling e retry

- [x] Se il cancel riesce ma il refund fallisce, non perdere il dettaglio del fallimento
- [x] Mostrare chiaramente `Cancelled, refund failed`
- [x] Consentire retry manuale del refund dal backoffice
- [x] Consentire retry bulk per i soli casi falliti
- [x] Evitare che un retry crei un doppio refund

## Occurrence bulk strategy

- [x] Non fare chiamate Stripe dentro la transazione DB principale della cancellazione occurrence
- [x] Persistire prima lo stato locale necessario
- [x] Eseguire poi i refund in una seconda fase controllata
- [x] Restituire un summary aggregato, non un singolo esito opaco
- [ ] Valutare se il bulk va tenuto sincrono in v1 oppure spostato in job/queue dedicata

## Sicurezza e policy

- [ ] Limitare refund action a organizer admin autenticati
- [ ] Loggare sempre l'actor che ha richiesto il refund
- [ ] Consentire refund automatico solo per registrazioni dello stesso organizer
- [ ] Esplicitare nel copy che il rimborso riguarda solo la quota incassata online

## Test

- [ ] Test singola cancellazione con zero online collected
- [ ] Test singola cancellazione con refund automatico riuscito
- [ ] Test singola cancellazione con refund non eleggibile
- [ ] Test idempotenza su doppio click `cancel + refund`
- [ ] Test webhook `charge.refunded` dopo refund richiesto localmente
- [ ] Test refund esterno ricevuto solo via webhook
- [x] Test bulk occurrence cancellation con mix di registrazioni eleggibili e non eleggibili
- [x] Test error path Stripe e retry
- [x] Test UI organizer per detail mode
- [x] Test UI organizer per event-day mode

## Definition of done

- [ ] Un organizer puo cancellare una registrazione e richiedere contestualmente il refund online
- [x] Una occurrence cancellata puo avviare refund bulk per le registrazioni eleggibili
- [ ] `refundedCents` e ledger restano coerenti con Stripe
- [ ] L'utente riceve una comunicazione chiara sullo stato del refund
- [ ] I report organizer e payments page mostrano refund richiesti e refund completati
- [x] I fallimenti sono ritentabili senza doppio rimborso
- [x] `npm run test` passa
- [x] `npm run verify` passa
- [x] Smoke test organizer completato
- [ ] Deploy Vercel verificato
