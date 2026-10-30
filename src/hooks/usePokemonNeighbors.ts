import { useQuery } from '@tanstack/react-query';
import { fetchPokemonNeighbors } from '../api/pokemonNavigation';
export function usePokemonNeighbors(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['pokemon', 'neighbors', id],
    queryFn: () => fetchPokemonNeighbors(id),
    enabled,
    retry: 2,
  });
}
