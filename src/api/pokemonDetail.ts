import { ApiError, fetchResource } from './resource';
// src/api/pokemonDetail.ts
import type { FlavorTextEntry, Pokemon, PokemonAbility, PokemonStat, PokemonType } from './pokemon.type';
import type { Name } from './common.type';
import { API_BASE_URL } from '../config';

export class PokemonNotFoundError extends Error {
  constructor() {
    super('ポケモンが見つかりません');
    this.name = 'PokemonNotFoundError';
  }
}

type PokemonDetail = {
  id: number;
  number: number;
  name: string;
  japaneseName: string;
  image: string | null;
  types: string[];
  abilities: string[];
  description: string;
  baseStats: { name: string; value: number }[];
};

type PokemonSpeciesData = {
  id: number;
  names: Name[];
  flavor_text_entries: FlavorTextEntry[];
};

const findJapaneseName = (names: Name[], fallbackName: string): string => {
  const japaneseName = names.find((name) => name.language.name === 'ja-hrkt')
    ?? names.find((name) => name.language.name === 'ja');

  return japaneseName ? japaneseName.name : fallbackName;
};

export const fetchPokemonDetail = async (id: number): Promise<PokemonDetail> => {
  let data: Pokemon;
  try { data = await fetchResource<Pokemon>(`${API_BASE_URL}/pokemon/${id}/`, 'ポケモンの詳細情報の取得に失敗しました'); }
  catch (error) { if (error instanceof ApiError && error.status === 404) throw new PokemonNotFoundError(); throw error; }
  const speciesData = await fetchResource<PokemonSpeciesData>(data.species.url, 'ポケモン種族情報の取得に失敗しました');
  const japaneseName = findJapaneseName(speciesData.names, data.name);

  // タイプの日本語名を取得
  const types = await Promise.all(
    data.types.map(async (typeInfo: PokemonType) => {
      const typeData = await fetchResource<{ names: Name[] }>(typeInfo.type.url, 'タイプ情報の取得に失敗しました');
      return findJapaneseName(typeData.names, typeInfo.type.name);
    })
  );

  // 特性の日本語名を取得
  const abilities = await Promise.all(
    data.abilities.map(async (abilityInfo: PokemonAbility) => {
      const abilityData = await fetchResource<{ names: Name[] }>(abilityInfo.ability.url, '特性情報の取得に失敗しました');
      return findJapaneseName(abilityData.names, abilityInfo.ability.name);
    })
  );

  // 種族値の取得
  const baseStats = await Promise.all(data.stats.map( async (stat: PokemonStat) => {
    // 日本語名を取得
    const japaneseStatDataJson = await fetchResource<{ names: Name[] }>(`${API_BASE_URL}/stat/${stat.stat.name}`, '種族値の取得に失敗しました');
    return {
      name: findJapaneseName(japaneseStatDataJson.names, stat.stat.name),
      value: stat.base_stat,
    };
  }));

  // 説明文の取得
  const flavorTextEntry = speciesData.flavor_text_entries.find(
    (entry: FlavorTextEntry) => entry.language.name === 'ja'
  );
  const description = flavorTextEntry
    ? flavorTextEntry.flavor_text.replace(/\f/g, ' ')
    : '説明文がありません。';

  return {
    id: data.id,
    number: speciesData.id,
    name: data.name,
    japaneseName,
    image: data.sprites.other?.['official-artwork']?.front_default ?? data.sprites.front_default ?? null,
    types,
    abilities,
    description,
    baseStats,
  };
};
