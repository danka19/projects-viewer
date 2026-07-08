import type { ProjectStatus } from '../types';
import { STATUS_META } from '../statusMeta';
import StatusOrb from './StatusOrb';

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.unknown;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wide uppercase ${meta.badge}`}
    >
      <StatusOrb status={status} size={7} />
      {meta.label}
    </span>
  );
}
