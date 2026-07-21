# Bantay Budget React migration

This directory contains the incremental React replacement for the existing
Bantay Budget frontend. The legacy application remains at the repository root
until the React version passes feature-parity testing and the migration PR is
approved.

## Local development

```bash
npm install
npm run dev
```

Vite normally serves the app at `http://localhost:5173`. The React preview uses
the existing production Firebase project, so test financial mutations carefully.

## Production validation

```bash
npm run check
```

This creates the Vite production build and validates the manifest, install
icons, combined offline/FCM service worker, and critical migration invariants.

## Firebase preview channel

From the repository root, after building the React app:

```bash
firebase hosting:channel:deploy react-migration \
  --config firebase.react-preview.json \
  --project expenses-monitoring-4540e
```

This uses `react-app/dist` and does not replace the production Hosting release.
Do not deploy the React build to the live channel until the parity checklist is
complete and the draft pull request is approved.

## Architecture

- `src/components` — screens, cards, drawers, and dialogs
- `src/hooks` — Firestore listeners, recurring generation, and inactivity lock
- `src/services` — backup, push registration, and service-worker registration
- `public` — install icons, PWA manifest, and combined offline/FCM worker
- `scripts/validate-build.mjs` — production/PWA validation

See [MIGRATION.md](./MIGRATION.md) for the current parity checklist.
