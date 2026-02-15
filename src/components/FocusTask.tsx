'use client';

import { useState, useEffect } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSupabaseTaskStore } from '@/store/supabaseTaskStore';
import { Confetti } from './Confetti';

export function FocusTask() {
    const [note, setNote] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);
    const router = useRouter();

    const {
        loading,
        initialized,
        getCurrentTask,
        completeTask,
        isAllCompleted,
        getTodayTasks,
        error,
        initialize,
    } = useSupabaseTaskStore();

    const currentTask = getCurrentTask();
    const allDone = isAllCompleted();
    const todayTasks = getTodayTasks();
    const completedCount = todayTasks.filter((t) => t.is_completed).length;
    const totalCount = todayTasks.length;

    // Redirect to login if authentication error
    useEffect(() => {
        if (error && error.includes('non autenticato')) {
            router.push('/login');
        }
    }, [error, router]);

    const handleComplete = async () => {
        if (currentTask) {
            const success = await completeTask(currentTask.id, note);
            setNote('');

            // Check if this was the last task (only on success)
            if (success && completedCount + 1 === totalCount) {
                setShowConfetti(true);
            }
        }
    };

    // Error state (check before loading so errors are visible)
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
                <div className="space-y-4 max-w-md">
                    <div className="text-red-400 text-lg">{error}</div>
                    <p className="text-gray-500 text-sm">
                        Se il problema persiste, prova a disconnetterti e ricollegarti.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => initialize()}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors"
                        >
                            Riprova
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                        >
                            Ricarica Pagina
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (!initialized || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-pulse">
                    <Sparkles className="w-12 h-12 text-purple-400" />
                </div>
            </div>
        );
    }

    // All tasks completed view
    if (allDone && totalCount > 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
                <Confetti trigger={showConfetti} />
                <div className="space-y-6">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Check className="w-12 h-12 text-white" strokeWidth={3} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                        Sei un Grande!
                    </h1>
                    <p className="text-xl text-gray-400 max-w-md">
                        Continua così! Hai completato tutti i task di oggi. 🎉
                    </p>
                    <div className="pt-4">
                        <span
                            className="px-4 py-2 bg-white/5 rounded-full text-sm text-gray-400"
                            aria-live="polite"
                        >
                            {completedCount}/{totalCount} completati
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // No tasks yet
    if (!currentTask) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
                <Sparkles className="w-16 h-16 text-purple-400 mb-6" />
                <h1 className="text-3xl font-bold text-gray-200 mb-2">Nessun Task per Oggi</h1>
                <p className="text-gray-500">I task verranno caricati automaticamente</p>
            </div>
        );
    }

    // Current task view
    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
            <Confetti trigger={showConfetti} />

            {/* Progress indicator */}
            <div className="fixed top-20 right-6">
                <span
                    className="px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full text-sm text-gray-400 border border-white/10"
                    aria-live="polite"
                    aria-label={`Progresso: ${completedCount} completati su ${totalCount}`}
                >
                    {completedCount}/{totalCount}
                </span>
            </div>

            {/* Main content */}
            <div className="w-full max-w-lg space-y-8">
                {/* Task order badge */}
                <div className="flex justify-center">
                    <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${currentTask.color}30`, color: currentTask.color }}
                    >
                        Task #{currentTask.order}
                    </span>
                </div>

                {/* Task name */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent leading-tight">
                    {currentTask.name}
                </h1>

                {/* Note textarea */}
                <div className="space-y-2">
                    <label htmlFor="note" className="block text-sm text-gray-500 ml-1">
                        Note (opzionale)
                    </label>
                    <textarea
                        id="note"
                        name="note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Aggiungi una nota…"
                        rows={3}
                        maxLength={1000}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none transition-all"
                    />
                    {note.length > 900 && (
                        <p className="text-xs text-gray-500">{1000 - note.length} caratteri rimanenti</p>
                    )}
                </div>

                {/* Complete button */}
                <button
                    onClick={handleComplete}
                    className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-2xl text-white font-semibold text-lg shadow-lg shadow-purple-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                >
                    <Check className="w-6 h-6" />
                    Completa
                </button>
            </div>
        </div>
    );
}
