import { useEffect, useState } from 'react';
import { Text, type TextStyle } from 'react-native';
import { formatPoints } from '@/lib/format';

/** A number that ticks up (or down) to its value, slot-machine style. */
export function CountUp({ value, from = 0, duration = 650, sign, style }: { value: number; from?: number; duration?: number; sign?: boolean; style?: TextStyle | TextStyle[] }) {
  const [shown, setShown] = useState(from);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, from, duration]);
  return <Text style={style}>{formatPoints(shown, { sign })}</Text>;
}
