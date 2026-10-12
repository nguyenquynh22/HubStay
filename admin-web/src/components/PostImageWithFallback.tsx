"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Building2 } from "lucide-react";

interface PostImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className: string;
  imageClassName?: string;
  iconClassName?: string;
}

export function PostImageWithFallback({
  src,
  alt,
  className,
  imageClassName = "object-cover",
  iconClassName = "h-7 w-7 text-slate-400/70",
}: PostImageWithFallbackProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageSrc = src?.trim() || null;
  const showImage = imageSrc !== null && failedSrc !== imageSrc;

  useEffect(() => {
    setFailedSrc(null);
  }, [imageSrc]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-slate-100 ${className}`}>
      {showImage ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          unoptimized
          className={imageClassName}
          onError={() => setFailedSrc(imageSrc)}
        />
      ) : (
        <Building2 aria-hidden="true" className={iconClassName} />
      )}
    </div>
  );
}
