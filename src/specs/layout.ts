export interface LayoutNode { key: string; width: number; height: number }
export interface LayoutEdge { prerequisiteKey: string; dependentKey: string }
export interface CardRect extends LayoutNode { x: number; y: number; layer: number; lane: number }

export function layoutSpecCards(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  _options: { focusKey?: string | null } = {},
): Map<string, CardRect> {
  const ordered = [...nodes].sort((a, b) => a.key.localeCompare(b.key));
  const keys = new Set(ordered.map((node) => node.key));
  const incoming = new Map(ordered.map((node) => [node.key, 0]));
  const outgoing = new Map(ordered.map((node) => [node.key, [] as string[]]));
  for (const edge of edges) if (keys.has(edge.prerequisiteKey) && keys.has(edge.dependentKey) && edge.prerequisiteKey !== edge.dependentKey) {
    outgoing.get(edge.prerequisiteKey)!.push(edge.dependentKey);
    incoming.set(edge.dependentKey, (incoming.get(edge.dependentKey) ?? 0) + 1);
  }
  const layer = new Map(ordered.map((node) => [node.key, 0]));
  const queue = ordered.filter((node) => incoming.get(node.key) === 0).map((node) => node.key).sort();
  while (queue.length) {
    const key = queue.shift()!;
    for (const next of [...(outgoing.get(key) ?? [])].sort()) {
      layer.set(next, Math.max(layer.get(next) ?? 0, (layer.get(key) ?? 0) + 1));
      incoming.set(next, (incoming.get(next) ?? 1) - 1);
      if (incoming.get(next) === 0) queue.push(next), queue.sort();
    }
  }
  const byLayer = new Map<number, LayoutNode[]>();
  for (const node of ordered) {
    const value = layer.get(node.key) ?? 0;
    byLayer.set(value, [...(byLayer.get(value) ?? []), node]);
  }
  const result = new Map<string, CardRect>();
  for (const [column, columnNodes] of [...byLayer.entries()].sort((a, b) => a[0] - b[0])) {
    let y = 48;
    columnNodes.sort((a, b) => a.key.localeCompare(b.key)).forEach((node, lane) => {
      result.set(node.key, { ...node, x: 48 + column * 360, y, layer: column, lane });
      y += node.height + 48;
    });
  }
  return result;
}
