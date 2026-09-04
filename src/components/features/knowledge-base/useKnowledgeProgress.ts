'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export interface LessonProgress {
  started: boolean;
  completed: boolean;
  secondsWatched: number;
  durationSeconds: number;
  updatedAt: string;
}

type ProgressMap = Record<string, LessonProgress>;

const STORAGE_KEY = 'parenta-knowledge-progress';

function emptyProgress(): LessonProgress {
  return {
    started: false,
    completed: false,
    secondsWatched: 0,
    durationSeconds: 0,
    updatedAt: new Date().toISOString(),
  };
}

function readStore(): ProgressMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(map: ProgressMap) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function percentComplete(row: LessonProgress | undefined): number {
  if (!row) return 0;
  if (row.completed) return 100;
  if (row.durationSeconds > 0) {
    return Math.min(99, Math.round((row.secondsWatched / row.durationSeconds) * 100));
  }
  return row.started ? 12 : 0;
}

export function useKnowledgeProgress() {
  const [map, setMap] = useState<ProgressMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMap(readStore());
    setReady(true);
  }, []);

  const patch = useCallback((slug: string, update: Partial<LessonProgress>) => {
    setMap((prev) => {
      const next = {
        ...prev,
        [slug]: {
          ...emptyProgress(),
          ...prev[slug],
          ...update,
          started: true,
          updatedAt: new Date().toISOString(),
        },
      };
      writeStore(next);
      return next;
    });
  }, []);

  const markComplete = useCallback(
    (slug: string) => {
      patch(slug, { completed: true, started: true });
    },
    [patch]
  );

  const stats = useMemo(() => {
    const rows = Object.values(map);
    const completed = rows.filter((row) => row.completed).length;
    const minutes = Math.round(rows.reduce((sum, row) => sum + row.secondsWatched, 0) / 60);
    const completedToday = rows.filter((row) => {
      if (!row.completed) return false;
      return row.updatedAt.slice(0, 10) === new Date().toISOString().slice(0, 10);
    }).length;
    return { completed, minutes, completedToday };
  }, [map]);

  return { map, ready, patch, markComplete, stats, percentComplete };
}
