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
        <div className="absolute inset-0 flex items-center justify-center bg-slate-200 relative overflow-hidden">
          <img src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783234123/ChatGPT_Image_5_Jul_2026__13.47.35-removebg-preview_gztehs.png" alt="Fallback" className="w-1/2 h-1/2 object-contain absolute z-10 opacity-70" />
          <div className="absolute inset-0 bg-slate-300/30 backdrop-blur-sm z-0"></div>
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
