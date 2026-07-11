import { describe, expect, it } from 'vitest';
import { layoutSpecCards } from '../../src/specs/layout';
import { pathIntersectsRect, routeDependencies } from '../../src/specs/routing';

describe('spec canvas deterministic geometry', () => {
  it('uses stable layers and never overlaps cards after expansion', () => {
    const nodes = [
      { key: 'a', width: 260, height: 180 },
      { key: 'b', width: 260, height: 320 },
      { key: 'c', width: 260, height: 180 },
      { key: 'independent', width: 260, height: 180 },
    ];
    const edges = [{ prerequisiteKey: 'a', dependentKey: 'b' }, { prerequisiteKey: 'a', dependentKey: 'c' }];
    const layout = layoutSpecCards(nodes, edges, { focusKey: 'b' });
    expect(layout.get('a')!.x).toBeLessThan(layout.get('b')!.x);
    const rects = [...layout.values()];
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]; const b = rects[j];
      expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
    }
    expect(layoutSpecCards([...nodes].reverse(), [...edges].reverse(), { focusKey: 'b' })).toEqual(layout);
  });

  it('routes endpoints to ports and clears every non-endpoint card by four pixels', () => {
    const rects = new Map([
      ['a', { key: 'a', x: 0, y: 0, width: 200, height: 120 }],
      ['obstacle', { key: 'obstacle', x: 260, y: 20, width: 200, height: 180 }],
      ['b', { key: 'b', x: 540, y: 80, width: 200, height: 120 }],
    ]);
    const [route] = routeDependencies([{ key: 'a->b', prerequisiteKey: 'a', dependentKey: 'b', label: 'Enables B' }], rects);
    expect(route.points[0]).toEqual({ x: 200, y: 60 });
    expect(route.points.at(-1)).toEqual({ x: 540, y: 140 });
    expect(pathIntersectsRect(route.points, rects.get('obstacle')!, 4)).toBe(false);
    expect(route.labelRect && pathIntersectsRect([
      { x: route.labelRect.x, y: route.labelRect.y },
      { x: route.labelRect.x + route.labelRect.width, y: route.labelRect.y + route.labelRect.height },
    ], rects.get('obstacle')!, 0)).toBe(false);
  });
});
