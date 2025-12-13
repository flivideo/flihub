// NFR-6c: Shared size toggle component for thumbnail size selection

interface SizeToggleProps<T extends string> {
  sizes: readonly T[]
  value: T
  onChange: (size: T) => void
  labels?: Partial<Record<T, string>>  // Optional full labels for tooltips
}

export function SizeToggle<T extends string>({
  sizes,
  value,
  onChange,
  labels,
}: SizeToggleProps<T>) {
  return (
    <div className="flex items-center gap-1">
      {sizes.map((size) => (
        <button
          key={size}
          onClick={() => onChange(size)}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            value === size
              ? 'bg-blue-500 text-white'
              : 'text-gray-500 hover:bg-gray-100 border border-gray-200'
          }`}
          title={labels?.[size] ?? size}
        >
          {size}
        </button>
      ))}
    </div>
  )
}
