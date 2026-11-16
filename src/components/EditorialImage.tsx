import { BookOpen } from 'lucide-react';
import { useState } from 'react';
import { resolveAssetSrc } from '../utils/seoLogic';

interface EditorialImageProps {
  src?: string;
  alt: string;
  caption?: string;
  className?: string;
  imgClassName?: string;
  borderClass?: string;
  captionClass?: string;
}

export function EditorialImage({
  src,
  alt,
  caption,
  className = '',
  imgClassName = '',
  borderClass = 'border-[#E5DFD3]',
  captionClass = 'text-[#57534E]',
}: EditorialImageProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = resolveAssetSrc(src, import.meta.env.BASE_URL);

  return (
    <figure className={`flex flex-col ${className}`}>
      <div
        className={`relative flex-1 overflow-hidden rounded-lg border bg-[#F3EFE7] ${borderClass}`}
      >
        {resolvedSrc && !failed ? (
          <img
            src={resolvedSrc}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover ${imgClassName}`}
          />
        ) : (
          <div className="flex h-full min-h-[220px] w-full flex-col items-center justify-center bg-gradient-to-br from-[#F3EFE7] via-[#ECE5D8] to-[#E2D9C8] p-8 text-center">
            <BookOpen className="mb-3 h-6 w-6 text-[#881337]/70" aria-hidden="true" />
            <p className="font-serif text-base italic text-[#57534E]">{alt}</p>
          </div>
        )}
      </div>
      {caption && (
        <figcaption className={`mt-2.5 font-serif text-xs italic ${captionClass}`}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
