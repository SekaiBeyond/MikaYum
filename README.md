# MikaYum

Bilingual (EN / 简体中文) maid cafe ordering system.

- **Customers** scan a per-table QR to browse the menu, customize items, and place orders without mandatory login.
- **Wait staff / maids** log in to assist customers and mark items delivered.
- **Kitchen** sees a live queue and marks orders ready.
- **Admin** manages the menu, tables, staff, and reports.

Payment is settled at a counter — the app tracks unpaid balances per table only.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Firebase: Firestore, Auth, Hosting, Cloud Functions
- npm workspaces

## Workspace layout

```
apps/web/        # Customer / staff / kitchen / admin SPA
functions/       # Cloud Functions (placeOrder, status transitions, etc.)
firestore.rules  # Security rules
firebase.json    # Hosting + Functions + Emulators config
```

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Firebase project

1. Go to <https://console.firebase.google.com/> → **Add project** → name it (e.g. `mikayum-dev`).
2. Skip Google Analytics (not needed).
3. **Build → Firestore Database** → Create database → start in production mode.
4. **Build → Authentication** → Get started → enable **Email/Password** and **Anonymous** sign-in providers.
5. **Build → Storage** → Get started (default rules; we'll lock these down).
6. **Project settings (gear) → General → Your apps → Web (`</>`)** → register an app named `web`. Copy the config snippet.

Then:

```bash
cp .env.example apps/web/.env.local
# Fill in the VITE_FIREBASE_* values from the config snippet you just copied.

# Link this repo to the Firebase project
npx firebase login
npx firebase use --add        # pick your project, alias it as "dev"
```

### 3. Run locally against the emulator

```bash
npm run dev:emulators
```

- Web app: <http://localhost:5173>
- Emulator UI: <http://localhost:4000>

The emulator stores no real data and lets you reset state freely. Set `VITE_USE_EMULATORS=0` in `.env.local` to point at the real dev project instead.

### 4. Deploy

```bash
npm run deploy
```

This builds the web app and functions, then runs `firebase deploy` to Hosting + Functions + Firestore rules.

## Roles

- **Customer** — anonymous Firebase auth, auto on first QR scan.
- **Staff / Kitchen / Admin** — email/password. Roles set via Firebase custom claims by an admin (see `functions/src/admin.ts → setStaffRole`).

## Status

🚧 In active development. Currently in **M1 — Scaffold & infra**. See plan file for milestones.
