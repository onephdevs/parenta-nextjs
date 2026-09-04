'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  BarChart3,
  Building2,
  Check,
  Circle,
  FileText,
  FolderOpen,
  Play,
  Receipt,
  Search,
  Settings,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import {
  KNOWLEDGE_MODULES,
  articleKindLabel,
  articlesInModule,
  type KnowledgeArticle,
  type KnowledgeModule,
} from '@/lib/knowledge-base/articles';
import { percentComplete, useKnowledgeProgress, type LessonProgress } from './useKnowledgeProgress';

type HomeTab = 'in-progress' | 'completed' | 'all';

const MODULE_ICONS: Record<string, LucideIcon> = {
  properties: Building2,
  tenants: Users,
  leasing: FileText,
  payments: Wallet,
  bills: Receipt,
  documents: FolderOpen,
  reports: BarChart3,
  maintenance: Wrench,
  office: Settings,
};

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function moduleMatches(module: KnowledgeModule, lessons: KnowledgeArticle[], query: string): boolean {
  if (!query) return true;
  const haystack = `${module.title} ${module.description} ${lessons.map((row) => row.title).join(' ')}`.toLowerCase();
  return haystack.includes(query);
}

function CalendarCard() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const label = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
        {cells.map((day, index) => (
          <span
            key={index}
            className={
              day === today
                ? 'mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#0056D2] text-xs font-semibold text-white'
                : 'mx-auto flex h-7 w-7 items-center justify-center text-gray-700'
            }
          >
            {day || ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  lessons,
  map,
  resumeSlug,
}: {
  module: KnowledgeModule;
  lessons: KnowledgeArticle[];
  map: Record<string, LessonProgress>;
  resumeSlug: string | null;
}) {
  const Icon = MODULE_ICONS[module.id] || Building2;
  const completedCount = lessons.filter((lesson) => map[lesson.slug]?.completed).length;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8F0FE] text-[#0056D2]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{module.title}</h2>
          <p className="text-sm text-gray-500">{module.description}</p>
        </div>
        <p className="shrink-0 text-sm text-gray-500">
          {completedCount} of {lessons.length} complete
        </p>
      </div>
      <ul className="divide-y divide-gray-100">
        {lessons.map((lesson, index) => {
          const progress = map[lesson.slug];
          const percent = percentComplete(progress);
          const isResume = resumeSlug === lesson.slug;
          return (
            <li key={lesson.slug} className={isResume ? 'bg-[#F3F8FF]' : undefined}>
              <div className="flex items-start gap-3 px-5 py-4">
                <span className="mt-0.5 shrink-0">
                  {progress?.completed ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                  ) : (
                    <Circle className="h-7 w-7 text-gray-300" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{lesson.title}</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Lesson {index + 1} of {lessons.length}
                    {progress?.completed
                      ? ' · Complete'
                      : percent > 0
                        ? ` · ${percent}% complete`
                        : ' · Not started'}
                  </p>
                  {isResume && (
                    <>
                      <div className="mt-2 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-[#0056D2]"
                          style={{ width: `${Math.max(percent, 8)}%` }}
                        />
                      </div>
                      {lesson.hasVideo && (
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
                          <Play className="h-3.5 w-3.5" />
                          Walkthrough recording
                        </p>
                      )}
                    </>
                  )}
                </div>
                <Link
                  href={`/admin/knowledge-base/${lesson.slug}`}
                  className={
                    isResume
                      ? 'inline-flex h-10 shrink-0 items-center rounded-md bg-[#0056D2] px-4 text-sm font-semibold text-white hover:bg-[#0047b3]'
                      : 'inline-flex h-10 shrink-0 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50'
                  }
                >
                  {progress?.completed ? 'Review' : isResume ? 'Resume' : 'Start'}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function KnowledgeBaseIndex() {
  const { data: session } = useSession();
  const { map, stats } = useKnowledgeProgress();
  const [tab, setTab] = useState<HomeTab>('in-progress');
  const [query, setQuery] = useState('');
  const firstName = session?.user?.firstName || 'there';
  const initials =
    `${session?.user?.firstName?.charAt(0) || ''}${session?.user?.lastName?.charAt(0) || ''}`.toUpperCase() || 'A';
  const q = query.trim().toLowerCase();

  const modules = useMemo(() => {
    return KNOWLEDGE_MODULES.map((module) => {
      const lessons = articlesInModule(module.id).filter((lesson) => {
        if (!q) return true;
        return `${lesson.title} ${lesson.when}`.toLowerCase().includes(q);
      });
      return { module, lessons };
    }).filter(({ module, lessons }) => lessons.length > 0 && moduleMatches(module, lessons, q));
  }, [q]);

  const resumeSlug = useMemo(() => {
    for (const { lessons } of modules) {
      const current = lessons.find((lesson) => map[lesson.slug]?.started && !map[lesson.slug]?.completed);
      if (current) return current.slug;
    }
    for (const { lessons } of modules) {
      const next = lessons.find((lesson) => !map[lesson.slug]?.completed);
      if (next) return next.slug;
    }
    return null;
  }, [map, modules]);

  const visible = modules.filter(({ lessons }) => {
    const done = lessons.filter((lesson) => map[lesson.slug]?.completed).length;
    if (tab === 'completed') return done === lessons.length && lessons.length > 0;
    if (tab === 'in-progress') return done < lessons.length;
    return true;
  });

  const tabs: Array<{ id: HomeTab; label: string }> = [
    { id: 'in-progress', label: 'In Progress' },
    { id: 'completed', label: 'Completed' },
    { id: 'all', label: 'All modules' },
  ];

  return (
    <div className="min-h-full bg-white px-4 py-6 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-700">
              {initials}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {greetingForHour(new Date().getHours())}, {firstName}
            </h1>
          </div>
        </div>

        <div className="relative mt-5 flex items-center justify-between gap-6 overflow-hidden rounded-xl bg-[#E8F0FE] px-5 py-4">
          <p className="max-w-xl text-sm text-gray-800">
            Need help with the office? Start with <span className="font-semibold">Properties</span>, then{' '}
            <span className="font-semibold">Tenants</span> and <span className="font-semibold">Leasing</span>. Watch the
            recording, then do the same job in the app.
          </p>
          <Link href="/admin/knowledge-base/add-unit" className="shrink-0 text-sm font-semibold text-[#0056D2] hover:underline">
            Start Properties
          </Link>
        </div>

        <div className="relative mt-6 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What do you want to learn?"
            aria-label="Search knowledge base"
            className="w-full rounded-full border border-gray-300 bg-white py-2.5 pl-10 pr-12 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#0056D2] focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20"
          />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="flex gap-6 border-b border-gray-200">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`-mb-px border-b-[3px] pb-3 text-sm font-semibold ${
                    tab === item.id
                      ? 'border-[#0056D2] text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-6">
              {visible.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 px-5 py-10 text-center text-sm text-gray-500">
                  {tab === 'completed'
                    ? 'No module finished yet. Complete every lesson in Properties, Tenants, or Leasing to see it here.'
                    : 'No modules match that search.'}
                </p>
              ) : (
                visible.map(({ module, lessons }) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    lessons={lessons}
                    map={map}
                    resumeSlug={tab === 'completed' ? null : resumeSlug}
                  />
                ))
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <CalendarCard />
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">Last 4 weeks</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedToday}</p>
                  <p className="mt-1 text-[11px] leading-tight text-gray-500">Daily goals completed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                  <p className="mt-1 text-[11px] leading-tight text-gray-500">Items completed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.minutes}</p>
                  <p className="mt-1 text-[11px] leading-tight text-gray-500">Minutes learned</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
