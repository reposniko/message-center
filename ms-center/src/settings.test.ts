import { describe, expect, it } from 'vitest';
import { HOURS, applyPreset, defaultConfiguration, parseConfiguration, presetSettings, resumeIfExpired, standardSettings } from './settings';

describe('notification settings', () => {
  it('covers every hour once, including midnight and the final hour', () => {
    expect(HOURS).toHaveLength(24);
    expect(new Set(HOURS).size).toBe(24);
    expect(HOURS[0]).toBe('00:00');
    expect(HOURS.at(-1)).toBe('23:00');
    expect(standardSettings().digestTime).toBe('19:00');
  });
  it('does not overwrite child preferences while selecting quiet mode', () => {
    const original = { ...standardSettings(), digestTime: '00:00', promotions: true };
    const quiet = presetSettings('quiet', original);
    expect(quiet).toMatchObject({ pushEnabled: false, digestTime: '00:00', promotions: true });
    expect(original.pushEnabled).toBe(true);
  });
  it('starts the pause deadline only when a preset is applied', () => {
    expect(applyPreset('quiet', '8h', standardSettings(), 1000).quietUntil).toBe(28_801_000);
    expect(applyPreset('quiet', 'manual', standardSettings(), 1000).quietUntil).toBeNull();
    expect(applyPreset('standard', '8h', standardSettings(), 1000).quietUntil).toBeNull();
  });
  it('automatically resumes an expired pause without dropping preferences', () => {
    const quiet = applyPreset('quiet', '1h', { ...standardSettings(), digestTime: '23:00' }, 1000);
    expect(resumeIfExpired(quiet, 2000).settings.pushEnabled).toBe(false);
    expect(resumeIfExpired(quiet, 3_601_000).settings).toMatchObject({ pushEnabled: true, digestTime: '23:00' });
  });
  it('only keeps direct reminders in the important preset', () => {
    expect(presetSettings('important')).toMatchObject({ security: true, following: '仅站内查看', promotions: false, reservations: '按预约设置' });
  });
  it('round-trips valid saved settings and rejects corrupt local data', () => {
    const saved = { ...defaultConfiguration(), settings: { ...standardSettings(), digestTime: '00:00' } };
    expect(parseConfiguration(JSON.stringify(saved))).toEqual(saved);
    for (const raw of ['{bad', '{}', JSON.stringify({ ...saved, settings: { ...saved.settings, digestTime: '24:00' } }), JSON.stringify({ ...saved, settings: { ...saved.settings, pushEnabled: 'true' } })]) {
      expect(parseConfiguration(raw)).toEqual(defaultConfiguration());
    }
  });
});
