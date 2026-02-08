export interface Task {
  id: string;
  name: string;
  date: string; // ISO date (YYYY-MM-DD)
  isCompleted: boolean;
  note?: string;
  order: number;
  color: string;
  isEnabled: boolean;
  taskType: 'default' | 'adhoc';
  completedAt?: string; // ISO timestamp
}

export interface DefaultTask {
  id: string;
  name: string;
  order: number;
  color: string;
  isEnabled: boolean;
}

export const TASK_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#78716c', '#64748b', '#6b7280',
  '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d',
];

export const INITIAL_DEFAULT_TASKS: DefaultTask[] = [
  { id: 'dt1', name: 'Ore Sonno', order: 1, color: '#3b82f6', isEnabled: true },
  { id: 'dt2', name: 'Peso', order: 2, color: '#22c55e', isEnabled: true },
  { id: 'dt3', name: 'Creme Corpo', order: 3, color: '#f59e0b', isEnabled: true },
  { id: 'dt4', name: 'Mandare CV', order: 4, color: '#ef4444', isEnabled: true },
  { id: 'dt5', name: 'Corsa', order: 5, color: '#8b5cf6', isEnabled: true },
  { id: 'dt6', name: 'Studio', order: 6, color: '#06b6d4', isEnabled: true },
  { id: 'dt7', name: 'KCAL', order: 7, color: '#ec4899', isEnabled: true },
  { id: 'dt8', name: "Bicchieri d'acqua", order: 8, color: '#14b8a6', isEnabled: true },
  { id: 'dt9', name: 'Ottimizzazione Workflow', order: 9, color: '#6366f1', isEnabled: true },
];
