import { useEffect, useRef } from 'react';

export function usePointerTilt<T extends HTMLElement>(strength = 9) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;

    const move = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      node.style.setProperty('--tilt-x', `${(-y * strength).toFixed(2)}deg`);
      node.style.setProperty('--tilt-y', `${(x * strength).toFixed(2)}deg`);
      node.style.setProperty('--shine-x', `${50 + x * 46}%`);
      node.style.setProperty('--shine-y', `${42 + y * 40}%`);
    };

    const leave = () => {
      node.style.setProperty('--tilt-x', '0deg');
      node.style.setProperty('--tilt-y', '0deg');
    };

    node.addEventListener('pointermove', move);
    node.addEventListener('pointerleave', leave);
    return () => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerleave', leave);
    };
  }, [strength]);

  return ref;
}
