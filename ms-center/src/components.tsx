import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

const ICONS = {
  signal: ['bb8ad.svg', 16, 12], back: ['09463.svg', 22, 22],
  messageBack: ['016a4.svg', 20, 20], quickBack: ['3f4bd.svg', 22, 22],
  settings: ['96163.svg', 20, 20], trash: ['4d26d.svg', 22, 22],
  heart: ['dc9f2.svg', 26, 26], like: ['6fcc4.svg', 26, 26],
  at: ['58588.svg', 26, 26], reply: ['505bb.svg', 26, 26],
  zap: ['9507f.svg', 23, 23], sliders: ['25594.svg', 23, 23],
  centerChevron: ['b7acf.svg', 16, 16], chevron: ['178db.svg', 14, 14],
  smallChevron: ['30144.svg', 12, 12], check: ['2204a.svg', 13, 13],
  bolt: ['8d009.svg', 24, 24],
  shield: ['ce650.svg', 24, 24], moon: ['f4105.svg', 24, 24], success: ['28a6d.svg', 24, 24],
} as const;

export function Icon({ name }: { name: keyof typeof ICONS }) {
  const [file, width, height] = ICONS[name];
  return <img className="icon" src={`/assets/${file}`} width={width} height={height} alt="" draggable={false} />;
}

export function StatusBar() {
  return <div className="status-bar" aria-label="手机状态栏">
    <span className="status-time">15:57</span>
    <span className="device-status"><Icon name="signal" /><span>5GA</span><span className="battery"><span /></span></span>
  </div>;
}

export function Toggle({ label, checked, disabled = false, onChange, onAsset = '9bebc.svg' }: { label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void; onAsset?: '9e5e3.svg' | '9bebc.svg' }) {
  return <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} className="toggle" onClick={() => onChange(!checked)}>
    <img src={`/assets/${checked ? onAsset : '188e2.svg'}`} width="42" height="25" alt="" />
  </button>;
}

export function RadioMark({ selected }: { selected: boolean }) {
  return <span className={`radio-mark${selected ? ' selected' : ''}`} aria-hidden="true">{selected && <Icon name="check" />}</span>;
}

export function SettingRow({ label, summary, description, checked, disabled = false, onClick, onToggle, onAsset }: {
  label: string; summary?: string; description?: string; checked?: boolean; disabled?: boolean;
  onClick?: () => void; onToggle?: (value: boolean) => void; onAsset?: '9e5e3.svg' | '9bebc.svg';
}) {
  const content = <><span className="row-main"><span className="row-label">{label}</span><span className="row-value">{summary}<Icon name="chevron" /></span></span>{description && <span className="row-description">{description}</span>}</>;
  if (checked !== undefined && onToggle) return <div className={`setting-row${description ? ' with-description' : ''}${disabled ? ' is-disabled' : ''}`}>
    <div className="row-main"><span className="row-label">{label}</span><Toggle label={label} checked={checked} disabled={disabled} onChange={onToggle} onAsset={onAsset} /></div>
    {description && <p className="row-description">{description}</p>}
  </div>;
  return <button type="button" className={`setting-row${description ? ' with-description' : ''}`} disabled={disabled} onClick={onClick} aria-label={`${label}${summary ? `：${summary}` : ''}`}>{content}</button>;
}

export function Group({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const id = useId();
  return <section className="settings-group" aria-labelledby={id}><h2 id={id}>{title}</h2>{description && <p className="group-description">{description}</p>}<div className="group-card">{children}</div></section>;
}

export function PrimaryButton({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
  return <button type="button" className={`primary-button ${className}`} onClick={onClick}>{children}</button>;
}

export function Dialog({ title, description, children, onClose, icon, variant = 'default' }: { title: string; description?: string; children: ReactNode; onClose: () => void; icon?: ReactNode; variant?: 'default' | 'detail' | 'success' }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const descriptionId = useId();
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element?.showModal();
    return () => { element?.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return <dialog ref={dialog} className={`modal ${variant}-modal`} aria-labelledby={id} aria-describedby={description ? descriptionId : undefined} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-content">{icon && <div className="modal-icon">{icon}</div>}<h2 id={id}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}<div className="modal-actions">{children}</div></div>
  </dialog>;
}

export function HourPicker({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const initialValue = useRef(value);
  const hours = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
  useEffect(() => {
    const element = viewport.current;
    if (element) element.scrollTop = Number(initialValue.current.slice(0, 2)) * 48;
  }, []);

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = hours.indexOf(value);
    const next = event.key === 'ArrowDown' ? Math.min(23, index + 1) : event.key === 'ArrowUp' ? Math.max(0, index - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? 23 : null;
    if (next === null) return;
    event.preventDefault();
    onChange(hours[next]);
    if (viewport.current) viewport.current.scrollTo({ top: next * 48, behavior: 'smooth' });
  }

  return <div className="hour-picker" ref={viewport} role="listbox" tabIndex={0} aria-label={label} aria-activedescendant={`hour-${value.slice(0, 2)}`} onKeyDown={handleKey}>
    <div className="hour-list">{hours.map(hour => <button key={hour} id={`hour-${hour.slice(0, 2)}`} type="button" role="option" tabIndex={-1} aria-selected={hour === value} className={`hour-option${hour === value ? ' selected' : ''}`} onClick={() => onChange(hour)}>{hour}</button>)}</div>
  </div>;
}
