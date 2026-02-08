-- Goalify Database Schema for Supabase
-- Run this in the Supabase SQL Editor after creating your project

-- Default tasks template per user
CREATE TABLE default_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  "order" INT NOT NULL,
  color TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  note TEXT,
  "order" INT NOT NULL,
  color TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  task_type TEXT DEFAULT 'default' CHECK (task_type IN ('default', 'adhoc')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_tasks_user_date ON tasks(user_id, date);
CREATE INDEX idx_tasks_user_completed ON tasks(user_id, is_completed);
CREATE INDEX idx_default_tasks_user ON default_tasks(user_id);

-- Row Level Security (RLS)
ALTER TABLE default_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see/edit their own data
CREATE POLICY "Users can view own default_tasks" ON default_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own default_tasks" ON default_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own default_tasks" ON default_tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own default_tasks" ON default_tasks
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);
