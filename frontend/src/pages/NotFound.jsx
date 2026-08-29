import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black/90 flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="bg-white/5 border border-white/10 p-10 rounded-3xl max-w-lg text-center backdrop-blur-xl relative z-10 shadow-2xl">
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-primary/30">
          <FileQuestion className="w-10 h-10 text-primary drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight drop-shadow-sm">404</h1>
        <h2 className="text-xl font-semibold text-white/90 mb-3">Không tìm thấy trang</h2>
        <p className="text-white/60 mb-8 leading-relaxed">
          Đường dẫn bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển. Hãy kiểm tra lại URL hoặc trở về trang chủ nhé.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
          Về Trang Chủ
        </Link>
      </div>
    </div>
  );
}
