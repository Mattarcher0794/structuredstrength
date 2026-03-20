import { useRef, useState, useCallback, useLayoutEffect } from 'react';

export function useScrollHeader(fadeStart = 80, fadeEnd = 130) {
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

  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    setOpacity(0);
  }, []);

  return { scrollRef, opacity, handleScroll };
}
