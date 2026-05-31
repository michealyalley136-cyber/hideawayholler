'use client';

import { ImgHTMLAttributes, useState } from 'react';
import { clsx } from 'clsx';

type MarketingImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
  gradient?: string;
  wrapperClassName?: string;
};

export function MarketingImage({
  src,
  fallbackSrc,
  gradient = 'from-slate-900 via-stone-800 to-emerald-900',
  wrapperClassName,
  className,
  alt,
  ...props
}: MarketingImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  return (
    <div className={clsx('relative overflow-hidden bg-gradient-to-br', gradient, wrapperClassName)}>
      {!failed && currentSrc ? (
        <img
          src={currentSrc}
          alt={alt}
          className={clsx('h-full w-full object-cover', className)}
          onError={() => {
            if (fallbackSrc && currentSrc !== fallbackSrc) {
              setCurrentSrc(fallbackSrc);
              return;
            }
            setFailed(true);
          }}
          {...props}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent" />
    </div>
  );
}
