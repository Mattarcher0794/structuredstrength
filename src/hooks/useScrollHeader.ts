import { useRef, useState, useCallback } from 'react';

export function useScrollHeader(fadeStart = 60, fadeEnd = 110) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(0);

  const handleScroll = useCallback(() => {
    const scrollY = scrollRef.current?.scrollTop ?? 0;
    const newOpacity = Math.min(
      1,
      Math.max(0, (scrollY - fadeStart) / (fadeEnd - fadeStart))
    );
    setOpacity(newOpacity);
  }, [fadeStart, fadeEnd]);

  return { scrollRef, opacity, handleScroll };
}
