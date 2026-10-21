# CSHARE iPhone PWA build notes

A separate PWA implementation is located in `web/`. The original React Native Android application remains in its original directories. Root Firestore rules, indexes, and Cloud Functions have not been changed.

Read `web/README.md` for installation, build, and deployment instructions, and `web/FEATURE_PARITY.md` for honest implementation status and outstanding parity work.

This is an initial working-source delivery, not a certified production release. Dependency installation timed out in the current environment, so a dependency-backed production build and actual iPhone test could not be completed here. Do not distribute it to all congregation users until it has been built, tested with a separate account, and checked on an iPhone.
