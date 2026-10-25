# 消息中心 · React + TypeScript

按 [Figma 消息中心设计](https://www.figma.com/design/mO23fLt1XoislY85FFjGes/) 还原，沿用现有 Vite、React 和 TypeScript 项目。

## 启动

```sh
npm install
npm run dev
```

默认进入消息页。点击右上角设置图标进入配置中心，也可以直接访问：

- `/#/settings`：消息配置中心
- `/#/notifications/quick`：快捷配置
- `/#/notifications/custom`：自定义配置

## 页面和交互

- 消息页、个人/系统通知切换、关注/表态/@我/回复入口及原设计空状态。
- 标准、仅重要消息、安静三种模式；选择后点击“应用此配置”才生效。
- 安静模式可暂停 1 小时、8 小时或直到手动恢复；到期后恢复消息推送，并保留子项配置。
- “进一步自定义”带入当前选择的模式。
- 消息推送、红点、9 类消息、免打扰、每日摘要和频率配置。
- 每日摘要通过同一个单列滚动组件选择 `00:00–23:00`，默认 `19:00`。支持鼠标、触摸和方向键/Home/End；滚动浏览后点击时间选中。
- 所有设置先写入草稿，点击“保存设置”后存入 `localStorage`。未保存返回支持保存、放弃或继续编辑；恢复标准配置需要确认。
- 关闭消息推送后，其下属配置保留并禁用，红点仍可调整。
- 游戏/作者列表使用原设计头像，取消关注可撤回，并随父页面设置一起保存。
- 在地址的 hash **前**添加 `?permission=denied` 可预览系统通知未开启提示，例如 `/?permission=denied#/notifications/custom`。

这是本地可运行的前端还原，尚未接入消息列表、真实关注关系及消息推送服务；系统权限提示是可控预览状态。

## 结构

```text
src/
  App.tsx                路由、导航、返回确认和滚动位置恢复
  pages.tsx              消息、配置及二级设置页面
  components.tsx         状态栏、设置行、开关、弹窗、时间选择器
  settings.ts            强类型配置、预设、存储校验和暂停期限
  context.ts             共享状态接口
  SettingsProvider.tsx   草稿与已保存状态、持久化
  App.css / index.css    Figma 颜色与布局、移动端适配
public/assets/           从 Figma 下载的本地图标、插画和头像
```

所有运行时素材及 Noto Sans SC 字体均本地提供，无临时 Figma 素材地址或字体 CDN 依赖。

## 验证

```sh
npm run lint
npm run test
npm run build
npm run test:e2e
```

浏览器测试使用本机 Chrome。未安装 Chrome 时，可将 `playwright.config.ts` 的 `channel` 改为 `msedge`，或安装 Playwright Chromium 并移除该选项。
