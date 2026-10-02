// Web version. Browsers cannot read or write the phone's calendar, so automatic calendar sync is not
// available. "Add to phone" on an assignment instead downloads a calendar file (.ics) which iPhone
// opens straight in Calendar.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Assignment, AppSettings, Week } from '../types';
import { eventFor } from '../utils/calendarPlan';
import { logError } from '../utils/errors';

export interface DeviceCalendar {
  id: number;
  name: string;
  account: string;
}

export interface CalendarPrefs {
  enabled: boolean;
  calendarId?: number;
  alerts: boolean;
}

const PREFS_KEY = 'cshare.calprefs.v1';

export async function getCalendarPrefs(): Promise<CalendarPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (raw) return { enabled: false, alerts: true, ...(JSON.parse(raw) as Partial<CalendarPrefs>) };
  } catch {
    // fall through to defaults
  }
  return { enabled: false, alerts: true };
}

export async function setCalendarPrefs(p: CalendarPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

export async function hasCalendarPermission(): Promise<boolean> {
  return false;
}

export async function requestCalendarPermission(): Promise<boolean> {
  return false;
}

export async function listCalendars(): Promise<DeviceCalendar[]> {
  return [];
}

export function syncCalendar(
  _assignments: Assignment[],
  _uid: string,
  _settings: Pick<AppSettings, 'midweekName' | 'weekendName'>,
  _weeks: Week[] = [],
): Promise<void> {
  return Promise.resolve();
}

export async function clearCalendar(_uid: string): Promise<void> {}

export type AddToPhoneResult =
  | { ok: true; calendarName: string }
  | { ok: false; reason: 'unsupported' | 'permission_denied' | 'no_calendar' | 'error' };

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const utc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const fold = (line: string) => (line.length <= 73 ? line : line.match(/.{1,73}/g)!.join('\r\n '));

export async function addAssignmentToDeviceCalendar(
  a: Assignment,
  _uid: string,
  meetingName: string | undefined,
  meetingStartTime?: string,
): Promise<AddToPhoneResult> {
  try {
    const spec = eventFor(a, { meetingName, meetingStartTime, alerts: true });
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CSHARE//Assignments//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${a.id}@cshare`,
      `DTSTAMP:${utc(Date.now())}`,
      `DTSTART:${utc(spec.startMs)}`,
      `DTEND:${utc(spec.endMs)}`,
      `SUMMARY:${esc(spec.title)}`,
      spec.location ? `LOCATION:${esc(spec.location)}` : '',
      `DESCRIPTION:${esc(spec.description)}`,
      ...spec.alarms.flatMap(m => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(spec.title)}`, `TRIGGER:-PT${m}M`, 'END:VALARM']),
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean);

    const blob = new Blob([lines.map(fold).join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cshare-assignment.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    return { ok: true, calendarName: 'Calendar' };
  } catch (e) {
    logError('add to calendar (ics)', e);
    return { ok: false, reason: 'error' };
  }
}
