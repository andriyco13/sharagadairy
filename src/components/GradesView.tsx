'use client';

import { useState, useSyncExternalStore } from 'react';
import {
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  AlertTriangle,
  Circle,
  GraduationCap,
  Sparkles,
  RotateCcw,
  ArrowRightLeft,
  Flame,
  ChevronDown,
  FlaskConical,
  User,
} from 'lucide-react';
import { AssignmentModal, AssignmentFormData } from './AssignmentModal';
import { SubjectModal, SubjectModalData } from './SubjectModal';
import {
  deleteAssignmentAction,
  updateSubjectControlTypeAction,
  deleteSubjectAction,
} from '@/app/actions';
import { getDeadlineStatus, sortAssignmentsByDate } from '@/lib/dateUtils';

export type SubjectWithGrades = {
  id: string;
  name: string;
  controlType?: 'EXAM' | 'CREDIT';
  lecturer?: string | null;
  practitioner?: string | null;
  assignments: {
    id: string;
    title: string;
    maxScore: number;
    dueDate?: Date | string | null;
    userGrades: {
      id: string;
      score: number;
      earnedAt: Date | string;
    }[];
  }[];
};

const subscribeCalcExpanded = (callback: () => void) => {
  window.addEventListener('storage', callback);
  window.addEventListener('local-storage-scholarship-calc', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('local-storage-scholarship-calc', callback);
  };
};

const getCalcExpandedSnapshot = () => {
  try {
    return localStorage.getItem('scholarship_calc_expanded') === 'true';
  } catch {
    return false;
  }
};

const getCalcExpandedServerSnapshot = () => false;

interface GradesViewProps {
  subjects: SubjectWithGrades[];
  onSubjectsChange?: (subjects: SubjectWithGrades[]) => void;
  isAdmin?: boolean;
}

export function GradesView({ subjects, onSubjectsChange, isAdmin = false }: GradesViewProps) {
  // Modal state
  const [modalSubject, setModalSubject] = useState<{ id: string; name: string } | null>(null);
  const [modalInitialData, setModalInitialData] = useState<AssignmentFormData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Delete confirmation modal state
  const [deletingAssignment, setDeletingAssignment] = useState<{
    id: string;
    title: string;
    subjectId: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Subject Modal state
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubjectData, setEditingSubjectData] = useState<SubjectModalData | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingSubject, setIsDeletingSubject] = useState(false);

  // Activity extra points (0 - 10)
  const [activityPoints, setActivityPoints] = useState<number>(0);

  // Collapsible state for Scholarship Calculator (default: collapsed, persisted in localStorage)
  const isCalcExpanded = useSyncExternalStore(
    subscribeCalcExpanded,
    getCalcExpandedSnapshot,
    getCalcExpandedServerSnapshot
  );

  const toggleCalcExpanded = () => {
    try {
      const next = !getCalcExpandedSnapshot();
      localStorage.setItem('scholarship_calc_expanded', String(next));
      window.dispatchEvent(new Event('local-storage-scholarship-calc'));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Simulated scores per subject for scholarship calculation:
  // key = subjectId -> { semester: number, exam: number }
  const [simulatedScores, setSimulatedScores] = useState<
    Record<string, { semester: number; exam: number }>
  >({});

  // Helper to compute actual earned semester score for a subject
  const getSubjectActualEarned = (subject: SubjectWithGrades) => {
    return subject.assignments.reduce((sum, a) => {
      const score = a.userGrades[0]?.score || 0;
      return sum + score;
    }, 0);
  };

  // Helper to get simulated or default scores for an exam subject
  const getSubjectSimulated = (subject: SubjectWithGrades) => {
    const existing = simulatedScores[subject.id];
    if (existing) return existing;

    const actual = getSubjectActualEarned(subject);
    // Cap default semester score at 60
    const defaultSemester = Math.min(60, Math.round(actual * 10) / 10);
    // Default expected exam score: 35 out of 40 (or 0 if semester is 0)
    const defaultExam = defaultSemester > 0 ? 35 : 30;

    return { semester: defaultSemester, exam: defaultExam };
  };

  const handleSimulatedSemesterChange = (subjectId: string, val: number) => {
    const clamped = Math.max(0, Math.min(60, isNaN(val) ? 0 : val));
    setSimulatedScores((prev) => ({
      ...prev,
      [subjectId]: {
        ...(prev[subjectId] || { semester: 0, exam: 35 }),
        semester: clamped,
      },
    }));
  };

  const handleSimulatedExamChange = (subjectId: string, val: number) => {
    const clamped = Math.max(0, Math.min(40, isNaN(val) ? 0 : val));
    setSimulatedScores((prev) => ({
      ...prev,
      [subjectId]: {
        ...(prev[subjectId] || { semester: 60, exam: 0 }),
        exam: clamped,
      },
    }));
  };

  const handleResetSubjectSimulation = (subject: SubjectWithGrades) => {
    const actual = getSubjectActualEarned(subject);
    const defaultSemester = Math.min(60, Math.round(actual * 10) / 10);
    setSimulatedScores((prev) => ({
      ...prev,
      [subject.id]: { semester: defaultSemester, exam: 35 },
    }));
  };

  // Toggle subject control type: EXAM <-> CREDIT
  const handleToggleControlType = async (subjectId: string, currentType: 'EXAM' | 'CREDIT') => {
    const newType: 'EXAM' | 'CREDIT' = currentType === 'EXAM' ? 'CREDIT' : 'EXAM';

    // Optimistic update
    const updated: SubjectWithGrades[] = subjects.map((s) =>
      s.id === subjectId ? { ...s, controlType: newType } : s
    );
    if (onSubjectsChange) {
      onSubjectsChange(updated);
    }

    const res = await updateSubjectControlTypeAction(subjectId, newType);
    if (!res.success) {
      alert(res.error || 'Не вдалося змінити тип контролю');
      if (onSubjectsChange) {
        onSubjectsChange(subjects);
      }
    }
  };

  // Exam subjects for scholarship rating calculation
  const examSubjects = subjects.filter((s) => (s.controlType || 'EXAM') === 'EXAM');
  const creditSubjects = subjects.filter((s) => (s.controlType || 'EXAM') === 'CREDIT');

  // Calculate scholarship rating immutably
  const examDetails = examSubjects.map((s) => {
    const sim = getSubjectSimulated(s);
    const total = Math.min(100, Math.round((sim.semester + sim.exam) * 10) / 10);

    return {
      subject: s,
      semester: sim.semester,
      exam: sim.exam,
      total,
    };
  });

  const sumExamScores = examDetails.reduce((sum, d) => sum + d.total, 0);

  const averageExamScore = examSubjects.length > 0 ? sumExamScores / examSubjects.length : 0;
  const academicRating = averageExamScore * 0.9; // 90% academic score
  const finalRating = Math.min(100, academicRating + activityPoints);

  // Rating Tier / Scholarship Chance
  const getRatingStatus = () => {
    if (finalRating >= 85) {
      return {
        text: 'Претендент на підвищену стипендію (топ рейтингу)',
        badge: 'Підвищена стипендія',
        color: 'emerald',
      };
    }
    if (finalRating >= 75) {
      return {
        text: 'Високі шанси на академічну стипендію (у межах 40-45% ліміту)',
        badge: 'Академічна стипендія',
        color: 'indigo',
      };
    }
    if (finalRating >= 60) {
      return {
        text: 'Задовільно, проходження на стипендію залежить від конкурсу в групі',
        badge: 'Базовий рівень',
        color: 'amber',
      };
    }
    return {
      text: 'Середній бал нижче 60',
      badge: 'Низький бал',
      color: 'rose',
    };
  };

  const ratingStatus = getRatingStatus();

  // Modal handlers
  const handleOpenCreate = (subjectId: string, subjectName: string) => {
    setModalSubject({ id: subjectId, name: subjectName });
    setModalInitialData(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (
    subjectId: string,
    subjectName: string,
    assignment: SubjectWithGrades['assignments'][0]
  ) => {
    setModalSubject({ id: subjectId, name: subjectName });
    setModalInitialData({
      id: assignment.id,
      title: assignment.title,
      maxScore: assignment.maxScore,
      dueDate: assignment.dueDate,
      score: assignment.userGrades[0]?.score ?? null,
    });
    setIsModalOpen(true);
  };

  const handleSavedAssignment = (saved: SubjectWithGrades['assignments'][0]) => {
    if (!modalSubject) return;

    const updated = subjects.map((subj) => {
      if (subj.id !== modalSubject.id) return subj;

      const existingIdx = subj.assignments.findIndex((a) => a.id === saved.id);
      if (existingIdx >= 0) {
        const nextAssignments = [...subj.assignments];
        nextAssignments[existingIdx] = {
          ...nextAssignments[existingIdx],
          ...saved,
          userGrades: saved.userGrades || nextAssignments[existingIdx].userGrades,
        };
        return { ...subj, assignments: nextAssignments };
      } else {
        return {
          ...subj,
          assignments: [...subj.assignments, saved],
        };
      }
    });

    if (onSubjectsChange) {
      onSubjectsChange(updated);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAssignment) return;

    const { id: assignmentId, subjectId } = deletingAssignment;
    setIsDeleting(true);

    const updated = subjects.map((subj) => {
      if (subj.id !== subjectId) return subj;
      return {
        ...subj,
        assignments: subj.assignments.filter((a) => a.id !== assignmentId),
      };
    });

    if (onSubjectsChange) {
      onSubjectsChange(updated);
    }

    const res = await deleteAssignmentAction(assignmentId);
    setIsDeleting(false);
    setDeletingAssignment(null);

    if (!res.success) {
      alert(res.error || 'Не вдалося видалити роботу');
      if (onSubjectsChange) {
        onSubjectsChange(subjects);
      }
    }
  };

  const handleConfirmDeleteSubject = async () => {
    if (!subjectToDelete) return;
    const { id: subjId } = subjectToDelete;
    setIsDeletingSubject(true);

    const updated = subjects.filter((s) => s.id !== subjId);
    if (onSubjectsChange) {
      onSubjectsChange(updated);
    }

    const res = await deleteSubjectAction(subjId);
    setIsDeletingSubject(false);
    setSubjectToDelete(null);

    if (!res.success) {
      alert(res.error || 'Не вдалося видалити предмет');
      if (onSubjectsChange) {
        onSubjectsChange(subjects);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Scholarship Rating Calculator / Simulator Card (Collapsible) */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-zinc-950 text-white shadow-lg border border-indigo-800/40 transition-all duration-300">
        {/* Collapsible Header Button */}
        <button
          type="button"
          onClick={toggleCalcExpanded}
          className={`w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left transition-colors hover:bg-white/[0.03] focus:outline-none cursor-pointer select-none ${
            isCalcExpanded ? 'border-b border-indigo-800/40' : ''
          }`}
          aria-expanded={isCalcExpanded}
        >
          {/* Left: Icon, Title & Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 shadow-2xs">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                  Стипендіальний бал
                </h3>
                <span className="hidden sm:inline-flex items-center rounded-full bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-0.5 text-[11px] font-bold text-indigo-300">
                  {examSubjects.length} {examSubjects.length === 1 ? 'іспит' : examSubjects.length < 5 ? 'іспити' : 'іспитів'}
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 truncate mt-0.5">
                {isCalcExpanded
                  ? 'Формула: Середній бал іспитів × 0.90 + Додаткові бали (до 10 б.)'
                  : 'Калькулятор рейтингу • Натисніть, щоб розгорнути симулятор'}
              </p>
            </div>
          </div>

          {/* Right: Calculated rating & Chevron toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span
              className={`hidden sm:inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${
                ratingStatus.color === 'emerald'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : ratingStatus.color === 'indigo'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                  : ratingStatus.color === 'amber'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
              }`}
            >
              {ratingStatus.badge}
            </span>

            <div className="flex items-baseline gap-1 bg-white/10 rounded-xl px-3 py-1.5 border border-white/10">
              <span className="text-base sm:text-lg font-black tracking-tight text-white">
                {finalRating.toFixed(2)}
              </span>
              <span className="text-[11px] font-bold text-indigo-200">/ 100</span>
              <span className="hidden md:inline text-[10px] text-indigo-300/80 ml-1">
                ({academicRating.toFixed(2)} / 90)
              </span>
            </div>

            <div className="rounded-xl bg-white/10 p-2 text-indigo-200 transition-colors hover:bg-white/20 hover:text-white">
              <ChevronDown
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${
                  isCalcExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
        </button>

        {/* Expanded View */}
        {isCalcExpanded && (
          <div className="p-5 sm:p-6 space-y-5 animate-in fade-in duration-200">
            {/* Top detailed stats bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/40 pb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 text-xs font-bold text-indigo-300 backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Симулятор сесії
                </span>
                <h4 className="mt-2 text-xl font-black tracking-tight text-white">
                  Прогноз академічного рейтингу
                </h4>
                <p className="mt-0.5 text-xs text-indigo-200">
                  {examSubjects.length} екзамени • {creditSubjects.length} заліки (заліки не враховуються до рейтингу)
                </p>
              </div>

              {/* Rating Big Numbers */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center justify-center rounded-2xl p-4 backdrop-blur-md border bg-white/10 border-white/15 text-white">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tight">
                      {finalRating.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-indigo-200">/ 100</span>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-200/90 mt-0.5">
                    Фінальний рейтинг
                  </span>
                </div>

                <div className="flex flex-col rounded-2xl bg-white/5 border border-white/10 p-3.5 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-indigo-200">Академічний:</span>
                    <strong className="text-white font-bold">{academicRating.toFixed(2)} / 90</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-indigo-200">Сер. бал:</span>
                    <strong className="text-white font-bold">{averageExamScore.toFixed(2)} / 100</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-indigo-200">Активність:</span>
                    <strong className="text-emerald-400 font-bold">+{activityPoints} б.</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Rating tier message */}
            {examSubjects.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs text-indigo-100">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      ratingStatus.color === 'emerald'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : ratingStatus.color === 'indigo'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                        : ratingStatus.color === 'amber'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                    }`}
                  >
                    {ratingStatus.badge}
                  </span>
                  <span>{ratingStatus.text}</span>
                </div>
                {finalRating >= 85 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-semibold">
                    <Flame className="w-3.5 h-3.5" />
                    Вищий бал
                  </span>
                )}
              </div>
            )}

            {/* Exam Subjects Simulation Matrix */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Екзаменаційні дисципліни (семестр до 60 + іспит до 40):</span>
                </h4>

                {/* Extra activity points input */}
                <div className="flex items-center gap-2 self-start sm:self-auto bg-white/10 rounded-xl px-3 py-1.5 border border-white/10">
                  <label
                    htmlFor="activity-input"
                    className="text-xs font-semibold text-indigo-200 cursor-pointer"
                  >
                    + Бали за активність:
                  </label>
                  <input
                    id="activity-input"
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={activityPoints}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setActivityPoints(Math.max(0, Math.min(10, isNaN(val) ? 0 : val)));
                    }}
                    className="w-14 rounded-lg bg-black/40 border border-white/20 px-2 py-0.5 text-xs font-bold text-center text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  <span className="text-[11px] text-indigo-300">/ 10</span>
                </div>
              </div>

              {examSubjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-indigo-700/50 bg-white/5 p-4 text-center">
                  <p className="text-xs text-indigo-200">
                    Жодна дисципліна наразі не має статусу «Іспит». Натисніть на бейдж «Залік» біля
                    предмета нижче, щоб перемкнути його на «Іспит» для розрахунку рейтингу.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {examDetails.map(({ subject, semester, exam, total }) => {
                    const actual = getSubjectActualEarned(subject);

                    return (
                      <div
                        key={subject.id}
                        className="rounded-xl p-3.5 border transition-all bg-white/5 border-white/10 hover:border-white/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-white truncate max-w-[200px]">
                            {subject.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-black ${
                                total >= 90
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : total >= 75
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  : total >= 60
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30'
                              }`}
                            >
                              {total} / 100 б.
                            </span>
                          </div>
                        </div>

                        {/* Inputs row */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* Semester points */}
                          <div className="rounded-lg bg-black/30 p-2 border border-white/5">
                            <div className="flex items-center justify-between text-[11px] text-indigo-200 mb-1">
                              <span>Семестр (до 60):</span>
                              {Math.abs(semester - actual) > 0.1 && (
                                <button
                                  type="button"
                                  onClick={() => handleResetSubjectSimulation(subject)}
                                  title={`Скинути до фактичного (${actual})`}
                                  className="text-amber-400 hover:text-amber-300"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="60"
                                step="0.5"
                                value={semester}
                                onChange={(e) =>
                                  handleSimulatedSemesterChange(
                                    subject.id,
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                              <span className="text-[11px] text-zinc-400">/ 60</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 block mt-1">
                              Факт: {actual} б.
                            </span>
                          </div>

                          {/* Exam points */}
                          <div className="rounded-lg bg-black/30 p-2 border border-white/5">
                            <div className="flex items-center justify-between text-[11px] text-indigo-200 mb-1">
                              <span>Іспит (до 40):</span>
                              <span className="text-[10px] text-indigo-300">прогноз</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="40"
                                step="0.5"
                                value={exam}
                                onChange={(e) =>
                                  handleSimulatedExamChange(subject.id, parseFloat(e.target.value))
                                }
                                className="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                              <span className="text-[11px] text-zinc-400">/ 40</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 block mt-1">
                              {exam >= 35 ? 'відмінно' : exam >= 25 ? 'добре' : 'задовільно'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subjects breakdown list */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Дисципліни та навчальні роботи
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {subjects.length} дисциплін ({examSubjects.length} іспити, {creditSubjects.length} заліки)
            </span>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditingSubjectData(null);
                setIsSubjectModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 text-xs font-bold text-white transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати предмет</span>
            </button>
          )}
        </div>

        {subjects.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center space-y-3">
            <p className="text-sm text-zinc-500">Немає зареєстрованих предметів у базі</p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditingSubjectData(null);
                  setIsSubjectModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Створити перший предмет</span>
              </button>
            )}
          </div>
        ) : (
          subjects.map((subject) => {
            let subjEarned = 0;
            let subjMax = 0;
            let subjLost = 0;
            let subjGradedCount = 0;

            subject.assignments.forEach((a) => {
              subjMax += a.maxScore;
              if (a.userGrades.length > 0) {
                const s = a.userGrades[0].score;
                subjEarned += s;
                subjGradedCount++;
                if (s < a.maxScore) {
                  subjLost += a.maxScore - s;
                }
              }
            });

            const subjPercentage = subjMax > 0 ? Math.round((subjEarned / subjMax) * 100) : 0;
            const sortedAssignments = sortAssignmentsByDate(subject.assignments);
            const isExam = (subject.controlType || 'EXAM') === 'EXAM';

            return (
              <div
                key={subject.id}
                className="overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-all hover:shadow-sm"
              >
                {/* Subject Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/60 p-2.5 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                          {subject.name}
                        </h4>

                        {/* Control Type Badge */}
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleControlType(subject.id, subject.controlType || 'EXAM')
                            }
                            title="Натисніть, щоб змінити тип контролю (Іспит / Залік)"
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold transition-all shadow-2xs ${
                              isExam
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                                : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100'
                            }`}
                          >
                            <ArrowRightLeft className="w-3 h-3 opacity-60" />
                            <span>{isExam ? 'Іспит' : 'Залік'}</span>
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                              isExam
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                            }`}
                          >
                            <span>{isExam ? 'Іспит' : 'Залік'}</span>
                          </span>
                        )}

                        {/* Subject Edit and Delete actions (ADMIN ONLY) */}
                        {isAdmin && (
                          <div className="flex items-center gap-1 pl-1 border-l border-zinc-200 dark:border-zinc-800">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSubjectData({
                                  id: subject.id,
                                  name: subject.name,
                                  controlType: (subject.controlType || 'EXAM') as 'EXAM' | 'CREDIT',
                                  lecturer: subject.lecturer,
                                  practitioner: subject.practitioner,
                                });
                                setIsSubjectModalOpen(true);
                              }}
                              title="Редагувати параметри предмета"
                              className="p-1 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSubjectToDelete({ id: subject.id, name: subject.name })}
                              title="Видалити предмет"
                              className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Display Lecturer & Practitioner */}
                      {(subject.lecturer || subject.practitioner) && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {subject.lecturer && (
                            <span className="inline-flex items-center gap-1">
                              <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>Лектор: <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">{subject.lecturer}</strong></span>
                            </span>
                          )}
                          {subject.practitioner && (
                            <span className="inline-flex items-center gap-1">
                              <FlaskConical className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>Практик: <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">{subject.practitioner}</strong></span>
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>
                          {subject.assignments.length} робіт ({subjGradedCount} оцінено)
                        </span>
                        {subjLost > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 px-1.5 py-0.2 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            Втрачено: -{subjLost} б.
                          </span>
                        )}
                        {subjMax > 0 && subjLost > 0 && (
                          <span className="text-[10px] text-zinc-400">
                            (макс. {subjMax - subjLost} б.)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Header: Points & Add Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                    <div className="text-left sm:text-right">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {subjEarned} / {subjMax} б.
                      </span>
                      <span className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {subjPercentage}%
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenCreate(subject.id, subject.name)}
                        className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Додати роботу</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Subject Progress bar */}
                <div className="mt-3">
                  <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
                      style={{ width: `${Math.min(subjPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Assignments List */}
                <div className="mt-4 space-y-2">
                  {sortedAssignments.length > 0 ? (
                    sortedAssignments.map((assignment) => {
                      const grade = assignment.userGrades[0];
                      const hasGrade = grade !== undefined;
                      const lostOnAssignment =
                        hasGrade && grade.score < assignment.maxScore
                          ? assignment.maxScore - grade.score
                          : 0;

                      const deadlineStatus = getDeadlineStatus(assignment.dueDate, hasGrade);

                      return (
                        <div
                          key={assignment.id}
                          className="group/item flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 p-3 border border-zinc-200/50 dark:border-zinc-800/80 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
                        >
                          {/* Left: Status icon, Title, Due date badge */}
                          <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                            {hasGrade ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5 sm:mt-0" />
                            ) : (
                              <Circle className="w-4 h-4 shrink-0 text-zinc-300 dark:text-zinc-600 mt-0.5 sm:mt-0" />
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm">
                                  {assignment.title}
                                </span>

                                {/* Date / Deadline badge */}
                                {deadlineStatus && (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                      deadlineStatus.badgeType === 'danger'
                                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                                        : deadlineStatus.badgeType === 'warning'
                                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                        : deadlineStatus.badgeType === 'success'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                                    }`}
                                  >
                                    <Calendar className="w-3 h-3" />
                                    <span>{deadlineStatus.label}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Score badge & Action buttons */}
                          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pl-6 sm:pl-0">
                            {/* Score */}
                            <div className="flex items-center gap-1.5">
                              {hasGrade ? (
                                <div className="flex items-center gap-1">
                                  <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm">
                                    {grade.score} / {assignment.maxScore} б.
                                  </span>
                                  {lostOnAssignment > 0 && (
                                    <span className="text-[10px] font-bold text-rose-500">
                                      (-{lostOnAssignment})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-400 dark:text-zinc-500 text-xs">
                                  до {assignment.maxScore} б.
                                </span>
                              )}
                            </div>

                            {/* Action Buttons: Edit and Delete (ADMIN ONLY) */}
                            {isAdmin && (
                              <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(subject.id, subject.name, assignment)}
                                  className="p-1 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition-colors"
                                  title="Редагувати роботу"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeletingAssignment({
                                      id: assignment.id,
                                      title: assignment.title,
                                      subjectId: subject.id,
                                    })
                                  }
                                  className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition-colors"
                                  title="Видалити роботу"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-4 text-center">
                      <p className="text-xs text-zinc-400">
                        {isAdmin
                          ? 'У цьому предметі ще немає робіт. Натисніть «+ Додати роботу», щоб створити першу!'
                          : 'У цьому предметі ще немає доданих робіт.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Assignment Create / Edit Modal */}
      {modalSubject && (
        <AssignmentModal
          key={modalInitialData?.id || `new-${modalSubject.id}`}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setModalSubject(null);
            setModalInitialData(null);
          }}
          subjectId={modalSubject.id}
          subjectName={modalSubject.name}
          initialData={modalInitialData}
          onSaved={handleSavedAssignment}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeletingAssignment(null);
          }}
        >
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Видалити роботу?
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Ви впевнені, що хочете видалити «{deletingAssignment.title}»? Оцінку за цю роботу також буде
              вилучено з журналу успішності.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingAssignment(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Скасувати
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
              >
                {isDeleting ? 'Видалення...' : 'Видалити'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Create / Edit Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => {
          setIsSubjectModalOpen(false);
          setEditingSubjectData(null);
        }}
        initialData={editingSubjectData}
        onSaved={(saved) => {
          const exists = subjects.some((s) => s.id === saved.id);
          let updated: SubjectWithGrades[];
          if (exists) {
            updated = subjects.map((s) => (s.id === saved.id ? { ...s, ...saved } : s));
          } else {
            updated = [...subjects, { ...saved, assignments: [] }];
          }
          if (onSubjectsChange) {
            onSubjectsChange(updated);
          }
        }}
      />

      {/* Delete Subject Confirmation Modal */}
      {subjectToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingSubject) setSubjectToDelete(null);
          }}
        >
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Видалити предмет?
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Ви впевнені, що хочете видалити дисципліну «{subjectToDelete.name}»? Всі повʼязані роботи, оцінки та пари в розкладі також буде вилучено.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingSubject}
                onClick={() => setSubjectToDelete(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Скасувати
              </button>
              <button
                type="button"
                disabled={isDeletingSubject}
                onClick={handleConfirmDeleteSubject}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
              >
                {isDeletingSubject ? 'Видалення...' : 'Видалити'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
