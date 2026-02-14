'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { format, subDays } from 'date-fns';
import { TASK_COLORS, INITIAL_DEFAULTS, MAX_TASK_NAME_LENGTH, MAX_NOTE_LENGTH } from '@/types/task';

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
    error: string | null;

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
    loadHistoricalTasks: (startDate: string, endDate: string) => Promise<void>;
}

// Singleton Supabase client
let _supabase: ReturnType<typeof createClient> | null = null;
const getSupabase = () => {
    if (!_supabase) {
        _supabase = createClient();
    }
    return _supabase;
};

const getToday = () => format(new Date(), 'yyyy-MM-dd');

// Validation helpers
const validateTaskName = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Il nome del task non può essere vuoto');
    if (trimmed.length > MAX_TASK_NAME_LENGTH) {
        throw new Error(`Il nome del task non può superare ${MAX_TASK_NAME_LENGTH} caratteri`);
    }
    return trimmed;
};

const validateNote = (note?: string): string | undefined => {
    if (!note) return undefined;
    const trimmed = note.trim();
    if (trimmed.length > MAX_NOTE_LENGTH) {
        throw new Error(`La nota non può superare ${MAX_NOTE_LENGTH} caratteri`);
    }
    return trimmed || undefined;
};

const validateColor = (color: string): void => {
    if (!TASK_COLORS.includes(color)) {
        throw new Error('Colore non valido');
    }
};

export const useSupabaseTaskStore = create<TaskStore>((set, get) => ({
    tasks: [],
    defaultTasks: [],
    loading: false,
    initialized: false,
    error: null,

    initialize: async () => {
        if (get().initialized) return;

        set({ loading: true, error: null });
        const supabase = getSupabase();

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError) throw authError;
            if (!user) {
                set({ loading: false, error: 'Utente non autenticato' });
                return;
            }

            // Fetch default tasks
            const { data: defaultTasks, error: defaultError } = await supabase
                .from('default_tasks')
                .select('*')
                .order('order');

            if (defaultError) throw defaultError;

            // If no default tasks, create initial ones
            if (!defaultTasks || defaultTasks.length === 0) {
                const { data: newDefaults, error: insertError } = await supabase
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

                if (insertError) throw insertError;
                set({ defaultTasks: newDefaults || [] });
            } else {
                set({ defaultTasks });
            }

            // Fetch only recent tasks (last 30 days + today + future)
            const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
            const { data: tasks, error: tasksError } = await supabase
                .from('tasks')
                .select('*')
                .gte('date', thirtyDaysAgo)
                .order('date', { ascending: false });

            if (tasksError) throw tasksError;

            set({
                tasks: tasks || [],
                loading: false,
                initialized: true,
            });

            // Initialize today's tasks
            await get().initializeDailyTasks();
        } catch (error) {
            console.error('Error initializing store:', error);
            set({
                loading: false,
                error: error instanceof Error ? error.message : 'Errore durante l\'inizializzazione'
            });
        }
    },

    initializeDailyTasks: async () => {
        const supabase = getSupabase();
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
                // Use upsert to handle race conditions (multiple tabs)
                const { data, error } = await supabase
                    .from('tasks')
                    .upsert(newTasks, {
                        onConflict: 'user_id,name,date',
                        ignoreDuplicates: true
                    })
                    .select();

                if (error) {
                    console.error('Error creating daily tasks:', error);
                    set({ error: 'Errore durante la creazione dei task giornalieri' });
                    return;
                }

                if (data) {
                    set((state) => ({ tasks: [...state.tasks, ...data] }));
                }
            }
        }
    },

    completeTask: async (id: string, note?: string) => {
        const supabase = getSupabase();
        const completedAt = new Date().toISOString();

        try {
            const validatedNote = validateNote(note);

            // Optimistic update
            const previousTasks = get().tasks;
            set((state) => ({
                tasks: state.tasks.map((t) =>
                    t.id === id ? { ...t, is_completed: true, note: validatedNote, completed_at: completedAt } : t
                ),
            }));

            const { error } = await supabase
                .from('tasks')
                .update({ is_completed: true, note: validatedNote, completed_at: completedAt })
                .eq('id', id);

            if (error) {
                // Rollback on error
                set({ tasks: previousTasks, error: 'Errore durante il completamento del task' });
                throw error;
            }
        } catch (error) {
            console.error('Error completing task:', error);
        }
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
        const supabase = getSupabase();

        try {
            const validatedName = validateTaskName(name);
            validateColor(color);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Utente non autenticato');

            const maxOrder = Math.max(...get().defaultTasks.map((t) => t.order), 0);

            const { data, error } = await supabase
                .from('default_tasks')
                .insert({
                    user_id: user.id,
                    name: validatedName,
                    order: maxOrder + 1,
                    color,
                    is_enabled: true,
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                set((state) => ({ defaultTasks: [...state.defaultTasks, data] }));
            }
        } catch (error) {
            console.error('Error adding default task:', error);
            set({ error: error instanceof Error ? error.message : 'Errore durante l\'aggiunta del task' });
        }
    },

    removeDefaultTask: async (id: string) => {
        const supabase = getSupabase();

        try {
            // Optimistic update
            const previousDefaultTasks = get().defaultTasks;
            set((state) => ({
                defaultTasks: state.defaultTasks.filter((t) => t.id !== id),
            }));

            const { error } = await supabase.from('default_tasks').delete().eq('id', id);

            if (error) {
                // Rollback on error
                set({ defaultTasks: previousDefaultTasks, error: 'Errore durante l\'eliminazione del task' });
                throw error;
            }
        } catch (error) {
            console.error('Error removing default task:', error);
        }
    },

    updateDefaultTask: async (id: string, updates: Partial<DefaultTask>) => {
        const supabase = getSupabase();

        try {
            // Validate if name or color is being updated
            if (updates.name) {
                updates.name = validateTaskName(updates.name);
            }
            if (updates.color) {
                validateColor(updates.color);
            }

            // Optimistic update
            const previousDefaultTasks = get().defaultTasks;
            set((state) => ({
                defaultTasks: state.defaultTasks.map((t) =>
                    t.id === id ? { ...t, ...updates } : t
                ),
            }));

            const { error } = await supabase.from('default_tasks').update(updates).eq('id', id);

            if (error) {
                // Rollback on error
                set({ defaultTasks: previousDefaultTasks, error: 'Errore durante l\'aggiornamento del task' });
                throw error;
            }
        } catch (error) {
            console.error('Error updating default task:', error);
        }
    },

    reorderDefaultTasks: async (tasks: DefaultTask[]) => {
        const supabase = getSupabase();

        try {
            const updates = tasks.map((t, i) => ({ id: t.id, order: i + 1 }));

            // Optimistic update
            const previousDefaultTasks = get().defaultTasks;
            set({ defaultTasks: tasks.map((t, i) => ({ ...t, order: i + 1 })) });

            // Batch update using a single RPC call would be ideal, but for now update in parallel
            const updatePromises = updates.map((update) =>
                supabase
                    .from('default_tasks')
                    .update({ order: update.order })
                    .eq('id', update.id)
            );

            const results = await Promise.all(updatePromises);
            const errors = results.filter((r) => r.error);

            if (errors.length > 0) {
                // Rollback on error
                set({ defaultTasks: previousDefaultTasks, error: 'Errore durante il riordino dei task' });
                throw new Error('Failed to reorder some tasks');
            }
        } catch (error) {
            console.error('Error reordering default tasks:', error);
        }
    },

    addAdhocTask: async (date: string, name: string, color: string, order: number) => {
        const supabase = getSupabase();

        try {
            const validatedName = validateTaskName(name);
            validateColor(color);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Utente non autenticato');

            const { data, error } = await supabase
                .from('tasks')
                .insert({
                    user_id: user.id,
                    name: validatedName,
                    date,
                    is_completed: false,
                    order,
                    color,
                    is_enabled: true,
                    task_type: 'adhoc',
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                set((state) => ({ tasks: [...state.tasks, data] }));
            }
        } catch (error) {
            console.error('Error adding adhoc task:', error);
            set({ error: error instanceof Error ? error.message : 'Errore durante l\'aggiunta del task' });
        }
    },

    getCompletedTasks: (startDate: string, endDate: string) => {
        return get()
            .tasks.filter(
                (t) => t.is_completed && t.date >= startDate && t.date <= endDate
            )
            .sort((a, b) => (b.completed_at || b.date).localeCompare(a.completed_at || a.date));
    },

    loadHistoricalTasks: async (startDate: string, endDate: string) => {
        const supabase = getSupabase();

        try {
            set({ loading: true, error: null });

            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .eq('is_completed', true)
                .order('completed_at', { ascending: false });

            if (error) throw error;

            if (data) {
                // Merge with existing tasks, avoiding duplicates
                set((state) => {
                    const existingIds = new Set(state.tasks.map((t) => t.id));
                    const newTasks = data.filter((t) => !existingIds.has(t.id));
                    return { tasks: [...state.tasks, ...newTasks], loading: false };
                });
            }
        } catch (error) {
            console.error('Error loading historical tasks:', error);
            set({
                loading: false,
                error: 'Errore durante il caricamento dello storico'
            });
        }
    },
}));
