'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  BookOpen,
  CalendarDays,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  AlertCircle,
  Clock,
  MapPin,
  User,
  GraduationCap,
  Sparkles,
  Layers,
  Award,
} from 'lucide-react';
import {
  createGroupAction,
  updateGroupAction,
  deleteGroupAction,
  createSubjectAction,
  updateSubjectAction,
  deleteSubjectAction,
  createScheduleItemAction,
  updateScheduleItemAction,
  deleteScheduleLessonAction,
} from '@/app/actions';
import { BELL_SCHEDULE, LESSON_ORDERS, getBellSchedule } from '@/lib/constants';

export type GroupWithCount = {
  id: string;
  name: string;
  _count: {
    users: number;
    subjects: number;
    schedules: number;
  };
};

export type AdminSubject = {
  id: string;
  name: string;
  groupId: string;
  controlType: 'EXAM' | 'CREDIT';
  lecturer: string | null;
  practitioner: string | null;
  group?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    assignments: number;
    schedules: number;
  };
};

export type AdminSchedule = {
  id: string;
  groupId: string;
  subjectId: string;
  dayOfWeek: number;
  lessonOrder: number;
  lessonType: 'LECTURE' | 'PRACTICE';
  startTime: string;
  endTime: string;
  weekType: 'ALL' | 'EVEN' | 'ODD';
  room: string;
  teacher: string | null;
  subject: {
    id: string;
    name: string;
    controlType?: 'EXAM' | 'CREDIT';
    lecturer?: string | null;
    practitioner?: string | null;
  };
  group?: {
    id: string;
    name: string;
  } | null;
};

interface AdminDashboardProps {
  initialGroups: GroupWithCount[];
  initialSubjects: AdminSubject[];
  initialSchedules: AdminSchedule[];
  currentAdminUser: {
    id: string;
    name: string;
    email: string;
    groupId: string | null;
  };
}

const DAYS = [
  { id: 1, short: 'Пн', full: 'Понеділок' },
  { id: 2, short: 'Вт', full: 'Вівторок' },
  { id: 3, short: 'Ср', full: 'Середа' },
  { id: 4, short: 'Чт', full: 'Четвер' },
  { id: 5, short: 'Пт', full: "П'ятниця" },
];

export function AdminDashboard({
  initialGroups,
  initialSubjects,
  initialSchedules,
  currentAdminUser,
}: AdminDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'groups' | 'subjects' | 'schedule'>('schedule');

  // Active state data
  const [groups, setGroups] = useState<GroupWithCount[]>(initialGroups);
  const [subjects, setSubjects] = useState<AdminSubject[]>(initialSubjects);
  const [schedules, setSchedules] = useState<AdminSchedule[]>(initialSchedules);

  // Selected group for filtering Disciplines & Schedule
  const defaultGroupId =
    currentAdminUser.groupId && groups.some((g) => g.id === currentAdminUser.groupId)
      ? currentAdminUser.groupId
      : groups[0]?.id || '';

  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultGroupId);

  // Synchronize selectedGroupId if empty and groups become available
  if (!selectedGroupId && groups.length > 0) {
    setSelectedGroupId(groups[0].id);
  }

  // Feedback banner state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  /* =========================================================================
     TAB 1: GROUPS MANAGEMENT
     ========================================================================= */
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ id?: string; name: string } | null>(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [isGroupPending, startGroupTransition] = useTransition();

  const handleOpenCreateGroup = () => {
    setEditingGroup(null);
    setGroupNameInput('');
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (g: GroupWithCount) => {
    setEditingGroup({ id: g.id, name: g.name });
    setGroupNameInput(g.name);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = () => {
    const trimmed = groupNameInput.trim();
    if (!trimmed) {
      showFeedback('error', 'Вкажіть назву групи');
      return;
    }

    startGroupTransition(async () => {
      if (editingGroup?.id) {
        const res = await updateGroupAction(editingGroup.id, trimmed);
        if (res.success) {
          setGroups((prev) =>
            prev.map((g) => (g.id === editingGroup.id ? { ...g, name: trimmed } : g))
          );
          showFeedback('success', `Групу оновлено на "${trimmed}"`);
          setIsGroupModalOpen(false);
          router.refresh();
        } else {
          showFeedback('error', res.error || 'Помилка оновлення групи');
        }
      } else {
        const res = await createGroupAction(trimmed);
        if (res.success && res.group) {
          const newG: GroupWithCount = {
            id: res.group.id,
            name: res.group.name,
            _count: { users: 0, subjects: 0, schedules: 0 },
          };
          setGroups((prev) => [...prev, newG].sort((a, b) => a.name.localeCompare(b.name)));
          if (!selectedGroupId) setSelectedGroupId(newG.id);
          showFeedback('success', `Групу "${trimmed}" успішно створено`);
          setIsGroupModalOpen(false);
          router.refresh();
        } else {
          showFeedback('error', res.error || 'Помилка створення групи');
        }
      }
    });
  };

  const handleDeleteGroup = (g: GroupWithCount) => {
    if (
      !confirm(
        `Ви впевнені, що хочете видалити групу "${g.name}"?\nУсі пов'язані дисципліни та пари буде видалено.`
      )
    ) {
      return;
    }

    startGroupTransition(async () => {
      const res = await deleteGroupAction(g.id);
      if (res.success) {
        setGroups((prev) => prev.filter((item) => item.id !== g.id));
        setSubjects((prev) => prev.filter((item) => item.groupId !== g.id));
        setSchedules((prev) => prev.filter((item) => item.groupId !== g.id));
        if (selectedGroupId === g.id) {
          const remaining = groups.filter((item) => item.id !== g.id);
          setSelectedGroupId(remaining[0]?.id || '');
        }
        showFeedback('success', `Групу "${g.name}" видалено`);
        router.refresh();
      } else {
        showFeedback('error', res.error || 'Помилка видалення групи');
      }
    });
  };

  /* =========================================================================
     TAB 2: SUBJECTS / DISCIPLINES MANAGEMENT
     ========================================================================= */
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<{
    id?: string;
    groupId: string;
    name: string;
    controlType: 'EXAM' | 'CREDIT';
    lecturer: string;
    practitioner: string;
  } | null>(null);
  const [isSubjectPending, startSubjectTransition] = useTransition();

  const handleOpenCreateSubject = (targetGroupId?: string) => {
    setEditingSubject({
      groupId: targetGroupId || selectedGroupId || (groups[0]?.id ?? ''),
      name: '',
      controlType: 'EXAM',
      lecturer: '',
      practitioner: '',
    });
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (s: AdminSubject) => {
    setEditingSubject({
      id: s.id,
      groupId: s.groupId,
      name: s.name,
      controlType: s.controlType,
      lecturer: s.lecturer || '',
      practitioner: s.practitioner || '',
    });
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = () => {
    if (!editingSubject) return;
    const trimmedName = editingSubject.name.trim();
    if (!trimmedName) {
      showFeedback('error', 'Вкажіть назву дисципліни');
      return;
    }
    if (!editingSubject.groupId) {
      showFeedback('error', 'Виберіть академічну групу');
      return;
    }

    startSubjectTransition(async () => {
      if (editingSubject.id) {
        const res = await updateSubjectAction({
          id: editingSubject.id,
          groupId: editingSubject.groupId,
          name: trimmedName,
          controlType: editingSubject.controlType,
          lecturer: editingSubject.lecturer.trim() || undefined,
          practitioner: editingSubject.practitioner.trim() || undefined,
        });

        if (res.success && res.subject) {
          const updatedSubj = res.subject;
          const targetG = groups.find((g) => g.id === editingSubject.groupId);
          setSubjects((prev) =>
            prev.map((s) =>
              s.id === editingSubject.id
                ? {
                    ...s,
                    name: updatedSubj.name,
                    groupId: updatedSubj.groupId,
                    controlType: updatedSubj.controlType as 'EXAM' | 'CREDIT',
                    lecturer: updatedSubj.lecturer,
                    practitioner: updatedSubj.practitioner,
                    group: targetG ? { id: targetG.id, name: targetG.name } : s.group,
                  }
                : s
            )
          );
          // Also update subject reference in schedules
          setSchedules((prev) =>
            prev.map((item) =>
              item.subjectId === editingSubject.id
                ? {
                    ...item,
                    subject: {
                      ...item.subject,
                      name: updatedSubj.name,
                      controlType: updatedSubj.controlType as 'EXAM' | 'CREDIT',
                      lecturer: updatedSubj.lecturer,
                      practitioner: updatedSubj.practitioner,
                    },
                  }
                : item
            )
          );
          showFeedback('success', `Дисципліну "${trimmedName}" успішно оновлено`);
          setIsSubjectModalOpen(false);
          router.refresh();
        } else {
          showFeedback('error', res.error || 'Помилка оновлення дисципліни');
        }
      } else {
        const res = await createSubjectAction({
          groupId: editingSubject.groupId,
          name: trimmedName,
          controlType: editingSubject.controlType,
          lecturer: editingSubject.lecturer.trim() || undefined,
          practitioner: editingSubject.practitioner.trim() || undefined,
        });

        if (res.success && res.subject) {
          const newSubj = res.subject;
          const targetG = groups.find((g) => g.id === editingSubject.groupId);
          const fullSubj: AdminSubject = {
            id: newSubj.id,
            name: newSubj.name,
            groupId: newSubj.groupId,
            controlType: newSubj.controlType as 'EXAM' | 'CREDIT',
            lecturer: newSubj.lecturer,
            practitioner: newSubj.practitioner,
            group: targetG ? { id: targetG.id, name: targetG.name } : null,
            _count: { assignments: 0, schedules: 0 },
          };
          setSubjects((prev) => [...prev, fullSubj].sort((a, b) => a.name.localeCompare(b.name)));
          showFeedback('success', `Дисципліну "${trimmedName}" створено`);
          setIsSubjectModalOpen(false);
          router.refresh();
        } else {
          showFeedback('error', res.error || 'Помилка створення дисципліни');
        }
      }
    });
  };

  const handleDeleteSubject = (s: AdminSubject) => {
    if (
      !confirm(
        `Ви впевнені, що хочете видалити дисципліну "${s.name}"?\nУсі пари цієї дисципліни в розкладі також буде видалено.`
      )
    ) {
      return;
    }

    startSubjectTransition(async () => {
      const res = await deleteSubjectAction(s.id);
      if (res.success) {
        setSubjects((prev) => prev.filter((item) => item.id !== s.id));
        setSchedules((prev) => prev.filter((item) => item.subjectId !== s.id));
        showFeedback('success', `Дисципліну "${s.name}" видалено`);
        router.refresh();
      } else {
        showFeedback('error', res.error || 'Помилка видалення дисципліни');
      }
    });
  };

  /* =========================================================================
     TAB 3: SCHEDULE CONSTRUCTOR
     ========================================================================= */
  const [scheduleDay, setScheduleDay] = useState<number>(1);
  const [scheduleWeekType, setScheduleWeekType] = useState<'ALL' | 'ODD' | 'EVEN'>('ALL');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isSchedulePending, startScheduleTransition] = useTransition();

  const [scheduleForm, setScheduleForm] = useState<{
    id?: string;
    groupId: string;
    subjectId: string;
    dayOfWeek: number;
    lessonOrder: number;
    lessonType: 'LECTURE' | 'PRACTICE';
    weekType: 'ALL' | 'EVEN' | 'ODD';
    startTime: string;
    endTime: string;
    room: string;
    teacher: string;
  }>({
    groupId: selectedGroupId,
    subjectId: '',
    dayOfWeek: 1,
    lessonOrder: 1,
    lessonType: 'LECTURE',
    weekType: 'ALL',
    startTime: '08:20',
    endTime: '09:40',
    room: '',
    teacher: '',
  });

  // Filtered subjects for current active group
  const activeGroupSubjects = subjects.filter((s) => s.groupId === selectedGroupId);

  // Helper: auto-select teacher based on lessonType and chosen subject
  const resolveAutoTeacher = (
    subjectId: string,
    lessonType: 'LECTURE' | 'PRACTICE',
    allSubjs = activeGroupSubjects
  ): string => {
    const subj = allSubjs.find((s) => s.id === subjectId);
    if (!subj) return '';
    if (lessonType === 'LECTURE') {
      return subj.lecturer || subj.practitioner || '';
    } else {
      return subj.practitioner || subj.lecturer || '';
    }
  };

  // Open modal to add a lesson to a specific order slot
  const handleOpenAddScheduleSlot = (order: number) => {
    const bell = getBellSchedule(order);
    const initialSubject = activeGroupSubjects[0];
    const initialType: 'LECTURE' | 'PRACTICE' = 'LECTURE';
    const autoTeacher = initialSubject
      ? resolveAutoTeacher(initialSubject.id, initialType, activeGroupSubjects)
      : '';

    setScheduleForm({
      groupId: selectedGroupId,
      subjectId: initialSubject?.id || '',
      dayOfWeek: scheduleDay,
      lessonOrder: order,
      lessonType: initialType,
      weekType: scheduleWeekType === 'ALL' ? 'ALL' : scheduleWeekType,
      startTime: bell.startTime,
      endTime: bell.endTime,
      room: '',
      teacher: autoTeacher,
    });
    setIsScheduleModalOpen(true);
  };

  // Open modal to edit an existing lesson
  const handleOpenEditSchedule = (item: AdminSchedule) => {
    setScheduleForm({
      id: item.id,
      groupId: item.groupId,
      subjectId: item.subjectId,
      dayOfWeek: item.dayOfWeek,
      lessonOrder: item.lessonOrder,
      lessonType: item.lessonType,
      weekType: item.weekType,
      startTime: item.startTime,
      endTime: item.endTime,
      room: item.room,
      teacher: item.teacher || '',
    });
    setIsScheduleModalOpen(true);
  };

  // When switching lessonType in modal: auto-fill teacher
  const handleToggleLessonType = (newType: 'LECTURE' | 'PRACTICE') => {
    const autoTeacher = resolveAutoTeacher(scheduleForm.subjectId, newType);
    setScheduleForm((prev) => ({
      ...prev,
      lessonType: newType,
      teacher: autoTeacher || prev.teacher,
    }));
  };

  // When changing subject dropdown in modal: auto-fill teacher
  const handleSelectSubject = (newSubjectId: string) => {
    const autoTeacher = resolveAutoTeacher(newSubjectId, scheduleForm.lessonType);
    setScheduleForm((prev) => ({
      ...prev,
      subjectId: newSubjectId,
      teacher: autoTeacher,
    }));
  };

  // When changing lesson order in modal: update start/end time
  const handleSelectOrder = (orderNum: number) => {
    const bell = getBellSchedule(orderNum);
    setScheduleForm((prev) => ({
      ...prev,
      lessonOrder: orderNum,
      startTime: bell.startTime,
      endTime: bell.endTime,
    }));
  };

  // Save lesson in constructor
  const handleSaveScheduleItem = () => {
    if (!scheduleForm.groupId) {
      showFeedback('error', 'Виберіть групу');
      return;
    }
    if (!scheduleForm.subjectId) {
      showFeedback('error', 'Оберіть дисципліну зі списку');
      return;
    }

    startScheduleTransition(async () => {
      if (scheduleForm.id) {
        // Update
        const res = await updateScheduleItemAction(scheduleForm.id, {
          groupId: scheduleForm.groupId,
          subjectId: scheduleForm.subjectId,
          dayOfWeek: scheduleForm.dayOfWeek,
          lessonOrder: scheduleForm.lessonOrder,
          lessonType: scheduleForm.lessonType,
          weekType: scheduleForm.weekType,
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime,
          room: scheduleForm.room || 'дистанційно',
          teacher: scheduleForm.teacher || null,
        });

        if (res.success && res.schedule) {
          const updated = res.schedule;
          const subj = subjects.find((s) => s.id === scheduleForm.subjectId);
          setSchedules((prev) =>
            prev.map((item) =>
              item.id === scheduleForm.id
                ? {
                    ...item,
                    subjectId: updated.subjectId,
                    dayOfWeek: updated.dayOfWeek,
                    lessonOrder: updated.lessonOrder,
                    lessonType: updated.lessonType as 'LECTURE' | 'PRACTICE',
                    weekType: updated.weekType as 'ALL' | 'EVEN' | 'ODD',
                    startTime: updated.startTime,
                    endTime: updated.endTime,
                    room: updated.room,
                    teacher: updated.teacher,
                    subject: subj ? { id: subj.id, name: subj.name } : item.subject,
                  }
                : item
            )
          );
          showFeedback('success', 'Пару оновлено в розкладі');
          setIsScheduleModalOpen(false);
          router.refresh();
        } else {
          showFeedback('error', res.error || 'Помилка оновлення пари');
        }
      } else {
        // Create
        const res = await createScheduleItemAction({
          groupId: scheduleForm.groupId,
          subjectId: scheduleForm.subjectId,
          dayOfWeek: scheduleForm.dayOfWeek,
          lessonOrder: scheduleForm.lessonOrder,
          lessonType: scheduleForm.lessonType,
          weekType: scheduleForm.weekType,
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime,
          room: scheduleForm.room || 'дистанційно',
          teacher: scheduleForm.teacher || null,
        });

        if (res.success && res.schedule) {
          const created = res.schedule;
          const subj = subjects.find((s) => s.id === scheduleForm.subjectId);
          const fullSchedule: AdminSchedule = {
            id: created.id,
            groupId: created.groupId,
            subjectId: created.subjectId,
            dayOfWeek: created.dayOfWeek,
            lessonOrder: created.lessonOrder,
            lessonType: created.lessonType as 'LECTURE' | 'PRACTICE',
            startTime: created.startTime,
            endTime: created.endTime,
            weekType: created.weekType as 'ALL' | 'EVEN' | 'ODD',
            room: created.room,
            teacher: created.teacher,
            subject: subj
              ? {
                  id: subj.id,
                  name: subj.name,
                  controlType: subj.controlType,
                  lecturer: subj.lecturer,
                  practitioner: subj.practitioner,
                }
              : { id: created.subjectId, name: 'Предмет' },
          };
          setSchedules((prev) => [...prev, fullSchedule]);
          showFeedback('success', 'Пару додано до розкладу');
          setIsScheduleModalOpen(false);
          router.refresh();
        } else {
          showFeedback('error', res.error || 'Помилка додавання пари');
        }
      }
    });
  };

  // Delete schedule item
  const handleDeleteScheduleItem = (itemId: string) => {
    if (!confirm('Видалити цю пару з розкладу?')) return;

    startScheduleTransition(async () => {
      const res = await deleteScheduleLessonAction(itemId);
      if (res.success) {
        setSchedules((prev) => prev.filter((item) => item.id !== itemId));
        if (scheduleForm.id === itemId) setIsScheduleModalOpen(false);
        showFeedback('success', 'Пару видалено з розкладу');
        router.refresh();
      } else {
        showFeedback('error', res.error || 'Помилка видалення пари');
      }
    });
  };

  // Filtered schedules for currently viewed group, day, and parity
  const currentGroupSchedules = schedules.filter((s) => s.groupId === selectedGroupId);
  const activeDaySchedules = currentGroupSchedules.filter(
    (s) =>
      s.dayOfWeek === scheduleDay &&
      (scheduleWeekType === 'ALL' || s.weekType === 'ALL' || s.weekType === scheduleWeekType)
  );

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl p-4 shadow-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span className="text-sm font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Top Admin Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 p-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Конструктор розкладу</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'subjects'
                ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Дисципліни</span>
            <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.2 text-[10px] font-semibold">
              {subjects.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'groups'
                ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Групи</span>
            <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.2 text-[10px] font-semibold">
              {groups.length}
            </span>
          </button>
        </div>

        {/* Global Group Selector for active context */}
        {groups.length > 0 && activeTab !== 'groups' && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Група:
            </span>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g._count.users} студ., {g._count.subjects} предм.)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* =====================================================================
          TAB 1: GROUPS MANAGEMENT
          ===================================================================== */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Академічні групи</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Створюйте групи для студентів і закріплюйте за ними дисципліни
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateGroup}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Створити групу</span>
            </button>
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <div
                key={g.id}
                className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs hover:border-purple-300 dark:hover:border-purple-800 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {g.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditGroup(g)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Редагувати назву"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(g)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Видалити групу"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-zinc-100 dark:border-zinc-800/80 text-center mb-4">
                    <div>
                      <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {g._count.users}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">студентів</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {g._count.subjects}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">предметів</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {g._count.schedules}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">пар у розкладі</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGroupId(g.id);
                      setActiveTab('subjects');
                    }}
                    className="flex-1 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Дисципліни
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGroupId(g.id);
                      setActiveTab('schedule');
                    }}
                    className="flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Розклад
                  </button>
                </div>
              </div>
            ))}

            {groups.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 text-center">
                <Users className="mx-auto w-8 h-8 text-zinc-400 mb-2" />
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  Ще не створено жодної групи
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateGroup}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Створити першу групу</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: SUBJECTS / DISCIPLINES MANAGEMENT
          ===================================================================== */}
      {activeTab === 'subjects' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Дисципліни</span>
                {selectedGroupId && (
                  <span className="rounded-md bg-purple-50 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 px-2 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                    {groups.find((g) => g.id === selectedGroupId)?.name}
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Налаштуйте тип контролю (Іспит/Залік) та викладачів лекцій і практик
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenCreateSubject(selectedGroupId)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Додати дисципліну</span>
            </button>
          </div>

          {/* Subjects Table */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th className="px-5 py-3.5">Назва дисципліни</th>
                    <th className="px-4 py-3.5">Група</th>
                    <th className="px-4 py-3.5">Контроль</th>
                    <th className="px-4 py-3.5">Викладач лекцій</th>
                    <th className="px-4 py-3.5">Викладач практик</th>
                    <th className="px-4 py-3.5 text-right">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                  {subjects
                    .filter((s) => !selectedGroupId || s.groupId === selectedGroupId)
                    .map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {s.name}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-block rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            {s.group?.name || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {s.controlType === 'EXAM' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                              <Award className="w-3 h-3" />
                              <span>Іспит</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                              <GraduationCap className="w-3 h-3" />
                              <span>Залік</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs text-zinc-700 dark:text-zinc-300">
                          {s.lecturer ? (
                            <span className="font-semibold">{s.lecturer}</span>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-500 italic">
                              Не призначено
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs text-zinc-700 dark:text-zinc-300">
                          {s.practitioner ? (
                            <span className="font-semibold">{s.practitioner}</span>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-500 italic">
                              Не призначено
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSubject(s)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Редагувати дисципліну"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubject(s)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Видалити дисципліну"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {subjects.filter((s) => !selectedGroupId || s.groupId === selectedGroupId)
                    .length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                        У цій групі ще немає дисциплін.{' '}
                        <button
                          type="button"
                          onClick={() => handleOpenCreateSubject(selectedGroupId)}
                          className="font-bold text-purple-600 hover:underline cursor-pointer"
                        >
                          Додати першу дисципліну
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: SCHEDULE BUILDER (CONSTRUCTOR)
          ===================================================================== */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Controls: Day Selector & Parity Toggle */}
          <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span>Сітка розкладу (1–8 пар)</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Виберіть день тижня та заповніть пари. При перемиканні Лекція/Практика викладач підтягується автоматично.
                </p>
              </div>

              {/* Parity Filter */}
              <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setScheduleWeekType('ALL')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    scheduleWeekType === 'ALL'
                      ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Усі тижні
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleWeekType('ODD')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    scheduleWeekType === 'ODD'
                      ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Непарний (I)
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleWeekType('EVEN')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    scheduleWeekType === 'EVEN'
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Парний (II)
                </button>
              </div>
            </div>

            {/* Days of week selector tabs */}
            <div className="grid grid-cols-5 gap-2">
              {DAYS.map((d) => {
                const count = currentGroupSchedules.filter(
                  (item) =>
                    item.dayOfWeek === d.id &&
                    (scheduleWeekType === 'ALL' ||
                      item.weekType === 'ALL' ||
                      item.weekType === scheduleWeekType)
                ).length;

                const isSelected = scheduleDay === d.id;

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setScheduleDay(d.id)}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 sm:p-3 text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold">{d.short}</span>
                    <span
                      className={`text-[10px] mt-0.5 font-semibold ${
                        isSelected
                          ? 'text-purple-100'
                          : count > 0
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {count > 0 ? `${count} пар` : 'порожньо'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1–8 Bell Schedule Slots Grid */}
          <div className="space-y-3">
            {LESSON_ORDERS.map((order) => {
              const bell = BELL_SCHEDULE[order];
              const slotLessons = activeDaySchedules.filter((s) => s.lessonOrder === order);

              return (
                <div
                  key={order}
                  className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Slot Order badge and standard time */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 font-bold text-sm text-purple-700 dark:text-purple-300">
                        {order}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Пара №{order}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            {bell.startTime} – {bell.endTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Add to this slot button if slot is empty or to add alternating week */}
                    <div>
                      <button
                        type="button"
                        onClick={() => handleOpenAddScheduleSlot(order)}
                        className="inline-flex items-center gap-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{slotLessons.length === 0 ? 'Заповнити пару' : 'Додати ще пару'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Render Scheduled Lessons for this Slot */}
                  {slotLessons.length > 0 ? (
                    <div className="mt-3.5 space-y-2.5">
                      {slotLessons.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                {item.subject.name}
                              </span>

                              {/* Lesson Type Badge */}
                              <span
                                className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                  item.lessonType === 'LECTURE'
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                }`}
                              >
                                {item.lessonType === 'LECTURE' ? 'Лекція' : 'Практика'}
                              </span>

                              {/* Week Type Badge */}
                              <span className="rounded-md bg-zinc-200/80 dark:bg-zinc-700 px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                                {item.weekType === 'ALL'
                                  ? 'Щотижня'
                                  : item.weekType === 'ODD'
                                  ? 'Непарний (I)'
                                  : 'Парний (II)'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                              {item.room && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>{item.room}</span>
                                </span>
                              )}
                              {item.teacher && (
                                <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                                  <User className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>{item.teacher}</span>
                                </span>
                              )}
                              <span className="text-[11px] text-zinc-400">
                                {item.startTime} – {item.endTime}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSchedule(item)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                              title="Редагувати пару"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteScheduleItem(item.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Видалити пару"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-zinc-400 dark:text-zinc-500 italic">
                      Вільна пара
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE / EDIT GROUP
          ===================================================================== */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingGroup?.id ? 'Редагувати групу' : 'Створити академічну групу'}
              </h3>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Назва групи *
                </label>
                <input
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  placeholder="Наприклад: КН-21 або ПІ-32"
                  autoFocus
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3.5 py-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleSaveGroup}
                disabled={isGroupPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isGroupPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Зберегти</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE / EDIT SUBJECT
          ===================================================================== */}
      {isSubjectModalOpen && editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingSubject.id ? 'Редагувати дисципліну' : 'Додати нову дисципліну'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Group Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Академічна група *
                </label>
                <select
                  value={editingSubject.groupId}
                  onChange={(e) =>
                    setEditingSubject((prev) => (prev ? { ...prev, groupId: e.target.value } : null))
                  }
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3.5 py-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Назва дисципліни *
                </label>
                <input
                  type="text"
                  value={editingSubject.name}
                  onChange={(e) =>
                    setEditingSubject((prev) => (prev ? { ...prev, name: e.target.value } : null))
                  }
                  placeholder="Наприклад: Вища математика, Алгоритми"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3.5 py-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Control Type (Exam / Credit) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Форма семестрового контролю
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingSubject((prev) =>
                        prev ? { ...prev, controlType: 'EXAM' } : null
                      )
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold transition-all cursor-pointer ${
                      editingSubject.controlType === 'EXAM'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Іспит</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingSubject((prev) =>
                        prev ? { ...prev, controlType: 'CREDIT' } : null
                      )
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold transition-all cursor-pointer ${
                      editingSubject.controlType === 'CREDIT'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Залік</span>
                  </button>
                </div>
              </div>

              {/* Lecturer */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Викладач лекцій (ПІБ або посада)
                </label>
                <input
                  type="text"
                  value={editingSubject.lecturer}
                  onChange={(e) =>
                    setEditingSubject((prev) =>
                      prev ? { ...prev, lecturer: e.target.value } : null
                    )
                  }
                  placeholder="Наприклад: проф. Петренко В. І."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Practitioner */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Викладач практик / лабораторних
                </label>
                <input
                  type="text"
                  value={editingSubject.practitioner}
                  onChange={(e) =>
                    setEditingSubject((prev) =>
                      prev ? { ...prev, practitioner: e.target.value } : null
                    )
                  }
                  placeholder="Наприклад: асист. Мельник О. В."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleSaveSubject}
                disabled={isSubjectPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubjectPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Зберегти</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADD / EDIT SCHEDULE ITEM IN CONSTRUCTOR
          ===================================================================== */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {scheduleForm.id ? 'Редагувати пару в розкладі' : 'Додати пару в розклад'}
              </h3>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Day & Lesson Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    День тижня
                  </label>
                  <select
                    value={scheduleForm.dayOfWeek}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({ ...prev, dayOfWeek: Number(e.target.value) }))
                    }
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    {DAYS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Номер пари (1–8)
                  </label>
                  <select
                    value={scheduleForm.lessonOrder}
                    onChange={(e) => handleSelectOrder(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    {LESSON_ORDERS.map((num) => (
                      <option key={num} value={num}>
                        Пара №{num} ({BELL_SCHEDULE[num].startTime}–{BELL_SCHEDULE[num].endTime})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Time & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Початок
                  </label>
                  <input
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Кінець
                  </label>
                  <input
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({ ...prev, endTime: e.target.value }))
                    }
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                  />
                </div>
              </div>

              {/* Subject Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Дисципліна *
                </label>
                {activeGroupSubjects.length > 0 ? (
                  <select
                    value={scheduleForm.subjectId}
                    onChange={(e) => handleSelectSubject(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3.5 py-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="" disabled>
                      Оберіть дисципліну...
                    </option>
                    {activeGroupSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.controlType === 'EXAM' ? 'Іспит' : 'Залік'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
                    У цій групі ще немає дисциплін.{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsScheduleModalOpen(false);
                        handleOpenCreateSubject(selectedGroupId);
                      }}
                      className="font-bold underline cursor-pointer"
                    >
                      Створити дисципліну
                    </button>
                  </div>
                )}
              </div>

              {/* Lesson Type Toggle (Lecture vs Practice) with Auto Teacher Detection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Тип заняття (автопідтягування викладача)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleLessonType('LECTURE')}
                    className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold transition-all cursor-pointer ${
                      scheduleForm.lessonType === 'LECTURE'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Лекція</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleLessonType('PRACTICE')}
                    className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold transition-all cursor-pointer ${
                      scheduleForm.lessonType === 'PRACTICE'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Практика / Лаб.</span>
                  </button>
                </div>
              </div>

              {/* Teacher (Auto-filled on toggle, but editable) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Викладач
                  </label>
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                    {scheduleForm.lessonType === 'LECTURE'
                      ? 'лектор дисципліни'
                      : 'практик дисципліни'}
                  </span>
                </div>
                <input
                  type="text"
                  value={scheduleForm.teacher}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({ ...prev, teacher: e.target.value }))
                  }
                  placeholder="Автоматично або введіть вручну..."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>

              {/* Room & Auditory */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Аудиторія / Посилання
                </label>
                <input
                  type="text"
                  value={scheduleForm.room}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({ ...prev, room: e.target.value }))
                  }
                  placeholder="Наприклад: ауд. 204, комп. клас 12, Zoom"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Week Type Parity */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Періодичність пари
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleForm((prev) => ({ ...prev, weekType: 'ALL' }))}
                    className={`rounded-xl py-2 px-1 text-xs font-bold text-center transition-all cursor-pointer ${
                      scheduleForm.weekType === 'ALL'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    Щотижня
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleForm((prev) => ({ ...prev, weekType: 'ODD' }))}
                    className={`rounded-xl py-2 px-1 text-xs font-bold text-center transition-all cursor-pointer ${
                      scheduleForm.weekType === 'ODD'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    Непарний (I)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleForm((prev) => ({ ...prev, weekType: 'EVEN' }))}
                    className={`rounded-xl py-2 px-1 text-xs font-bold text-center transition-all cursor-pointer ${
                      scheduleForm.weekType === 'EVEN'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    Парний (II)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              {scheduleForm.id ? (
                <button
                  type="button"
                  onClick={() => handleDeleteScheduleItem(scheduleForm.id!)}
                  className="rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  Видалити пару
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  onClick={handleSaveScheduleItem}
                  disabled={isSchedulePending || activeGroupSubjects.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSchedulePending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Зберегти</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
