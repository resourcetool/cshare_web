# CSHARE web app (iPhone, hosted on Vercel, no paid Firebase plan)

Standalone web app using the same Firebase project as the Android app (shared accounts and data).

## Setup

1. Push the files of this folder to a GitHub repo (main branch). Import it on vercel.com (Add New > Project).
2. Vercel environment variables (Settings > Environment Variables), then deploy:
   - `VITE_FIREBASE_CONFIG`  one-line JSON of the Firebase web config (quoted keys)
   - `VITE_FIREBASE_VAPID_KEY`  Firebase console > Project settings > Cloud Messaging > Web Push certificates
   - `FIREBASE_SERVICE_ACCOUNT`  Project settings > Service accounts > Generate new private key; paste the whole JSON
   - `CRON_SECRET`  any long random text you invent
3. Firebase console > Authentication > Settings > Authorized domains: add your `*.vercel.app` domain.
4. Firestore > Rules: paste the contents of `firestore.rules` and Publish.
   Firestore > Indexes > Single field > Add exemption: collection group `webReminders`, field `fireAt`,
   enable Ascending for Collection group scope.
5. Reminders while the app is closed: on cron-job.org (free) create a job with the URL
   `https://<your-domain>/api/send-reminders?key=<CRON_SECRET>`, scheduled every 1 minute.
6. iPhone (iOS 16.4+): open the site in Safari > Share > Add to Home Screen > open from the icon > sign in >
   Profile > Turn on notifications.

## Limits (no Cloud Functions without the Blaze plan)

- No instant push when an admin adds or changes an assignment. Reminders are planned when the app is opened,
  so people should open CSHARE after assignments change.
- The final "call-style" reminder is a prominent notification, not a full-screen call.
- No automatic calendar sync; "Add to phone" downloads a calendar file.

Source: `src/` is the Android app source plus web replacements (`src/firebase.ts`, `services/notificationService.ts`,
`backgroundSync.ts`, `calendarService.ts`, `components/{DateTimeField,WeekNav,SheetActions,AppUpdateNotice}.tsx`);
`shims/` replaces native packages.
