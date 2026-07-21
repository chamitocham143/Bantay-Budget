# React migration status

The React application is developed on `agent/react-migration` and targets the
`develop` branch through draft pull request #1. The root legacy app remains the
production implementation.

## Completed

- Firebase email/password authentication and verified-email gate
- User profiles and browser-local authentication persistence
- Dark/light theme and splash loading state
- Live inflow, expense, recurring-template, and notification listeners
- Month filtering and all six financial calculations
- Inflow and regular-expense create/edit/delete workflows
- Direct Paid, Pending, and On Hold status updates
- Duplicate-safe monthly recurring generation and template management
- Notification center, unread badge, retention cleanup, and multi-device FCM
- Profile drawer, Settings, backup/restore, FAQ, and About pages
- Strict three-minute inactivity-only app lock
- Installable PWA manifest, icons, offline shell, and Firebase Messaging worker
- Firebase preview-channel configuration and optimized production chunks

## Remaining parity review

- CSV export from the selected month
- Rotating daily finance-tip card
- Pull-to-refresh animation (Firestore listeners already update data live)
- Developer-mode test-push shortcut
- Registration password visibility toggle
- Device testing: iOS installed PWA, Android installed PWA, and desktop browsers
- Preview-channel testing of offline startup, push opt-in/out, and app upgrades
- Firestore mutation testing with a dedicated test account before production

## Production cutover checklist

1. Resolve or explicitly waive every remaining parity item.
2. Test login, verification, reset, CRUD, recurring generation, notifications,
   backup/restore, app lock, offline startup, and installation on real devices.
3. Export a production backup before the first React Hosting release.
4. Deploy to a Firebase preview channel and complete acceptance testing.
5. Update the production Hosting `public` directory to `react-app/dist` only
   after approval.
6. Keep the legacy release tag available for immediate rollback.
