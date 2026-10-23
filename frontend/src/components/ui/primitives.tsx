import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

/* ============================================================================
 * 1. BUTTON PRIMITIVE
 * ========================================================================== */

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-1.5 font-semibold transition-colors select-none whitespace-nowrap rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7562E8] disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
    {
        variants: {
            variant: {
                primary:
                    'bg-[#7562E8] hover:bg-[#634FDB] active:bg-[#5642CC] text-white border border-transparent shadow-2xs',
                secondary:
                    'bg-white hover:bg-[#F8F9FB] active:bg-[#F1F3F7] text-[#222938] border border-[#D9DEE7] shadow-2xs',
                tertiary:
                    'bg-transparent hover:bg-[#EDEFF3] active:bg-[#E2E6EE] text-[#647187] hover:text-[#222938] border border-transparent',
                subtle:
                    'bg-[#F2F0FD] hover:bg-[#E7E3FC] text-[#634FDB] border border-[#D8D1FA]',
                destructive:
                    'bg-white hover:bg-red-50 active:bg-red-100 text-[#DC2626] border border-red-200 shadow-2xs',
                dangerSolid:
                    'bg-[#DC2626] hover:bg-red-700 text-white border border-transparent shadow-2xs',
                icon:
                    'bg-white hover:bg-[#F8F9FB] text-[#647187] hover:text-[#222938] border border-[#D9DEE7] shadow-2xs',
                ghostIcon:
                    'bg-transparent hover:bg-[#EDEFF3] text-[#647187] hover:text-[#222938] border border-transparent',
            },
            size: {
                xs: 'h-7 px-2.5 text-[11px]',
                sm: 'h-8 px-3 text-[12px]',
                md: 'h-9 px-3.5 text-[13px]',
                lg: 'h-10 px-4 text-[13px]',
                iconSm: 'h-7 w-7 p-0',
                iconMd: 'h-8 w-8 p-0',
            },
        },
        defaultVariants: {
            variant: 'secondary',
            size: 'sm',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant,
            size,
            isLoading = false,
            leftIcon,
            rightIcon,
            children,
            disabled,
            type = 'button',
            ...props
        },
        ref
    ) => {
        return (
            <button
                ref={ref}
                type={type}
                disabled={disabled || isLoading}
                className={cn(buttonVariants({ variant, size }), className)}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                    leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>
                )}
                {children && <span>{children}</span>}
                {!isLoading && rightIcon && (
                    <span className="shrink-0 flex items-center">{rightIcon}</span>
                )}
            </button>
        );
    }
);
Button.displayName = 'Button';

/* ============================================================================
 * 2. INPUT PRIMITIVE
 * ========================================================================== */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    leftIcon?: React.ReactNode;
    rightElement?: React.ReactNode;
    mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, leftIcon, rightElement, mono = false, ...props }, ref) => {
        if (leftIcon || rightElement) {
            return (
                <div
                    className={cn(
                        'flex items-center gap-2 h-8 px-2.5 rounded-md bg-white border border-[#D9DEE7] focus-within:border-[#7562E8] focus-within:ring-1 focus-within:ring-[#7562E8] transition-colors',
                        className
                    )}
                >
                    {leftIcon && (
                        <span className="text-[#647187] shrink-0 pointer-events-none flex items-center">
                            {leftIcon}
                        </span>
                    )}
                    <input
                        ref={ref}
                        className={cn(
                            'w-full min-w-0 bg-transparent text-[12.5px] text-[#222938] placeholder-[#8A94A6] focus:outline-none disabled:opacity-50',
                            mono ? 'font-mono text-[12px]' : 'font-medium'
                        )}
                        {...props}
                    />
                    {rightElement && (
                        <span className="shrink-0 flex items-center">{rightElement}</span>
                    )}
                </div>
            );
        }

        return (
            <input
                ref={ref}
                className={cn(
                    'h-8 w-full px-2.5 rounded-md bg-white border border-[#D9DEE7] text-[12.5px] text-[#222938] placeholder-[#8A94A6] hover:border-[#C3CBD8] focus:outline-none focus:border-[#7562E8] focus:ring-1 focus:ring-[#7562E8] disabled:bg-[#F8F9FB] disabled:text-[#8A94A6] transition-colors',
                    mono ? 'font-mono text-[12px] tabular-nums' : 'font-medium',
                    className
                )}
                {...props}
            />
        );
    }
);
Input.displayName = 'Input';

/* ============================================================================
 * 3. SELECT PRIMITIVE
 * ========================================================================== */

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { }

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div className="relative w-full">
                <select
                    ref={ref}
                    className={cn(
                        'h-8 w-full appearance-none bg-white border border-[#D9DEE7] hover:border-[#C3CBD8] rounded-md pl-2.5 pr-7 text-[12.5px] font-medium text-[#222938] focus:outline-none focus:border-[#7562E8] focus:ring-1 focus:ring-[#7562E8] disabled:bg-[#F8F9FB] disabled:text-[#8A94A6] transition-colors cursor-pointer',
                        className
                    )}
                    {...props}
                >
                    {children}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#647187] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
        );
    }
);
Select.displayName = 'Select';

/* ============================================================================
 * 4. SWITCH PRIMITIVE
 * ========================================================================== */

export interface SwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
    id?: string;
}

export const Switch: React.FC<SwitchProps> = ({
    checked,
    onCheckedChange,
    disabled = false,
    label,
    description,
    id,
}) => {
    const buttonEl = (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => !disabled && onCheckedChange(!checked)}
            className={cn(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                checked
                    ? 'bg-[#7562E8] border-[#7562E8]'
                    : 'bg-[#E2E6EE] border-[#CBD2DF]'
            )}
        >
            <span
                className={cn(
                    'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-2xs transition-transform',
                    checked ? 'translate-x-4' : 'translate-x-0.5'
                )}
            />
        </button>
    );

    if (!label && !description) return buttonEl;

    return (
        <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
                {label && (
                    <label
                        htmlFor={id}
                        className="text-[12.5px] font-medium text-[#222938] block cursor-pointer"
                    >
                        {label}
                    </label>
                )}
                {description && (
                    <span className="text-[11.5px] text-[#647187] block mt-0.5">
                        {description}
                    </span>
                )}
            </div>
            {buttonEl}
        </div>
    );
};

/* ============================================================================
 * 5. CHECKBOX PRIMITIVE
 * ========================================================================== */

export interface CheckboxProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
    id?: string;
    className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
    checked,
    onCheckedChange,
    disabled = false,
    label,
    description,
    id,
    className,
}) => {
    return (
        <label
            htmlFor={id}
            className={cn(
                'inline-flex items-start gap-2 select-none',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                className
            )}
        >
            <button
                id={id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                disabled={disabled}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) onCheckedChange(!checked);
                }}
                className={cn(
                    'mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors',
                    checked
                        ? 'bg-[#7562E8] border-[#7562E8] text-white'
                        : 'bg-white border-[#C3CBD8] hover:border-[#7562E8]'
                )}
            >
                {checked && <Check className="w-3 h-3 stroke-[2.75]" />}
            </button>
            {(label || description) && (
                <div className="min-w-0 leading-tight">
                    {label && (
                        <span className="text-[12.5px] font-medium text-[#222938] block">
                            {label}
                        </span>
                    )}
                    {description && (
                        <span className="text-[11px] text-[#647187] block mt-0.5">
                            {description}
                        </span>
                    )}
                </div>
            )}
        </label>
    );
};

/* ============================================================================
 * 6. TECHNICAL SLIDER FIELD
 * ========================================================================== */

export interface SliderFieldProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    formatValue?: (val: number) => string;
    onChange: (val: number) => void;
}

export const SliderField: React.FC<SliderFieldProps> = ({
    label,
    value,
    min,
    max,
    step = 1,
    unit = '',
    formatValue,
    onChange,
}) => {
    const displayVal = formatValue
        ? formatValue(value)
        : `${value}${unit ? ` ${unit}` : ''}`;

    return (
        <div className="flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between gap-2">
                <label className="text-[12px] font-medium text-[#222938] truncate">
                    {label}
                </label>
                <span className="px-1.5 py-0.5 rounded-sm bg-[#F8F9FB] border border-[#D9DEE7] text-[11.5px] font-mono font-semibold text-[#222938] tabular-nums shrink-0">
                    {displayVal}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-[10.5px] font-mono text-[#8A94A6] tabular-nums">
                <span>
                    {min}
                    {unit ? ` ${unit}` : ''}
                </span>
                <span>
                    {max}
                    {unit ? ` ${unit}` : ''}
                </span>
            </div>
        </div>
    );
};

/* ============================================================================
 * 7. SEMANTIC STATUS BADGE
 * ========================================================================== */

const statusBadgeVariants = cva(
    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium border leading-tight whitespace-nowrap',
    {
        variants: {
            tone: {
                success: 'bg-[#ECFDF5] text-[#0D8A58] border-[#A7F3D0]',
                warning: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
                danger: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
                info: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]',
                accent: 'bg-[#F2F0FD] text-[#634FDB] border-[#D8D1FA]',
                neutral: 'bg-[#F8F9FB] text-[#647187] border-[#D9DEE7]',
            },
        },
        defaultVariants: {
            tone: 'neutral',
        },
    }
);

export interface StatusBadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
    dot?: boolean;
    pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    tone = 'neutral',
    dot = true,
    pulse = false,
    className,
    children,
    ...props
}) => {
    const dotColor =
        tone === 'success'
            ? 'bg-[#0D8A58]'
            : tone === 'warning'
                ? 'bg-[#D97706]'
                : tone === 'danger'
                    ? 'bg-[#DC2626]'
                    : tone === 'info'
                        ? 'bg-[#2563EB]'
                        : tone === 'accent'
                            ? 'bg-[#7562E8]'
                            : 'bg-[#8A94A6]';

    return (
        <span className={cn(statusBadgeVariants({ tone }), className)} {...props}>
            {dot && (
                <span
                    className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        dotColor,
                        pulse && 'animate-pulse'
                    )}
                />
            )}
            <span>{children}</span>
        </span>
    );
};

/* ============================================================================
 * 8. SEGMENTED TABS PRIMITIVE
 * ========================================================================== */

export interface TabOption<T extends string> {
    id: T;
    label: string;
    icon?: React.ReactNode;
    count?: number;
}

interface SegmentedTabsProps<T extends string> {
    options: TabOption<T>[];
    value: T;
    onChange: (value: T) => void;
    size?: 'sm' | 'md';
    fullWidth?: boolean;
    className?: string;
}

export function SegmentedTabs<T extends string>({
    options,
    value,
    onChange,
    size = 'sm',
    fullWidth = false,
    className,
}: SegmentedTabsProps<T>) {
    return (
        <div
            role="tablist"
            className={cn(
                'inline-flex items-center gap-0.5 p-0.5 rounded-md bg-[#EEF1F6] border border-[#D9DEE7]',
                fullWidth && 'w-full flex',
                className
            )}
        >
            {options.map((opt) => {
                const isActive = opt.id === value;
                return (
                    <button
                        key={opt.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(opt.id)}
                        className={cn(
                            'flex items-center justify-center gap-1.5 rounded-sm font-semibold transition-all cursor-pointer truncate',
                            fullWidth && 'flex-1',
                            size === 'sm' ? 'px-2.5 py-1 text-[11.5px]' : 'px-3 py-1.5 text-[12px]',
                            isActive
                                ? 'bg-white text-[#222938] shadow-2xs border border-[#D9DEE7]/80'
                                : 'text-[#647187] hover:text-[#222938] border border-transparent'
                        )}
                    >
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <span className="truncate">{opt.label}</span>
                        {opt.count !== undefined && (
                            <span
                                className={cn(
                                    'text-[10.5px] font-mono tabular-nums',
                                    isActive ? 'text-[#7562E8]' : 'text-[#8A94A6]'
                                )}
                            >
                                ({opt.count})
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}