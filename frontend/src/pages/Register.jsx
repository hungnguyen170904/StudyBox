import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Mail, Lock, User } from 'lucide-react';
import Logo from '../components/Logo';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const res = await register(username, email, password);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Căn Logo ra giữa phía trên form */}
      <div className="mb-8">
        <Logo className="w-12 h-12" textClassName="text-4xl" />
      </div>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative overflow-hidden">
        
        {/* Lớp phủ sáng nhẹ trên cùng (tạo độ bóng kính) */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Tạo tài khoản</h1>
          <p className="text-white/70 mt-2 text-sm">Tham gia cộng đồng học tập</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/20 backdrop-blur-md border border-red-500/50 rounded-lg text-red-100 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1.5 drop-shadow-md">Tên định danh (Username)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-white/60" />
              </div>
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl placeholder:text-white/40"
                placeholder="Ví dụ: hungnguyen"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-1.5 drop-shadow-md">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-white/60" />
              </div>
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl placeholder:text-white/40"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-1.5 drop-shadow-md">Mật khẩu</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-white/60" />
              </div>
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl placeholder:text-white/40"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl font-medium transition-all shadow-lg backdrop-blur-sm disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center mt-2"
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            {loading ? 'Đang tạo...' : 'Đăng ký'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-white/70">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-white font-bold hover:underline transition-colors drop-shadow-md">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
