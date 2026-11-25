export interface Random {
  next(): number;
  range(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  weighted<K extends string>(weights: Readonly<Record<K, number>>): K;
}

export function createRandom(seed: number): Random {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min, max) => min + next() * (max - min),
    pick: (items) => {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error('Random.pick called with an empty list');
      return item;
    },
    weighted: <K extends string>(weights: Readonly<Record<K, number>>): K => {
      const entries = (Object.entries(weights) as [K, number][]).filter(([, weight]) => weight > 0);
      const last = entries.at(-1);
      if (!last) throw new Error('Random.weighted needs at least one positive weight');

      const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
      let roll = next() * total;
      for (const [key, weight] of entries) {
        roll -= weight;
        if (roll < 0) return key;
      }
      return last[0];
    },
  };
}

export function createRandomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}
