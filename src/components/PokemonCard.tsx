// src/components/PokemonCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import type { PokemonWithJapaneseName } from '../api/pokemonWithJapaneseName';

type PokemonCardProps = {
  pokemon: PokemonWithJapaneseName;
};

const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon }) => {
  const id = pokemon.url.split('/').filter(Boolean).pop();
  const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

  return (
    <Link to={`/pokemon/${id}`}>
      <div className="h-full min-w-0 bg-white shadow-md rounded-lg p-4 flex flex-col items-center hover:shadow-xl transition-shadow">
        <p className="text-sm text-gray-500 mr-auto">No. {pokemon.number}</p>
        <img src={imageUrl} alt={pokemon.japaneseName} className="w-20 h-20 md:w-24 md:h-24 object-contain" loading="lazy" />
        <h2 className="mt-2 text-base md:text-lg font-semibold break-words w-full text-center">{pokemon.japaneseName}</h2>
      </div>
    </Link>
  );
};

export default PokemonCard;
