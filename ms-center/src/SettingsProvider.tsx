import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SettingsContext } from './context';
import { STORAGE_KEY, applyPreset, parseConfiguration, resumeIfExpired, sameSettings } from './settings';
import type { Mode, QuietDuration, SavedConfiguration, Settings } from './settings';

function initialState() {
  let raw: string | null = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch { /* Private browsing may block storage. */ }
  const saved = parseConfiguration(raw);
  return { saved, draft: structuredClone(saved.settings) };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  const [toast, setToast] = useState('');
  const dirty = !sameSettings(state.saved.settings, state.draft);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const config = state.saved;
    if (config.mode !== 'quiet' || config.quietUntil === null) return;
    const timer = window.setTimeout(() => {
      const resumed = resumeIfExpired(config);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(resumed)); } catch { /* The current session can still resume. */ }
      setState(previous => ({ saved: resumed, draft: sameSettings(previous.draft, config.settings) ? structuredClone(resumed.settings) : previous.draft }));
    }, Math.max(0, config.quietUntil - Date.now()));
    return () => window.clearTimeout(timer);
  }, [state.saved]);

  function commit(next: SavedConfiguration, message: string) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setState({ saved: next, draft: structuredClone(next.settings) });
      setToast(message);
      return true;
    } catch {
      setToast('保存失败，请检查浏览器存储空间后重试');
      return false;
    }
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setState(previous => ({ ...previous, draft: { ...previous.draft, [key]: value } }));
  }

  return <SettingsContext value={{
    saved: state.saved, draft: state.draft, dirty, toast, update,
    replaceDraft: draft => setState(previous => ({ ...previous, draft: structuredClone(draft) })),
    discard: () => setState(previous => ({ ...previous, draft: structuredClone(previous.saved.settings) })),
    save: () => commit({ ...state.saved, settings: structuredClone(state.draft), mode: 'custom', quietUntil: null }, '设置已保存'),
    applyMode: (mode: Mode, duration: QuietDuration) => commit(applyPreset(mode, duration, state.saved.settings), '配置已应用'),
    notify: setToast,
  }}>{children}</SettingsContext>;
}
