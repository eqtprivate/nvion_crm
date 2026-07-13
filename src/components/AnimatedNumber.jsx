import React, { useEffect, useRef, useState } from 'react';

// Número com animação de contagem (count-up). Aceita um formatador.
export default function AnimatedNumber({ value = 0, duration = 700, format = (v) => Math.round(v).toLocaleString('pt-BR'), className }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    const from = fromRef.current;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}
