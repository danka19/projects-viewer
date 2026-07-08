import type { ProjectStatus } from '../types';

interface Props {
  status: ProjectStatus;
  size?: number;
  className?: string;
}

export default function StatusOrb({ status, size = 10, className = '' }: Props) {
  return (
    <span
      className={`orb ${className}`}
      data-status={status}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="orb-ring" />
      <span className="orb-core" />
    </span>
  );
}
