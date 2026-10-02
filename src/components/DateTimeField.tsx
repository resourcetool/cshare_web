import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, space, TOUCH } from '../theme';
import { formatDayLong, formatTime } from '../utils/dates';
import { Body, Label, Small } from './ui';

interface Props {
  label: string;
  mode: 'date' | 'time';
  /** 'YYYY-MM-DD' for dates, 'HH:mm' for times; empty when not set */
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
}

// Web version: same look as the Android field, but the tap goes to a transparent native <input>
// laid over it, so iPhone shows its own date / time wheel.
export function DateTimeField({ label, mode, value, onChange, onClear, placeholder }: Props) {
  const { palette } = useTheme();
  const shown = value ? (mode === 'date' ? formatDayLong(value) : formatTime(value)) : placeholder ?? 'Tap to choose';

  return (
    <View style={{ marginBottom: space.lg }}>
      <Label style={{ marginBottom: space.xs }}>{label}</Label>
      <View style={{ position: 'relative' }}>
        <View style={[styles.field, { borderColor: palette.line, backgroundColor: palette.surface }]}>
          <Body style={!value ? { color: palette.placeholder } : undefined}>{shown}</Body>
        </View>
        {React.createElement('input', {
          type: mode,
          value,
          'aria-label': `${label}: ${shown}`,
          onChange: (e: { target: { value: string } }) => {
            if (e.target.value) onChange(e.target.value);
          },
          style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, border: 0, margin: 0, padding: 0, fontSize: 16, cursor: 'pointer' },
        })}
      </View>
      {onClear && value ? (
        <Pressable accessibilityRole="button" onPress={onClear} style={{ paddingVertical: space.sm }}>
          <Small style={{ color: palette.primary, fontWeight: '700' }}>Remove {label.toLowerCase()}</Small>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { minHeight: TOUCH, justifyContent: 'center', borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: space.lg },
});
