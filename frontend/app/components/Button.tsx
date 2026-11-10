/** Reusable button component */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  ...args
}: ButtonProps) {
  const variants = {
    primary: 'btn btn-primary',
    secondary: 'btn btn-secondary',
    danger: 'btn btn-danger',
  };
  return (
    <button
      className={`${variants[variant]} ${className} transition-all`}
      disabled={disabled || loading}
      {...args}
    >
      {loading ? '...' : children}
    </button>
  );
}