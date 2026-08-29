'use client';

import type { LucideIcon } from 'lucide-react';
import type { WheelEvent } from 'react';

export interface QuickActionRailItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tile: string;
  badge?: string | null;
}

interface QuickActionRailProps {
  actions: QuickActionRailItem[];
  ariaLabel: string;
}

function forwardWheelToAppMain(event: WheelEvent<HTMLElement>) {
  if (event.ctrlKey || event.metaKey) return;
  const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
  const dx = event.deltaX * scale;
  const dy = event.deltaY * scale;
  const main = document.querySelector<HTMLElement>('[data-app-main]');
  if (main) {
    main.scrollTop += dy;
    main.scrollLeft += dx;
    return;
  }
  window.scrollBy(dx, dy);
}

export default function QuickActionRail({ actions, ariaLabel }: QuickActionRailProps) {
  return (
    <>
      <aside
        className="pointer-events-none fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 lg:block"
        aria-label={ariaLabel}
      >
        <div
          className="pointer-events-auto flex flex-col rounded-l-md shadow-[0_8px_24px_rgba(37,42,69,0.16)]"
          onWheel={forwardWheelToAppMain}
        >
          {actions.map((action, index) => {
            const Icon = action.icon;
            const round =
              index === 0
                ? 'rounded-tl-md'
                : index === actions.length - 1
                  ? 'rounded-bl-md'
                  : '';
            return (
              <div key={action.id} className="group relative">
                <button
                  type="button"
                  onClick={action.onClick}
                  aria-label={action.label}
                  className={`relative flex h-12 w-12 items-center justify-center transition ${action.tile} ${round}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                  {action.badge ? (
                    <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                      {action.badge}
                    </span>
                  ) : null}
                </button>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute right-full top-1/2 z-50 mr-3 -translate-y-1/2 whitespace-nowrap rounded-sm bg-black px-3 py-1.5 font-[family-name:var(--font-lato)] text-sm font-medium text-white shadow-[0_4px_14px_rgba(0,0,0,0.22)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  {action.label}
                  <span className="absolute left-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-l-black" />
                </span>
              </div>
            );
          })}
        </div>
      </aside>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div className="pointer-events-auto flex justify-end">
          <div
            className="flex overflow-hidden rounded-tl-md shadow-[0_-4px_20px_rgba(15,23,42,0.16)]"
            onWheel={forwardWheelToAppMain}
          >
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  aria-label={action.label}
                  className={`relative flex h-12 w-12 items-center justify-center ${action.tile}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                  {action.badge ? (
                    <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                      {action.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
