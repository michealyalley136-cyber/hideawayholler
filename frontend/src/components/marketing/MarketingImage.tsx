'use client';

import { ImgHTMLAttributes, useEffect, useState } from 'react';
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
  style,
  ...props
}: MarketingImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);
  const isFallback = !!fallbackSrc && currentSrc === fallbackSrc;

  useEffect(() => {
    setCurrentSrc(src);
    setFailed(!src);
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    if (!fallbackSrc || loaded || failed || currentSrc === fallbackSrc) return;

    const timeout = window.setTimeout(() => {
      setCurrentSrc(fallbackSrc);
      setLoaded(false);
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [currentSrc, failed, fallbackSrc, loaded]);

  return (
    <div className={clsx('relative overflow-hidden bg-gradient-to-br', gradient, wrapperClassName)}>
      {!failed && currentSrc ? (
        <img
          src={currentSrc}
          alt={alt}
          className={clsx('h-full w-full object-cover transition-opacity duration-500', className)}
          style={{ ...style, ...(!loaded && !isFallback ? { opacity: 0 } : {}) }}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (fallbackSrc && currentSrc !== fallbackSrc) {
              setLoaded(false);
              setCurrentSrc(fallbackSrc);
              return;
            }
            setLoaded(false);
            setFailed(true);
          }}
          {...props}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent" />
    </div>
  );
}
