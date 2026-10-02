// Web version. There is no background fetch on the web. What replaces it:
//  - while the app is open, Firestore's live listeners keep everything current and the reminder queue
//    is re-planned by notificationService.syncLocalReminders();
//  - when the app is closed, the Cloud Functions send web push ("new/changed assignment", reminders).
// So these entry points only need to exist.

export type PushData = { [key: string]: string | object } | undefined;

export async function announceNew(_assignments: unknown[], _uid: string, _enabled: boolean, _callStyle: boolean): Promise<void> {
  // New/changed assignments reach the phone as a push from the server; while the app is open the
  // person is looking at the list, which updates live.
}

export async function runBackgroundSync(): Promise<void> {}

export async function handlePush(_data: PushData): Promise<void> {
  // The service worker already showed the notification; open pages update through Firestore listeners.
}

export async function startBackgroundSync(): Promise<void> {}

export async function headlessSync(): Promise<void> {}
