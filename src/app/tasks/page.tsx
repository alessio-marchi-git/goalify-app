'use client';

import { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, X } from 'lucide-react';
import { useSupabaseTaskStore, DefaultTask } from '@/store/supabaseTaskStore';
import { ColorPicker } from '@/components/ColorPicker';
import { TASK_COLORS, MAX_TASK_NAME_LENGTH } from '@/types/task';

interface SortableTaskItemProps {
    task: DefaultTask;
    onToggle: () => void;
    onDelete: () => void;
    onColorChange: (color: string) => void;
}

function SortableTaskItem({ task, onToggle, onDelete, onColorChange }: SortableTaskItemProps) {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl mb-3 ${
                isDragging ? 'opacity-50 shadow-xl' : ''
            } ${!task.is_enabled ? 'opacity-50' : ''}`}
        >
            {/* Drag handle */}
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/10 rounded"
                aria-label="Trascina per riordinare"
            >
                <GripVertical className="w-5 h-5 text-gray-500" />
            </button>

            {/* Color indicator */}
            <div className="relative">
                <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-6 h-6 rounded-md border-2 border-white/20 hover:border-white/40 transition-colors"
                    style={{ backgroundColor: task.color }}
                    aria-label="Cambia colore task"
                />
                {showColorPicker && (
                    <div className="absolute left-0 top-10 z-50 bg-gray-900 border border-white/10 rounded-xl shadow-xl">
                        <ColorPicker
                            selectedColor={task.color}
                            onColorChange={(color) => {
                                onColorChange(color);
                                setShowColorPicker(false);
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Task name */}
            <span className="flex-1 text-gray-200 font-medium">{task.name}</span>

            {/* Enable/Disable toggle */}
            <button
                onClick={onToggle}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    task.is_enabled
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-gray-500/20 text-gray-400'
                }`}
                aria-label={task.is_enabled ? 'Disattiva task' : 'Attiva task'}
            >
                {task.is_enabled ? 'Attivo' : 'Disattivo'}
            </button>

            {/* Delete button */}
            <button
                onClick={onDelete}
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                aria-label={`Elimina task ${task.name}`}
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

export default function TasksPage() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskColor, setNewTaskColor] = useState(TASK_COLORS[0]);

    const {
        initialized,
        loading,
        defaultTasks,
        addDefaultTask,
        removeDefaultTask,
        updateDefaultTask,
        reorderDefaultTasks,
        error,
    } = useSupabaseTaskStore();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = defaultTasks.findIndex((t) => t.id === active.id);
            const newIndex = defaultTasks.findIndex((t) => t.id === over.id);
            const newOrder = arrayMove(defaultTasks, oldIndex, newIndex);
            reorderDefaultTasks(newOrder);
        }
    };

    const handleAddTask = async () => {
        if (newTaskName.trim()) {
            await addDefaultTask(newTaskName.trim(), newTaskColor);
            setNewTaskName('');
            setNewTaskColor(TASK_COLORS[0]);
            setShowAddModal(false);
        }
    };

    const handleDeleteTask = async (id: string) => {
        await removeDefaultTask(id);
        setShowDeleteConfirm(null);
    };

    if (!initialized || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Caricamento…</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-2">Elenco Task</h1>
                <p className="text-gray-500 mb-8">Trascina per riordinare, clicca sul colore per cambiarlo</p>

                {error && (
                    <div role="alert" className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={defaultTasks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {defaultTasks
                            .sort((a, b) => a.order - b.order)
                            .map((task) => (
                                <SortableTaskItem
                                    key={task.id}
                                    task={task}
                                    onToggle={() =>
                                        updateDefaultTask(task.id, { is_enabled: !task.is_enabled })
                                    }
                                    onDelete={() => setShowDeleteConfirm(task.id)}
                                    onColorChange={(color) => updateDefaultTask(task.id, { color })}
                                />
                            ))}
                    </SortableContext>
                </DndContext>

                {/* Add Task Button */}
                <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full mt-4 py-4 border-2 border-dashed border-white/10 rounded-xl text-gray-500 hover:text-white hover:border-white/30 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Aggiungi Task
                </button>

                {/* Add Task Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">Nuovo Task</h2>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg"
                                    aria-label="Chiudi"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleAddTask();
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label htmlFor="taskName" className="block text-sm text-gray-400 mb-2">
                                        Nome
                                    </label>
                                    <input
                                        id="taskName"
                                        name="taskName"
                                        type="text"
                                        value={newTaskName}
                                        onChange={(e) => setNewTaskName(e.target.value)}
                                        placeholder="Es. Meditazione"
                                        maxLength={MAX_TASK_NAME_LENGTH}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                        autoFocus
                                        required
                                    />
                                    {newTaskName.length > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {newTaskName.length}/{MAX_TASK_NAME_LENGTH}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Colore</label>
                                    <ColorPicker
                                        selectedColor={newTaskColor}
                                        onColorChange={setNewTaskColor}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={!newTaskName.trim()}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-all"
                                >
                                    Aggiungi
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
                            <h2 className="text-xl font-bold text-white mb-4">Conferma Eliminazione</h2>
                            <p className="text-gray-400 mb-6">
                                Sei sicuro di voler eliminare questo task? Questa azione non può essere annullata.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-semibold transition-all"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={() => handleDeleteTask(showDeleteConfirm)}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-semibold transition-all"
                                >
                                    Elimina
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
