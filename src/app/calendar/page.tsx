'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    addMonths,
    startOfWeek,
    endOfWeek,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronDown, Plus, X, Check } from 'lucide-react';
import { useSupabaseTaskStore, Task } from '@/store/supabaseTaskStore';
import { TASK_COLORS } from '@/types/task';
import { ColorPicker } from '@/components/ColorPicker';

export default function CalendarPage() {
    const [monthsToShow, setMonthsToShow] = useState(3);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskColor, setNewTaskColor] = useState(TASK_COLORS[0]);

    const { initialize, initialized, loading, tasks, getTasksByDate, addAdhocTask } = useSupabaseTaskStore();

    useEffect(() => {
        initialize();
    }, [initialize]);

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const months = useMemo(() => {
        const result = [];
        for (let i = 0; i < monthsToShow; i++) {
            result.push(addMonths(today, i));
        }
        return result;
    }, [monthsToShow]);

    const handleDayClick = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        setSelectedDate(dateStr);
    };

    const handleAddTask = async () => {
        if (newTaskName.trim() && selectedDate) {
            const existingTasks = getTasksByDate(selectedDate);
            const maxOrder = Math.max(...existingTasks.map((t) => t.order), 0);
            await addAdhocTask(selectedDate, newTaskName.trim(), newTaskColor, maxOrder + 1);
            setNewTaskName('');
            setNewTaskColor(TASK_COLORS[0]);
            setShowAddModal(false);
        }
    };

    const selectedDateTasks = selectedDate ? getTasksByDate(selectedDate) : [];
    const isPastDate = selectedDate ? selectedDate < todayStr : false;

    if (!initialized || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Caricamento...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4 py-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-2">Calendario</h1>
                <p className="text-gray-500 mb-8">Scorri per vedere i mesi futuri, clicca su un giorno per vedere i task</p>

                {/* Calendar Grid */}
                <div className="space-y-8">
                    {months.map((month) => (
                        <MonthCalendar
                            key={month.toISOString()}
                            month={month}
                            selectedDate={selectedDate}
                            onDayClick={handleDayClick}
                            tasks={tasks}
                            todayStr={todayStr}
                        />
                    ))}
                </div>

                {/* Load More */}
                <button
                    onClick={() => setMonthsToShow((prev) => prev + 3)}
                    className="w-full mt-8 py-4 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/30 transition-colors flex items-center justify-center gap-2"
                >
                    <ChevronDown className="w-5 h-5" />
                    Carica altri mesi
                </button>

                {/* Selected Date Panel */}
                {selectedDate && (
                    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 p-4 animate-slide-up">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        {format(new Date(selectedDate), 'd MMMM yyyy', { locale: it })}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {selectedDateTasks.length} task
                                        {isPastDate && ' (storico)'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    className="p-2 hover:bg-white/10 rounded-lg"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            {/* Task List */}
                            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                                {selectedDateTasks.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">Nessun task per questo giorno</p>
                                ) : (
                                    selectedDateTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className={`flex items-center gap-3 p-3 bg-white/5 rounded-xl ${task.is_completed ? 'opacity-60' : ''
                                                }`}
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: task.color }}
                                            />
                                            <span className={`flex-1 ${task.is_completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                                                {task.name}
                                            </span>
                                            {task.is_completed && (
                                                <Check className="w-4 h-4 text-emerald-400" />
                                            )}
                                            {task.task_type === 'adhoc' && (
                                                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                                                    Ad-hoc
                                                </span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add Task Button (only for future dates) */}
                            {!isPastDate && (
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    Aggiungi Task Ad-hoc
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Add Task Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">Nuovo Task Ad-hoc</h2>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Nome</label>
                                    <input
                                        type="text"
                                        value={newTaskName}
                                        onChange={(e) => setNewTaskName(e.target.value)}
                                        placeholder="Es. Appuntamento dottore"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Colore</label>
                                    <ColorPicker
                                        selectedColor={newTaskColor}
                                        onColorChange={setNewTaskColor}
                                    />
                                </div>

                                <button
                                    onClick={handleAddTask}
                                    disabled={!newTaskName.trim()}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-all"
                                >
                                    Aggiungi
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface MonthCalendarProps {
    month: Date;
    selectedDate: string | null;
    onDayClick: (date: Date) => void;
    tasks: Task[];
    todayStr: string;
}

function MonthCalendar({ month, selectedDate, onDayClick, tasks, todayStr }: MonthCalendarProps) {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

    const getTasksForDate = (dateStr: string) => {
        return tasks.filter((t) => t.date === dateStr);
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <h2 className="text-xl font-semibold text-white mb-4 capitalize">
                {format(month, 'MMMM yyyy', { locale: it })}
            </h2>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                    <div key={day} className="text-center text-xs text-gray-500 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isCurrentMonth = isSameMonth(day, month);
                    const isPast = dateStr < todayStr;
                    const isSelected = selectedDate === dateStr;
                    const isTodayDate = isToday(day);
                    const dayTasks = getTasksForDate(dateStr);
                    const hasTasks = dayTasks.length > 0;

                    return (
                        <button
                            key={dateStr}
                            onClick={() => onDayClick(day)}
                            className={`
                relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all
                ${!isCurrentMonth ? 'opacity-30' : ''}
                ${isPast && isCurrentMonth ? 'opacity-50' : ''}
                ${isSelected ? 'bg-purple-500/30 border border-purple-500' : 'hover:bg-white/10'}
                ${isTodayDate ? 'ring-2 ring-purple-400' : ''}
              `}
                        >
                            <span className={isTodayDate ? 'font-bold text-purple-400' : 'text-gray-300'}>
                                {format(day, 'd')}
                            </span>
                            {hasTasks && (
                                <div className="flex gap-0.5 mt-1">
                                    {dayTasks.slice(0, 3).map((task, i) => (
                                        <div
                                            key={i}
                                            className={`w-1.5 h-1.5 rounded-full ${task.is_completed ? 'opacity-100' : 'opacity-50'}`}
                                            style={{ backgroundColor: task.color }}
                                        />
                                    ))}
                                    {dayTasks.length > 3 && (
                                        <span className="text-[8px] text-gray-500">+{dayTasks.length - 3}</span>
                                    )}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
