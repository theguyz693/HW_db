// The cleaned Hot Wheels logo as an <img>; renders nothing until it's ready.

import { useEffect, useState } from 'react';
import { cleanLogoUrl } from '@/lib/brandLogo.ts';

export function BrandLogo({ className }: { className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    cleanLogoUrl()
      .then((u) => alive && setSrc(u))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return src ? <img src={src} alt="Hot Wheels" className={className} draggable={false} /> : null;
}
