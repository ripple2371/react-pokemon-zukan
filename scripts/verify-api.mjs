import assert from 'node:assert/strict';
import { build } from 'vite';
import { QueryClient } from '@tanstack/react-query';

// アプリと同じTypeScriptを追加ライブラリなしで読み込む検証用バンドル。
const result = await build({
  configFile: false,
  logLevel: 'silent',
  plugins: [{
    name: 'api-verification',
    resolveId(id) { if (id.endsWith('virtual:verify')) return '\0verify'; },
    load(id) {
      if (id === '\0verify') return `
        export * from '/src/api/pokemon.ts';
        export * from '/src/api/resource.ts';
        export * from '/src/api/pokemonNavigation.ts';
        export * from '/src/api/pokemonDetail.ts';
        export * from '/src/api/pokemonSpecies.ts';
        export * from '/src/api/pokemonWithJapaneseName.ts';
        export * from '/src/queryKeys.ts';
        export * from '/src/pokemonTypesMap.ts';
      `;
    },
  }],
  build: { write: false, minify: false, lib: { entry: 'virtual:verify', formats: ['es'] } },
});
const { output } = Array.isArray(result) ? result[0] : result;
const code = output.find((item) => item.type === 'chunk' && item.isEntry).code;
const api = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const originalFetch = globalThis.fetch;
const originalError = console.error;
const json = (data) => new Response(JSON.stringify(data));
let calls = [];
const speciesUrl = 'https://pokeapi.co/api/v2/pokemon-species/1/';
const detailUrl = 'https://pokeapi.co/api/v2/pokemon/1/';
const detail = { id: 1, species: { url: speciesUrl }, types: [], abilities: [] };
try {
  assert.equal(api.pokemonTypesMap.length, 18);
  assert.equal(new Set(api.pokemonTypesMap.map((item) => item.type)).size, 18);
  api.resourceQueryClient.clear();
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url === detailUrl) return json(detail);
    if (url === speciesUrl) return json({ names: [
      { name: '別表記', language: { name: 'ja' } },
      { name: 'フシギダネ', language: { name: 'ja-hrkt' } },
    ] });
    return json({ count: 1, next: null, previous: null, results: [{ name: 'bulbasaur', url: detailUrl }] });
  };
  const data = await api.fetchPokemonListWithJapaneseNames(20, 1);
  assert.match(calls[0], /offset=20&limit=1$/);
  assert.equal(data.results[0].japaneseName, 'フシギダネ');
  assert.equal(data.results[0].number, '1');
  assert.equal(data.next, null);
  api.resourceQueryClient.clear();
  globalThis.fetch = async () => json({ names: [{ name: '日本語名', language: { name: 'ja' } }] });
  assert.equal(await api.fetchPokemonJapaneseName(speciesUrl, 'fallback'), '日本語名');
  api.resourceQueryClient.clear();
  globalThis.fetch = async () => json({ names: [] });
  assert.equal(await api.fetchPokemonJapaneseName(speciesUrl, 'fallback'), 'fallback');
  console.error = () => {};
  api.resourceQueryClient.clear();
  globalThis.fetch = async () => new Response('', { status: 503 });
  await assert.rejects(api.fetchPokemonDetail(1), /詳細情報の取得に失敗/);
  api.resourceQueryClient.clear();
  globalThis.fetch = async () => new Response('', { status: 404 });
  await assert.rejects(api.fetchPokemonDetail(999999), api.PokemonNotFoundError);
  await assert.rejects(api.fetchPokemonList(), /一覧の取得に失敗/);
  assert.equal(await api.fetchPokemonJapaneseName(speciesUrl, 'fallback'), 'fallback');
  api.resourceQueryClient.clear();
  globalThis.fetch = async (url) => url === detailUrl
    ? new Response('', { status: 404 })
    : json({ results: [{ name: 'bulbasaur', url: detailUrl }] });
  await assert.rejects(api.fetchPokemonListWithJapaneseNames(), /詳細情報の取得に失敗/);
  api.resourceQueryClient.clear();
  globalThis.fetch = async () => { throw new TypeError('Network failure'); };
  await assert.rejects(api.fetchPokemonList(), /Network failure/);
  assert.equal(await api.fetchPokemonJapaneseName(speciesUrl, 'fallback'), 'fallback');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  let requests = 0;
  try {
    const options = { queryKey: api.apiQueryKeys.pokemon.list, queryFn: async () => { requests++; return data; } };
    await client.fetchQuery(options);
    await client.fetchQuery(options);
    assert.equal(requests, 1);
    assert.notDeepEqual(api.apiQueryKeys.pokemon.detail(1), api.apiQueryKeys.pokemon.detail(25));
    assert.notDeepEqual(api.apiQueryKeys.pokemon.list, api.apiQueryKeys.pokemon.detail(1));
  } finally { client.clear(); }

  api.resourceQueryClient.clear();
  let active = 0, peak = 0; requests = 0;
  globalThis.fetch = async () => {
    requests++; active++; peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active--; return json({ ok: true });
  };
  await Promise.all(Array.from({ length: 20 }, (_, i) => api.fetchResource('https://pokeapi.co/test/' + i, 'failed')));
  assert.equal(peak, 6);
  await Promise.all([api.fetchResource('https://pokeapi.co/test/shared', 'failed'), api.fetchResource('https://pokeapi.co/test/shared/', 'failed')]);
  assert.equal(requests, 21);
  await api.fetchResource('https://pokeapi.co/test/shared', 'failed');
  assert.equal(requests, 21);
  api.resourceQueryClient.clear();
  const entry = (id) => ({ name: String(id), url: `https://pokeapi.co/api/v2/pokemon/${id}/` });
  requests = 0;
  globalThis.fetch = async (url) => {
    requests++;
    return json(String(url).includes('offset=200')
      ? { count: 3, next: null, previous: 'unused', results: [entry(10001)] }
      : { count: 3, next: 'https://pokeapi.co/api/v2/pokemon?offset=200&limit=200', previous: null, results: [entry(1), entry(25)] });
  };
  let neighbors = await api.fetchPokemonNeighbors(1);
  assert.equal(neighbors.previous, undefined);
  assert.equal(neighbors.next.name, '25');
  assert.equal(requests, 1);
  neighbors = await api.fetchPokemonNeighbors(25);
  assert.equal(neighbors.previous.name, '1');
  assert.equal(neighbors.next.name, '10001');
  neighbors = await api.fetchPokemonNeighbors(10001);
  assert.equal(neighbors.previous.name, '25');
  assert.equal(neighbors.next, undefined);
  assert.deepEqual(await api.fetchPokemonNeighbors(999), {});
  assert.equal(requests, 2);
  api.resourceQueryClient.clear();
  globalThis.fetch = async () => new Response('', { status: 500 });
  await assert.rejects(api.fetchPokemonNeighbors(1), /一覧の取得に失敗/);
  globalThis.fetch = async () => json({ results: [entry(1)], next: null });
  assert.deepEqual(await api.fetchPokemonNeighbors(1), { previous: undefined, next: undefined });
  api.resourceQueryClient.clear();
  const originalTimeout = AbortSignal.timeout;
  const deadlines = [];
  try {
    // 15秒の指定を確認したうえで、待機だけを5msに短縮する。
    AbortSignal.timeout = (ms) => { deadlines.push(ms); return originalTimeout.call(AbortSignal, 5); };
    globalThis.fetch = (_url, { signal }) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(json({})), 100);
      signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
    });
    const timeouts = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => api.fetchResource(`https://pokeapi.co/timeout/${i}`, 'timeout')));
    assert.equal(timeouts.filter(result => result.status === 'rejected' && result.reason.name === 'TimeoutError').length, 8);
    assert.deepEqual(deadlines, Array(8).fill(15000));
  } finally { AbortSignal.timeout = originalTimeout; }
  // タイムアウト後も待ち行列の枠が解放され、次の通信が成功する。
  globalThis.fetch = async () => json({ recovered: true });
  assert.deepEqual(await api.fetchResource('https://pokeapi.co/recovered', 'failed'), { recovered: true });
  globalThis.fetch = async () => new Response('invalid json');
  await assert.rejects(api.fetchResource('https://pokeapi.co/malformed', 'failed'), SyntaxError);
  globalThis.fetch = async () => json({ recovered: true });
  assert.deepEqual(await api.fetchResource('https://pokeapi.co/malformed', 'failed'), { recovered: true });
  console.log('PASS: timeout signal/deadline, queued request recovery, malformed JSON retry');
  console.log('PASS: concurrency=6, in-flight deduplication, cache reuse, gaps/forms/page boundary/first/last/missing ID, 500 then retry');

  console.log('PASS: 18タイプ、ページ引数、日本語優先順位、フォールバック、HTTP/通信エラー、クエリキーとキャッシュ');
} finally {
  api.resourceQueryClient.clear();
  api.resourceQueryClient.clear();
  globalThis.fetch = originalFetch;
  console.error = originalError;
}
if (process.argv.includes('--live')) {
  api.resourceQueryClient.clear();
  globalThis.fetch = (url, options) => originalFetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  try {
    const first = await api.fetchPokemonListWithJapaneseNames(0, 1);
    assert.equal(first.results[0].japaneseName, 'フシギダネ');
    assert.equal(first.results[0].number, '1');
    assert.ok(first.results[0].types.length > 0);
    const next = await api.fetchPokemonList(1, 1);
    assert.equal(next.results[0].name, 'ivysaur');
    const detail = await api.fetchPokemonDetail(1);
    assert.equal(detail.japaneseName, 'フシギダネ');
    assert.equal(detail.number, 1);
    assert.equal(detail.baseStats.length, 6);
    assert.equal(detail.baseStats.reduce((sum, stat) => sum + stat.value, 0), 318);
    assert.ok(detail.types.includes('くさ'));
    assert.ok(detail.abilities.includes('しんりょく'));
    const form = await api.fetchPokemonDetail(10001);
    assert.equal(form.id, 10001);
    assert.equal(form.number, 386);
    const index = await api.fetchPokemonIndex();
    assert.ok(index.some((pokemon) => pokemon.url.endsWith('/10001/')));
    console.log('PASS: 実PokeAPIの一覧・詳細・日本語名取得、次ページ取得');
  } finally { api.resourceQueryClient.clear(); globalThis.fetch = originalFetch; }
}
