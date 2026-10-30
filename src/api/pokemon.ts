import { fetchResource } from './resource';
// src/api/pokemon.ts
import { API_BASE_URL } from '../config';

export interface PokemonListResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    name: string;
    url: string;
  }[];
}

export const fetchPokemonList = async (offset: number = 0, limit: number = 20): Promise<PokemonListResult> => {
  return fetchResource<PokemonListResult>(`${API_BASE_URL}/pokemon?offset=${offset}&limit=${limit}`, 'ポケモン一覧の取得に失敗しました');
};

// 件数をAPIから確認する。IDに欠番があっても、実在する項目の順番で移動できる。
export const fetchPokemonIndex = async (): Promise<PokemonListResult['results']> => {
  const firstPage = await fetchPokemonList(0, 1);
  if (!firstPage.next) return firstPage.results;
  const allPokemon = await fetchPokemonList(0, firstPage.count);
  return allPokemon.results;
};
