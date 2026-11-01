import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  placeholder?: string;
  options?: SelectOption[];
  error?: string;
  helperText?: string;
  isLoading?: boolean;
  required?: boolean;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      placeholder = 'Select an option',
      options = [],
      error,
      helperText,
      isLoading = false,
      required = false,
      className = '',
      containerClassName = '',
      disabled,
      children,
      id,
      value,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

    return (
      <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1"
          >
            <span>{label}</span>
            {required && <span className="text-rose-500 font-black">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            value={value}
            disabled={disabled || isLoading}
            required={required}
            className={`
              w-full appearance-none rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all
              bg-white dark:bg-[#101014] text-zinc-900 dark:text-zinc-100
              border-zinc-200 dark:border-[#2e2e38]
              focus:bg-white dark:focus:bg-[#141418] focus:border-zinc-400 dark:focus:border-zinc-500
              focus:outline-none focus:ring-2 focus:ring-zinc-400/20 dark:focus:ring-zinc-500/20
              disabled:opacity-50 disabled:cursor-not-allowed
              pr-9 cursor-pointer
              ${error ? 'border-rose-500 dark:border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20' : ''}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled={required} className="bg-white dark:bg-[#101014] text-zinc-400 dark:text-zinc-500 font-medium">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-white dark:bg-[#101014] text-zinc-900 dark:text-zinc-100 font-semibold py-1"
              >
                {opt.label}
              </option>
            ))}
            {children}
          </select>

          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 stroke-[2.25]" />
            )}
          </div>
        </div>

        {error ? (
          <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
