'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, Filter } from 'lucide-react';
import { useSupabaseTaskStore } from '@/store/supabaseTaskStore';

export default function HistoryPage() {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [viewMode, setViewMode] = useState<'all' | 'single'>('all');
    const [selectedTaskName, setSelectedTaskName] = useState<string | null>(null);

    const { initialized, loading, tasks, getCompletedTasks, defaultTasks, loadHistoricalTasks } = useSupabaseTaskStore();

    // Ensure startDate is not after endDate
    const validStartDate = startDate > endDate ? endDate : startDate;
    const validEndDate = endDate < startDate ? startDate : endDate;

    // Load historical tasks if date range is outside cached range
    useEffect(() => {
        if (initialized) {
            loadHistoricalTasks(validStartDate, validEndDate);
        }
    }, [initialized, validStartDate, validEndDate, loadHistoricalTasks]);

    const completedTasks = useMemo(() => {
        return getCompletedTasks(validStartDate, validEndDate);
    }, [getCompletedTasks, validStartDate, validEndDate]);

    const uniqueTaskNames = useMemo(() => {
        const names = new Set(completedTasks.map((t) => t.name));
        return Array.from(names).sort();
    }, [completedTasks]);

    const taskColors = useMemo(() => {
        const colors: Record<string, string> = {};
        defaultTasks.forEach((dt) => {
            colors[dt.name] = dt.color;
        });
        completedTasks.forEach((t) => {
            if (!colors[t.name]) {
                colors[t.name] = t.color;
            }
        });
        return colors;
    }, [defaultTasks, completedTasks]);

    // Prepare data for graph
    const graphData = useMemo(() => {
        const days = eachDayOfInterval({
            start: parseISO(validStartDate),
            end: parseISO(validEndDate),
        });

        return days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTasks = completedTasks.filter((t) => t.date === dateStr);

            const byTask: Record<string, number> = {};
            dayTasks.forEach((t) => {
                byTask[t.name] = (byTask[t.name] || 0) + 1;
            });

            return {
                date: dateStr,
                label: format(day, 'd MMM', { locale: it }),
                total: dayTasks.length,
                byTask,
            };
        });
    }, [validStartDate, validEndDate, completedTasks]);

    const filteredLogs = useMemo(() => {
        if (viewMode === 'single' && selectedTaskName) {
            return completedTasks.filter((t) => t.name === selectedTaskName);
        }
        return completedTasks;
    }, [completedTasks, viewMode, selectedTaskName]);

    if (!initialized || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Caricamento…</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4 py-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-2">Storico</h1>
                <p className="text-gray-500 mb-8">Visualizza i tuoi progressi nel tempo</p>

                {/* Filters */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gray-500" />
                            <span className="text-gray-400 text-sm">Dal</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">al</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            <Filter className="w-5 h-5 text-gray-500" />
                            <select
                                value={viewMode}
                                onChange={(e) => {
                                    setViewMode(e.target.value as 'all' | 'single');
                                    if (e.target.value === 'all') setSelectedTaskName(null);
                                }}
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                style={{ colorScheme: 'dark' }}
                            >
                                <option value="all">Tutti i Task</option>
                                <option value="single">Singolo Task</option>
                            </select>

                            {viewMode === 'single' && (
                                <select
                                    value={selectedTaskName || ''}
                                    onChange={(e) => setSelectedTaskName(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    <option value="">Seleziona…</option>
                                    {uniqueTaskNames.map((name) => (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                {/* Graph */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4">Grafico Completamenti</h3>

                    {graphData.length > 0 ? (
                        <div className="relative h-64">
                            <CompletionGraph
                                data={graphData}
                                taskColors={taskColors}
                                viewMode={viewMode}
                                selectedTaskName={selectedTaskName}
                                uniqueTaskNames={uniqueTaskNames}
                            />
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">Nessun dato nel periodo selezionato</p>
                    )}

                    {/* Legend */}
                    {viewMode === 'all' && (
                        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
                            {uniqueTaskNames.map((name) => (
                                <div key={name} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: taskColors[name] || '#6b7280' }}
                                    />
                                    <span className="text-xs text-gray-400">{name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Logs */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        Log Completamenti ({filteredLogs.length})
                    </h3>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredLogs.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Nessun completamento nel periodo selezionato</p>
                        ) : (
                            filteredLogs.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-start gap-3 p-4 bg-white/5 rounded-xl"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                                        style={{ backgroundColor: task.color }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-200">{task.name}</span>
                                            {task.task_type === 'adhoc' && (
                                                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                                                    Ad-hoc
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {format(parseISO(task.completed_at || task.date), 'd MMMM yyyy, HH:mm', { locale: it })}
                                        </div>
                                        {task.note && (
                                            <p className="mt-2 text-sm text-gray-400 bg-white/5 rounded-lg p-3">
                                                {task.note}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface GraphProps {
    data: { date: string; label: string; total: number; byTask: Record<string, number> }[];
    taskColors: Record<string, string>;
    viewMode: 'all' | 'single';
    selectedTaskName: string | null;
    uniqueTaskNames: string[];
}

function CompletionGraph({ data, taskColors, viewMode, selectedTaskName, uniqueTaskNames }: GraphProps) {
    const maxValue = Math.max(
        ...data.map((d) => {
            if (viewMode === 'single' && selectedTaskName) {
                return d.byTask[selectedTaskName] || 0;
            }
            return d.total;
        }),
        1
    );

    const width = data.length * 30;
    const height = 200;
    const padding = 40;

    const getY = (value: number) => {
        return height - padding - (value / maxValue) * (height - padding * 2);
    };

    const getX = (index: number) => {
        return padding + index * ((width - padding * 2) / (data.length - 1 || 1));
    };

    const renderLine = (taskName: string, color: string) => {
        const points = data.map((d, i) => {
            const value = d.byTask[taskName] || 0;
            return `${getX(i)},${getY(value)}`;
        });

        return (
            <g key={taskName}>
                <polyline
                    points={points.join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.8"
                />
                {data.map((d, i) => {
                    const value = d.byTask[taskName] || 0;
                    if (value > 0) {
                        return (
                            <circle
                                key={i}
                                cx={getX(i)}
                                cy={getY(value)}
                                r="4"
                                fill={color}
                            />
                        );
                    }
                    return null;
                })}
            </g>
        );
    };

    const tasksToRender = viewMode === 'single' && selectedTaskName
        ? [selectedTaskName]
        : uniqueTaskNames;

    return (
        <div className="w-full overflow-x-auto">
            <svg width={Math.max(width, 300)} height={height} className="min-w-full">
                {/* Y grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                    <g key={ratio}>
                        <line
                            x1={padding}
                            y1={getY(maxValue * ratio)}
                            x2={width - padding}
                            y2={getY(maxValue * ratio)}
                            stroke="rgba(255,255,255,0.1)"
                            strokeDasharray="4"
                        />
                        <text
                            x={padding - 10}
                            y={getY(maxValue * ratio) + 4}
                            fontSize="10"
                            fill="#6b7280"
                            textAnchor="end"
                        >
                            {Math.round(maxValue * ratio)}
                        </text>
                    </g>
                ))}

                {/* Lines for each task */}
                {tasksToRender.map((name) =>
                    renderLine(name, taskColors[name] || '#6b7280')
                )}

                {/* X axis labels */}
                {data.map((d, i) => {
                    // Only show some labels to avoid overlap
                    if (data.length > 15 && i % Math.ceil(data.length / 10) !== 0) return null;
                    return (
                        <text
                            key={d.date}
                            x={getX(i)}
                            y={height - 10}
                            fontSize="10"
                            fill="#6b7280"
                            textAnchor="middle"
                        >
                            {d.label}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
}
