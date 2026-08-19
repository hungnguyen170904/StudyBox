import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Mail, Lock, User, ArrowRight, BookOpen, Users, Zap } from 'lucide-react';

const FEATURES = [
  { icon: BookOpen, text: 'Phòng học cộng tác thời gian thực' },
  { icon: Users,    text: 'Kết nối bạn bè, nhắn tin & voice chat' },
  { icon: Zap,      text: 'Bảng trắng, nhạc chung & Kanban tasks' },
];

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const register = useAuthStore(s => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await register(username, email, password);
    if (res.success) navigate('/');
    else setError(res.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12"
           style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 50%, #100d28 100%)' }}>

        <div className="auth-blob w-96 h-96 bg-violet-600 -top-20 -left-20 animate-float" />
        <div className="auth-blob w-80 h-80 bg-cyan-500 bottom-0 right-0 animate-float" style={{ animationDelay: '-3s' }} />
        <div className="auth-blob w-60 h-60 bg-pink-600 top-1/3 right-1/4 animate-float" style={{ animationDelay: '-5s' }} />

        <div className="relative z-10 max-w-sm">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <span className="text-2xl font-black text-white tracking-tight">StudyBox</span>
          </div>

          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Tham gia cộng đồng<br />
            <span style={{ background: 'linear-gradient(90deg,#a78bfa,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              học tập.
            </span>
          </h1>
          <p className="text-white/50 mb-10 text-sm leading-relaxed">
            Đăng ký miễn phí và bắt đầu học nhóm hiệu quả hơn ngay hôm nay.
          </p>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-violet-300" />
                </div>
                <span className="text-white/70 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="text-2xl">📚</span>
            <span className="text-xl font-black text-white">StudyBox</span>
          </div>

          <h2 className="text-2xl font-black text-white mb-1">Tạo tài khoản</h2>
          <p className="text-white/40 text-sm mb-8">Điền thông tin để bắt đầu hành trình học tập.</p>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Tên định danh</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="vd: hungnguyen"
                  className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-sm placeholder:text-white/25"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-sm placeholder:text-white/25"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-sm placeholder:text-white/25"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primaryHover text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_28px_rgba(139,92,246,0.5)] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Đăng ký <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-white/40">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
