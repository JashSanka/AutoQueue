# Architecture

AutoQueue has an Express/Prisma/PostgreSQL backend and a React/Vite renderer. Express routers delegate to controllers, while JWT authentication populates `req.user`; role and verified-dealer middleware enforce access boundaries. Prisma transactions protect acceptance, cancellation, audit writes, inventory mutation, and offer lifecycle transitions.

The React app centralizes HTTP behavior in `src/api/client.js`, keeps session restoration in `AuthContext`, and protects role routes. JWTs are kept in local storage because the present backend returns a bearer token rather than issuing an HTTP-only session cookie. They are never displayed or logged in the UI.

Electron has a separate main process (`frontend/electron/main.cjs`) and an isolated preload (`preload.cjs`). The renderer is the same React application: development uses `VITE_DEV_SERVER_URL`, production loads Vite's `dist/index.html`. The preload exposes only read-only platform metadata and no IPC bridge.

The renderer calls the Express API over the configured API base URL. It never accesses the Electron main process for API work. This preserves the boundary between untrusted renderer code, backend authorization, and the native desktop process.
