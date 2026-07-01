# Phân tích và thiết kế hệ thống
## Web cộng đồng dạng "Discord thu nhỏ" — Room, chat, nghe nhạc chung, video call

---

## 1. Tổng quan dự án

### 1.1 Mục tiêu
Xây dựng một web cộng đồng cho phép người dùng tạo **room** (phòng), trong đó các thành viên có thể:
- Nhắn tin chat real-time
- Nghe nhạc đồng bộ cùng nhau
- Gọi video, chia sẻ webcam và màn hình
- Gửi ảnh/video trong cuộc trò chuyện

Đây là phiên bản **rút gọn** của Discord — chỉ giữ lại nhóm tính năng cốt lõi, không cần các tính năng phức tạp như bot, threads, stage channel, role permission chi tiết...

### 1.2 Phạm vi (scope)

**Trong phạm vi:**
- Quản lý user, room, channel (text/music/voice)
- Chat real-time có lịch sử
- Nghe nhạc đồng bộ theo room
- Video call + chia sẻ màn hình (nhóm nhỏ)
- Gửi ảnh/video trong chat

**Ngoài phạm vi (có thể làm sau hoặc không làm):**
- Bot/tích hợp bên thứ ba
- Phân quyền chi tiết theo từng channel
- Ghi âm/lưu lại cuộc gọi
- Hỗ trợ phòng quy mô lớn (>20 người gọi video cùng lúc)

---

## 2. Phân tích yêu cầu

### 2.1 Yêu cầu chức năng

| Module | Yêu cầu |
|---|---|
| Tài khoản | Đăng ký, đăng nhập, quản lý profile |
| Room | Tạo/xoá room, room public hoặc private (invite code), quản lý thành viên (mời, kick), phân quyền owner/admin/member |
| Channel | Mỗi room có nhiều channel: text, music, voice |
| Chat | Gửi/nhận tin nhắn real-time, xem lịch sử (phân trang), hiển thị trạng thái online |
| Nghe nhạc chung | Phát/dừng/seek nhạc đồng bộ cho toàn room, hàng đợi (queue) bài hát |
| Video call | Gọi video nhóm nhỏ qua webcam, chia sẻ màn hình trong cùng cuộc gọi |
| Media trong chat | Gửi ảnh/video kèm tin nhắn, xem preview/thumbnail |

### 2.2 Yêu cầu phi chức năng

- **Độ trễ thấp**: chat và đồng bộ nhạc cần phản hồi gần như tức thì (real-time qua WebSocket)
- **Khả năng mở rộng**: kiến trúc cho phép scale ngang sau này (qua Redis pub/sub) mà không cần đập lại từ đầu
- **Bảo mật**: xác thực, giới hạn dung lượng/loại file upload, validate input
- **Dễ vận hành**: phù hợp để 1 người hoặc nhóm nhỏ tự deploy và maintain

---

## 3. Kiến trúc tổng thể

```
                      ┌──────────────┐
                      │    Client    │   (Web/app — React)
                      └──────┬───────┘
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼───────┐        ┌────────▼─────────┐
        │   REST API    │        │ WebSocket Gateway │
        │ (CRUD, auth)  │        │ (chat, nhạc,      │
        │               │        │  signaling WebRTC)│
        └───────┬───────┘        └────────┬──────────┘
                │                         │
        ┌───────▼───────┐        ┌────────▼──────────┐
        │  PostgreSQL   │        │      Redis        │
        │ (dữ liệu bền  │        │ (pub/sub, presence,│
        │  vững)        │        │  playback state)  │
        └───────────────┘        └───────────────────┘

  Hạ tầng bổ sung cho media:
  - Object Storage (S3-compatible / MinIO / Cloudflare R2) — lưu ảnh, video chat
  - STUN/TURN server (coturn) — cho kết nối WebRTC xuyên NAT
```

**Nguyên tắc thiết kế chính:**
- REST API: stateless, xử lý CRUD (user, room, channel, lịch sử)
- WebSocket Gateway: giữ kết nối sống, broadcast event real-time, đồng thời là nơi **relay signaling** cho WebRTC (không truyền media)
- Redis: nguồn trạng thái tạm thời cần đọc/viết nhanh — playback state của nhạc, presence online/offline, pub/sub để các instance WebSocket server nói chuyện với nhau khi scale ngang
- Media thật của video call (audio/video/screen) đi **trực tiếp P2P giữa các client**, không qua server — server chỉ giúp 2 bên "bắt tay" với nhau

---

## 4. Thiết kế chi tiết từng module

### 4.1 Authentication & User
- Đăng ký/đăng nhập bằng email + password (hash bằng bcrypt/argon2), có thể bổ sung OAuth (Google) sau
- Session quản lý bằng JWT hoặc session token, gửi kèm khi mở kết nối WebSocket để xác thực

### 4.2 Room & Channel
- Room có `owner`, danh sách `room_members` kèm `role` (owner/admin/member)
- Room public: ai cũng thấy và join được. Room private: cần `invite_code`
- Mỗi room chứa nhiều channel, mỗi channel có `type`: `text`, `music`, hoặc `voice`

### 4.3 Chat real-time
- Gửi tin nhắn qua WebSocket event `chat:send` → server lưu vào PostgreSQL → broadcast `chat:new` cho mọi người trong channel
- Lấy lịch sử cũ hơn qua REST API (phân trang theo `created_at`, không tải qua WebSocket)

### 4.4 Đồng bộ nhạc (music sync)

**Nguyên tắc:** server là nguồn sự thật duy nhất về trạng thái phát nhạc, lưu trong Redis theo từng music channel:

```
playback_state:{channel_id} = {
  track_id,
  is_playing: true,
  position_seconds: 87.2,
  server_timestamp: 1719999999,
  updated_by: user_id
}
```

**Luồng hoạt động:**
1. User bấm play/pause/seek → gửi event lên WebSocket Gateway
2. Server cập nhật `playback_state` trong Redis, gắn `server_timestamp` → broadcast cho cả room
3. Mỗi client tự tính vị trí cần phát:
   `vị_trí_hiện_tại = position_seconds + (now - server_timestamp)` (khi đang playing)
4. User mới join → server gửi ngay `music:state_sync` để client nhảy đúng vị trí

**Quyết định thiết kế quan trọng:**
- Chỉ **owner/admin** của room được điều khiển playback → tránh xung đột khi nhiều người cùng bấm
- Nguồn nhạc khuyến nghị: **link YouTube** (qua YouTube IFrame API) để tránh vấn đề lưu trữ và bản quyền file nhạc tự upload

### 4.5 Video call & chia sẻ màn hình (WebRTC)

- **Signaling** (trao đổi SDP offer/answer, ICE candidate) đi qua WebSocket Gateway sẵn có — không cần server riêng
- **Media** (audio/video/screen) truyền **trực tiếp P2P** giữa các client sau khi signaling xong
- **STUN/TURN bắt buộc phải có**: STUN giúp client phát hiện địa chỉ public; TURN làm relay dự phòng khi 2 client không thể kết nối trực tiếp (NAT khó, mạng công ty...). Thiếu TURN, một phần đáng kể cuộc gọi sẽ không kết nối được.
- **Chia sẻ màn hình** không phải tính năng riêng về kỹ thuật — chỉ là thêm 1 video track (lấy qua `getDisplayMedia()`) vào cùng kết nối WebRTC đang có

**Lựa chọn mô hình — Mesh vs SFU:**

| | Mesh (P2P thuần) | SFU (media server trung gian) |
|---|---|---|
| Cách hoạt động | Mỗi client gửi stream tới tất cả người khác | Mỗi client chỉ gửi 1 lần, server forward lại |
| Phù hợp | Phòng ≤4-6 người | Phòng đông hơn, ổn định hơn |
| Độ phức tạp | Thấp, tự code bằng WebRTC API thuần | Cao hơn, cần host media server (mediasoup/LiveKit/Janus) |

→ **Khuyến nghị**: bắt đầu với mesh WebRTC cho phòng nhỏ (≤6 người) — đơn giản, đủ dùng và giúp hiểu rõ bản chất WebRTC. Nâng cấp sang LiveKit (mã nguồn mở, có thể tự host) nếu sau này cần phòng đông hơn.

### 4.6 Gửi ảnh/video trong chat
- Client lấy **presigned URL** từ REST API → upload **trực tiếp** lên Object Storage (không qua backend) → backend chỉ lưu lại URL vào DB
- Giới hạn thực tế: ảnh ≤10MB, video ≤50-100MB (nên giới hạn thời lượng video, ví dụ ≤60s) để kiểm soát chi phí storage/bandwidth

---

## 5. Thiết kế cơ sở dữ liệu

```sql
-- Người dùng
users (
  id UUID PK,
  username VARCHAR UNIQUE,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  avatar_url VARCHAR NULL,
  created_at TIMESTAMP
)

-- Room
rooms (
  id UUID PK,
  name VARCHAR,
  owner_id UUID FK -> users,
  is_public BOOLEAN,
  invite_code VARCHAR UNIQUE NULL,
  created_at TIMESTAMP
)

room_members (
  room_id UUID FK -> rooms,
  user_id UUID FK -> users,
  role ENUM('owner','admin','member'),
  joined_at TIMESTAMP,
  PRIMARY KEY (room_id, user_id)
)

-- Channel
channels (
  id UUID PK,
  room_id UUID FK -> rooms,
  name VARCHAR,
  type ENUM('text','music','voice'),
  created_at TIMESTAMP
)

-- Chat
messages (
  id UUID PK,
  channel_id UUID FK -> channels,
  user_id UUID FK -> users,
  type ENUM('text','image','video','system'),
  content TEXT NULL,
  created_at TIMESTAMP
)

attachments (
  id UUID PK,
  message_id UUID FK -> messages,
  file_url VARCHAR,
  file_type ENUM('image','video'),
  thumbnail_url VARCHAR NULL,
  size_bytes BIGINT,
  duration_seconds INT NULL
)

-- Nhạc
tracks (
  id UUID PK,
  channel_id UUID FK -> channels,
  title VARCHAR,
  source_url VARCHAR,
  added_by UUID FK -> users,
  queue_order INT,
  created_at TIMESTAMP
)

-- Lịch sử cuộc gọi (tuỳ chọn)
call_sessions (
  id UUID PK,
  channel_id UUID FK -> channels,
  started_by UUID FK -> users,
  started_at TIMESTAMP,
  ended_at TIMESTAMP NULL
)

call_participants (
  call_id UUID FK -> call_sessions,
  user_id UUID FK -> users,
  joined_at TIMESTAMP,
  left_at TIMESTAMP NULL,
  PRIMARY KEY (call_id, user_id)
)
```

**Dữ liệu tạm thời trong Redis (không lưu PostgreSQL):**
- `presence:{user_id}` — trạng thái online/offline
- `playback_state:{channel_id}` — trạng thái phát nhạc hiện tại
- Pub/sub channel để broadcast giữa nhiều instance WebSocket server

---

## 6. Thiết kế API & WebSocket Event

### 6.1 REST API (chính)

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

POST   /api/rooms
GET    /api/rooms
GET    /api/rooms/:id
POST   /api/rooms/:id/join
DELETE /api/rooms/:id/members/:userId

POST   /api/rooms/:roomId/channels
GET    /api/channels/:id/messages?before=&limit=
POST   /api/channels/:id/attachments/presigned-url

GET    /api/channels/:id/queue
POST   /api/channels/:id/queue
```

### 6.2 WebSocket events

```
# Kết nối & phòng
join_room / leave_room
presence:update

# Chat
chat:send → chat:new

# Nhạc
music:play / music:pause / music:seek / music:next
music:state_sync

# Video call (WebRTC signaling)
call:invite / call:accept / call:reject / call:end
webrtc:offer / webrtc:answer / webrtc:ice_candidate
screen:start / screen:stop
```

---

## 7. Đề xuất công nghệ

| Thành phần | Option A (Node.js) | Option B (Laravel) |
|---|---|---|
| Frontend | React | React |
| Backend + Realtime | Node.js (Express/NestJS) + Socket.IO | Laravel + Laravel Reverb + Echo |
| Database | PostgreSQL | PostgreSQL |
| Cache/Pub-sub | Redis | Redis |
| Storage | S3-compatible (MinIO/R2) | S3-compatible (MinIO/R2) |
| WebRTC | STUN/TURN (coturn) + WebRTC API thuần | STUN/TURN (coturn) + WebRTC API thuần |

Option A xử lý real-time/WebSocket tự nhiên hơn. Option B phù hợp nếu muốn kết hợp luyện Laravel.

---

## 8. Lộ trình phát triển (đề xuất)

1. **Phase 1**: Auth + tạo/join room + text chat real-time
2. **Phase 2**: Music channel — đồng bộ play/pause/seek cơ bản, queue đơn giản
3. **Phase 3**: Gửi ảnh/video trong chat (upload qua presigned URL)
4. **Phase 4**: Video call mesh WebRTC (≤6 người) + chia sẻ màn hình — tách riêng, giai đoạn tốn thời gian nhất
5. **Phase 5 (tuỳ chọn)**: Nâng cấp lên LiveKit nếu cần phòng đông hơn; thêm playlist, role chi tiết hơn

---

## 9. Rủi ro kỹ thuật cần lưu ý

- **Thiếu TURN server** → một phần cuộc gọi video sẽ không kết nối được mà không rõ lý do
- **Mesh WebRTC với phòng quá đông** → giật/lag do tải lên tăng theo số người
- **Đồng bộ nhạc không bù trừ độ trễ mạng** → các client nghe lệch nhau vài trăm ms đến vài giây
- **Upload file không giới hạn dung lượng/thời lượng** → chi phí storage/bandwidth tăng nhanh ngoài kiểm soát

---

## 10. Hướng mở rộng tương lai

- Playlist lưu lại theo room, vote bỏ qua bài hát
- Phân quyền chi tiết hơn theo từng channel
- SFU (LiveKit/mediasoup) khi cần phòng video đông người
- Ghi âm/lưu lại cuộc gọi (cần xử lý thêm về lưu trữ và quyền riêng tư)
