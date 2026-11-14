# AutoQueue

**One Queue. Multiple Dealers. Smarter Car Reservations.**

AutoQueue is a desktop-based car booking and shared queue management platform that connects customers with multiple car dealerships through a centralized system.

Customers can explore available cars, compare dealer-wise pricing, join a shared booking queue, receive offers from eligible dealers, and confirm reservations. Dealers can manage their inventory, view customer demand, and submit offers, while administrators oversee platform activity.


## Key Features

- **Car Marketplace:** Browse and compare cars across multiple dealerships.
- **Shared Queue:** Join a common queue instead of registering separately with each dealer.
- **Dealer Management:** Manage vehicle inventory, availability and pricing.
- **Dealer Offers:** Receive and respond to offers from eligible dealers.
- **Booking Management:** Confirm reservations with transparent price breakdowns.
- **Admin Dashboard:** Monitor dealers, queues, bookings and platform activity.


## Tech Stack

- **Desktop:** Electron.js
- **Frontend:** React.js, Tailwind CSS
- **Backend:** Node.js, Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JWT
# AutoQueue

AutoQueue is a shared vehicle queue platform: customers join a model/variant/city queue, verified dealers make offers, and one accepted offer becomes a price-snapshotted booking.

## Stack and layout

- `server/` — Express 5, Prisma 7, PostgreSQL, JWT, Zod
- `frontend/` — React 19, Vite, Tailwind and Electron
- `docs/` — API, Electron IPC and architecture references

## Setup

Create `server/.env` with `DATABASE_URL`, `JWT_SECRET`, optional `JWT_EXPIRES_IN`, and optional `CORS_ORIGIN`. The Prisma schema is authoritative: use the existing migrations/database configuration and do not edit the schema to run the application.

```sh
cd server && npm install && npm run dev
cd frontend && npm install && npm run dev
```

The web client proxies `/api` to `http://localhost:3000` in development. Start Electron after Vite is running with `npm run electron:dev`; build the renderer with `npm run build`; package a macOS DMG with `npm run electron:package`.

Customer, dealer, and admin roles are enforced by backend middleware. Dealer mutations require an admin-verified dealer profile. See [API documentation](docs/API_ROUTES.md), [Electron IPC documentation](docs/ELECTRON_IPC.md), and [architecture](docs/ARCHITECTURE.md).

For a local, database-backed demonstration, see [demo data instructions](docs/DEMO_DATA.md). Demo seeding is explicit and development-only; it never runs during normal startup.

Pricing and vehicle-image behavior, including the schema-backed limitations, are documented in [PRICING_AND_IMAGES.md](docs/PRICING_AND_IMAGES.md).
