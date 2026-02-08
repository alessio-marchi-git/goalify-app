'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { Task, DefaultTask, INITIAL_DEFAULT_TASKS } from '@/types/task';

interface TaskStore {
    tasks: Task[];
    defaultTasks: DefaultTask[];

    // Task actions
    initializeDailyTasks: () => void;
    completeTask: (id: string, note?: string) => void;
    getCurrentTask: () => Task | null;
    isAllCompleted: () => boolean;
    getTodayTasks: () => Task[];
    getTasksByDate: (date: string) => Task[];

    // Default task management
    addDefaultTask: (name: string, color: string) => void;
    removeDefaultTask: (id: string) => void;
    updateDefaultTask: (id: string, updates: Partial<DefaultTask>) => void;
    reorderDefaultTasks: (tasks: DefaultTask[]) => void;

    // Ad-hoc tasks
    addAdhocTask: (date: string, name: string, color: string, order: number) => void;

    // History
    getCompletedTasks: (startDate: string, endDate: string) => Task[];
    getCompletedTasksByName: (name: string, startDate: string, endDate: string) => Task[];
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const getToday = () => format(new Date(), 'yyyy-MM-dd');

export const useTaskStore = create<TaskStore>()(
    persist(
        (set, get) => ({
            tasks: [],
            defaultTasks: INITIAL_DEFAULT_TASKS,

            initializeDailyTasks: () => {
                const today = getToday();
                const existingTodayTasks = get().tasks.filter((t) => t.date === today);

                if (existingTodayTasks.length === 0) {
                    const enabledDefaults = get().defaultTasks.filter((dt) => dt.isEnabled);
                    const newTasks: Task[] = enabledDefaults.map((dt) => ({
                        id: generateId(),
                        name: dt.name,
                        date: today,
                        isCompleted: false,
                        order: dt.order,
                        color: dt.color,
                        isEnabled: true,
                        taskType: 'default' as const,
                    }));

                    set((state) => ({
                        tasks: [...state.tasks, ...newTasks],
                    }));
                }
            },

            completeTask: (id: string, note?: string) => {
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === id
                            ? {
                                ...t,
                                isCompleted: true,
                                note: note || t.note,
                                completedAt: new Date().toISOString(),
                            }
                            : t
                    ),
                }));
            },

            getCurrentTask: () => {
                const today = getToday();
                const todayTasks = get()
                    .tasks.filter((t) => t.date === today && !t.isCompleted && t.isEnabled)
                    .sort((a, b) => a.order - b.order);

                return todayTasks.length > 0 ? todayTasks[0] : null;
            },

            isAllCompleted: () => {
                const today = getToday();
                const todayTasks = get().tasks.filter((t) => t.date === today && t.isEnabled);
                return todayTasks.length > 0 && todayTasks.every((t) => t.isCompleted);
            },

            getTodayTasks: () => {
                const today = getToday();
                return get()
                    .tasks.filter((t) => t.date === today)
                    .sort((a, b) => a.order - b.order);
            },

            getTasksByDate: (date: string) => {
                return get()
                    .tasks.filter((t) => t.date === date)
                    .sort((a, b) => a.order - b.order);
            },

            // Default task management
            addDefaultTask: (name: string, color: string) => {
                const maxOrder = Math.max(...get().defaultTasks.map((t) => t.order), 0);
                const newTask: DefaultTask = {
                    id: generateId(),
                    name,
                    order: maxOrder + 1,
                    color,
                    isEnabled: true,
                };
                set((state) => ({
                    defaultTasks: [...state.defaultTasks, newTask],
                }));
            },

            removeDefaultTask: (id: string) => {
                set((state) => ({
                    defaultTasks: state.defaultTasks.filter((t) => t.id !== id),
                }));
            },

            updateDefaultTask: (id: string, updates: Partial<DefaultTask>) => {
                set((state) => ({
                    defaultTasks: state.defaultTasks.map((t) =>
                        t.id === id ? { ...t, ...updates } : t
                    ),
                }));
            },

            reorderDefaultTasks: (tasks: DefaultTask[]) => {
                set({ defaultTasks: tasks.map((t, i) => ({ ...t, order: i + 1 })) });
            },

            // Ad-hoc tasks
            addAdhocTask: (date: string, name: string, color: string, order: number) => {
                const newTask: Task = {
                    id: generateId(),
                    name,
                    date,
                    isCompleted: false,
                    order,
                    color,
                    isEnabled: true,
                    taskType: 'adhoc',
                };
                set((state) => ({
                    tasks: [...state.tasks, newTask],
                }));
            },

            // History
            getCompletedTasks: (startDate: string, endDate: string) => {
                return get()
                    .tasks.filter(
                        (t) =>
                            t.isCompleted &&
                            t.date >= startDate &&
                            t.date <= endDate
                    )
                    .sort((a, b) => (b.completedAt || b.date).localeCompare(a.completedAt || a.date));
            },

            getCompletedTasksByName: (name: string, startDate: string, endDate: string) => {
                return get()
                    .tasks.filter(
                        (t) =>
                            t.isCompleted &&
                            t.name === name &&
                            t.date >= startDate &&
                            t.date <= endDate
                    )
                    .sort((a, b) => (b.completedAt || b.date).localeCompare(a.completedAt || a.date));
            },
        }),
        {
            name: 'goalify-tasks',
        }
    )
);
