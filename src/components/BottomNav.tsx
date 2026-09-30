'use client';

import { CalendarDays, GraduationCap, Settings2 } from 'lucide-react';

export type TabType = 'schedule' | 'grades' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    {
      id: 'schedule' as TabType,
      label: 'Розклад',
      icon: CalendarDays,
    },
    {
      id: 'grades' as TabType,
      label: 'Успішність',
      icon: GraduationCap,
    },
    {
      id: 'settings' as TabType,
      label: 'Налаштування',
      icon: Settings2,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200/90 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg px-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2 shadow-lg"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-1 flex-col items-center justify-center py-1 text-center transition-all ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-normal'
              }`}
            >
              <div
                className={`relative flex items-center justify-center rounded-xl p-1 transition-all ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 scale-105'
                    : 'bg-transparent'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="mt-1 text-[11px] leading-tight tracking-tight">
                {tab.label}
              </span>

              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-6 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
