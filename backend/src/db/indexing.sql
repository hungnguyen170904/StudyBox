-- Tối ưu tốc độ lấy tin nhắn trong một channel, sắp xếp theo thời gian
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages (channel_id, created_at DESC);

-- Tối ưu tốc độ tìm kiếm tin nhắn theo người gửi
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages (user_id);

-- Tối ưu tốc độ lấy danh sách phòng theo người tạo (owner)
CREATE INDEX IF NOT EXISTS idx_rooms_owner ON rooms (owner_id);

-- Tối ưu lấy các phòng public
CREATE INDEX IF NOT EXISTS idx_rooms_is_public ON rooms (is_public);

-- Tối ưu tìm kiếm thành viên trong phòng
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members (user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members (room_id);

-- Tối ưu lấy bạn bè theo user_id
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships (user_id_1);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships (user_id_2);
