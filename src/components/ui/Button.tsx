interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'danger' | 'dark'
  size?: 'sm' | 'md'
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
}: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    dark: 'bg-gray-800 hover:bg-black text-white',
  }

  const sizes = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
  }

  return (
    <button
      onClick={onClick}
      className={`rounded-lg transition ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </button>
  )
}
