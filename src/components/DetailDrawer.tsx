import { useEffect, useId, useRef, useState } from 'react';
import type { DrawerItem } from '../types';

interface Props {
  item: DrawerItem;
  onNavigate: (item: DrawerItem) => void;
  onClose: () => void;
}

export default function DetailDrawer({ item, onNavigate, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const generatedOriginId = `detail-drawer-origin-${useId().replace(/:/g, '')}`;

  // The drawer owns focus while open, then restores the exact invoking control.
  useEffect(() => {
    const activeElement =
      document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement
        : null;
    const originId = activeElement?.id || (activeElement ? generatedOriginId : null);
    const assignedOriginId = Boolean(activeElement && !activeElement.id && originId);
    if (activeElement && assignedOriginId && originId) activeElement.id = originId;
    const root = rootRef.current;
    const siblings = root?.parentElement
      ? Array.from(root.parentElement.children).filter((element) => element !== root)
      : [];
    const previous = siblings.map((element) => ({
      element,
      inert: element.getAttribute('inert'),
      ariaHidden: element.getAttribute('aria-hidden'),
    }));

    for (const sibling of siblings) {
      sibling.setAttribute('inert', '');
      sibling.setAttribute('aria-hidden', 'true');
    }
    closeButtonRef.current?.focus();

    return () => {
      for (const state of previous) {
        if (state.inert === null) state.element.removeAttribute('inert');
        else state.element.setAttribute('inert', state.inert);
        if (state.ariaHidden === null) state.element.removeAttribute('aria-hidden');
        else state.element.setAttribute('aria-hidden', state.ariaHidden);
      }
      const focusOrigin = originId ? document.getElementById(originId) : null;
      focusOrigin?.focus();
      if (assignedOriginId && focusOrigin?.id === originId) focusOrigin.removeAttribute('id');
    };
  }, [generatedOriginId]);
  const fullPath = `${item.projectPath.replace(/[\\/]+$/, '')}\\${item.file.replace(/\//g, '\\')}${
    item.line ? `:${item.line}` : ''
  }`;

  useEffect(() => {
    setCopied(false);
    closeButtonRef.current?.focus();
  }, [item]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(fullPath);
      setCopied(true);
    } catch {
      /* clipboard unavailable: the path stays selectable below */
    }
  }

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    const root = rootRef.current;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('hidden'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onKeyDown={trapFocus}
    >
      <div className="backdrop-in absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="drawer-in glass absolute top-0 right-0 flex h-full w-full max-w-md flex-col border-l border-line">
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] tracking-[0.2em] text-faint uppercase">
              {item.type}
            </p>
            <h3 className="mt-1 font-display text-base leading-snug font-semibold text-ink">
              {item.title}
            </h3>
            {item.status && (
              <span
                className={`mt-2 inline-block rounded border px-2 py-0.5 font-mono text-[11px] ${item.statusChip ?? 'border-dim/40 bg-dim/10 text-dim'}`}
              >
                {item.status}
              </span>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-lg border border-line px-2.5 py-1 text-sm text-mute transition-colors hover:border-line-strong hover:text-ink"
          >
            ✕
          </button>
        </header>

        <div className="scroll-slim flex-1 overflow-y-auto px-5 py-4">
          {item.text && (
            <p className="text-sm leading-relaxed whitespace-pre-line text-mute">
              {item.text}
            </p>
          )}

          <div className="mt-5 rounded-lg border border-line bg-void/40 p-3">
            <p className="font-mono text-[10px] tracking-[0.2em] text-faint uppercase">Source</p>
            <p className="mt-1.5 font-mono text-xs break-all text-mute select-all">
              {item.file}
              {item.line ? `:${item.line}` : ''}
            </p>
            <button
              onClick={copyPath}
              className="mt-2.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] text-accent-ink transition-colors hover:bg-accent/15"
            >
              {copied ? 'Copied ✓' : 'Copy full path'}
            </button>
          </div>

          {item.related && item.related.length > 0 && (
            <div className="mt-5">
              <p className="font-mono text-[10px] tracking-[0.2em] text-faint uppercase">
                Related
              </p>
              <ul className="mt-2 space-y-1.5">
                {item.related.map((r, i) => (
                  <li key={i}>
                    <button
                      onClick={() => onNavigate(r.item)}
                      className="w-full rounded-lg border border-line bg-dim/5 px-3 py-2 text-left text-sm text-mute transition-colors hover:border-line-strong hover:text-ink"
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="border-t border-line px-5 py-3">
          <p className="font-mono text-[10px] text-faint">
            Read-only view · press Esc to close
          </p>
        </footer>
      </aside>
    </div>
  );
}
