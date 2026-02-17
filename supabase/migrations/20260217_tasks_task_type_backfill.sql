-- Backfill and harden tasks.task_type for deterministic day ordering
UPDATE tasks
SET task_type = 'default'
WHERE task_type IS NULL;

ALTER TABLE tasks
ALTER COLUMN task_type SET DEFAULT 'default';

ALTER TABLE tasks
ALTER COLUMN task_type SET NOT NULL;

-- Keep day queries fast with deterministic ordering
CREATE INDEX IF NOT EXISTS idx_tasks_user_date_type_order
ON tasks(user_id, date, task_type, "order");
