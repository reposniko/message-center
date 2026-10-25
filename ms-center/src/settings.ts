export type Mode = 'standard' | 'important' | 'quiet';
export type QuietDuration = '1h' | '8h' | 'manual';
export type Delivery = '即时提醒' | '每日汇总' | '仅站内查看';

export interface Settings {
  pushEnabled: boolean;
  redDot: '仅重要消息' | '互动与订阅消息' | '关闭红点';
  security: boolean;
  privateMessages: '所有人' | '互相关注的人' | '仅站内查看';
  replies: '即时提醒·连续消息合并' | '每日汇总' | '仅站内查看';
  likes: Delivery;
  following: Delivery;
  reservations: '按预约设置' | '仅站内查看';
  updates: '全部更新' | '仅重大更新' | '仅站内查看';
  recommendations: boolean;
  promotions: boolean;
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
  digestTime: string;
  dailyLimit: '每天最多1条' | '每天最多2条' | '每天最多3条';
  unfollowed: string[];
}

export type ChoiceKey = 'redDot' | 'privateMessages' | 'replies' | 'likes' | 'following' | 'reservations' | 'updates' | 'dailyLimit';
export type TimeKey = 'dndStart' | 'dndEnd' | 'digestTime';
export type FieldKey = ChoiceKey | TimeKey;
export const STORAGE_KEY = 'message-center.settings.v1';
export const HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);

export const CHOICES = {
  redDot: { title: '红点显示', description: '选择哪些消息在APP内显示红点', options: ['仅重要消息', '互动与订阅消息', '关闭红点'] },
  privateMessages: { title: '私信', description: '选择允许触发消息推送提醒的私信来源', options: ['所有人', '互相关注的人', '仅站内查看'] },
  replies: { title: '回复与@我', description: '选择直接互动的提醒方式', options: ['即时提醒·连续消息合并', '每日汇总', '仅站内查看'] },
  likes: { title: '点赞与收藏', description: '按你的偏好调整轻量互动提醒', options: ['即时提醒', '每日汇总', '仅站内查看'] },
  following: { title: '关注的人发布内容', description: '汇总关注动态，减少重复打扰', options: ['即时提醒', '每日汇总', '仅站内查看'] },
  reservations: { title: '游戏预约与上线', description: '主动预约的游戏按各自预约设置提醒', options: ['按预约设置', '仅站内查看'] },
  updates: { title: '游戏版本更新', description: '选择你希望收到的版本更新提醒', options: ['全部更新', '仅重大更新', '仅站内查看'] },
  dailyLimit: { title: '推荐与活动消息推送上限', description: '不包含直接互动、安全及主动预约提醒', options: ['每天最多1条', '每天最多2条', '每天最多3条'] },
} as const;

export const TIMES = {
  dndStart: { title: '免打扰开始时间', description: '每日从此时间起暂停消息推送打扰', options: ['21:00', '22:00', '23:00'] },
  dndEnd: { title: '免打扰结束时间', description: '次日到此时间恢复消息推送提醒', options: ['07:00', '08:00', '09:00'] },
  digestTime: { title: '每日摘要时间', description: '上下滚动，点击选择每天发送摘要的时间', options: HOURS },
} as const;

export const MODES: Record<Mode, { name: string; description: string; detail: string }> = {
  standard: { name: '标准模式', description: '重要消息及时提醒，关注动态每天汇总', detail: '安全、私信、回复与预约及时提醒；营销消息推送默认关闭。' },
  important: { name: '仅重要消息', description: '只提醒与你直接相关的重要事项', detail: '保留安全、私信、回复、@我和主动预约提醒。' },
  quiet: { name: '安静模式', description: '暂停所有消息推送，进入APP后查看消息', detail: '包括安全消息推送；站内消息继续保留。' },
};

export function standardSettings(): Settings {
  return {
    pushEnabled: true, redDot: '仅重要消息', security: true,
    privateMessages: '互相关注的人', replies: '即时提醒·连续消息合并',
    likes: '仅站内查看', following: '每日汇总', reservations: '按预约设置', updates: '仅重大更新',
    recommendations: false, promotions: false, dndEnabled: true,
    dndStart: '22:00', dndEnd: '08:00', digestTime: '19:00', dailyLimit: '每天最多2条', unfollowed: [],
  };
}

export function presetSettings(mode: Mode, current: Settings = standardSettings()): Settings {
  // Quiet mode retains the individual preferences that will be used on resuming.
  if (mode === 'quiet') return { ...current, pushEnabled: false, unfollowed: [...current.unfollowed] };
  const next = { ...standardSettings(), unfollowed: [...current.unfollowed] };
  if (mode === 'important') next.following = '仅站内查看';
  return next;
}

export interface SavedConfiguration {
  version: 1;
  settings: Settings;
  mode: Mode | 'custom';
  quietDuration: QuietDuration;
  quietUntil: number | null;
}

export function defaultConfiguration(): SavedConfiguration {
  return { version: 1, settings: standardSettings(), mode: 'standard', quietDuration: '1h', quietUntil: null };
}

export function applyPreset(mode: Mode, duration: QuietDuration, current: Settings, now = Date.now()): SavedConfiguration {
  return {
    version: 1, settings: presetSettings(mode, current), mode, quietDuration: duration,
    quietUntil: mode === 'quiet' && duration !== 'manual' ? now + (duration === '1h' ? 1 : 8) * 3_600_000 : null,
  };
}

export function resumeIfExpired(config: SavedConfiguration, now = Date.now()): SavedConfiguration {
  if (config.mode !== 'quiet' || config.quietUntil === null || config.quietUntil > now) return config;
  return { ...config, mode: 'custom', quietUntil: null, settings: { ...config.settings, pushEnabled: true } };
}

export function parseConfiguration(raw: string | null): SavedConfiguration {
  try {
    if (!raw) return defaultConfiguration();
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1) return defaultConfiguration();
    const value = data as SavedConfiguration;
    const defaults = standardSettings();
    if (!value.settings || typeof value.settings !== 'object') return defaultConfiguration();
    for (const key of Object.keys(defaults) as (keyof Settings)[]) {
      if (typeof value.settings[key] !== typeof defaults[key]) return defaultConfiguration();
    }
    for (const key of Object.keys(CHOICES) as ChoiceKey[]) {
      if (!(CHOICES[key].options as readonly string[]).includes(value.settings[key])) return defaultConfiguration();
    }
    if (!HOURS.includes(value.settings.digestTime) || !TIMES.dndStart.options.includes(value.settings.dndStart as '21:00') || !TIMES.dndEnd.options.includes(value.settings.dndEnd as '07:00')) return defaultConfiguration();
    if (!Array.isArray(value.settings.unfollowed) || value.settings.unfollowed.some(id => typeof id !== 'string')) return defaultConfiguration();
    if (!['standard', 'important', 'quiet', 'custom'].includes(value.mode) || !['1h', '8h', 'manual'].includes(value.quietDuration)) return defaultConfiguration();
    if (value.quietUntil !== null && (typeof value.quietUntil !== 'number' || !Number.isFinite(value.quietUntil))) return defaultConfiguration();
    return resumeIfExpired(value);
  } catch {
    return defaultConfiguration();
  }
}

export function isFieldKey(key: string | undefined): key is FieldKey {
  return !!key && (Object.hasOwn(CHOICES, key) || Object.hasOwn(TIMES, key));
}

export function sameSettings(a: Settings, b: Settings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
