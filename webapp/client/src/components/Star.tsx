import { useStore, FavouriteType } from '../store'

interface Props {
  id: string
  type: FavouriteType
  label: string
  subtitle?: string
}

export function Star({ id, type, label, subtitle }: Props) {
  const { favourites, toggleFavourite } = useStore()
  const starred = favourites.some((f) => f.id === id)

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        toggleFavourite({ id, type, label, subtitle })
      }}
      title={starred ? 'Remove from favourites' : 'Add to favourites'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 14,
        padding: '2px 4px',
        color: starred ? 'var(--accent-amber)' : 'var(--text-dim)',
        transition: 'color 0.15s, transform 0.1s',
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {starred ? '★' : '☆'}
    </button>
  )
}
