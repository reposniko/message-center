import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const storageKey = 'message-center.settings.v1';
const custom = '/#/notifications/custom';

async function stored(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), storageKey);
}

test('message page, settings center, and back links form a working navigation flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '消息', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '消息设置' }).click();
  await expect(page.getByRole('heading', { name: '消息配置中心' })).toBeVisible();
  await page.getByRole('link', { name: /使用常用方案/ }).click();
  await expect(page.getByRole('radio', { name: '标准模式', exact: true })).toBeChecked();
  await page.getByRole('button', { name: '返回消息配置中心' }).click();
  await page.getByRole('button', { name: '返回消息界面' }).click();
  await expect(page.getByText('暂无内容～')).toBeVisible();
});

test('preset choices are pending until apply, and quiet duration starts on apply', async ({ page }) => {
  await page.goto('/#/notifications/quick');
  await page.getByRole('radio', { name: '安静模式', exact: true }).click();
  await expect(page.getByRole('radio', { name: '8小时', exact: true })).toBeVisible();
  await page.getByRole('radio', { name: '8小时', exact: true }).click();
  expect(await stored(page)).toBeNull();
  await page.getByRole('button', { name: '应用此配置' }).click();
  await expect(page.getByRole('dialog', { name: '配置已应用' })).toBeVisible();
  const config = await stored(page);
  expect(config.mode).toBe('quiet');
  expect(config.settings.pushEnabled).toBe(false);
  expect(config.quietUntil - Date.now()).toBeGreaterThan(7.99 * 3_600_000);
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('radio', { name: '安静模式', exact: true })).toBeChecked();
});

test('further customization carries the selected preset without saving it', async ({ page }) => {
  await page.goto('/#/notifications/quick');
  await page.getByRole('radio', { name: '仅重要消息', exact: true }).click();
  await page.getByRole('button', { name: '进一步自定义 ›' }).click();
  await expect(page.getByRole('button', { name: '关注的人发布内容：仅站内查看' })).toBeEnabled();
  expect(await stored(page)).toBeNull();
});

test('turning global push off preserves child values and keeps red dots editable', async ({ page }) => {
  await page.goto(custom);
  await page.getByRole('switch', { name: '消息推送', exact: true }).click();
  await expect(page.getByRole('switch', { name: '账号与安全' })).toBeDisabled();
  await expect(page.getByRole('switch', { name: '账号与安全' })).toBeChecked();
  await expect(page.getByRole('button', { name: /^私信：/ })).toBeDisabled();
  await page.getByRole('button', { name: /^红点显示：/ }).click();
  await page.getByRole('radio', { name: '互动与订阅消息', exact: true }).click();
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await page.getByRole('switch', { name: '消息推送', exact: true }).click();
  await expect(page.getByRole('switch', { name: '账号与安全' })).toBeEnabled();
  await expect(page.getByRole('switch', { name: '账号与安全' })).toBeChecked();
  await expect(page.getByRole('button', { name: '红点显示：互动与订阅消息' })).toBeVisible();
});

test('single-column hours include midnight and 23:00, return to the same row, and persist only on save', async ({ page }) => {
  await page.goto(custom);
  const entry = page.getByRole('button', { name: /^每日摘要时间：/ });
  await entry.click();
  const list = page.getByRole('listbox', { name: '每日摘要时间' });
  await expect(list.getByRole('option')).toHaveCount(24);
  await expect(list.getByRole('option', { name: '19:00', exact: true })).toBeInViewport();
  await list.getByRole('option', { name: '00:00', exact: true }).click();
  expect(await stored(page)).toBeNull();
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await expect(page.getByRole('button', { name: '每日摘要时间：00:00' })).toBeInViewport();
  await page.getByRole('button', { name: '每日摘要时间：00:00' }).click();
  await list.focus();
  await page.keyboard.press('End');
  await expect(list.getByRole('option', { name: '23:00', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await page.getByRole('button', { name: '保存设置', exact: true }).click();
  expect((await stored(page)).settings.digestTime).toBe('23:00');
  await page.reload();
  await expect(page.getByRole('button', { name: '每日摘要时间：23:00' })).toBeAttached();
});

test('unsaved return supports continuing, discarding and saving', async ({ page }) => {
  await page.goto(custom);
  const push = page.getByRole('switch', { name: '消息推送', exact: true });
  await push.click();
  await page.getByRole('button', { name: '返回消息配置中心' }).click();
  await expect(page.getByRole('dialog', { name: '保存当前设置？' })).toBeVisible();
  await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(push).not.toBeChecked();
  await page.getByRole('button', { name: '返回消息配置中心' }).click();
  await page.getByRole('button', { name: '放弃修改', exact: true }).click();
  await page.getByRole('link', { name: /按个人偏好/ }).click();
  await expect(push).toBeChecked();
  await push.click();
  await page.getByRole('button', { name: '返回消息配置中心' }).click();
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('heading', { name: '消息配置中心' })).toBeVisible();
  expect((await stored(page)).settings.pushEnabled).toBe(false);
});

test('restore requires confirmation and does not overwrite saved data before save', async ({ page }) => {
  await page.goto(custom);
  await page.getByRole('switch', { name: '消息推送', exact: true }).click();
  await page.getByRole('button', { name: '保存设置', exact: true }).click();
  await page.getByRole('button', { name: '恢复标准配置', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '恢复标准配置？' })).toBeVisible();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  expect((await stored(page)).settings.pushEnabled).toBe(false);
  await page.getByRole('button', { name: '恢复标准配置', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '恢复标准配置', exact: true }).click();
  await expect(page.getByRole('switch', { name: '消息推送', exact: true })).toBeChecked();
  expect((await stored(page)).settings.pushEnabled).toBe(false);
  await page.getByRole('button', { name: '保存设置', exact: true }).click();
  expect((await stored(page)).settings.pushEnabled).toBe(true);
});

test('management uses the original avatars and supports undoing a pending unfollow', async ({ page }) => {
  await page.goto(custom);
  await page.getByRole('button', { name: '管理关注的游戏', exact: true }).click();
  await expect(page.getByRole('img', { name: '王者荣耀', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '取消关注王者荣耀', exact: true }).click();
  expect(await stored(page)).toBeNull();
  await page.getByRole('button', { name: '重新关注王者荣耀', exact: true }).click();
  await page.getByRole('button', { name: '返回上一级' }).click();
  await page.getByRole('button', { name: '管理关注的作者', exact: true }).click();
  await expect(page.getByText('动画评论师')).toBeVisible();
  const loaded = await page.locator('img').evaluateAll(images => images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0));
  expect(loaded).toBe(true);
});

test('small mobile viewport keeps all content reachable and the save button visible', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(custom);
  await page.getByRole('button', { name: '恢复标准配置', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: '保存设置', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('do not disturb retains both chosen hours when disabled and re-enabled', async ({ page }) => {
  await page.goto(custom);
  await page.getByRole('button', { name: '免打扰开始时间：22:00' }).click();
  await page.getByRole('radio', { name: '21:00', exact: true }).click();
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await page.getByRole('button', { name: '免打扰结束时间：08:00' }).click();
  await page.getByRole('radio', { name: '09:00', exact: true }).click();
  await page.getByRole('button', { name: '完成', exact: true }).click();
  const dnd = page.getByRole('switch', { name: '免打扰时段', exact: true });
  await dnd.click();
  await expect(page.getByRole('button', { name: '免打扰开始时间：21:00' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '免打扰结束时间：09:00' })).toBeDisabled();
  await dnd.click();
  await expect(page.getByRole('button', { name: '免打扰结束时间：09:00' })).toBeEnabled();
  await page.getByRole('button', { name: '保存设置', exact: true }).click();
  expect((await stored(page)).settings).toMatchObject({ dndEnabled: true, dndStart: '21:00', dndEnd: '09:00' });
});

test('every secondary notification choice updates the draft and saves together', async ({ page }) => {
  await page.goto(custom);
  const choices = [
    ['私信', '所有人'], ['回复与@我', '每日汇总'], ['点赞与收藏', '每日汇总'],
    ['关注的人发布内容', '即时提醒'], ['游戏预约与上线', '仅站内查看'],
    ['游戏版本更新', '全部更新'], ['推荐与活动消息推送上限', '每天最多1条'],
  ];
  for (const [label, value] of choices) {
    await page.getByRole('button', { name: new RegExp(`^${label}：`) }).click();
    await page.getByRole('radio', { name: value, exact: true }).click();
    await page.getByRole('button', { name: '完成', exact: true }).click();
    await expect(page.getByRole('button', { name: `${label}：${value}`, exact: true })).toBeAttached();
  }
  expect(await stored(page)).toBeNull();
  await page.getByRole('button', { name: '保存设置', exact: true }).click();
  expect((await stored(page)).settings).toMatchObject({ privateMessages: '所有人', replies: '每日汇总', likes: '每日汇总', following: '即时提醒', reservations: '仅站内查看', updates: '全部更新', dailyLimit: '每天最多1条' });
});

test('the system permission banner is hidden by default and can be previewed explicitly', async ({ page }) => {
  await page.goto(custom);
  await expect(page.getByText('系统通知未开启', { exact: true })).toHaveCount(0);
  await page.goto('/?permission=denied#/notifications/custom');
  await expect(page.getByText('系统通知未开启', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '前往设置', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '开启系统通知' })).toBeVisible();
});

test('the whole mode card selects it while its detail button leaves the selected mode unchanged', async ({ page }) => {
  await page.goto('/#/notifications/quick');
  await page.locator('.mode-card').nth(1).click({ position: { x: 2, y: 2 } });
  await expect(page.getByRole('radio', { name: '仅重要消息', exact: true })).toBeChecked();
  await page.getByRole('button', { name: '查看安静模式详情' }).click();
  await expect(page.getByRole('dialog', { name: '安静模式', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '知道了', exact: true }).click();
  await expect(page.getByRole('radio', { name: '仅重要消息', exact: true })).toBeChecked();
  expect(await stored(page)).toBeNull();
});
