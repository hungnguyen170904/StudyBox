import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import PrivateRoute from './components/PrivateRoute';
import { useChatStore } from './store/chatStore';
import { useNotificationStore } from './store/notificationStore';
import BackgroundSlider from './components/Layout/BackgroundSlider';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Lazy loading pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Home = lazy(() => import('./pages/Home'));
const Room = lazy(() => import('./pages/Room'));
const Invite = lazy(() => import('./pages/Invite'));

// Fallback Loader
const PageLoader = () => (
  <div className="min-h-screen bg-transparent flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
  </div>
);

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
      <ToastContainer 
        theme="dark" 
        position="bottom-right" 
        autoClose={3000} 
        hideProgressBar={true} 
        toastClassName="!bg-black/70 !backdrop-blur-xl !border !border-white/10 !shadow-lg !text-white !rounded-xl" 
      />
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
        </Routes>
      </Suspense>
    </BackgroundSlider>
  );
}

export default App;
