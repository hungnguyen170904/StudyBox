import { useEffect, useState } from 'react';
import { usePomodoroStore } from '../../../store/pomodoroStore';
import { useChatStore } from '../../../store/chatStore';
import { Play, Pause, RotateCcw, Timer, X } from 'lucide-react';

export default function PomodoroTimer({ roomId }) {
  const { isRunning, mode, timeLeft, initPomodoro, cleanup, start, pause, reset } = usePomodoroStore();
  const { getSocket } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (socket && roomId) {
      initPomodoro(socket, roomId);
    }
    return () => cleanup();
  }, [roomId, initPomodoro, cleanup]); // eslint-disable-line

  // Format mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progressPercentage = mode === 'work' 
    ? ((25 * 60 - timeLeft) / (25 * 60)) * 100 
    : ((5 * 60 - timeLeft) / (5 * 60)) * 100;

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-6 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 p-3 rounded-full shadow-lg transition-all text-white flex items-center gap-2"
        title="Mở Đồng hồ Pomodoro"
      >
        <Timer className="w-5 h-5 text-red-400" />
        <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
      </button>
    );
  }

  return (
    <div className="fixed top-20 right-6 z-50 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-64 shadow-[0_8px_30px_rgb(0,0,0,0.3)] animate-in slide-in-from-top-4 fade-in duration-200">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-white">
          <Timer className="w-5 h-5 text-red-400" />
          <span className="font-bold text-sm uppercase tracking-wider opacity-90">Pomodoro</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col items-center justify-center py-2">
        <div className={`text-sm font-medium mb-2 ${mode === 'work' ? 'text-red-400' : 'text-green-400'}`}>
          {mode === 'work' ? 'Thời gian Tập trung' : 'Thời gian Nghỉ ngơi'}
        </div>
        
        {/* Đồng hồ số */}
        <div className="text-5xl font-mono font-bold text-white drop-shadow-md mb-4 tracking-tighter">
          {formatTime(timeLeft)}
        </div>

        {/* Thanh Progress */}
        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mb-6">
          <div 
            className={`h-full transition-all duration-1000 linear ${mode === 'work' ? 'bg-red-400' : 'bg-green-400'}`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {!isRunning ? (
            <button 
              onClick={start}
              className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-colors border border-white/10"
            >
              <Play className="w-6 h-6 fill-current ml-1" />
            </button>
          ) : (
            <button 
              onClick={pause}
              className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-colors border border-white/10"
            >
              <Pause className="w-6 h-6 fill-current" />
            </button>
          )}
          <button 
            onClick={reset}
            className="text-white/50 hover:text-white p-2 transition-colors"
            title="Khôi phục 25 phút"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
