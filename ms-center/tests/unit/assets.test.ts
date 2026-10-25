import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const directory = new URL('../../public/assets/', import.meta.url);

describe('original Figma assets', () => {
  it('keeps the exact six source images mapped to their game and author slots', () => {
    const images = {
      'raw-5.jpeg': '84d14d81c0f9f0ee56b7b61e914cc44a08a00da7',
      'raw-4.jpeg': '9662869258a889d9ad8f1c3981bf283b12bfdc79',
      'raw-0.jpeg': '96346d65e1d346338ff42e2410d6e30d576bd78d',
      'author-raw-0.jpeg': '5c4b3d6a4abf1b6710ff93cb8e3514dc443e8429',
      'author-raw-1.jpeg': 'a4c99e72a79d6272f8df518302a4e96b81980002',
      'author-raw-5.jpeg': 'd09a3e0f641fa02b53f6666d308ad30a50793d9b',
    };
    for (const [file, hash] of Object.entries(images)) {
      expect(createHash('sha1').update(readFileSync(new URL(file, directory))).digest('hex')).toBe(hash);
    }
  });
  it('has a nonempty local file for every referenced static icon and illustration', () => {
    const components = readFileSync(new URL('../../src/components.tsx', import.meta.url), 'utf8');
    const files = [...components.matchAll(/'([a-z0-9]+\.svg)'/g)].map(match => match[1]);
    for (const file of new Set([...files, '174ae.png', '9e5e3.svg', '188e2.svg', '9bebc.svg'])) {
      expect(statSync(fileURLToPath(new URL(file, directory))).size).toBeGreaterThan(100);
    }
    const pages = readFileSync(new URL('../../src/pages.tsx', import.meta.url), 'utf8');
    expect(pages).not.toContain('https://www.figma.com/api/mcp/asset');
    expect(components).not.toContain('https://www.figma.com/api/mcp/asset');
  });
});
