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
  globalThis.fetch = async () => json({ names: [{ name: '日本語名', language: { name: 'ja' } }] });
  assert.equal(await api.fetchPokemonJapaneseName(speciesUrl, 'fallback'), '日本語名');
  globalThis.fetch = async () => json({ names: [] });
  assert.equal(await api.fetchPokemonJapaneseName(speciesUrl, 'fallback'), 'fallback');
  console.error = () => {};
  globalThis.fetch = async () => new Response('', { status: 503 });
  await assert.rejects(api.fetchPokemonList(), /一覧の取得に失敗/);
  assert.equal(await api.fetchPokemonJapaneseName(speciesUrl, 'fallback'), 'fallback');
  globalThis.fetch = async (url) => url === detailUrl
    ? new Response('', { status: 404 })
    : json({ results: [{ name: 'bulbasaur', url: detailUrl }] });
  await assert.rejects(api.fetchPokemonListWithJapaneseNames(), /詳細情報の取得に失敗/);
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
  console.log('PASS: 18タイプ、ページ引数、日本語優先順位、フォールバック、HTTP/通信エラー、クエリキーとキャッシュ');
} finally {
  globalThis.fetch = originalFetch;
  console.error = originalError;
}
if (process.argv.includes('--live')) {
  globalThis.fetch = (url, options) => originalFetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  try {
    const first = await api.fetchPokemonListWithJapaneseNames(0, 1);
    assert.equal(first.results[0].japaneseName, 'フシギダネ');
    assert.equal(first.results[0].number, '1');
    assert.ok(first.results[0].types.length > 0);
    const next = await api.fetchPokemonList(1, 1);
    assert.equal(next.results[0].name, 'ivysaur');
    console.log('PASS: 実PokeAPIの一覧・詳細・日本語名取得、次ページ取得');
  } finally { globalThis.fetch = originalFetch; }
}
