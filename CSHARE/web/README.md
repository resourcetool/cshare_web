# CSHARE iPhone PWA — implementation build

This is a separate Vite + React web client inside the original CSHARE project. It does not replace the Android app or modify the supplied Firestore rules/indexes/Cloud Functions.

## Firebase

The web config supplied by the project owner is in `src/ui/firebase.ts`. Firebase web API keys are client configuration, not service-account secrets. Authentication and Firestore operations are still constrained by the existing Firestore security rules.

The configured project ID is `cshare-2fac4`. Confirm this is the intended live project before using real accounts. Do not deploy or change Firestore rules from this folder.

## Run locally

```sh
cd web
npm install
npm run dev
```

Build for hosting:

```sh
npm run build
```

Deploy the contents of `web/dist` to an HTTPS static host such as Firebase Hosting, Vercel, or GitHub Pages configured for SPA fallback. The existing Android app is unchanged by these instructions.

## iPhone installation

1. Deploy the PWA to an HTTPS URL.
2. Open that URL in Safari on the iPhone.
3. Tap Share → Add to Home Screen.
4. Launch CSHARE from the Home Screen.

## Current implementation coverage

Implemented in this first web build: Firebase email/password sign-in and sign-up; inactive-account approval gate; role-aware navigation; member-facing assignments and response status; administrator assignment creation/deletion; weekly sheet viewing; monthly report creation; private daily pioneer service entries; member activation/role/reporting-type administration; report review; group overview; profile and online/offline indicators; installable PWA manifest and service worker shell caching.

Important limitations: this is a functional initial PWA implementation, not yet a verified pixel-perfect or feature-complete clone. The original Android app has richer meeting-sheet planning/editing, automatic assignment suggestions, dependent assignment flows, notification scheduling, Android full-screen call-style reminders, native calendar integration, and other native workflows. These are not fully reproduced here. iOS PWA push notifications and closed-app background execution are not implemented. Weekly sheets are currently read-only in the web UI. Group creation/editing and admin correction of monthly reports need further parity work. The app has not been verified on an actual iPhone in this environment.

## Data safety notes

- Do not deploy modified Firestore rules as part of the web deployment.
- The existing rules permit users to create their monthly report document but only admins to update an existing report. This client therefore should not be used to overwrite an already-submitted report; corrections must be handled through an authorized administrator workflow.
- Firestore web persistent cache is enabled where supported. It is not a guarantee that every operation will work offline. Test synchronization/conflicts before relying on it for important reports.
- Browser PWA service-worker caching caches the app shell, not private report data in custom storage.


## GitHub Actions → Vercel production deployment

The repository includes `.github/workflows/deploy-pwa.yml`. It runs on pushes to `main`/`master` that change `web/**`, and can also be started manually from **GitHub → Actions → Build and deploy CSHARE iPhone PWA → Run workflow**.

### One-time setup

1. Create a Vercel project and set its **Root Directory** to `web` (or use the Vercel project created for this PWA). Use Vite as the framework and `npm run build` as the build command. The output directory is `dist`.
2. In Vercel project settings, find the Vercel **Organization ID** and **Project ID**. Create a Vercel access token.
3. In GitHub repository **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
4. Commit the complete project files to the repository's `main` or `master` branch.
5. Open the **Actions** tab and run the workflow manually, or push a change under `web/`.
6. Check that the workflow's build step succeeds and the deployment step reports a Vercel production URL. If the Vercel secrets are absent, the workflow still builds and uploads `dist` as an artifact but skips deployment.

The workflow installs dependencies, runs `npm run build` (which type-checks and builds with Vite), uploads `web/dist` as a recovery artifact, then deploys the prebuilt output to Vercel. It does not deploy Firestore rules or Cloud Functions.

### Safety and release gate

- The Firebase web configuration is public client configuration; never add service-account JSON or private keys to the web app.
- Confirm `projectId: cshare-2fac4` is the intended Firebase project before testing real users.
- Do not deploy the supplied Firestore rules as part of the Vercel workflow.
- Use a separate test account and verify rules, authentication, reports, and assignment responses before sharing the URL with congregation users.
- A successful build/deployment does **not** mean feature parity is complete. See `FEATURE_PARITY.md`; the current web client is an initial implementation and has not been certified on a real iPhone.

### iPhone installation

After deployment succeeds, open the Vercel HTTPS URL in Safari on the iPhone, tap **Share → Add to Home Screen**, then launch CSHARE from the Home Screen.
