import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// ===== Button =====
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/25',
  secondary:
    'bg-surface-800 hover:bg-surface-700 text-surface-100 border border-surface-700',
  ghost:
    'bg-transparent hover:bg-surface-800 text-surface-300 hover:text-white',
  danger:
    'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25',
  gold:
    'bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black font-semibold shadow-lg shadow-gold-600/25',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => (
  <button
    className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 
      disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
      ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
    {children}
  </button>
);

// ===== Input =====
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-surface-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full rounded-lg bg-surface-900 border border-surface-700 px-4 py-2.5 text-white
            placeholder:text-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500
            transition-colors duration-200 ${icon ? 'pl-10' : ''} ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

// ===== Textarea =====
interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-surface-300">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`w-full rounded-lg bg-surface-900 border border-surface-700 px-4 py-2.5 text-white
          placeholder:text-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500
          transition-colors duration-200 resize-y min-h-[100px] ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';

// ===== Select =====
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-surface-300">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`w-full rounded-lg bg-surface-900 border border-surface-700 px-4 py-2.5 text-white
          focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500
          transition-colors duration-200 ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
        } ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" className="text-surface-500">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';

// ===== Badge =====
type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'gold';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-surface-800 text-surface-300 border-surface-700',
  primary: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  secondary: 'bg-surface-700 text-surface-300 border-surface-600',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  gold: 'bg-gold-500/10 text-gold-400 border-gold-500/20',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeVariants[variant]} ${className}`}
  >
    {children}
  </span>
);

// ===== Card =====
interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  hover = false,
  className = '',
  ...props
}) => (
  <motion.div
    className={`rounded-xl bg-surface-900 border border-surface-800 overflow-hidden
      ${hover ? 'hover:border-surface-600 hover:shadow-xl hover:shadow-black/20 transition-all duration-300 cursor-pointer' : ''}
      ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);

// ===== Modal =====
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-5xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className={`relative w-full ${modalSizes[size]} bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl p-6`}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="text-surface-400 hover:text-white transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </motion.div>
    </div>
  );
};

// ===== Spinner =====
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({
  size = 'md',
}) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex items-center justify-center">
      <Loader2 className={`${sizes[size]} animate-spin text-primary-500`} />
    </div>
  );
};

// ===== Loading Screen =====
export const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface-950">
    <div className="text-center space-y-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-2 border-surface-800 mx-auto" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full border-2 border-transparent border-t-primary-500 animate-spin" />
      </div>
      <p className="text-surface-400 text-sm">Loading...</p>
    </div>
  </div>
);

// ===== Empty State =====
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {icon && <div className="text-surface-600 mb-4">{icon}</div>}
    <h3 className="text-lg font-medium text-surface-300 mb-2">{title}</h3>
    {description && (
      <p className="text-sm text-surface-500 max-w-sm mb-6">{description}</p>
    )}
    {action}
  </div>
);

// ===== Stats Card =====
interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  icon,
  trend,
}) => (
  <Card className="p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-surface-400">{label}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {trend && (
          <p
            className={`text-xs mt-1 ${
              trend.positive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </p>
        )}
      </div>
      <div className="p-2.5 rounded-lg bg-surface-800 text-primary-400">
        {icon}
      </div>
    </div>
  </Card>
);
