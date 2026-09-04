# Bantay Budget

Bantay Budget is a mobile-first personal finance Progressive Web App for tracking income, expenses, recurring bills, and available funds. It is built with React and Firebase and is available at [bantaybudget.fyi](https://bantaybudget.fyi).

## Features

### Budget tracking

- Add, edit, delete, search, and filter cash inflows and expenses
- Track expenses as **Paid**, **Pending**, or **On Hold**
- View Total Income, Total Paid, Total Pending, Total On Hold, Allocable Balance, and Remaining Balance
- Switch between monthly records with compact Month and Year controls
- Choose US Dollar (USD) or Philippine Peso (PHP)
- Swipe transaction rows for quick actions on mobile

### Dashboard and analytics

- Animated financial summary cards and progress indicators
- Financial health score, health summary, and contextual budget insights
- Monthly financial analytics and expense-category breakdowns
- Running transaction balances and built-in calculator
- Daily rotating finance tips

### Recurring expenses

- Create, edit, pause, resume, and delete recurring templates
- Generate one duplicate-safe expense per template and billing month
- Generate upcoming expenses seven days before their due date
- Start generated expenses as **On Hold** and automatically move them to **Pending** three days before they are due
- Clamp billing dates safely for shorter months

### Notifications

- In-app recurring-due notifications with unread badges
- Web push notifications across registered devices
- Optional, duplicate-safe email reminders sent three days before recurring dues
- Scheduled daily reminder processing through Firebase Cloud Functions
- Mark individual or all notifications as read and clean up older notifications
- App-icon badge counts on supported devices
- Resend transactional email delivery with credentials stored in Firebase Secret Manager

### Authentication and security

- Firebase email/password authentication
- Required email verification, password reset, and verification-email resend
- Verified email-address changes protected by current-password reauthentication
- Permanent self-service account deletion with recursive user-data cleanup
- Optional Face ID/passkey login on enrolled devices using WebAuthn
- Automatic Firebase sign-out after three minutes of inactivity
- Persistent inactivity checks when the PWA is suspended, closed, or reopened
- Email/password remains available as a recovery and fallback method
- User-scoped Firestore security rules
- Passkey challenges and public credentials are server-managed; biometric data never leaves the device
- Account deletion removes the Auth user and the complete Firestore user document tree

### PWA and data tools

- Installable on iOS, Android, and desktop
- Offline app-shell support with Firebase background messaging
- Responsive light and dark themes
- Pull-to-refresh feedback on mobile
- Selected-month CSV export
- JSON backup and restore
- Custom confirmations, loading states, and mobile-friendly dialogs

## Technology

- React 19 and Vite
- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Functions (Node.js 24)
- Firebase Cloud Messaging
- Firebase Hosting
- WebAuthn/passkeys with SimpleWebAuthn
- Resend email API
- Progressive Web App manifest and service worker

## Project structure

```text
react-app/              React and Vite frontend
  src/                  Components, hooks, services, and styles
  public/               PWA assets and combined service worker source
  scripts/              Production/PWA validation
functions/              Scheduled, push, and WebAuthn Cloud Functions
firestore.rules         User-scoped Firestore security rules
firestore.indexes.json  Firestore indexes
firebase.json           Production Firebase configuration
firebase.react-preview.json
                        Preview-channel Hosting configuration
```

The legacy root frontend remains in the repository for historical reference and rollback. Production Hosting serves `react-app/dist`.

## Local development

Requirements:

- Node.js 24 for Firebase Functions
- Firebase CLI
- Access to a Firebase project with Authentication, Firestore, Functions, Hosting, and Cloud Messaging configured

Install dependencies and start Vite:

```bash
npm --prefix functions ci
npm --prefix react-app ci
npm --prefix react-app run dev
```

The frontend supports these optional Vite environment variables:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

## Validation

Run the production build and automated PWA checks:

```bash
npm --prefix react-app run check
node --check functions/index.js
```

The validation checks the production build, install manifest, combined offline/messaging worker, recurring-generation invariants, automatic sign-out behavior, Face ID login UI, financial calculations, CSV export, and retained feature parity.

## Firebase preview deployment

Build the React app before deploying so the preview does not reuse an older `dist` directory:

```bash
npm --prefix react-app run check
firebase deploy --only functions
firebase hosting:channel:deploy <channel-name> \
  --config firebase.react-preview.json
```

Passkeys are tied to their website domain, so a Firebase preview URL requires its own passkey enrollment.

## Production deployment

From the repository root:

```bash
git checkout main
git pull origin main

npm --prefix functions ci
npm --prefix react-app ci
npm --prefix react-app run check

firebase deploy --only functions,firestore:rules,hosting
```

The Cloud Functions service account needs the **Service Account Token Creator** role so Firebase can create custom tokens after successful passkey verification.

Email reminders require a Resend API key stored in Firebase Secret Manager:

```bash
firebase functions:secrets:set RESEND_API_KEY
```

The sending domain must be verified in Resend. Reminder messages are sent from `reminders@bantaybudget.fyi`.

## Privacy and security notes

- Financial records are stored under each authenticated user's Firestore document tree.
- Firestore rules restrict users to their own supported collections.
- Exported CSV and JSON backup files remain on the user's device unless the user chooses to share them.
- Bantay Budget stores passkey public-key material—not facial images, fingerprints, or device passcodes.
- Face ID, fingerprint, and passcode verification are performed locally by the operating system.

## License

See [LICENSE](LICENSE).
