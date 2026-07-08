import { useState, type ReactNode } from 'react';

interface Props {
  title: string;
  count: number;
  accent?: string; // text color class for the count
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function Section({
  title,
  count,
  accent = 'text-mute',
  defaultOpen = true,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="glass rounded-xl">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <h3 className="flex items-baseline gap-2.5 font-mono text-[11px] font-medium tracking-[0.18em] text-mute uppercase">
          {title}
          <span className={`font-display text-sm font-semibold tracking-normal ${accent}`}>
            {count}
          </span>
        </h3>
        <span
          className={`text-[10px] text-faint transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        >
          ▶
        </span>
      </button>
      {open && (
        <div className="scroll-slim max-h-80 overflow-y-auto px-4 pb-4">{children}</div>
      )}
    </section>
  );
}
