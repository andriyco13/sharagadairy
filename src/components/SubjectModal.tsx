'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  BookOpen,
  User,
  GraduationCap,
  Loader2,
  AlertCircle,
  Check,
  Award,
} from 'lucide-react';
import { createSubjectAction, updateSubjectAction, CreateSubjectInput } from '@/app/actions';

export interface SubjectModalData {
  id?: string;
  name: string;
  controlType: 'EXAM' | 'CREDIT';
  lecturer?: string | null;
  practitioner?: string | null;
}

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: SubjectModalData | null;
  onSaved?: (subject: any) => void;
}

export function SubjectModal({
  isOpen,
  onClose,
  initialData,
  onSaved,
}: SubjectModalProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData?.id);

  const [name, setName] = useState<string>(() => initialData?.name ?? '');
  const [controlType, setControlType] = useState<'EXAM' | 'CREDIT'>(
    () => initialData?.controlType ?? 'EXAM'
  );
  const [lecturer, setLecturer] = useState<string>(() => initialData?.lecturer ?? '');
  const [practitioner, setPractitioner] = useState<string>(() => initialData?.practitioner ?? '');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Вкажіть назву предмета');
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload: CreateSubjectInput = {
      name: trimmedName,
      controlType,
      lecturer: lecturer.trim() || null,
      practitioner: practitioner.trim() || null,
    };

    let res;
    if (isEditing && initialData?.id) {
      res = await updateSubjectAction({
        id: initialData.id,
        ...payload,
      });
    } else {
      res = await createSubjectAction(payload);
    }

    setIsLoading(false);

    if (res.success && res.subject) {
      if (onSaved) {
        onSaved(res.subject);
      }
      router.refresh();
      onClose();
    } else {
      setError(res.error || 'Не вдалося зберегти предмет');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {isEditing ? 'Редагувати предмет' : 'Додати новий предмет'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isEditing
                  ? 'Зміна налаштувань дисципліни та викладачів'
                  : 'Створення дисципліни для розкладу та оцінок'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Subject Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Назва предмета <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <BookOpen className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="напр. Вища математика"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-10 pr-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Control Type Switch: Іспит / Залік */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Тип контролю (Іспит / Залік)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setControlType('EXAM')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  controlType === 'EXAM'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Іспит (Екзамен)</span>
              </button>

              <button
                type="button"
                onClick={() => setControlType('CREDIT')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  controlType === 'CREDIT'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Залік</span>
              </button>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              {controlType === 'EXAM'
                ? 'Іспит враховується до стипендіального рейтингу (до 100 б.)'
                : 'Залік перевіряє виконання вимог дисципліни (не йде в розрахунок рейтингу)'}
            </p>
          </div>

          {/* Lecturer field (Викладач лекцій) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Викладач лекцій
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-indigo-500" />
              <input
                type="text"
                value={lecturer}
                onChange={(e) => setLecturer(e.target.value)}
                placeholder="напр. проф. Коваленко О. П."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-10 pr-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">
              Автоматично підставиться при додаванні пари «Лекція»
            </span>
          </div>

          {/* Practitioner field (Викладач практик) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Викладач практик / лабораторних
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-emerald-500" />
              <input
                type="text"
                value={practitioner}
                onChange={(e) => setPractitioner(e.target.value)}
                placeholder="напр. асист. Сидоренко В. М."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-10 pr-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">
              Автоматично підставиться при додаванні пари «Практика»
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Зберегти зміни' : 'Створити предмет'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
