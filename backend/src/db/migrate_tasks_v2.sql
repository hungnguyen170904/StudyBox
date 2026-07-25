-- Migration: Nâng cấp bảng room_tasks với priority, deadline, status, assigned_to
-- Chạy file này một lần để nâng cấp schema

-- Thêm cột status (thay thế is_completed)
ALTER TABLE room_tasks ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done'));

-- Thêm cột priority
ALTER TABLE room_tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- Thêm cột deadline
ALTER TABLE room_tasks ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE;

-- Thêm cột assigned_to (người được giao)
ALTER TABLE room_tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

-- Thêm cột updated_at
ALTER TABLE room_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Đồng bộ status từ is_completed cũ (nếu đã có data)
UPDATE room_tasks SET status = 'done' WHERE is_completed = TRUE AND status = 'todo';

-- Index thêm cho tìm kiếm theo deadline và priority
CREATE INDEX IF NOT EXISTS idx_room_tasks_deadline ON room_tasks(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_room_tasks_assigned ON room_tasks(assigned_to) WHERE assigned_to IS NOT NULL;

-- Index full-text cho messages (tìm kiếm toàn văn)
CREATE INDEX IF NOT EXISTS idx_messages_content_fts ON messages USING gin(to_tsvector('simple', content)) WHERE content IS NOT NULL;
