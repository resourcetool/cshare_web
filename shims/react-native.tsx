// "react-native" on the web = react-native-web, plus the few things it does not do:
//  - Alert.alert (a no-op in react-native-web) is replaced by a real dialog styled like the app.
export * from 'react-native-web';

type AlertButton = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: (value?: string) => void };
type AlertOptions = { cancelable?: boolean; onDismiss?: () => void };

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function showDialog(title: string, message: string | undefined, buttons: AlertButton[], options?: AlertOptions) {
  const dark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const c = dark
    ? { card: '#17262C', ink: '#E6EEF0', muted: '#9FB2B8', line: '#2C3F46', primary: '#5BB8C6', onPrimary: '#06232A', bad: '#F2B8B5', onBad: '#3B0A07' }
    : { card: '#FFFFFF', ink: '#14252D', muted: '#55666E', line: '#D5DEE1', primary: '#0E5A66', onPrimary: '#FFFFFF', bad: '#B3261E', onBad: '#FFFFFF' };

  const list = buttons.length ? buttons : [{ text: 'OK' }];
  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.style.cssText = `position:fixed;inset:0;z-index:2147483000;background:rgba(10,20,24,.5);display:flex;align-items:center;justify-content:center;padding:24px;font-family:${FONT};`;

  const card = document.createElement('div');
  card.style.cssText = `width:100%;max-width:340px;max-height:90%;overflow:auto;background:${c.card};color:${c.ink};border-radius:16px;padding:20px;box-sizing:border-box;box-shadow:0 12px 40px rgba(0,0,0,.3);`;

  const h = document.createElement('div');
  h.textContent = title;
  h.style.cssText = 'font-size:18px;font-weight:700;line-height:1.3;';
  card.appendChild(h);

  if (message) {
    const m = document.createElement('div');
    m.textContent = message;
    m.style.cssText = `margin-top:8px;font-size:15px;line-height:1.45;color:${c.muted};white-space:pre-wrap;`;
    card.appendChild(m);
  }

  const row = document.createElement('div');
  row.style.cssText = `display:flex;flex-direction:${list.length > 2 ? 'column' : 'row'};gap:8px;margin-top:18px;`;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && options?.cancelable) dismiss();
  };
  const close = () => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  };
  const dismiss = () => {
    close();
    options?.onDismiss?.();
  };

  list.forEach(b => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = b.text ?? 'OK';
    const filled = b.style === 'destructive' || (b.style !== 'cancel' && list.length > 1);
    const bg = b.style === 'destructive' ? c.bad : c.primary;
    const fg = b.style === 'destructive' ? c.onBad : c.onPrimary;
    btn.style.cssText = `flex:1;min-height:48px;padding:0 12px;border-radius:12px;font:700 16px ${FONT};cursor:pointer;` +
      (filled ? `border:0;background:${bg};color:${fg};` : `border:1.5px solid ${c.line};background:transparent;color:${b.style === 'cancel' ? c.muted : c.primary};`);
    btn.addEventListener('click', () => {
      close();
      b.onPress?.();
    });
    row.appendChild(btn);
  });
  card.appendChild(row);
  overlay.appendChild(card);

  overlay.addEventListener('click', e => {
    if (e.target === overlay && options?.cancelable) dismiss();
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions): void {
    showDialog(title, message, buttons ?? [], options);
  },
};
