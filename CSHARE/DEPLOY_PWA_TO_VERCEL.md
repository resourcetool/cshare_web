# CSHARE: GitHub Actions to Vercel

## This archive is the complete project tree

Extract the contents of this archive into the root of your existing `resourcetool/cshare-app` repository. Keep the `android/`, `src/`, Firebase rules, functions, and all existing project files. Do not upload the ZIP as the only repository file and expect the PWA workflow to run: GitHub Actions must see the actual `web/` and `.github/workflows/deploy-pwa.yml` folders in the repository.

If you are using the repository's existing `CSHARE tasks` workflow to unpack a zip, the archive expected by that older workflow must be named `CSHARE.zip` and contain a top-level `CSHARE/` folder. After unpacking, run the PWA deployment workflow separately.

## Required GitHub repository secrets

Create these three repository secrets under Settings → Secrets and variables → Actions:

- `VERCEL_TOKEN`: a Vercel access token.
- `VERCEL_ORG_ID`: the Vercel organization/team ID that owns the project.
- `VERCEL_PROJECT_ID`: the Vercel project ID for the CSHARE PWA.

Never put these values in source code or commit them.

## Vercel setup

Create/link a Vercel project for the `web/` directory. Framework: Vite. Root Directory: `web`. Build command: `npm run build`. Output directory: `dist`. The included `web/vercel.json` handles SPA routes and prevents long-term caching of the service worker.

Then go to GitHub → Actions → **Build and deploy CSHARE iPhone PWA** → **Run workflow**. The workflow installs dependencies, type-checks and builds the app, uploads the build artifact, and deploys to Vercel when all three secrets exist. If secrets are missing, it builds and uploads the artifact but skips deployment.

## Critical status note

This package includes the original Android project and an initial PWA client. The PWA has not been verified as a complete, exact copy of Android and has not been certified on a real iPhone. Read `web/FEATURE_PARITY.md`. Do not deploy Firestore rules from the web workflow. Verify the configured Firebase project (`cshare-2fac4`) and test with a separate account before any real-user rollout.
