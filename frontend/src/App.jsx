import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Room from './pages/Room';
import Invite from './pages/Invite';
import PrivateRoute from './components/PrivateRoute';

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
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
  );
}

export default App;
