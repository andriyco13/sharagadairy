'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Award,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toDateKey } from '@/lib/dateUtils';
import { createAssignmentAction, updateAssignmentAction } from '@/app/actions';

export type AssignmentFormData = {
  id?: string;
  title: string;
  maxScore: number;
  dueDate?: Date | string | null;
  score?: number | null;
};

export type SavedAssignmentData = {
  id: string;
  title: string;
  maxScore: number;
  dueDate?: Date | string | null;
  userGrades: {
    id: string;
    score: number;
    earnedAt: Date | string;
  }[];
};

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  subjectName: string;
  initialData?: AssignmentFormData | null;
  onSaved: (savedAssignment: SavedAssignmentData) => void;
}

const TITLE_PRESETS = [
  'Лабораторна робота',
  'Практична робота',
  'Тест',
  'Модульна КР',
  'Самостійна робота',
  'Колоквіум',
];

const SCORE_PRESETS = [5, 7, 8, 10, 15, 20];

export function AssignmentModal({
  isOpen,
  onClose,
  subjectId,
  subjectName,
  initialData,
  onSaved,
}: AssignmentModalProps) {
  const isEditing = Boolean(initialData?.id);

  const [title, setTitle] = useState(initialData?.title || '');
  const [maxScore, setMaxScore] = useState<string>(
    initialData
      ? String(Math.round((initialData.maxScore + Number.EPSILON) * 10) / 10)
      : '10'
  );
  const [dueDate, setDueDate] = useState<string>(
    initialData?.dueDate ? toDateKey(initialData.dueDate) || '' : ''
  );
  const [hasScore, setHasScore] = useState<boolean>(
    initialData?.score !== null && initialData?.score !== undefined
  );
  const [score, setScore] = useState<string>(
    initialData?.score !== null && initialData?.score !== undefined
      ? String(Math.round((initialData.score + Number.EPSILON) * 10) / 10)
      : ''
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage('Введіть назву роботи');
      return;
    }

    const parsedMax = parseFloat(maxScore.replace(',', '.'));
    const numMax = Math.round((parsedMax + Number.EPSILON) * 10) / 10;
    if (isNaN(numMax) || numMax <= 0) {
      setErrorMessage('Максимальний бал повинен бути більшим за 0');
      return;
    }

    let numScore: number | null = null;
    if (hasScore && score.trim() !== '') {
      const parsedScore = parseFloat(score.replace(',', '.'));
      numScore = Math.round((parsedScore + Number.EPSILON) * 10) / 10;
      if (isNaN(numScore) || numScore < 0) {
        setErrorMessage('Отримана оцінка не може бути від’ємною');
        return;
      }
      if (numScore > numMax) {
        setErrorMessage(`Оцінка (${numScore}) не може перевищувати максимальний бал (${numMax})`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isEditing && initialData?.id) {
        const res = await updateAssignmentAction({
          assignmentId: initialData.id,
          title: trimmedTitle,
          maxScore: numMax,
          dueDate: dueDate || null,
          score: hasScore ? numScore : null,
        });

        if (res.success && res.assignment) {
          onSaved(res.assignment);
          onClose();
        } else {
          setErrorMessage(res.error || 'Не вдалося оновити роботу');
        }
      } else {
        const res = await createAssignmentAction({
          subjectId,
          title: trimmedTitle,
          maxScore: numMax,
          dueDate: dueDate || null,
          score: hasScore ? numScore : null,
        });

        if (res.success && res.assignment) {
          onSaved(res.assignment);
          onClose();
        } else {
          setErrorMessage(res.error || 'Не вдалося створити роботу');
        }
      }
    } catch {
      setErrorMessage('Виникла непередбачена помилка');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper shortcuts for date
  const setQuickDate = (daysFromToday: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    const dateKey = toDateKey(d);
    if (dateKey) setDueDate(dateKey);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {subjectName}
            </span>
          </div>
          <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {isEditing ? 'Редагувати роботу' : 'Додати нову роботу'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Вкажіть назву, максимальний бал та дедлайн здачі завдання
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Назва роботи <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="наприклад: Лабораторна робота №3"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />

            {/* Quick Title Presets */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Шаблони:
              </span>
              {TITLE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    if (!title.trim()) {
                      setTitle(`${preset} №1`);
                    } else if (!title.includes(preset)) {
                      setTitle(`${preset}: ${title}`);
                    }
                  }}
                  className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-zinc-200/50 dark:border-zinc-700/50"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Grid: Max Score and Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Max Score */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Максимальний бал <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  required
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value.replace(',', '.'))}
                  onKeyDown={(e) => {
                    if (e.key === ',') {
                      e.preventDefault();
                      setMaxScore((prev) => (prev.includes('.') ? prev : prev + '.'));
                    }
                  }}
                  placeholder="10"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 pl-3.5 pr-8 py-2.5 text-sm font-bold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-semibold text-zinc-400">
                  б.
                </span>
              </div>

              {/* Quick score pills */}
              <div className="mt-2 flex items-center gap-1.5">
                {SCORE_PRESETS.map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => setMaxScore(String(pts))}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition-colors ${
                      maxScore === String(pts)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {pts}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Дедлайн / Дата здачі
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              {/* Quick date shortcuts */}
              <div className="mt-2 flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setQuickDate(0)}
                  className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600"
                >
                  Сьогодні
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(7)}
                  className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600"
                >
                  +7 дн.
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(14)}
                  className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600"
                >
                  +14 дн.
                </button>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate('')}
                    className="ml-auto text-zinc-400 hover:text-red-500"
                  >
                    Очистити
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Earned Score Section (Optional) */}
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-3.5 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasScore}
                onChange={(e) => {
                  setHasScore(e.target.checked);
                  if (e.target.checked && !score) {
                    setScore(maxScore);
                  }
                }}
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-500" />
                Вже отримано оцінку за цю роботу
              </span>
            </label>

            {hasScore && (
              <div className="flex items-center gap-2 pl-6 animate-in fade-in duration-150">
                <span className="text-xs text-zinc-500">Отриманий бал:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={maxScore ? parseFloat(maxScore.replace(',', '.')) || 100 : 100}
                  value={score}
                  onChange={(e) => setScore(e.target.value.replace(',', '.'))}
                  onKeyDown={(e) => {
                    if (e.key === ',') {
                      e.preventDefault();
                      setScore((prev) => (prev.includes('.') ? prev : prev + '.'));
                    }
                  }}
                  placeholder="0"
                  className="w-20 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-sm font-bold text-center text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                <span className="text-xs text-zinc-400">з {maxScore || 10} б.</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Оновити роботу' : 'Додати роботу'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
