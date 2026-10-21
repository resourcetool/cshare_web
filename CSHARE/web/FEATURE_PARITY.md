# CSHARE web-client parity status

Status as of this archive: first functional PWA implementation; not production-certified and not an exact clone yet.

| Area | Current implementation | Remaining work |
|---|---|---|
| Firebase email/password authentication | Implemented using supplied web config | Test against intended live Firebase project |
| Self-signup / inactive approval | Creates profile matching supplied rules and blocks inactive users | Validate full account lifecycle with real test accounts |
| Member home | Dashboard, upcoming assignments, report counts, group summary | Compare visual details and all widgets with original app |
| Assignments | Personal list, response status, admin list/create/delete | Reproduce full assignment details, cannot-do reason workflow, dependent assignees, qualification checks, reminders, automatic assignment suggestions |
| Meeting sheets | Reads and displays available weeks and both meeting sheets | Full admin sheet editing/planning, row editor, publishing, scheduling, sheet actions |
| Monthly reports | Creates a monthly report under `${uid}_${monthKey}` | Admin correction UI; report correction must respect existing rules |
| Daily pioneer entries | Create/list/delete own daily entries | Match original validations, edit flows, and offline testing |
| Member administration | Admin can set role, active state, reporting type | Qualifications, group assignment, secretary/developer fields, dependents and complete edit UI |
| Groups | Displays groups, membership count and overseer | Create/edit/delete groups, assign members and overseers |
| Group overseer report access | Uses groupId-scoped query when profile has groupId | Verify overseer access and secretary/admin rules with emulator tests |
| Offline | Firestore persistent web cache where supported; shell service worker | Robust outbox/conflict handling and actual airplane-mode test matrix |
| PWA install | Manifest, icons, service worker, iOS metadata | Deploy HTTPS and verify installation on actual iPhone |
| Reminders / push | Online/offline indicator only | Web push permission/service worker messaging, if suitable; native full-screen call-style alarm cannot be reproduced exactly in PWA |
| Calendar / printing / emergency email | Not yet reproduced | Implement browser equivalents after comparing original workflows |
| Android app and backend rules | Original source/rules retained unchanged | Regression test Android and confirm the correct Firebase project before deployment |

Do not deploy the existing root Firestore rules from this web folder. This web client uses the rules supplied by the owner and should be tested with a separate test account before being used by the congregation.
