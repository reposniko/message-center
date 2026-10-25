import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Dialog, Group, HourPicker, Icon, PrimaryButton, RadioMark, SettingRow, Toggle } from './components';
import { useSettings } from './context';
import { CHOICES, MODES, TIMES, isFieldKey, presetSettings, standardSettings } from './settings';
import type { ChoiceKey, FieldKey, Mode, QuietDuration, Settings, TimeKey } from './settings';

export function MessagesPage({ category = false }: { category?: boolean }) {
  const [tab, setTab] = useState('personal');
  return <div className="messages-page">
    {!category && <><div className="message-shortcuts">
      <Link to="/messages/following"><Icon name="heart" /><span>关注</span></Link>
      <Link to="/messages/reactions"><Icon name="like" /><span>表态</span></Link>
      <Link to="/messages/mentions"><Icon name="at" /><span>@我</span></Link>
      <Link to="/messages/replies"><Icon name="reply" /><span>回复</span></Link>
    </div><div className="message-tabs" role="tablist" aria-label="消息分类"><button type="button" role="tab" aria-selected={tab === 'personal'} onClick={() => setTab('personal')}>个人通知</button><button type="button" role="tab" aria-selected={tab === 'system'} onClick={() => setTab('system')}>系统通知</button></div></>}
    <div className="empty-state" role={category ? undefined : 'tabpanel'} aria-label={category ? '暂无消息' : tab === 'personal' ? '个人通知' : '系统通知'}><div className="empty-illustration"><img src="/assets/174ae.png" alt="捧着纸张的游戏角色" width="537.6" height="1165.08" /></div><p>暂无内容～</p></div>
  </div>;
}

export function CenterPage() {
  const { discard } = useSettings();
  return <div className="center-page">
    <Link className="center-card" to="/notifications/quick"><span className="center-icon"><Icon name="zap" /></span><span className="center-copy"><strong>快捷配置</strong><span>使用常用方案，快速设置消息提醒</span></span><Icon name="centerChevron" /></Link>
    <Link className="center-card" to="/notifications/custom" onClick={discard}><span className="center-icon"><Icon name="sliders" /></span><span className="center-copy"><strong>自定义</strong><span>按个人偏好，灵活配置消息提醒</span></span><Icon name="centerChevron" /></Link>
  </div>;
}

export function QuickPage() {
  const navigate = useNavigate();
  const { saved, applyMode, replaceDraft } = useSettings();
  const [mode, setMode] = useState<Mode>(saved.mode === 'custom' ? 'standard' : saved.mode);
  const [duration, setDuration] = useState<QuietDuration>(saved.quietDuration);
  const [detail, setDetail] = useState<Mode | null>(null);
  const [applied, setApplied] = useState(false);
  function customize() {
    replaceDraft(presetSettings(mode, saved.settings));
    navigate('/notifications/custom');
  }
  return <div className="quick-page"><div className="mode-list" role="radiogroup" aria-label="提醒模式">
    {(Object.keys(MODES) as Mode[]).map(key => <div key={key} className={`mode-card${mode === key ? ' selected' : ''}`}>
      <button className="mode-select" type="button" role="radio" aria-checked={mode === key} aria-label={MODES[key].name} onClick={() => setMode(key)}><span className="mode-heading"><span>{MODES[key].name}{key === 'standard' && <span className="recommend-tag">推荐</span>}</span><RadioMark selected={mode === key} /></span><span className="mode-description">{MODES[key].description}</span></button>
      <button type="button" className="mode-detail" aria-label={`查看${MODES[key].name}详情`} onClick={() => setDetail(key)}>查看详情<Icon name="smallChevron" /></button>
    </div>)}
  </div>
    {mode === 'quiet' && <div className="quiet-duration"><span>暂停时长</span><div role="radiogroup" aria-label="暂停时长">{([['1h', '1小时'], ['8h', '8小时'], ['manual', '直到手动恢复']] as const).map(([value, label]) => <button type="button" role="radio" aria-checked={duration === value} key={value} onClick={() => setDuration(value)}>{label}</button>)}</div></div>}
    <button type="button" className="customize-link" onClick={customize}>进一步自定义 ›</button>
    <footer className="quick-footer"><PrimaryButton onClick={() => { if (applyMode(mode, duration)) setApplied(true); }}>应用此配置</PrimaryButton></footer>
    {detail && <Dialog variant="detail" title={MODES[detail].name} description={MODES[detail].detail} icon={<Icon name={detail === 'standard' ? 'bolt' : detail === 'important' ? 'shield' : 'moon'} />} onClose={() => setDetail(null)}><button type="button" className="modal-primary" onClick={() => setDetail(null)}>知道了</button></Dialog>}
    {applied && <Dialog variant="success" title="配置已应用" description={`${MODES[mode].name}已生效`} icon={<Icon name="success" />} onClose={() => setApplied(false)}><button type="button" className="modal-primary" onClick={() => setApplied(false)}>完成</button></Dialog>}
  </div>;
}

export function CustomPage() {
  const { draft, update, replaceDraft } = useSettings();
  const navigate = useNavigate();
  const [restore, setRestore] = useState(false);
  const [permissionHelp, setPermissionHelp] = useState(false);
  const unauthorized = new URLSearchParams(window.location.search).get('permission') === 'denied';
  const pushDisabled = !draft.pushEnabled;
  const open = (field: FieldKey) => navigate(`/notifications/custom/${field}`);
  const choiceRow = (key: ChoiceKey, disabled = pushDisabled) => <SettingRow key={key} label={CHOICES[key].title} summary={draft[key]} disabled={disabled} onClick={() => open(key)} />;
  return <div className="custom-page">
    {unauthorized && <div className="permission-banner"><span>系统通知未开启</span><button type="button" onClick={() => setPermissionHelp(true)}>前往设置</button></div>}
    <Group title="提醒方式"><SettingRow label="消息推送" description="离开APP后也能收到提醒" checked={draft.pushEnabled} onToggle={value => update('pushEnabled', value)} onAsset="9e5e3.svg" />{choiceRow('redDot', false)}</Group>
    <Group title="消息类型" description="以下设置控制提醒，不影响已有站内消息">
      <SettingRow label="账号与安全" description="系统消息会保留在站内" checked={draft.security} disabled={pushDisabled} onToggle={value => update('security', value)} />
      {(['privateMessages', 'replies', 'likes', 'following', 'reservations', 'updates'] as const).map(key => choiceRow(key))}
      <SettingRow label="可能感兴趣的内容" checked={draft.recommendations} disabled={pushDisabled} onToggle={value => update('recommendations', value)} onAsset="9e5e3.svg" />
      <SettingRow label="活动与商业推广" description="包含福利活动、促销和商业合作信息" checked={draft.promotions} disabled={pushDisabled} onToggle={value => update('promotions', value)} onAsset="9e5e3.svg" />
    </Group>
    <Group title="时间与频率"><div className={`dnd-settings${pushDisabled ? ' is-disabled' : ''}`}>
      <div className="row-main"><span>免打扰时段</span><Toggle label="免打扰时段" checked={draft.dndEnabled} disabled={pushDisabled} onChange={value => update('dndEnabled', value)} /></div>
      <div className={`time-range${!draft.dndEnabled ? ' is-disabled' : ''}`}><button type="button" className="time-chip" disabled={pushDisabled || !draft.dndEnabled} onClick={() => open('dndStart')} aria-label={`免打扰开始时间：${draft.dndStart}`}><strong>{draft.dndStart}</strong><Icon name="smallChevron" /></button><span>至</span><button type="button" className="time-chip end-time" disabled={pushDisabled || !draft.dndEnabled} onClick={() => open('dndEnd')} aria-label={`免打扰结束时间：${draft.dndEnd}`}><span>{draft.dndEnd <= draft.dndStart ? '次日' : '当日'}</span><strong>{draft.dndEnd}</strong><Icon name="smallChevron" /></button></div>
      <p className="row-description">暂停消息推送打扰，消息仍可在站内查看</p>
    </div><SettingRow label="每日摘要时间" summary={draft.digestTime} disabled={pushDisabled} onClick={() => open('digestTime')} /><SettingRow label="推荐与活动消息推送上限" summary={draft.dailyLimit} description="不包含直接互动、安全及主动预约提醒" disabled={pushDisabled} onClick={() => open('dailyLimit')} /></Group>
    <Group title="按游戏或作者设置" description="单独调整某个关注对象的提醒"><SettingRow label="管理关注的游戏" onClick={() => navigate('/notifications/custom/games')} /><SettingRow label="管理关注的作者" onClick={() => navigate('/notifications/custom/authors')} /></Group>
    <section className="restore-section"><h2>恢复配置</h2><button className="restore-button" type="button" onClick={() => setRestore(true)}>恢复标准配置</button></section>
    {restore && <Dialog title="恢复标准配置？" description="恢复后仍需点击“保存设置”才会生效。" onClose={() => setRestore(false)}><button className="modal-primary" type="button" onClick={() => { replaceDraft({ ...standardSettings(), unfollowed: [...draft.unfollowed] }); setRestore(false); }}>恢复标准配置</button><button className="modal-text" type="button" onClick={() => setRestore(false)}>取消</button></Dialog>}
    {permissionHelp && <Dialog title="开启系统通知" description="请在浏览器地址栏的网站设置中允许通知。浏览器页面无法直接打开手机系统设置。" onClose={() => setPermissionHelp(false)}><button type="button" className="modal-primary" onClick={() => setPermissionHelp(false)}>知道了</button></Dialog>}
  </div>;
}

export function FieldPage() {
  const { field } = useParams();
  if (!isFieldKey(field)) return <Navigate to="/notifications/custom" replace />;
  return <FieldEditor key={field} field={field} />;
}

function FieldEditor({ field }: { field: FieldKey }) {
  const { draft, update } = useSettings();
  const navigate = useNavigate();
  const isTime = Object.hasOwn(TIMES, field);
  const definition = isTime ? TIMES[field as TimeKey] : CHOICES[field as ChoiceKey];
  function choose(value: string) { update(field, value as Settings[typeof field]); }
  return <div className={`field-page${field === 'digestTime' ? ' digest-page' : ''}`}><p className="field-description">{definition.description}</p>
    {field === 'digestTime' ? <HourPicker value={draft.digestTime} onChange={choose} label="每日摘要时间" /> : <div className="field-selector"><SettingRow label={definition.title} summary={draft[field]} onClick={() => undefined} />
      <div className="option-list" role="radiogroup" aria-label={definition.title}>{definition.options.map(value => <button type="button" className={`choice-option${value === draft[field] ? ' selected' : ''}`} role="radio" aria-checked={value === draft[field]} key={value} onClick={() => choose(value)}><span>{value}</span><RadioMark selected={value === draft[field]} /></button>)}</div>
    </div>}
    <div className="field-completion"><p>{field === 'digestTime' ? '完成选择后返回，点击保存设置后生效' : '返回后点击“保存设置”才会生效'}</p><PrimaryButton onClick={() => navigate('/notifications/custom')}>完成</PrimaryButton></div>
  </div>;
}

const FOLLOWED = {
  games: [
    { id: 'game-wangzhe', name: '王者荣耀', image: 'raw-5.jpeg', description: '' },
    { id: 'game-luoke', name: '洛克王国', image: 'raw-4.jpeg', description: '' },
    { id: 'game-delta', name: '三角洲行动', image: 'raw-0.jpeg', description: '' },
  ],
  authors: [
    { id: 'author-orange', name: '小橘子', image: 'author-raw-0.jpeg', description: '动画评论师' },
    { id: 'author-stars', name: '星空漫游', image: 'author-raw-1.jpeg', description: '科幻小说作家' },
    { id: 'author-coffee', name: '咖啡小镇', image: 'author-raw-5.jpeg', description: '美食博主' },
  ],
};

export function FollowPage({ kind }: { kind: keyof typeof FOLLOWED }) {
  const { draft, update } = useSettings();
  return <div className={`follow-page ${kind}`}>{FOLLOWED[kind].map(item => {
    const removed = draft.unfollowed.includes(item.id);
    return <div className={`follow-row${removed ? ' unfollowed' : ''}`} key={item.id}><img className="follow-avatar" src={`/assets/${item.image}`} width="32" height="32" alt={item.name} /><span className="follow-copy"><span>{item.name}</span>{item.description && <span>{item.description}</span>}</span><button type="button" className="unfollow-button" aria-label={`${removed ? '重新关注' : '取消关注'}${item.name}`} onClick={() => update('unfollowed', removed ? draft.unfollowed.filter(id => id !== item.id) : [...draft.unfollowed, item.id])}>{removed ? '重新关注' : '取消关注'}</button></div>;
  })}</div>;
}
