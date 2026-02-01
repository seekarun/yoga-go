'use client';

import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';

type ButtonSize = 'default' | 'large';

interface BaseButtonProps {
  children: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  size?: ButtonSize;
}

type ButtonAsButton = BaseButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseButtonProps> & {
    href?: undefined;
  };

type ButtonAsLink = BaseButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseButtonProps> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const sizeClasses = {
  default: 'px-4 py-2.5 text-sm',
  large: 'px-10 py-4 text-lg',
};

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function PrimaryButton({
  children,
  loading = false,
  fullWidth = false,
  size = 'default',
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = `
    ${sizeClasses[size]} font-semibold text-white rounded-xl transition-all
    hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim();

  const style = {
    backgroundColor: 'var(--color-primary)',
    boxShadow: '0 8px 32px color-mix(in srgb, var(--color-primary) 40%, transparent)',
    ...('style' in props ? props.style : {}),
  };

  const content = loading ? (
    <span className="flex items-center justify-center gap-2">
      <LoadingSpinner />
      {children}
    </span>
  ) : (
    children
  );

  if ('href' in props && props.href) {
    const { href, ...linkProps } = props as ButtonAsLink;
    return (
      <Link href={href} className={baseClasses} style={style} {...linkProps}>
        {content}
      </Link>
    );
  }

  const buttonProps = props as ButtonAsButton;
  return (
    <button
      {...buttonProps}
      disabled={buttonProps.disabled || loading}
      className={baseClasses}
      style={style}
    >
      {content}
    </button>
  );
}

export function SecondaryButton({
  children,
  loading = false,
  fullWidth = false,
  size = 'default',
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = `
    ${sizeClasses[size]} font-semibold rounded-xl transition-all
    hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim();

  const style = {
    color: 'var(--color-primary)',
    border: '2px solid var(--color-primary)',
    backgroundColor: 'transparent',
    ...('style' in props ? props.style : {}),
  };

  const content = loading ? (
    <span className="flex items-center justify-center gap-2">
      <LoadingSpinner />
      {children}
    </span>
  ) : (
    children
  );

  if ('href' in props && props.href) {
    const { href, ...linkProps } = props as ButtonAsLink;
    return (
      <Link href={href} className={baseClasses} style={style} {...linkProps}>
        {content}
      </Link>
    );
  }

  const buttonProps = props as ButtonAsButton;
  return (
    <button
      {...buttonProps}
      disabled={buttonProps.disabled || loading}
      className={baseClasses}
      style={style}
    >
      {content}
    </button>
  );
}
