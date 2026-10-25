import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

test('reference views render with local assets at the original SVG dimensions', async ({ page }) => {
  const folder = resolve('test-results/screenshots');
  await mkdir(folder, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const imageEvidence: unknown[] = [];
  const routes = {
    messages: '/messages', center: '/settings', quick: '/notifications/quick',
    custom: '/notifications/custom', digest: '/notifications/custom/digestTime',
    redDot: '/notifications/custom/redDot', games: '/notifications/custom/games', authors: '/notifications/custom/authors',
  };
  for (const [name, route] of Object.entries(routes)) {
    if (name === 'messages' || name === 'center') await page.setViewportSize({ width: 390, height: 844 });
    else await page.setViewportSize({ width: 393, height: 852 });
    await page.goto(`/?view=${name}#${route}`);
    await page.evaluate(async () => { await document.fonts.ready; });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const images = await page.locator('img').evaluateAll(elements => elements.map(image => {
      if (!(image instanceof HTMLImageElement)) throw new Error('Expected an image element');
      const rect = image.getBoundingClientRect();
      return { src: new URL(image.src).pathname, loaded: image.complete && image.naturalWidth > 0, width: rect.width, height: rect.height };
    }));
    for (const image of images) {
      expect(image.loaded, `${name}: ${image.src} is loaded`).toBe(true);
      const localFile = resolve(`public${image.src}`);
      expect((await stat(localFile)).size).toBeGreaterThan(0);
      if (image.src.endsWith('.svg')) {
        const svg = await readFile(localFile, 'utf8');
        const root = svg.match(/<svg[^>]*>/)?.[0] ?? '';
        expect(image.width).toBe(Number(root.match(/\bwidth="([\d.]+)"/)?.[1]));
        expect(image.height).toBe(Number(root.match(/\bheight="([\d.]+)"/)?.[1]));
      }
    }
    imageEvidence.push({ route, images });
    await page.screenshot({ path: resolve(folder, `${name}.png`) });
    if (name === 'custom') {
      await page.getByRole('button', { name: '恢复标准配置', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(folder, 'custom-bottom.png') });
    }
  }
  await page.goto('/?view=modes#/notifications/quick');
  await page.getByRole('radio', { name: '安静模式', exact: true }).click();
  await page.screenshot({ path: resolve(folder, 'quiet.png') });
  await page.getByRole('button', { name: '查看安静模式详情' }).click();
  await page.screenshot({ path: resolve(folder, 'quiet-detail.png') });
  await page.getByRole('button', { name: '知道了', exact: true }).click();
  await page.getByRole('button', { name: '应用此配置' }).click();
  await page.screenshot({ path: resolve(folder, 'applied.png') });
  await page.getByRole('button', { name: '完成', exact: true }).click();
  for (const mode of ['标准模式', '仅重要消息', '安静模式']) {
    await page.getByRole('button', { name: `查看${mode}详情` }).click();
    const icon = page.getByRole('dialog').locator('img');
    const image = await icon.evaluate(element => {
      const img = element as HTMLImageElement;
      const box = img.getBoundingClientRect();
      return { src: new URL(img.src).pathname, loaded: img.complete && img.naturalWidth > 0, width: box.width, height: box.height };
    });
    expect(image.loaded).toBe(true);
    expect(image.width).toBe(24);
    expect(image.height).toBe(24);
    expect((await stat(resolve(`public${image.src}`))).size).toBeGreaterThan(0);
    imageEvidence.push({ mode, image });
    await expect(page.getByRole('dialog')).toHaveCSS('height', '310px');
    await page.getByRole('button', { name: '知道了', exact: true }).click();
  }
  await writeFile(resolve(folder, 'asset-geometry.json'), JSON.stringify(imageEvidence, null, 2));
  expect(errors).toEqual([]);
});
