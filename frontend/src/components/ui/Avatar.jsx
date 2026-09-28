export default function Avatar({ name = '?', src, size = 'md' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }
  const initial = name.charAt(0).toUpperCase()

  if (src) return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover`} />

  return (
    <div className={`${sizes[size]} rounded-full bg-indigo-600 flex items-center justify-center font-semibold text-white`}>
      {initial}
    </div>
  )
}
