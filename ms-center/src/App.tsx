import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, Outlet, RouterProvider, createHashRouter, useBeforeUnload, useBlocker, useLocation, useNavigate } from 'react-router-dom';
import { Dialog, Icon, PrimaryButton, StatusBar } from './components';
import { SettingsProvider } from './SettingsProvider';
import { useSettings } from './context';
import { CHOICES, TIMES, isFieldKey } from './settings';
import { CenterPage, CustomPage, FieldPage, FollowPage, MessagesPage, QuickPage } from './pages';
import './App.css';

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { dirty, discard, save, toast, notify } = useSettings();
  const [storageError, setStorageError] = useState('');
  const mainRef = useRef<HTMLElement>(null);
  const scrollPositions = useRef(new Map<string, number>());
  const path = location.pathname;
  const isQuick = path === '/notifications/quick';
  const isCustom = path === '/notifications/custom';
  const isMessages = path === '/messages';
  const isCenter = path === '/settings';
  const hasTabs = isQuick || isCustom;
  const isCustomFlow = path.startsWith('/notifications/custom');
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname.startsWith('/notifications/custom') && !nextLocation.pathname.startsWith('/notifications/custom'));

  useBeforeUnload(useCallback((event: BeforeUnloadEvent) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  }, [dirty]));

  useLayoutEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = scrollPositions.current.get(path) ?? 0;
    document.title = '消息中心';
  }, [path]);

  let title = isMessages ? '消息' : isCenter ? '消息配置中心' : hasTabs ? '消息通知' : '消息';
  if (path.endsWith('/games')) title = '关注的游戏';
  else if (path.endsWith('/authors')) title = '关注的作者';
  else if (isCustomFlow && !isCustom) {
    const field = path.split('/').at(-1);
    if (isFieldKey(field)) title = field in CHOICES ? CHOICES[field as keyof typeof CHOICES].title : TIMES[field as keyof typeof TIMES].title;
  } else if (path.startsWith('/messages/')) {
    title = ({ following: '关注', reactions: '表态', mentions: '@我', replies: '回复' } as Record<string, string>)[path.split('/').at(-1) ?? ''] ?? '消息';
  }

  function back() {
    if (isMessages) { notify('当前已是消息首页'); return; }
    if (isCenter) navigate('/messages');
    else if (hasTabs) navigate('/settings');
    else if (isCustomFlow) navigate('/notifications/custom');
    else navigate('/messages');
  }

  function leave(saveChanges: boolean) {
    if (saveChanges && !save()) { setStorageError('保存失败，请检查浏览器存储后重试。'); return; }
    if (!saveChanges) discard();
    setStorageError('');
    if (blocker.state === 'blocked') blocker.proceed();
  }

  return <div className={`app${isMessages || isCenter ? ' base-page' : ''}`}>
    <header className="app-header">
      <StatusBar />
      <nav className={`navigation${isMessages ? ' message-navigation' : ''}${!hasTabs && !isCenter && !isMessages ? ' secondary-navigation' : ''}`} aria-label="页面导航">
        <button type="button" className="back-button icon-button" onClick={back} aria-label={hasTabs ? '返回消息配置中心' : isCenter ? '返回消息界面' : '返回上一级'}><Icon name={isCenter || isMessages ? 'messageBack' : isQuick ? 'quickBack' : 'back'} /></button>
        <h1>{title}</h1>
        {isMessages && <div className="navigation-actions"><Link className="icon-button" to="/settings" aria-label="消息设置"><Icon name="settings" /></Link><button className="icon-button" aria-label="清空消息" type="button" onClick={() => notify('暂无可清理的消息')}><Icon name="trash" /></button></div>}
      </nav>
      {hasTabs && <div className="tabs" aria-label="通知配置方式"><Link to="/notifications/quick" aria-current={isQuick ? 'page' : undefined}>快捷配置</Link><Link to="/notifications/custom" aria-current={isCustom ? 'page' : undefined}>自定义配置</Link></div>}
    </header>
    <main ref={mainRef} className={`page-scroll${isQuick ? ' quick-scroll' : ''}${isCustom ? ' custom-scroll' : ''}`} onScroll={event => { if (event.target === event.currentTarget) scrollPositions.current.set(path, event.currentTarget.scrollTop); }}>
      <Outlet />
    </main>
    {isCustom && <footer className="fixed-footer"><PrimaryButton onClick={() => save()}>保存设置</PrimaryButton></footer>}
    {toast && <div className="toast" role="status">{toast}</div>}
    {blocker.state === 'blocked' && <Dialog title="保存当前设置？" description="保存后生效，也可以放弃本次修改。" onClose={() => { setStorageError(''); blocker.reset(); }}>
      {storageError && <p className="form-error" role="alert">{storageError}</p>}
      <button type="button" className="modal-primary" onClick={() => leave(true)}>保存</button>
      <button type="button" className="modal-text" onClick={() => leave(false)}>放弃修改</button>
      <button type="button" className="modal-text" onClick={() => { setStorageError(''); blocker.reset(); }}>继续编辑</button>
    </Dialog>}
  </div>;
}

function Root() { return <SettingsProvider><Layout /></SettingsProvider>; }

const router = createHashRouter([{ path: '/', element: <Root />, children: [
  { index: true, element: <Navigate to="/messages" replace /> },
  { path: 'messages', element: <MessagesPage /> },
  { path: 'messages/:category', element: <MessagesPage category /> },
  { path: 'settings', element: <CenterPage /> },
  { path: 'notifications/quick', element: <QuickPage /> },
  { path: 'notifications/custom', element: <CustomPage /> },
  { path: 'notifications/custom/games', element: <FollowPage kind="games" /> },
  { path: 'notifications/custom/authors', element: <FollowPage kind="authors" /> },
  { path: 'notifications/custom/:field', element: <FieldPage /> },
  { path: '*', element: <Navigate to="/messages" replace /> },
]}]);

export default function App() { return <RouterProvider router={router} />; }
