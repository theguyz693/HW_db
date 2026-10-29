// ──────────────────────────────────────────────
// Input component — floating label, animated
// ──────────────────────────────────────────────

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  inputClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, inputClassName, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={clsx('flex flex-col gap-1.5', className)}>
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(
              'text-sm font-medium transition-colors duration-200',
              isFocused ? 'text-accent' : 'text-text-secondary',
              error && 'text-error',
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={clsx(
              'w-full h-11 px-4 rounded-xl text-sm text-text-primary',
              'bg-bg-surface border transition-all duration-200',
              'placeholder:text-text-muted',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error
                ? 'border-error/50 focus:border-error focus:ring-error/20'
                : 'border-border hover:border-border-hover focus:border-accent focus:ring-accent/20',
              inputClassName,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
