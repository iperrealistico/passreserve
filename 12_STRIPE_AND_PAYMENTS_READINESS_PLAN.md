# Stripe And Payments Readiness Plan

Questa checklist raccoglie il lavoro necessario per sbloccare l'onboarding Stripe organizer, rendere affidabile la parte Checkout/webhook e chiudere i gap residui del sistema pagamenti.

## Obiettivo

- [ ] Sbloccare l'onboarding organizer Stripe in produzione
- [ ] Rendere affidabili Connect, Checkout, webhook e billing gate
- [ ] Chiudere i gap di UX, observability, documentazione e go-live relativi ai pagamenti

## Baseline attuale

- [x] Esiste gia una pagina organizer billing
- [x] Esiste gia la route organizer `/{slug}/admin/billing/connect`
- [x] Esiste gia la route organizer `/{slug}/admin/billing/return`
- [x] Esiste gia la route webhook `app/api/stripe/webhooks/route.js`
- [x] Esiste gia il gating che blocca date a pagamento se Stripe non e pronto
- [x] Esiste gia il fallback preview per Checkout quando Stripe live non e configurato
- [x] Esiste gia il tracciamento dello stato Stripe organizer nel modello dati
- [x] Esiste gia una health page platform che mostra il mode Stripe
- [ ] L'onboarding fallisce se `STRIPE_SECRET_KEY` non e presente nell'environment runtime
- [ ] La produzione o l'environment target che l'organizer sta usando non ha oggi Stripe live pronto
- [ ] La documentazione runtime e incoerente: parte del repo parla ancora di `no Stripe Connect`
- [ ] Non esiste ancora un runbook end-to-end chiuso per Connect + Checkout + webhook + refund
- [ ] Non esiste ancora il refund automatico da cancellazione organizer

## Blocco corrente da risolvere subito

- [x] Il messaggio di errore e coerente col codice: `createStripeConnectedAccount()` blocca senza `STRIPE_SECRET_KEY`
- [ ] Verificare in Vercel project corretto che `STRIPE_SECRET_KEY` sia presente in Production
- [ ] Verificare in Vercel project corretto che `STRIPE_SECRET_KEY` sia presente in Preview se serve testare anche preview
- [ ] Verificare che `STRIPE_WEBHOOK_SECRET` sia presente
- [ ] Verificare che `NEXT_PUBLIC_BASE_URL` punti al dominio canonico corretto
- [ ] Verificare che il deploy che espone billing stia leggendo l'env giusto e non un altro project/team/environment

## Fase 1 - Immediate unblock

- [ ] Impostare `STRIPE_SECRET_KEY` nel project Vercel canonico `passreserve`
- [ ] Impostare `STRIPE_WEBHOOK_SECRET`
- [ ] Confermare `STRIPE_CURRENCY_DEFAULT`
- [ ] Confermare `NEXT_PUBLIC_BASE_URL`
- [ ] Rieseguire un deploy pulito dopo il cambio env
- [ ] Riaprire `/{slug}/admin/billing`
- [ ] Verificare che `Connect Stripe` apra l'onboarding invece del messaggio di blocco

## Fase 2 - Environment and ownership sanity check

- [ ] Confermare che la chiave Stripe appartenga al platform account corretto
- [ ] Confermare che l'account Stripe sia in modalita appropriata per produzione o test
- [ ] Confermare che il dominio di ritorno usato da account link sia quello corretto
- [ ] Confermare che il webhook endpoint pubblico sia registrato nello Stripe account corretto
- [ ] Confermare che il team Vercel corretto possieda i secrets usati dal progetto live
- [ ] Confermare che non esistano env divergenti tra Production e Preview che sporcano i test

## Fase 3 - Connect onboarding hardening

- [ ] Sostituire il messaggio raw di errore con una UI piu utile nella billing page
- [ ] Mostrare check espliciti per `secret key`, `webhook secret`, `base url`, `account connected`, `charges`, `payouts`
- [ ] Mostrare il blocker esatto e l'owner action necessaria
- [ ] Migliorare il pulsante `Refresh status` con esito piu diagnostico
- [ ] Esporre nella platform health una sezione Stripe piu dettagliata

## Fase 4 - Architecture decision on Stripe Connect

- [ ] Decidere se tenere temporaneamente l'attuale path `accounts.create({ type: "standard" })` per unblock rapido
- [ ] Documentare che il path attuale usa una forma legacy di Connect onboarding
- [ ] Pianificare migrazione a Accounts v2 come hardening successivo
- [ ] Se si migra, ridefinire account configuration, dashboard access e responsabilita in modo esplicito
- [ ] Confermare che l'integrazione resti coerente con il charge model scelto

## Fase 5 - Charge model and payout truth

- [ ] Confermare esplicitamente il modello attuale: direct charges su connected account
- [ ] Verificare che la documentazione lo descriva senza ambiguita
- [ ] Verificare che i metadata checkout contengano tutto il necessario per reconcile e refund
- [ ] Verificare che il ledger locale mantenga `stripeAccountId`, `stripeSessionId`, `stripePaymentIntentId`
- [ ] Verificare che i payout restino responsabilita Stripe del connected account e non logica custom app-side

## Fase 6 - Checkout flow hardening

- [ ] Verificare che il publish gate delle occurrence a pagamento resti corretto
- [ ] Verificare che il passaggio `confirm -> pending payment -> checkout -> success` sia coerente in live
- [ ] Verificare che `cancel_url` e `success_url` usino sempre il base URL corretto
- [ ] Verificare che `resume payment` continui a funzionare in live
- [ ] Verificare che l'assenza di Stripe live non rompa eventi gratuiti o pay-at-venue

## Fase 7 - Webhook hardening

- [ ] Confermare che Stripe invii al webhook gli eventi necessari
- [ ] Confermare almeno questi eventi: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `account.updated`
- [ ] Verificare la signature con `STRIPE_WEBHOOK_SECRET`
- [ ] Verificare che il route handler legga il raw body come testo
- [ ] Verificare idempotenza su `externalEventId`
- [ ] Verificare che gli eventi di connected account arrivino con `event.account`
- [ ] Verificare che il reconciliation path aggiorni organizer/account e registration ledger correttamente

## Fase 8 - Refund readiness

- [ ] Integrare il piano `11_STRIPE_AUTO_REFUND_ON_CANCELLATION_PLAN.md`
- [ ] Aggiungere supporto organizer-side a refund automatico
- [ ] Verificare webhook `charge.refunded`
- [ ] Verificare copy email su refund state

## Fase 9 - Billing and platform ops

- [ ] Aggiungere un check platform-side per contare organizer con account `PENDING`
- [ ] Aggiungere un check platform-side per contare organizer `RESTRICTED`
- [ ] Aggiungere un check platform-side per contare organizer con paid dates pubblicate ma billing non pronto
- [ ] Rendere chiaro nella organizer billing page se il blocco e di env platform oppure di onboarding organizer
- [ ] Valutare una piattaforma-side action di resync Stripe per organizer specifico

## Fase 10 - Documentation cleanup

- [ ] Correggere la documentazione che dice ancora `no Stripe Connect`
- [ ] Allineare `README.md`, `04_DATA_MODEL_AND_BUSINESS_RULES.md`, `06_OPERATIONS_TESTING_AND_RISKS.md` e handoff docs
- [ ] Documentare il charge model scelto
- [ ] Documentare env minimi realmente necessari
- [ ] Documentare la sequenza ufficiale di go-live Stripe

## Fase 11 - Go-live runbook

- [ ] Checklist env Vercel completata
- [ ] Organizer test account creato
- [ ] Organizer completa onboarding Stripe
- [ ] Organizer pubblica una data paid
- [ ] Cliente crea registrazione con online amount > 0
- [ ] Cliente completa Checkout
- [ ] Webhook conferma il pagamento
- [ ] Organizer vede ledger aggiornato in admin
- [ ] Refund testato end-to-end
- [ ] Logs e audit review completati

## Fase 12 - Tests

- [ ] Test unit su `getStripeEnvironmentState`
- [ ] Test unit su billing gates
- [ ] Test unit su checkout session request
- [ ] Test unit su connect onboarding helpers
- [ ] Test webhook per connected-account completion
- [ ] Test webhook per refund
- [ ] Test organizer billing UI states
- [ ] Test error state quando manca `STRIPE_SECRET_KEY`
- [ ] Test success state dopo env validi e account synced

## Rischi e decisioni

- [ ] Decidere se il preview fallback deve restare attivo anche in ambienti quasi-live
- [ ] Decidere se la preview deve poter aprire onboarding Stripe test oppure solo production
- [ ] Decidere il timing della migrazione Accounts v2 rispetto all'unblock immediato
- [ ] Decidere se il refund bulk occurrence richiede job infrastructure dedicata

## Definition of done

- [ ] L'organizer puo avviare Stripe onboarding senza errore di env mancante
- [ ] L'organizer puo completare onboarding fino a `charges enabled` e `payouts enabled`
- [ ] Una occurrence paid puo essere pubblicata solo quando billing gate e realmente green
- [ ] Un cliente puo pagare una registrazione in live e il ledger si aggiorna via webhook
- [ ] Il platform admin ha visibilita chiara su env, webhook e organizer readiness
- [ ] La documentazione Stripe/pagamenti del repo e coerente col runtime reale
- [ ] Il refund plan e integrato o pronto per essere implementato subito dopo
- [ ] `npm run test` passa
- [ ] `npm run verify` passa
- [ ] Deploy Vercel verificato
