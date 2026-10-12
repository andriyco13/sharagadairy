'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Award,
  BookOpen,
  CheckCircle2,
  Trash2,
  Loader2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { saveUserGradeAction, deleteUserGradeAction } from '@/app/actions';
import { formatDateUk } from '@/lib/dateUtils';

export interface GradeModalAssignment {
  id: string;
  title: string;
  maxScore: number;
  dueDate?: Date | string | null;
  userGrades: {
    id: string;
    score: number;
    earnedAt?: Date | string;
  }[];
}

interface GradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  assignment: GradeModalAssignment | null;
  onGradeSaved: (
    assignmentId: string,
    score: number | null,
    gradeId?: string
  ) => void;
}

const round1 = (val: number | null | undefined): number => {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 10) / 10;
};

export function GradeModal({
  isOpen,
  onClose,
  subjectName,
  assignment,
  onGradeSaved,
}: GradeModalProps) {
  const existingGrade = assignment?.userGrades?.[0];
  const hasExistingGrade = existingGrade !== undefined && existingGrade !== null;

  const [score, setScore] = useState<string>(
    hasExistingGrade ? String(round1(existingGrade.score)) : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when modal opens or assignment changes
  useEffect(() => {
    if (assignment) {
      const g = assignment.userGrades?.[0];
      setScore(g !== undefined && g !== null ? String(round1(g.score)) : '');
      setErrorMessage(null);
    }
  }, [assignment]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !assignment) return null;

  const numMax = round1(assignment.maxScore);

  // Quick preset pills
  const presets: number[] = [];
  if (numMax > 0) {
    if (numMax <= 5) {
      for (let p = 1; p <= numMax; p++) presets.push(p);
    } else if (numMax === 10) {
      presets.push(5, 7, 8, 9, 10);
    } else if (numMax === 20) {
      presets.push(10, 14, 16, 18, 20);
    } else {
      const p60 = round1(numMax * 0.6);
      const p75 = round1(numMax * 0.75);
      const p90 = round1(numMax * 0.9);
      if (p60 > 0 && !presets.includes(p60)) presets.push(p60);
      if (p75 > 0 && !presets.includes(p75)) presets.push(p75);
      if (p90 > 0 && !presets.includes(p90)) presets.push(p90);
      if (!presets.includes(numMax)) presets.push(numMax);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanScore = score.trim().replace(',', '.');
    if (!cleanScore) {
      setErrorMessage('Введіть отриманий бал');
      return;
    }

    const numScore = round1(parseFloat(cleanScore));
    if (isNaN(numScore) || numScore < 0) {
      setErrorMessage('Бал не може бути від’ємним');
      return;
    }

    if (numScore > numMax) {
      setErrorMessage(`Бал (${numScore}) не може перевищувати максимальний (${numMax} б.)`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveUserGradeAction({
        assignmentId: assignment.id,
        score: numScore,
      });

      if (res.success && res.grade) {
        onGradeSaved(assignment.id, res.grade.score, res.grade.id);
        onClose();
      } else {
        setErrorMessage(res.error || 'Не вдалося зберегти бал');
      }
    } catch {
      setErrorMessage('Виникла непередбачена помилка');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGrade = async () => {
    if (!confirm(`Видалити ваш бал за роботу «${assignment.title}»?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await deleteUserGradeAction(assignment.id);
      if (res.success) {
        onGradeSaved(assignment.id, null);
        onClose();
      } else {
        setErrorMessage(res.error || 'Не вдалося видалити бал');
      }
    } catch {
      setErrorMessage('Виникла непередбачена помилка при видаленні');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting && !isDeleting) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting || isDeleting}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {subjectName}
            </span>
            {assignment.dueDate && (
              <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Дедлайн: {formatDateUk(assignment.dueDate)}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {hasExistingGrade ? 'Редагувати бал' : 'Виставити бал за роботу'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium line-clamp-2">
            «{assignment.title}» • максимум {numMax} б.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 p-3 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Grade Input Card */}
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Отриманий бал (від 0 до {numMax}):
            </label>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={numMax}
                  required
                  autoFocus
                  value={score}
                  onChange={(e) => setScore(e.target.value.replace(',', '.'))}
                  onKeyDown={(e) => {
                    if (e.key === ',') {
                      e.preventDefault();
                      setScore((prev) => (prev.includes('.') ? prev : prev + '.'));
                    }
                  }}
                  placeholder="0"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-base font-bold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                <span className="absolute right-3.5 top-2.5 text-sm font-semibold text-zinc-400">
                  / {numMax} б.
                </span>
              </div>

              {/* Set max button */}
              <button
                type="button"
                onClick={() => setScore(String(numMax))}
                className="shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                title={`Поставити повний бал (${numMax})`}
              >
                Макс ({numMax})
              </button>
            </div>

            {/* Quick score pills */}
            {presets.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-zinc-400">Швидкий вибір:</span>
                {presets.map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => setScore(String(pts))}
                    className={`rounded-lg px-2 py-0.5 text-xs font-bold transition-colors ${
                      score === String(pts)
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {pts}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {hasExistingGrade ? (
              <button
                type="button"
                disabled={isSubmitting || isDeleting}
                onClick={handleDeleteGrade}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                title="Видалити бал за цю роботу"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Видалити бал</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Зберегти бал</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
