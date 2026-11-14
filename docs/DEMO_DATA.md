# Development demo data

The demo seeder is `server/src/scripts/seedDemo.js`. It only runs when `DEMO_SEED=true` is explicitly set, never runs automatically, uses upserts, does not delete/reset data, and leaves existing matching users and inventory untouched.

Run it against a local development database only:

```sh
cd server
DEMO_SEED=true npm run seed:demo
```

All development demo accounts use password `DemoPass123!`:

|Role|Email|
|---|---|
|Admin|`admin@autoqueue.demo`|
|Customer|`customer@autoqueue.demo`|
|Dealer|`mumbai.dealer@autoqueue.demo`|

The seed supplies ten catalogue models, verified dealership accounts in Mumbai, Pune, Bengaluru, Delhi, and Hyderabad, and a mixture of available and zero-stock inventory. It does not seed a pre-arranged queue, offer, or booking: use the customer and dealer portals to exercise the real workflow without bypassing authorization.

No destructive demo reset command is provided. To preserve existing user data safely, rerun the idempotent seed instead of deleting data.
