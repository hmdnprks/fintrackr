interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'dark'
  size?: 'sm' | 'md'
  disabled?: boolean
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
}: ButtonProps) {
  const variants = {
    primary:   'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300',
    danger:    'bg-white hover:bg-red-50 text-red-500 border border-red-200 hover:border-red-300',
    dark:      'bg-gray-800 hover:bg-gray-900 text-white',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs font-medium',
    md: 'px-4 py-2 text-sm font-medium',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl transition ${variants[variant]} ${sizes[size]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {children}
    </button>
  )
}
