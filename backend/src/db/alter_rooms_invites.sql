-- Thêm các cột quản lý mã mời vào bảng rooms
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS invite_max_uses INT,
ADD COLUMN IF NOT EXISTS invite_uses INT DEFAULT 0;
