'use client';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1',
          {
            'bg-[var(--accent-primary)] text-white hover:opacity-90 focus:ring-[var(--accent-primary)]': variant === 'primary',
            'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--border-color)] focus:ring-[var(--border-color)]': variant === 'secondary',
            'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] focus:ring-[var(--border-color)]': variant === 'ghost',
            'bg-red-500/10 text-red-600 hover:bg-red-500/20 focus:ring-red-400': variant === 'danger',
            'border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] focus:ring-[var(--border-color)]': variant === 'outline',
            'text-xs px-2.5 py-1.5': size === 'sm',
            'text-sm px-4 py-2': size === 'md',
            'text-base px-6 py-3': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
