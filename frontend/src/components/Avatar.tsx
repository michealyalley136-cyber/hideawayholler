'use client';

import { clsx } from 'clsx';

const sizeClasses: Record<string, string> = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-xl',
};

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'R';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
}

export function Avatar({ name, src, size = 'md', className, alt }: AvatarProps) {
  const initials = getInitials(name || 'Resident');
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const imageAlt = alt || (src ? `Profile photo of ${name}` : `Avatar initials for ${name}`);

  if (src) {
    return (
      <img
        src={src}
        alt={imageAlt}
        className={clsx('rounded-full object-cover ring-2 ring-white bg-slate-100', sizeClass, className)}
      />
    );
  }

  return (
    <div
      aria-label={imageAlt}
      className={clsx(
        'flex items-center justify-center rounded-full bg-slate-200 text-slate-900 font-bold uppercase ring-2 ring-white',
        sizeClass,
        className
      )}
    >
      {initials}
    </div>
  );
}
