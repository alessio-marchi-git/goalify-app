'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

export interface Task {
    id: string;
    user_id: string;
    name: string;
    date: string;
    is_completed: boolean;
    note?: string;
    order: number;
    color: string;
    is_enabled: boolean;
    task_type: 'default' | 'adhoc';
    completed_at?: string;
}

export interface DefaultTask {
    id: string;
    user_id: string;
    name: string;
    order: number;
    color: string;
    is_enabled: boolean;
}

interface TaskStore {
    tasks: Task[];
    defaultTasks: DefaultTask[];
    loading: boolean;
    initialized: boolean;

    // Initialize
    initialize: () => Promise<void>;

    // Task actions
    initializeDailyTasks: () => Promise<void>;
    completeTask: (id: string, note?: string) => Promise<void>;
    getCurrentTask: () => Task | null;
    isAllCompleted: () => boolean;
    getTodayTasks: () => Task[];
    getTasksByDate: (date: string) => Task[];

    // Default task management
    addDefaultTask: (name: string, color: string) => Promise<void>;
    removeDefaultTask: (id: string) => Promise<void>;
    updateDefaultTask: (id: string, updates: Partial<DefaultTask>) => Promise<void>;
    reorderDefaultTasks: (tasks: DefaultTask[]) => Promise<void>;

    // Ad-hoc tasks
    addAdhocTask: (date: string, name: string, color: string, order: number) => Promise<void>;

    // History
    getCompletedTasks: (startDate: string, endDate: string) => Task[];
}

const TASK_COLORS = [
    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#6366f1',
];

const INITIAL_DEFAULTS = [
    { name: 'Ore Sonno', order: 1, color: '#3b82f6' },
    { name: 'Peso', order: 2, color: '#22c55e' },
    { name: 'Creme Corpo', order: 3, color: '#f59e0b' },
    { name: 'Mandare CV', order: 4, color: '#ef4444' },
    { name: 'Corsa', order: 5, color: '#8b5cf6' },
    { name: 'Studio', order: 6, color: '#06b6d4' },
    { name: 'KCAL', order: 7, color: '#ec4899' },
    { name: "Bicchieri d'acqua", order: 8, color: '#14b8a6' },
    { name: 'Ottimizzazione Workflow', order: 9, color: '#6366f1' },
];

const getToday = () => format(new Date(), 'yyyy-MM-dd');

export const useSupabaseTaskStore = create<TaskStore>((set, get) => ({
    tasks: [],
    defaultTasks: [],
    loading: false,
    initialized: false,

    initialize: async () => {
        if (get().initialized) return;

        set({ loading: true });
        const supabase = createClient();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                set({ loading: false });
                return;
            }

            // Fetch default tasks
            let { data: defaultTasks } = await supabase
                .from('default_tasks')
                .select('*')
                .order('order');

            // If no default tasks, create initial ones
            if (!defaultTasks || defaultTasks.length === 0) {
                const { data: newDefaults } = await supabase
                    .from('default_tasks')
                    .insert(
                        INITIAL_DEFAULTS.map((t) => ({
                            user_id: user.id,
                            name: t.name,
                            order: t.order,
                            color: t.color,
                            is_enabled: true,
                        }))
                    )
                    .select();
                defaultTasks = newDefaults;
            }

            // Fetch all tasks
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .order('date', { ascending: false });

            set({
                defaultTasks: defaultTasks || [],
                tasks: tasks || [],
                loading: false,
                initialized: true,
            });

            // Initialize today's tasks
            await get().initializeDailyTasks();
        } catch (error) {
            console.error('Error initializing store:', error);
            set({ loading: false });
        }
    },

    initializeDailyTasks: async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = getToday();
        const existingTodayTasks = get().tasks.filter((t) => t.date === today);

        if (existingTodayTasks.length === 0) {
            const enabledDefaults = get().defaultTasks.filter((dt) => dt.is_enabled);

            const newTasks = enabledDefaults.map((dt) => ({
                user_id: user.id,
                name: dt.name,
                date: today,
                is_completed: false,
                order: dt.order,
                color: dt.color,
                is_enabled: true,
                task_type: 'default' as const,
            }));

            if (newTasks.length > 0) {
                const { data } = await supabase
                    .from('tasks')
                    .insert(newTasks)
                    .select();

                if (data) {
                    set((state) => ({ tasks: [...state.tasks, ...data] }));
                }
            }
        }
    },

    completeTask: async (id: string, note?: string) => {
        const supabase = createClient();
        const completedAt = new Date().toISOString();

        await supabase
            .from('tasks')
            .update({ is_completed: true, note, completed_at: completedAt })
            .eq('id', id);

        set((state) => ({
            tasks: state.tasks.map((t) =>
                t.id === id ? { ...t, is_completed: true, note, completed_at: completedAt } : t
            ),
        }));
    },

    getCurrentTask: () => {
        const today = getToday();
        const todayTasks = get()
            .tasks.filter((t) => t.date === today && !t.is_completed && t.is_enabled)
            .sort((a, b) => a.order - b.order);
        return todayTasks.length > 0 ? todayTasks[0] : null;
    },

    isAllCompleted: () => {
        const today = getToday();
        const todayTasks = get().tasks.filter((t) => t.date === today && t.is_enabled);
        return todayTasks.length > 0 && todayTasks.every((t) => t.is_completed);
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

    addDefaultTask: async (name: string, color: string) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const maxOrder = Math.max(...get().defaultTasks.map((t) => t.order), 0);

        const { data } = await supabase
            .from('default_tasks')
            .insert({
                user_id: user.id,
                name,
                order: maxOrder + 1,
                color,
                is_enabled: true,
            })
            .select()
            .single();

        if (data) {
            set((state) => ({ defaultTasks: [...state.defaultTasks, data] }));
        }
    },

    removeDefaultTask: async (id: string) => {
        const supabase = createClient();
        await supabase.from('default_tasks').delete().eq('id', id);
        set((state) => ({
            defaultTasks: state.defaultTasks.filter((t) => t.id !== id),
        }));
    },

    updateDefaultTask: async (id: string, updates: Partial<DefaultTask>) => {
        const supabase = createClient();
        await supabase.from('default_tasks').update(updates).eq('id', id);
        set((state) => ({
            defaultTasks: state.defaultTasks.map((t) =>
                t.id === id ? { ...t, ...updates } : t
            ),
        }));
    },

    reorderDefaultTasks: async (tasks: DefaultTask[]) => {
        const supabase = createClient();
        const updates = tasks.map((t, i) => ({ ...t, order: i + 1 }));

        for (const task of updates) {
            await supabase
                .from('default_tasks')
                .update({ order: task.order })
                .eq('id', task.id);
        }

        set({ defaultTasks: updates });
    },

    addAdhocTask: async (date: string, name: string, color: string, order: number) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('tasks')
            .insert({
                user_id: user.id,
                name,
                date,
                is_completed: false,
                order,
                color,
                is_enabled: true,
                task_type: 'adhoc',
            })
            .select()
            .single();

        if (data) {
            set((state) => ({ tasks: [...state.tasks, data] }));
        }
    },

    getCompletedTasks: (startDate: string, endDate: string) => {
        return get()
            .tasks.filter(
                (t) => t.is_completed && t.date >= startDate && t.date <= endDate
            )
            .sort((a, b) => (b.completed_at || b.date).localeCompare(a.completed_at || a.date));
    },
}));
