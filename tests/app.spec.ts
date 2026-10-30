import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const api = 'https://pokeapi.co/api/v2';
const name = (id: number) => id === 1 ? 'フシギダネ' : id === 25 ? 'ピカチュウ' : id === 10001 ? 'デオキシス（アタックフォルム）' : `ポケモン${id}`;
const ids = [...Array.from({ length: 80 }, (_, i) => i + 1), 10001];
const entry = (id: number) => ({ name: `pokemon-${id}`, url: `${api}/pokemon/${id}/` });
async function fixture(page: Page) {
  const state = { failList: false, failNext: false, offline: false, delay: 0, calls: [] as string[] };
  await page.route('https://raw.githubusercontent.com/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="green"/></svg>' }));
  await page.route('https://pokeapi.co/api/v2/**', async route => {
    const url = new URL(route.request().url());
    state.calls.push(url.pathname + url.search);
    if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
    if (state.offline) return route.abort('failed');
    const parts = url.pathname.split('/').filter(Boolean);
    const kind = parts[2], id = Number(parts[3]);
    let body: unknown;
    if (kind === 'pokemon' && !parts[3]) {
      const offset = Number(url.searchParams.get('offset') ?? 0), limit = Number(url.searchParams.get('limit') ?? 20);
      if (state.failList || (state.failNext && offset > 0)) return route.fulfill({ status: 500, json: {} });
      body = { count: ids.length, next: offset + limit < ids.length ? `${api}/pokemon?offset=${offset+limit}&limit=${limit}` : null,
        previous: null, results: ids.slice(offset, offset+limit).map(entry) };
    } else if (kind === 'pokemon') {
      if (!ids.includes(id)) return route.fulfill({ status: 404, json: {} });
      body = { id, name: `pokemon-${id}`, species: { url: `${api}/pokemon-species/${id === 10001 ? 386 : id}/` },
        types: [{ slot: 1, type: { name: 'grass', url: `${api}/type/12/` } }],
        abilities: [{ ability: { name: 'overgrow', url: `${api}/ability/65/` } }],
        stats: ['hp','attack','defense','special-attack','special-defense','speed'].map(n => ({ base_stat: 45, stat: { name: n } })),
        sprites: { front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` } };
    } else if (kind === 'pokemon-species') {
      body = { id, names: [{ name: name(id === 386 ? 10001 : id), language: { name: 'ja-hrkt' } }],
        flavor_text_entries: [{ flavor_text: '長い日本語の説明文です。'.repeat(10), language: { name: 'ja' } }] };
    } else {
      body = { names: [{ name: kind === 'type' ? 'くさ' : kind === 'ability' ? 'しんりょく' : parts[3], language: { name: 'ja' } }] };
    }
    await route.fulfill({ json: body });
  });
  return state;
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('40 cards, aligned names/numbers/images, cache, repeated scrolling and no React warnings', async ({ page }) => {
  const state = await fixture(page);
  const warnings: string[] = [];
  page.on('pageerror', error => warnings.push(error.message));
  page.on('console', message => { if (['error','warning'].includes(message.type())) warnings.push(message.text()); });
  await page.goto('./');
  await expect(page.locator('main h2')).toHaveCount(40);
  expect(state.calls.length).toBe(81);
  const first = page.getByRole('link', { name: /No\. 1 フシギダネ/ });
  await expect(first).toHaveAttribute('href', '#/pokemon/1');
  await expect(first.getByRole('img')).toHaveAttribute('src', /pokemon\/1.png$/);
  await expect(first.getByRole('img')).toHaveAttribute('alt', 'フシギダネ');
  await noOverflow(page);
  // A user repeatedly reaches the bottom while the next page is still pending.
  state.delay = 10;
  await page.getByRole('button', { name: '続きを読み込む', exact: true }).scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 800);
  await page.mouse.wheel(0, 800);
  await expect(page.locator('main h2')).toHaveCount(80);
  expect(state.calls.filter(url => url === '/api/v2/pokemon?offset=40&limit=40')).toHaveLength(1);
  expect(new Set(await page.locator('main h2').allTextContents()).size).toBe(80);
  await first.click();
  await expect(page.getByRole('heading', { name: 'フシギダネ (#1)', exact: true })).toBeVisible();
  const before = state.calls.length;
  await page.getByRole('link', { name: '← 一覧に戻る', exact: true }).click();
  await expect(page.locator('main h2')).toHaveCount(80);
  expect(state.calls.length).toBe(before);
  expect(warnings).toEqual([]);
});

test('initial 500 error and manual retry', async ({ page }) => {
  const state = await fixture(page); state.failList = true;
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('一覧を読み込めませんでした', { timeout: 15000 });
  await noOverflow(page);
  expect(state.calls.length).toBe(3);
  state.failList = false;
  await page.getByRole('button', { name: '再読み込み', exact: true }).click();
  await expect(page.locator('main h2')).toHaveCount(40);
});

test('offline failure and recovery', async ({ page }) => {
  const state = await fixture(page); state.offline = true;
  await page.goto('./');
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 });
  state.offline = false;
  await page.getByRole('button', { name: '再読み込み', exact: true }).click();
  await expect(page.locator('main h2')).toHaveCount(40);
});

test('next-page failure retains cards and retry recovers', async ({ page }) => {
  const state = await fixture(page); state.failNext = true;
  await page.goto('./');
  await expect(page.locator('main h2')).toHaveCount(40);
  await page.getByRole('button', { name: '続きを読み込む', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('alert')).toContainText('続きの読み込みに失敗', { timeout: 15000 });
  await expect(page.locator('main h2')).toHaveCount(40);
  state.failNext = false;
  await page.getByRole('button', { name: '続きを再読み込み' }).click();
  await expect(page.locator('main h2')).toHaveCount(80);
});

test('detail, reload, keyboard navigation and form boundary', async ({ page }) => {
  await fixture(page);
  await page.goto('./#/pokemon/25');
  await expect(page.getByRole('heading', { name: 'ピカチュウ (#25)' })).toBeVisible();
  await expect(page.getByText('くさ', { exact: true })).toBeVisible();
  await expect(page.getByText('しんりょく', { exact: true })).toBeVisible();
  await expect(page.getByText('270', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'ピカチュウ' })).toBeVisible();
  await noOverflow(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'ピカチュウ (#25)' })).toBeVisible();
  const next = page.getByRole('link', { name: '次へ', exact: true });
  await next.focus(); await expect(next).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'ポケモン26 (#26)' })).toBeVisible();
  await page.goto('./#/pokemon/10001');
  await expect(page.getByRole('heading', { name: /デオキシス.*#386/ })).toBeVisible();
  await expect(page.getByRole('link', { name: '前へ', exact: true })).toHaveAttribute('href', '#/pokemon/80');
  await expect(page.getByRole('link', { name: '次へ', exact: true })).toHaveCount(0);
  await noOverflow(page);
});

test('invalid IDs, missing IDs and unknown route', async ({ page }) => {
  const state = await fixture(page);
  for (const id of ['abc', '0', '-1', '1.5', '9007199254740992']) {
    await page.goto(`./#/pokemon/${id}`);
    await expect(page.getByRole('alert')).toHaveText('図鑑番号が正しくありません。');
    await noOverflow(page);
  }
  expect(state.calls).toHaveLength(0);
  await page.goto('./#/pokemon/999999');
  await expect(page.getByRole('alert')).toHaveText('ポケモンが見つかりません。');
  expect(state.calls).toHaveLength(1);
  await page.goto('./#/missing');
  await expect(page.getByRole('heading', { name: 'ページが見つかりません。' })).toBeVisible();
  await noOverflow(page);
});

test('initial skeleton is announced while API is pending', async ({ page }) => {
  const state = await fixture(page); state.delay = 200;
  await page.goto('./');
  await expect(page.getByRole('status', { name: 'ポケモンを読み込み中' })).toBeVisible();
  await noOverflow(page);
  await expect(page.locator('main h2')).toHaveCount(40, { timeout: 15000 });
});

test('contrast, visible keyboard focus and image alternatives', async ({ page }) => {
  await fixture(page);
  await page.goto('./#/pokemon/25');
  await expect(page.getByRole('heading', { name: 'ピカチュウ (#25)' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /ポケモン図鑑/ })).toBeFocused();
  const outline = await page.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe('none');
  for (const image of await page.getByRole('img').all()) expect(await image.getAttribute('alt')).toBeTruthy();
  const colors = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    function luminance(color: string) {
      context.clearRect(0,0,1,1); context.fillStyle=color; context.fillRect(0,0,1,1);
      const pixels=context.getImageData(0,0,1,1).data;
      const rgb=Array.from(pixels).slice(0,3).map(channel => { const c=channel/255; return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4; });
      return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
    }
    return [...document.querySelectorAll('main span[style], main a, header a, nav a')].filter(element=>element.textContent?.trim()).map(element => {
      const foreground=getComputedStyle(element).color;
      let ancestor: Element | null=element, background='white';
      while(ancestor) { const bg=getComputedStyle(ancestor).backgroundColor; if(bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent'){background=bg;break;} ancestor=ancestor.parentElement; }
      const l1=luminance(foreground), l2=luminance(background);
      return { text: element.textContent, contrast:(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05) };
    });
  });
  expect(colors.length).toBeGreaterThan(3);
  for(const color of colors) expect(color.contrast, `${color.text} contrast`).toBeGreaterThanOrEqual(4.5);
});
