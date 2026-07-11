import type { CardRect } from './layout';

export interface Point { x: number; y: number }
export interface RouteEdge { key: string; prerequisiteKey: string; dependentKey: string; label: string }
export interface RoutedEdge extends RouteEdge { points: Point[]; labelRect: { x: number; y: number; width: number; height: number } | null }

function pointInside(point: Point, rect: CardRect, clearance: number) {
  return point.x > rect.x - clearance && point.x < rect.x + rect.width + clearance && point.y > rect.y - clearance && point.y < rect.y + rect.height + clearance;
}

function segmentIntersectsRect(a: Point, b: Point, rect: CardRect, clearance: number) {
  const left = rect.x - clearance; const right = rect.x + rect.width + clearance;
  const top = rect.y - clearance; const bottom = rect.y + rect.height + clearance;
  if (a.x === b.x) return a.x > left && a.x < right && Math.max(a.y, b.y) > top && Math.min(a.y, b.y) < bottom;
  if (a.y === b.y) return a.y > top && a.y < bottom && Math.max(a.x, b.x) > left && Math.min(a.x, b.x) < right;
  return pointInside(a, rect, clearance) || pointInside(b, rect, clearance);
}

export function pathIntersectsRect(points: Point[], rect: CardRect, clearance = 0) {
  for (let index = 1; index < points.length; index++) if (segmentIntersectsRect(points[index - 1], points[index], rect, clearance)) return true;
  return false;
}

export function routeDependencies(edges: RouteEdge[], rects: Map<string, CardRect>): RoutedEdge[] {
  return [...edges].sort((a, b) => a.key.localeCompare(b.key)).flatMap((edge) => {
    const from = rects.get(edge.prerequisiteKey); const to = rects.get(edge.dependentKey);
    if (!from || !to) return [];
    const start = { x: from.x + from.width, y: from.y + from.height / 2 };
    const end = { x: to.x, y: to.y + to.height / 2 };
    const obstacles = [...rects.values()].filter((rect) => rect.key !== from.key && rect.key !== to.key);
    const direct = [start, { x: (start.x + end.x) / 2, y: start.y }, { x: (start.x + end.x) / 2, y: end.y }, end];
    let points = direct;
    if (obstacles.some((rect) => pathIntersectsRect(direct, rect, 4))) {
      const detourY = Math.min(start.y, end.y, ...obstacles.map((rect) => rect.y)) - 24;
      points = [start, { x: start.x + 28, y: start.y }, { x: start.x + 28, y: detourY }, { x: end.x - 28, y: detourY }, { x: end.x - 28, y: end.y }, end];
    }
    const longest = points.slice(1).map((point, index) => ({ a: points[index], b: point, length: Math.abs(point.x - points[index].x) + Math.abs(point.y - points[index].y) })).sort((a, b) => b.length - a.length)[0];
    const width = Math.min(140, Math.max(56, edge.label.length * 7));
    const center = longest ? { x: (longest.a.x + longest.b.x) / 2, y: (longest.a.y + longest.b.y) / 2 } : start;
    const labelRect = { x: center.x - width / 2, y: center.y - 20, width, height: 18 };
    return [{ ...edge, points, labelRect }];
  });
}
