// Web version of the notification layer (iPhone / Android / desktop browsers).
//
// How reminders work on the web - the one real difference from the Android app:
//  * A web page cannot schedule alarms on the phone. So the app plans the reminders with the SAME
//    planner as Android (planReminders) and stores them as small documents in
//    users/{uid}/webReminders. A small Vercel function (api/send-reminders.js), called every minute by a free scheduler,
//    sends each one as a web push when its time arrives - this works with the app closed.
//  * While the app is open, the same reminders are also shown locally from timers. Both use the same
//    notification "tag", so the person never sees the same reminder twice.
//  * On iPhone, web push only works after "Add to Home Screen" (iOS 16.4+), opened from that icon.
import firebase from '@web/firebaseApp';
import 'firebase/compat/messaging';
import firestore from '@react-native-firebase/firestore';
import { Alert } from 'react-native';
import { Assignment } from '../types';
import { combineDateTime, isValidTime } from '../utils/dates';
import { logError } from '../utils/errors';
import { planReminders } from '../utils/reminders';
import { commit } from './commit';
import { addFcmToken, removeFcmToken } from './userService';

export const CHANNEL_REMINDER = 'cshare_reminders_v2';
export const CHANNEL_CALL = 'cshare_call_v1';
export const CALL_ACTIVITY = 'com.cshare.CallActivity';

const ICON = '/icons/icon-192.png';

// ------------------------------------------------------------------ environment helpers

const supported = (): boolean =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window;

const isStandalone = (): boolean =>
  (navigator as unknown as { standalone?: boolean }).standalone === true ||
  (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);

async function swRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), 5000)),
  ]);
}

async function showLocal(title: string, body: string, tag: string, data: Record<string, string>): Promise<void> {
  const reg = await swRegistration();
  if (!reg || Notification.permission !== 'granted') return;
  await reg.showNotification(title, { body, tag, icon: ICON, data });
}

// ------------------------------------------------------------------ setup & permissions

export async function ensureChannels(): Promise<void> {
  // Android notification channels do not exist on the web.
}

export interface ReminderCapability {
  notifications: boolean;
  /** Android 12+ only; always fine on the web. */
  exactAlarms: boolean;
}

export async function getReminderCapability(): Promise<ReminderCapability> {
  return { notifications: supported() && Notification.permission === 'granted', exactAlarms: true };
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!supported()) return false;
  if (Notification.permission === 'granted') {
    await attachToken().catch(e => logError('push token', e));
    return true;
  }
  if (Notification.permission === 'denied') return false;
  // Browsers (iPhone especially) only show the question after a tap. The automatic call at app start
  // is skipped; the "Turn on notifications" button in the app asks again from a tap.
  const activation = (navigator as unknown as { userActivation?: { isActive: boolean } }).userActivation;
  if (activation && !activation.isActive) return false;
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    await attachToken().catch(e => logError('push token', e));
    return true;
  }
  return false;
}

export async function openNotificationSettings(): Promise<void> {
  Alert.alert(
    'Turn on notifications',
    isStandalone() || !/iPhone|iPad|iPod/.test(navigator.userAgent)
      ? 'Open your phone’s Settings, find CSHARE (or your browser) under Notifications, and switch on “Allow Notifications”. Then come back to CSHARE.'
      : 'On iPhone, notifications only work once CSHARE is added to your Home Screen:\n\n1. In Safari, tap the Share button.\n2. Choose “Add to Home Screen”.\n3. Open CSHARE from the new icon and tap “Turn on notifications”.',
    [{ text: 'OK' }],
  );
}

export async function openExactAlarmSettings(): Promise<void> {
  // not applicable on the web
}

// ------------------------------------------------------------------ push token

let ctx: { uid: string; onData: (data: { [k: string]: string | object } | undefined) => void } | null = null;
let webToken: string | null = null;
let tokenFor: string | null = null;

async function attachToken(): Promise<void> {
  const c = ctx;
  if (!c || !supported() || Notification.permission !== 'granted') return;
  if (tokenFor === c.uid && webToken) return;
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  if (!vapidKey) {
    logError('web push', new Error('VITE_FIREBASE_VAPID_KEY is not set, so push messages are off'));
    return;
  }
  if (!firebase.messaging.isSupported()) return;
  const reg = await swRegistration();
  if (!reg) return;
  const token = await firebase.messaging().getToken({ vapidKey, serviceWorkerRegistration: reg });
  if (!token) return;
  webToken = token;
  tokenFor = c.uid;
  await addFcmToken(c.uid, token); // the existing Cloud Function then also reaches this browser
  // Reminders planned before the token existed can now be stored.
  if (lastAssignmentArgs) syncLocalReminders(lastAssignmentArgs.assignments, lastAssignmentArgs.uid, lastAssignmentArgs.opts).catch(e => logError('resync', e));
  if (lastReportArgs) syncReportReminder(lastReportArgs.dates, lastReportArgs.monthKey, lastReportArgs.done, lastReportArgs.opts).catch(e => logError('resync report', e));
}

export async function registerPush(uid: string, onData: (data: { [k: string]: string | object } | undefined) => void): Promise<() => void> {
  ctx = { uid, onData };
  // Push messages reach open pages through the service worker.
  const onMessage = (e: MessageEvent) => {
    if (e.data?.type === 'cshare-push') ctx?.onData(e.data.data);
  };
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', onMessage);
  await attachToken().catch(e => logError('push registration', e));
  return () => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.removeEventListener('message', onMessage);
    ctx = null;
  };
}

export async function unregisterPush(uid: string): Promise<void> {
  try {
    if (webToken) {
      await clearQueue(uid);
      await removeFcmToken(uid, webToken);
      await firebase.messaging().deleteToken();
    }
  } catch (e) {
    logError('unregister push', e);
  } finally {
    webToken = null;
    tokenFor = null;
  }
}

// ------------------------------------------------------------------ reminder queue (users/{uid}/webReminders)

interface QueueItem {
  id: string;
  kind: 'assignment' | 'report';
  assignmentId?: string;
  fireAt: Date;
  title: string;
  body: string;
  callStyle: boolean;
}

const queue = (uid: string) => firestore().collection('users').doc(uid).collection('webReminders');

function tokenKey(token: string): string {
  let h = 5381;
  for (let i = 0; i < token.length; i++) h = ((h << 5) + h + token.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const safeId = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, '_');

async function reconcileQueue(uid: string, kind: QueueItem['kind'], wanted: QueueItem[]): Promise<void> {
  const token = webToken;
  if (!token) return;
  const prefix = tokenKey(token);
  const wantedById = new Map(wanted.map(w => [`${prefix}_${safeId(w.id)}`, w]));

  let existing: { id: string; ref: unknown }[];
  try {
    const snap = await queue(uid).where('token', '==', token).where('kind', '==', kind).get();
    existing = snap.docs.map(d => ({ id: d.id, ref: d.ref }));
  } catch (e) {
    logError('reminder queue read', e);
    return;
  }
  const have = new Set(existing.map(e => e.id));

  const ops: ((b: ReturnType<ReturnType<typeof firestore>['batch']>) => void)[] = [];
  existing.forEach(e => {
    if (!wantedById.has(e.id)) ops.push(b => b.delete(e.ref as never));
  });
  wantedById.forEach((w, id) => {
    if (have.has(id)) return;
    ops.push(b =>
      b.set(queue(uid).doc(id), {
        kind: w.kind,
        token,
        assignmentId: w.assignmentId ?? null,
        title: w.title,
        body: w.body,
        callStyle: w.callStyle,
        fireAt: firestore.Timestamp.fromDate(w.fireAt),
        createdAt: firestore.FieldValue.serverTimestamp(),
      }),
    );
  });

  for (let i = 0; i < ops.length; i += 400) {
    const batch = firestore().batch();
    ops.slice(i, i + 400).forEach(op => op(batch));
    await commit(batch.commit(), 2000);
  }
}

async function clearQueue(uid: string): Promise<void> {
  if (!webToken) return;
  const snap = await queue(uid).where('token', '==', webToken).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = firestore().batch();
    snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await commit(batch.commit(), 2000);
  }
}

// ------------------------------------------------------------------ reminders while the app is open

const inPage: Record<QueueItem['kind'], QueueItem[]> = { assignment: [], report: [] };
const timers: number[] = [];
const IN_PAGE_WINDOW_MS = 6 * 60 * 60 * 1000;

function setInPage(kind: QueueItem['kind'], items: QueueItem[]) {
  inPage[kind] = items;
  timers.splice(0).forEach(t => window.clearTimeout(t));
  const now = Date.now();
  [...inPage.assignment, ...inPage.report].forEach(item => {
    const wait = item.fireAt.getTime() - now;
    if (wait <= 0 || wait > IN_PAGE_WINDOW_MS) return;
    timers.push(
      window.setTimeout(() => {
        showLocal(item.title, item.body, `${tokenKey(webToken ?? 'local')}_${safeId(item.id)}`, item.assignmentId ? { assignmentId: item.assignmentId } : {}).catch(e => logError('local reminder', e));
      }, wait),
    );
  });
}

// ------------------------------------------------------------------ assignment reminders

async function resolveMeetingStartTimes(assignments: Assignment[]): Promise<Map<string, Date>> {
  const result = new Map<string, Date>();
  const weekIds = Array.from(new Set(assignments.map(a => a.weekId).filter(Boolean)));
  if (!weekIds.length) return result;

  const snapshots = await Promise.all(
    weekIds.map(async weekId => {
      try {
        return [weekId, await firestore().collection('weeks').doc(weekId).get()] as const;
      } catch (error) {
        logError(`meeting start read ${weekId}`, error);
        return [weekId, null] as const;
      }
    }),
  );
  const weeks = new Map(snapshots);

  for (const assignment of assignments) {
    const data = weeks.get(assignment.weekId)?.data();
    if (!data) continue;
    const candidates: Array<{ date?: unknown; startTime?: unknown }> = [];
    if (assignment.meeting === 'midweek' || assignment.meeting === 'weekend') {
      if (data[assignment.meeting]) candidates.push(data[assignment.meeting]);
    } else {
      if (data.midweek) candidates.push(data.midweek);
      if (data.weekend) candidates.push(data.weekend);
    }
    const sheet = candidates.find(
      c => c && typeof c.date === 'string' && c.date === assignment.date && typeof c.startTime === 'string' && isValidTime(c.startTime),
    );
    if (sheet && typeof sheet.date === 'string' && typeof sheet.startTime === 'string') {
      result.set(assignment.id, combineDateTime(sheet.date, sheet.startTime));
    }
  }
  return result;
}

export interface SyncResult {
  scheduled: number;
  blocked?: 'notifications';
}

let lastAssignmentArgs: { assignments: Assignment[]; uid: string; opts: { remindersEnabled: boolean; callStyle: boolean } } | null = null;

/** Makes the stored reminders match the assignments Firestore last delivered. Safe to call repeatedly. */
export async function syncLocalReminders(
  assignments: Assignment[],
  uid: string,
  opts: { remindersEnabled: boolean; callStyle: boolean },
): Promise<SyncResult> {
  lastAssignmentArgs = { assignments, uid, opts };
  const cap = await getReminderCapability();
  if (!cap.notifications) return { scheduled: 0, blocked: 'notifications' };

  const meetingStarts = opts.remindersEnabled ? await resolveMeetingStartTimes(assignments) : new Map<string, Date>();
  const planned = opts.remindersEnabled
    ? assignments.flatMap(a => planReminders(a, uid, { now: new Date(), callStyle: opts.callStyle, meetingStartAt: meetingStarts.get(a.id) }))
    : [];

  const items: QueueItem[] = planned.map(p => ({
    id: p.id,
    kind: 'assignment',
    assignmentId: p.assignmentId,
    fireAt: p.fireAt,
    title: p.title,
    body: p.body,
    callStyle: p.callStyle,
  }));
  setInPage('assignment', items);
  await reconcileQueue(uid, 'assignment', items);
  return { scheduled: items.length };
}

export async function cancelAllLocalReminders(): Promise<void> {
  timers.splice(0).forEach(t => window.clearTimeout(t));
  inPage.assignment = [];
  inPage.report = [];
  lastAssignmentArgs = null;
  lastReportArgs = null;
  // the stored copies for this browser are removed by unregisterPush() at sign-out
}

// ------------------------------------------------------------------ "time to send your report"

let lastReportArgs: { dates: Date[]; monthKey: string; done: boolean; opts: { remindersEnabled: boolean; callStyle: boolean } } | null = null;

export async function syncReportReminder(
  dates: Date[],
  monthKey: string,
  alreadySubmitted: boolean,
  opts: { remindersEnabled: boolean; callStyle: boolean },
): Promise<void> {
  lastReportArgs = { dates, monthKey, done: alreadySubmitted, opts };
  const cap = await getReminderCapability();
  if (!cap.notifications) return;
  const uid = firebase.auth().currentUser?.uid;
  if (!uid) return;

  const wanted = opts.remindersEnabled && !alreadySubmitted ? dates : [];
  const items: QueueItem[] = wanted.map((at, i) => {
    const callStyle = i === wanted.length - 1 && opts.callStyle;
    return {
      id: `cshare-report|${monthKey}|${at.getTime()}`,
      kind: 'report',
      fireAt: at,
      title: 'CSHARE',
      body: callStyle ? "Your monthly report hasn't been sent yet. Please check the CSHARE app." : 'Reminder: send your monthly field service report before the month ends.',
      callStyle,
    };
  });
  setInPage('report', items);
  await reconcileQueue(uid, 'report', items);
}

/** For the "Send me a test reminder" buttons in Settings. */
export async function scheduleTestReminder(callStyle: boolean, seconds = 8): Promise<void> {
  const title = 'CSHARE';
  const body = callStyle ? 'This is a test. You have an assignment. Please check the CSHARE app.' : 'This is a test reminder.';
  const tag = `cshare-test|${Date.now()}`;
  const uid = firebase.auth().currentUser?.uid;
  window.setTimeout(() => {
    showLocal(title, body, tag, {}).catch(e => logError('test reminder', e));
  }, seconds * 1000);
  // Also send it through the server, so the test proves the closed-app path as well.
  if (uid && webToken) {
    await commit(
      queue(uid).doc(`${tokenKey(webToken)}_${safeId(tag)}`).set({
        kind: 'assignment',
        token: webToken,
        assignmentId: null,
        title,
        body,
        callStyle,
        fireAt: firestore.Timestamp.fromDate(new Date(Date.now() + seconds * 1000)),
        createdAt: firestore.FieldValue.serverTimestamp(),
      }),
      1500,
    );
  }
}

// ------------------------------------------------------------------ opening from a notification

export function listenForNotificationPress(onOpen: (assignmentId: string) => void, onGroupOpen?: (groupId: string) => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {};
  const handler = (e: MessageEvent) => {
    if (e.data?.type !== 'cshare-open') return;
    const d = (e.data.data ?? {}) as Record<string, unknown>;
    if (typeof d.groupId === 'string' && d.groupId && onGroupOpen) onGroupOpen(d.groupId);
    else if (typeof d.assignmentId === 'string' && d.assignmentId) onOpen(d.assignmentId);
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}

/** If the app was started by tapping a notification, the service worker put the target in the address. */
export async function getLaunchNotificationData(): Promise<Record<string, unknown> | undefined> {
  const params = new URLSearchParams(window.location.search);
  const assignmentId = params.get('a');
  const groupId = params.get('g');
  if (!assignmentId && !groupId) return undefined;
  window.history.replaceState(null, '', window.location.pathname);
  return { ...(assignmentId ? { assignmentId } : {}), ...(groupId ? { groupId } : {}) };
}

export async function getLaunchAssignmentId(): Promise<string | undefined> {
  const data = await getLaunchNotificationData();
  const id = data?.assignmentId;
  return typeof id === 'string' ? id : undefined;
}
