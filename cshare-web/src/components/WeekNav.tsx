import React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatWeekRange, parseDateKey, shiftWeek, weekIdFor } from '../utils/dates';
import { useTheme } from '../context/ThemeContext';
import { space } from '../theme';
import { Button, Heading, Small } from './ui';

/** `minWeekId`: pass the current week to stop navigation into the past (used for normal users).
 * Leave it unset for admins, who may need to look back. Web version: "Go to a date" opens the
 * phone's own date picker through a transparent <input> laid over the button. */
export function WeekNav({ weekId, onChange, minWeekId }: { weekId: string; onChange: (id: string) => void; minWeekId?: string }) {
  const { palette } = useTheme();
  const thisWeek = weekIdFor(new Date());
  const label = weekId === thisWeek ? 'This week' : weekId === shiftWeek(thisWeek, 1) ? 'Next week' : weekId === shiftWeek(thisWeek, -1) ? 'Last week' : 'Week';
  const atFloor = !!minWeekId && weekId <= minWeekId;

  const picked = (v: string) => {
    if (!v) return;
    const d = parseDateKey(v);
    onChange(weekIdFor(minWeekId && weekIdFor(d) < minWeekId ? parseDateKey(minWeekId) : d));
  };

  return (
    <View style={[styles.wrap, { borderBottomColor: palette.line }]}>
      <Small>{label}</Small>
      <Heading>{formatWeekRange(weekId)}</Heading>
      <View style={styles.row}>
        <Button label="◀ Earlier" variant="secondary" onPress={() => onChange(shiftWeek(weekId, -1))} style={{ flex: 1 }} disabled={atFloor} />
        <Button label="Later ▶" variant="secondary" onPress={() => onChange(shiftWeek(weekId, 1))} style={{ flex: 1 }} />
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1, position: 'relative' }}>
          <Button label="Go to a date" icon="calendar" variant="ghost" onPress={() => {}} />
          {React.createElement('input', {
            type: 'date',
            value: '',
            min: minWeekId,
            'aria-label': 'Go to a date',
            onChange: (e: { target: { value: string } }) => picked(e.target.value),
            style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, border: 0, margin: 0, padding: 0, fontSize: 16, cursor: 'pointer' },
          })}
        </View>
        {weekId !== thisWeek ? <Button label="This week" variant="ghost" onPress={() => onChange(thisWeek)} style={{ flex: 1 }} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: space.md, borderBottomWidth: 1, marginBottom: space.sm },
  row: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
});
