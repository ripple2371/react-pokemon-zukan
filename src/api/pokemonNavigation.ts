import { fetchPokemonList } from './pokemon';
import type { PokemonListResult } from './pokemon';

type Entry = PokemonListResult['results'][number];
export type PokemonNeighbors = { previous?: Entry; next?: Entry };
// REST APIにはID→一覧offsetの検索がないため、実在順にページを走査する。
// 対象と隣が判明したら停止し、取得済みページは共有キャッシュを再利用する。
export async function fetchPokemonNeighbors(id: number): Promise<PokemonNeighbors> {
  let offset = 0;
  let previous: Entry | undefined;
  const seen = new Set<number>();
  while (!seen.has(offset)) {
    seen.add(offset);
    const page = await fetchPokemonList(offset, 200);
    const index = page.results.findIndex((entry) => Number(entry.url.split('/').filter(Boolean).pop()) === id);
    if (index >= 0) {
      const before = page.results[index - 1] ?? previous;
      let after = page.results[index + 1];
      if (!after && page.next) {
        const nextOffset = Number(new URL(page.next).searchParams.get('offset'));
        after = (await fetchPokemonList(nextOffset, 200)).results[0];
      }
      return { previous: before, next: after };
    }
    if (!page.next || !page.results.length) return {};
    previous = page.results.at(-1);
    offset = Number(new URL(page.next).searchParams.get('offset'));
  }
  return {};
}
