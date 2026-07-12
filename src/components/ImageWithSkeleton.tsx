import React, { useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ImageWithSkeletonProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  skeletonClassName?: string;
  disableOverflowHidden?: boolean;
  containerClassName?: string;
  loaderType?: 'skeleton' | 'spinner';
};

export function ImageWithSkeleton({
  src,
  alt,
  className,
  skeletonClassName,
  disableOverflowHidden,
  containerClassName,
  style,
  loaderType = 'skeleton',
  ...props
}: ImageWithSkeletonProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div 
      className={cn(
        "relative", 
        !disableOverflowHidden && "overflow-hidden",
        loaderType === 'skeleton' && !disableOverflowHidden ? "bg-slate-100" : "",
        containerClassName || className
      )}
    >
      {isLoading && !error && (
        loaderType === 'spinner' ? (
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className={cn("absolute inset-0 z-0 animate-pulse bg-slate-200", skeletonClassName)} />
        )
      )}
      
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400">
          <ImageIcon className="w-1/3 h-1/3 opacity-20" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          style={style}
          loading="lazy"
          decoding="async"
          className={cn(
            "w-full h-full object-cover transition-all duration-700 ease-in-out",
            isLoading ? "opacity-0 scale-105 blur-sm" : "opacity-100 scale-100 blur-0",
            className // Preserve the hover states and specific positioning logic from parent
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setError(true);
          }}
          {...props}
        />
      )}
    </div>
  );
}
