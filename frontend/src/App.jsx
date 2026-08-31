import { useEffect, Suspense, lazy, useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import PrivateRoute from './components/PrivateRoute';
import { useChatStore } from './store/chatStore';
import { useNotificationStore } from './store/notificationStore';
import BackgroundSlider from './components/Layout/BackgroundSlider';
import SearchDialog from './components/Search/SearchDialog';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Lazy loading pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Home = lazy(() => import('./pages/Home'));
const Room = lazy(() => import('./pages/Room'));
const Invite = lazy(() => import('./pages/Invite'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Premium Fallback Loader
const PageLoader = () => (
  <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center relative overflow-hidden">
    <div className="absolute w-64 h-64 bg-primary/20 blur-[100px] rounded-full animate-pulse pointer-events-none"></div>
    <img src="/Logo.png" alt="StudyBox" className="w-20 h-20 mb-6 animate-pulse drop-shadow-[0_0_20px_rgba(139,92,246,0.4)] relative z-10" />
    <div className="flex items-center gap-2 relative z-10">
      <div className="w-2.5 h-2.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '0s' }}></div>
      <div className="w-2.5 h-2.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '0.15s' }}></div>
      <div className="w-2.5 h-2.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '0.3s' }}></div>
    </div>
  </div>
);

function App() {
  const { checkAuth, user, isAuthenticated } = useAuthStore();
  const { initSocket, disconnectSocket } = useChatStore();
  const { listenSocketEvents } = useNotificationStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  // Global Ctrl+K / Cmd+K shortcut để mở Search
  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (isAuthenticated) setIsSearchOpen(prev => !prev);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <BackgroundSlider>
      <ToastContainer 
        theme="dark" 
        position="bottom-right" 
        autoClose={3000} 
        hideProgressBar={true} 
        toastClassName="!bg-black/70 !backdrop-blur-xl !border !border-white/10 !shadow-lg !text-white !rounded-xl" 
      />

      {/* Search Dialog toàn cục — Ctrl+K */}
      {isAuthenticated && (
        <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      )}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Các route cần đăng nhập */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/room/:id" element={<Room />} />
            <Route path="/invite/:code" element={<Invite />} />
          </Route>
          
          {/* 404 Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BackgroundSlider>
  );
}

export default App;
