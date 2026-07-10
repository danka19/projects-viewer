import { useEffect, useMemo, useRef, useState } from 'react';
import { searchProjects } from '../search';
import type { SearchHit } from '../search';
import type { ProjectData } from '../types';

interface Props {
  projects: ProjectData[];
  query: string;
  includeDiagnostics: boolean;
  onQueryChange: (query: string) => void;
  onIncludeDiagnosticsChange: (include: boolean) => void;
  onOpenHit: (hit: SearchHit) => void;
}

const LISTBOX_ID = 'global-search-results';
const SEARCH_LABEL = 'Search projects, tasks, roadmap items, decisions, specs, and docs';

function optionId(key: string): string {
  return `global-search-option-${encodeURIComponent(key)}`;
}

function isTextEntry(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return (
    element.matches('input, textarea, select') ||
    element.isContentEditable
  );
}

export default function GlobalSearch({
  projects,
  query,
  includeDiagnostics,
  onQueryChange,
  onIncludeDiagnosticsChange,
  onOpenHit,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const result = useMemo(
    () => searchProjects(projects, query, { includeDiagnostics }),
    [includeDiagnostics, projects, query],
  );
  const searchable = query.trim().length >= 2;
  const popupOpen = open && searchable;
  const activeHit = popupOpen && activeIndex >= 0 ? result.hits[activeIndex] : undefined;

  useEffect(() => {
    if (!searchable) {
      setOpen(false);
      setActiveIndex(-1);
    } else if (activeIndex >= result.hits.length) {
      setActiveIndex(result.hits.length - 1);
    }
  }, [activeIndex, result.hits.length, searchable]);

  useEffect(() => {
    function focusShortcut(event: KeyboardEvent) {
      if (event.key !== '/' || isTextEntry(document.activeElement)) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', focusShortcut);
    return () => window.removeEventListener('keydown', focusShortcut);
  }, []);

  useEffect(() => {
    function dismissOutside(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !rootRef.current?.contains(target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('pointerdown', dismissOutside);
    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, []);

  function activate(hit: SearchHit) {
    // Mouse activation focuses the option; restore the durable trigger before
    // opening a drawer so its return-focus contract has a mounted origin.
    inputRef.current?.focus();
    onOpenHit(hit);
    setOpen(false);
    setActiveIndex(-1);
  }

  function moveActive(key: string) {
    if (result.hits.length === 0) return;
    setOpen(true);
    setActiveIndex((current) => {
      if (key === 'Home') return 0;
      if (key === 'End') return result.hits.length - 1;
      if (key === 'ArrowDown') return Math.min(result.hits.length - 1, current + 1);
      return current < 0 ? result.hits.length - 1 : Math.max(0, current - 1);
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && searchable) {
      event.preventDefault();
      moveActive(event.key);
      return;
    }
    if (event.key === 'Enter' && activeHit) {
      event.preventDefault();
      activate(activeHit);
      return;
    }
    if (event.key === 'Escape') {
      if (popupOpen) {
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      } else if (query.length > 0) {
        event.preventDefault();
        onQueryChange('');
      }
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative order-last w-full min-w-40 flex-1 sm:order-none sm:w-auto"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <input
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-label={SEARCH_LABEL}
        aria-expanded={popupOpen}
        aria-controls={LISTBOX_ID}
        aria-activedescendant={activeHit ? optionId(activeHit.key) : undefined}
        value={query}
        onFocus={() => {
          if (searchable) setOpen(true);
        }}
        onChange={(event) => {
          const next = event.target.value;
          onQueryChange(next);
          setOpen(next.trim().length >= 2);
          setActiveIndex(-1);
        }}
        onKeyDown={onKeyDown}
        placeholder="Search projects, tasks, decisions, docs"
        className="glass w-full rounded-lg py-2 pr-9 pl-3 font-mono text-xs text-ink placeholder:text-faint focus:border-accent/50"
      />
      <kbd className="absolute top-4 right-2.5 -translate-y-1/2">/</kbd>

      {popupOpen && (
        <div className="glass scroll-slim absolute top-full right-0 left-0 z-40 mt-2 max-h-96 overflow-y-auto rounded-xl p-2">
          <div className="flex items-center justify-between gap-3 px-2 pb-2 font-mono text-[10px] text-faint">
            <span>
              {result.truncated
                ? `Showing ${result.hits.length} of ${result.total} results`
                : `${result.total} ${result.total === 1 ? 'result' : 'results'}`}
            </span>
            {result.diagnosticsAvailable > 0 && (
              <label className="flex items-center gap-1.5 text-mute">
                <input
                  type="checkbox"
                  checked={includeDiagnostics}
                  onChange={(event) => onIncludeDiagnosticsChange(event.target.checked)}
                />
                Include diagnostics ({result.diagnosticsAvailable} matching diagnostics available)
              </label>
            )}
          </div>

          {result.hits.length > 0 ? (
            <div id={LISTBOX_ID} role="listbox" aria-label="Search results">
              {result.hits.map((hit, index) => (
                <button
                  id={optionId(hit.key)}
                  key={hit.key}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={activeIndex === index}
                  aria-label={`${hit.kind}: ${hit.label} — ${hit.project.name}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => activate(hit)}
                  className={`flex w-full items-baseline gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    activeIndex === index ? 'bg-void/50' : 'hover:bg-void/50'
                  }`}
                >
                  <span className="w-20 flex-none font-mono text-[10px] tracking-wider text-accent-ink uppercase">
                    {hit.kind}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{hit.label}</span>
                    <span className="block truncate font-mono text-[10px] text-faint">
                      {hit.project.name}
                      {hit.sub && hit.sub !== hit.project.name ? ` · ${hit.sub}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div id={LISTBOX_ID} role="listbox" aria-label="Search results" />
              <p role="status" className="px-2 py-2 text-sm text-mute">
                Nothing matches “{query.trim()}”.
              </p>
            </>
          )}
        </div>
      )}
      {!popupOpen && (
        <div id={LISTBOX_ID} role="listbox" aria-label="Search results" hidden />
      )}
    </div>
  );
}
