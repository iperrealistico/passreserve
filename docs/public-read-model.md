# Public read model

`PASSRESERVE_PUBLIC_READ_MODEL` controls the database read path used by public
organizer, event, and registration-entry pages:

- unset, invalid, or `legacy`: the previous read path;
- `v2`: the bounded public read model.

V2 reads only published organizer data, public events, active ticket
categories, published future occurrences, and the five registration fields
required for capacity. It does not load attendee records, registration items,
payment ledgers, private/draft events, past occurrences, cancelled
registrations, or expired holds.

Capacity rules remain shared and covered by parity tests: confirmed,
attended/no-show, unexpired confirmation holds, and unexpired payment holds
consume their quantity; cancelled and expired pending registrations do not.

All registration creation, confirmation, Stripe, webhook, admin, email, cron,
and database mutation paths continue to use their existing transactional
read/write logic.

## Rollout and rollback

Keep Production on `legacy` while testing Preview with `v2`. After route and
capacity parity checks, set Production to `v2` and redeploy. To roll back,
restore `PASSRESERVE_PUBLIC_READ_MODEL=legacy` and redeploy the last known-good
commit. No schema or data migration is involved.
