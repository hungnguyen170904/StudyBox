import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Room from './pages/Room';
import Invite from './pages/Invite';
import PrivateRoute from './components/PrivateRoute';
import { useChatStore } from './store/chatStore';
import { useNotificationStore } from './store/notificationStore';
import BackgroundSlider from './components/Layout/BackgroundSlider';

function App() {
  const { checkAuth, user, isAuthenticated } = useAuthStore();
  const { initSocket, disconnectSocket } = useChatStore();
  const { listenSocketEvents } = useNotificationStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Quản lý Socket connection tập trung
  useEffect(() => {
    if (isAuthenticated && user) {
      initSocket();
      setTimeout(() => {
        listenSocketEvents();
      }, 500);
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated, user, initSocket, disconnectSocket, listenSocketEvents]);

  return (
    <BackgroundSlider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Các route cần đăng nhập */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/room/:id" element={<Room />} />
          <Route path="/invite/:code" element={<Invite />} />
        </Route>
      </Routes>
    </BackgroundSlider>
  );
}

export default App;
