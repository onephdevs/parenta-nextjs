'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  Check,
  Circle,
  ExternalLink,
  FileText,
  Play,
  X,
} from 'lucide-react';
import {
  articleKindLabel,
  articlesInModule,
  getAdjacentArticles,
  moduleForArticle,
  type KnowledgeArticle,
} from '@/lib/knowledge-base/articles';
import { GuideText } from './GuideText';
import { useKnowledgeProgress } from './useKnowledgeProgress';

type GuideTab = 'guide' | 'watch-out' | 'screen';

function GuideBody({ article, guideTab }: { article: KnowledgeArticle; guideTab: GuideTab }) {
  if (guideTab === 'watch-out') {
    return (
      <p className="text-sm leading-relaxed text-gray-800">
        {article.watchOut ? <GuideText text={article.watchOut} /> : 'No special warnings for this job.'}
      </p>
    );
  }
  if (guideTab === 'screen') {
    return (
      <ul className="space-y-3 text-sm text-gray-800">
        {article.alsoOnThisPage.length ? (
          article.alsoOnThisPage.map((item, index) => (
            <li key={index} className="leading-relaxed">
              <GuideText text={item} />
            </li>
          ))
        ) : (
          <li>No extra screen notes for this job.</li>
        )}
      </ul>
    );
  }
  return (
    <div className="space-y-4">
      {article.replaces && (
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">Replaces: </span>
          <GuideText text={article.replaces} />
        </p>
      )}
      <ol className="space-y-3">
        {article.steps.map((step, index) => (
          <li
            key={index}
            className={index === 0 ? 'rounded-md bg-[#E8F0FE] p-2.5' : 'rounded-md p-2.5'}
          >
            <p className="text-xs font-semibold text-[#0056D2]">Step {index + 1}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-800">
              <GuideText text={step} />
            </p>
          </li>
        ))}
      </ol>
      {article.doneWhen && (
        <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-950">
          <p className="font-semibold">Done when</p>
          <p className="mt-1">
            <GuideText text={article.doneWhen} />
          </p>
        </div>
      )}
    </div>
  );
}

export default function KnowledgeArticleView({ article }: { article: KnowledgeArticle }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastProgressWrite = useRef(0);
  const { map, patch, markComplete } = useKnowledgeProgress();
  const [guideTab, setGuideTab] = useState<GuideTab>('guide');
  const [durationLabel, setDurationLabel] = useState('');
  const { previous, next } = getAdjacentArticles(article.slug);
  const module = moduleForArticle(article.slug);
  const moduleLessons = module ? articlesInModule(module.id) : [];

  useEffect(() => {
    patch(article.slug, { started: true });
    setGuideTab('guide');
    setDurationLabel('');
    lastProgressWrite.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.slug]);

  const tabs = [
    { id: 'guide' as const, label: 'Guide', icon: Play },
    { id: 'watch-out' as const, label: 'Watch out', icon: BookOpen },
    { id: 'screen' as const, label: 'This screen', icon: FileText },
  ];

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 bg-white">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-gray-200 lg:flex">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold leading-snug text-gray-900">
              {module?.title || 'Office training'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {moduleLessons.filter((item) => map[item.slug]?.completed).length} of {moduleLessons.length}{' '}
              complete
            </p>
          </div>
          <Link
            href="/admin/knowledge-base"
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close lesson"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto py-2">
          <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Lessons
          </p>
          <ul>
            {moduleLessons.map((item) => {
              const active = item.slug === article.slug;
              const done = Boolean(map[item.slug]?.completed);
              return (
                <li key={item.slug}>
                  <Link
                    href={`/admin/knowledge-base/${item.slug}`}
                    className={`flex items-start gap-2.5 border-l-4 px-3 py-2.5 text-left ${
                      active
                        ? 'border-[#0056D2] bg-[#E8F0FE]'
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    {done ? (
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    ) : (
                      <Circle className={`mt-0.5 h-5 w-5 shrink-0 ${active ? 'text-[#0056D2]' : 'text-gray-300'}`} />
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-snug text-gray-900">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {articleKindLabel(item)}
                        {item.slug === article.slug && durationLabel ? ` · ${durationLabel}` : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="bg-black">
          {article.videoSrc ? (
            <video
              key={article.slug}
              ref={videoRef}
              className="aspect-video w-full bg-black"
              controls
              playsInline
              preload="metadata"
              onLoadedMetadata={(event) => {
                const duration = event.currentTarget.duration;
                if (Number.isFinite(duration)) {
                  setDurationLabel(`${Math.max(1, Math.round(duration / 60))} min`);
                  patch(article.slug, { durationSeconds: duration });
                }
              }}
              onTimeUpdate={() => {
                const video = videoRef.current;
                if (!video) return;
                const now = Date.now();
                if (now - lastProgressWrite.current < 4000) return;
                lastProgressWrite.current = now;
                patch(article.slug, {
                  secondsWatched: video.currentTime,
                  durationSeconds: Number.isFinite(video.duration) ? video.duration : 0,
                });
              }}
              onEnded={() => markComplete(article.slug)}
            >
              <source src={article.videoSrc} type="video/webm" />
            </video>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-zinc-900 px-8 text-center">
              <div>
                <BookOpen className="mx-auto h-10 w-10 text-white/70" />
                <p className="mt-3 text-sm text-white/80">No recording yet — follow the guide on the right.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col px-5 py-5 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {module?.title} · {articleKindLabel(article)}
            {durationLabel ? ` · ${durationLabel}` : ''}
          </p>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
            {article.href && (
              <Link
                href={article.href}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0056D2] hover:underline"
              >
                Open this screen
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
          {article.when && (
            <p className="mt-2 text-sm text-gray-600">
              <GuideText text={article.when} />
            </p>
          )}

          <div className="mt-6 xl:hidden">
            <div className="flex gap-2 border-b border-gray-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setGuideTab(tab.id)}
                  className={`-mb-px border-b-2 px-2 pb-2 text-sm font-semibold ${
                    guideTab === tab.id
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="py-4">
              <GuideBody article={article} guideTab={guideTab} />
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
            <div className="flex items-center gap-3">
              {previous && (
                <Link href={`/admin/knowledge-base/${previous.slug}`} className="text-sm text-gray-600 hover:text-gray-900">
                  Previous
                </Link>
              )}
              {!map[article.slug]?.completed && (
                <button
                  type="button"
                  onClick={() => markComplete(article.slug)}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Mark complete
                </button>
              )}
            </div>
            {next ? (
              <button
                type="button"
                onClick={() => {
                  if (!map[article.slug]?.completed) markComplete(article.slug);
                  router.push(`/admin/knowledge-base/${next.slug}`);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0056D2] px-4 text-sm font-semibold text-white hover:bg-[#0047b3]"
              >
                Go to next item
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/admin/knowledge-base"
                className="inline-flex h-10 items-center rounded-md bg-[#0056D2] px-4 text-sm font-semibold text-white hover:bg-[#0047b3]"
              >
                Back to My Learning
              </Link>
            )}
          </div>
        </div>
      </section>

      <aside className="hidden w-[22rem] shrink-0 border-l border-gray-200 xl:flex">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">
              {guideTab === 'guide' ? 'Guide' : guideTab === 'watch-out' ? 'Watch out' : 'This screen'}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <GuideBody article={article} guideTab={guideTab} />
          </div>
        </div>
        <div className="flex w-14 flex-col border-l border-gray-200 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = guideTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGuideTab(tab.id)}
                className={`flex flex-col items-center gap-1 px-1 py-3 text-[10px] font-medium leading-tight ${
                  active ? 'bg-[#E8F0FE] text-[#0056D2]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
