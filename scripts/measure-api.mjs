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
let count = 0, active = 0, peak = 0;
globalThis.fetch = async (...args) => { count++; active++; peak = Math.max(peak, active); try { return await originalFetch(args[0], { ...args[1], signal: AbortSignal.timeout(15000) }); } finally { active--; } };
try {
 for (const [label, task] of [
  ['first40', () => api.fetchPokemonListWithJapaneseNames(0,40)],
  ['repeat40', () => api.fetchPokemonListWithJapaneseNames(0,40)],
  ['detail1', () => api.fetchPokemonDetail(1)],
  ['next40', () => api.fetchPokemonListWithJapaneseNames(40,40)]
 ]) { count=0; peak=0; const start=performance.now(); await task(); console.log(JSON.stringify({label,requests:count,peak,milliseconds:Math.round(performance.now()-start)})); }
} finally { globalThis.fetch=originalFetch; api.resourceQueryClient?.clear(); }
