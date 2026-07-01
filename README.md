# StudyBox 🚀

StudyBox is a comprehensive real-time web application designed for students and learners to collaborate, communicate, and study together effectively. It features a modern, beautiful **Glassmorphism** interface and is equipped with powerful real-time capabilities powered by WebRTC and Socket.io.

## ✨ Features

- **Real-time Chat:** Instant messaging with typing indicators, read receipts, and image/video sharing.
- **Voice & Video Channels:** High-quality WebRTC-powered voice rooms and screen sharing capabilities.
- **Collaborative Whiteboard:** Draw and brainstorm together in real-time.
- **Music Player:** Listen to focus-enhancing lo-fi music directly within the app, synchronized across your study sessions.
- **Friend System & Direct Messaging:** Connect with peers and message them privately.
- **Real-time Notifications:** Get instantly notified when someone sends a friend request or accepts one.
- **Role & Permission Management:** Room owners can assign Admins, and Admins can moderate the room by kicking disruptive users.
- **Stunning UI/UX:** Built with React, Tailwind CSS, and Zustand featuring a state-of-the-art Glassmorphism design system.

## 🛠️ Technology Stack

**Frontend:**
- React.js + Vite
- Tailwind CSS (Glassmorphism UI)
- Zustand (State Management)
- Socket.io-client (Real-time events)
- WebRTC (Voice, Video, Screen Share)

**Backend:**
- Node.js & Express.js
- PostgreSQL (Database)
- Socket.io (WebSocket Server)
- JWT (Authentication)
- Bcrypt (Password Hashing)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/hungnguyen170904/StudyBox.git
   cd StudyBox
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory:
   ```env
   DB_USER=postgres
   DB_PASSWORD=your_db_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=studybox
   JWT_SECRET=your_secret_key
   PORT=5000
   ```
   Run database init script (if applicable) or start the server:
   ```bash
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   ```
   Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```
   Start the development server:
   ```bash
   npm run dev
   ```

## 📜 License

This project is open-source and available under the MIT License.
