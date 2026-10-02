import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { space } from '../theme';
import { logError } from '../utils/errors';
import { SheetDoc, sheetToHtml, sheetToText } from '../utils/sheetShare';
import { Button } from './ui';

/** Share the sheet as text (WhatsApp, Messages ...) or print it / save it as a PDF. Web version. */
export function SheetActions({ doc }: { doc: SheetDoc }) {
  const [busy, setBusy] = useState(false);

  const share = async () => {
    const text = sheetToText(doc);
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        Alert.alert('Copied', 'The sheet was copied. You can paste it into WhatsApp or Messages.');
      }
    } catch (e) {
      if ((e as { name?: string })?.name !== 'AbortError') logError('share', e); // AbortError = person closed the share sheet
    }
  };

  const print = async () => {
    setBusy(true);
    try {
      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      document.body.appendChild(frame);
      const w = frame.contentWindow;
      const d = frame.contentDocument;
      if (!w || !d) throw new Error('no print frame');
      d.open();
      d.write(sheetToHtml(doc));
      d.close();
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      w.focus();
      w.print();
      setTimeout(() => frame.remove(), 3000);
    } catch (e) {
      logError('print', e);
      Alert.alert('Could not open printing', 'Please try again, or use “Share” instead.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flexDirection: 'row', gap: space.md, marginBottom: space.lg }}>
      <Button label="📤 Share" variant="secondary" onPress={share} style={{ flex: 1 }} />
      <Button label="🖨️ Print / PDF" variant="secondary" onPress={print} loading={busy} style={{ flex: 1 }} />
    </View>
  );
}
