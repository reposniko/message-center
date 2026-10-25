import { createContext, useContext } from 'react';
import type { Mode, QuietDuration, SavedConfiguration, Settings } from './settings';

export interface SettingsContextValue {
  saved: SavedConfiguration;
  draft: Settings;
  dirty: boolean;
  toast: string;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  replaceDraft: (settings: Settings) => void;
  discard: () => void;
  save: () => boolean;
  applyMode: (mode: Mode, duration: QuietDuration) => boolean;
  notify: (message: string) => void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('SettingsProvider is required');
  return value;
}
