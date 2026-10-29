type PokemonCardProps = {
  number: number
  name: string
}

function PokemonCard({ number, name }: PokemonCardProps) {
  return (
    <div>
      <p>図鑑番号：{number}</p>
      <h2>{name}</h2>
    </div>
  )
}

export default PokemonCard