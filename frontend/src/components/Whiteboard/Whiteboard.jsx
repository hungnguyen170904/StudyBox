import React, { useRef, useState, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { PenTool, Eraser, Trash2, Download } from 'lucide-react';

export default function Whiteboard({ channelId }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState('pen'); // 'pen' or 'eraser'
  
  const { getSocket } = useChatStore();
  const socket = getSocket();

  // Resize canvas to fill the container and initialize context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set internal canvas resolution to match display size to prevent pixelation
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    
    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;
    
    // Handle window resize
    const handleResize = () => {
      // Save current drawing
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCtx.drawImage(canvas, 0, 0);
      
      // Resize
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      
      // Restore drawing
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.drawImage(tempCanvas, 0, 0);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set up socket listeners
  useEffect(() => {
    if (!socket) return;
    
    const onDraw = (data) => {
      if (!contextRef.current) return;
      const ctx = contextRef.current;
      
      ctx.beginPath();
      ctx.moveTo(data.x0, data.y0);
      ctx.lineTo(data.x1, data.y1);
      
      if (data.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = data.size;
        ctx.stroke();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        ctx.stroke();
      }
      ctx.closePath();
    };

    const onClear = () => {
      if (!canvasRef.current || !contextRef.current) return;
      const canvas = canvasRef.current;
      contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on('whiteboard:draw', onDraw);
    socket.on('whiteboard:clear', onClear);

    return () => {
      socket.off('whiteboard:draw', onDraw);
      socket.off('whiteboard:clear', onClear);
    };
  }, [socket]);

  // Drawing Handlers
  const lastPosRef = useRef({ x: 0, y: 0 });

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    
    if (tool === 'eraser') {
      contextRef.current.globalCompositeOperation = 'destination-out';
    } else {
      contextRef.current.globalCompositeOperation = 'source-over';
      contextRef.current.strokeStyle = color;
    }
    
    contextRef.current.lineWidth = lineWidth;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    lastPosRef.current = { x: offsetX, y: offsetY };
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    
    // Vẽ trên local canvas
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();

    // Phát emit qua socket
    socket.emit('whiteboard:draw', {
      channel_id: channelId,
      x0: lastPosRef.current.x,
      y0: lastPosRef.current.y,
      x1: offsetX,
      y1: offsetY,
      color,
      size: lineWidth,
      tool
    });

    // Cập nhật vị trí cũ
    lastPosRef.current = { x: offsetX, y: offsetY };
  };

  const finishDrawing = () => {
    if (!isDrawing) return;
    contextRef.current.closePath();
    setIsDrawing(false);
  };
  
  return (
    <div className="flex-1 relative w-full h-full bg-transparent overflow-hidden flex flex-col">
      {/* Nền phụ nếu cần (tùy chọn) */}
      <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
      
      {/* Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 glass-panel px-6 py-3 rounded-full flex items-center gap-6 shadow-xl border border-white/20">
        
        {/* Tools */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTool('pen')}
            className={`p-2 rounded-xl transition-all ${tool === 'pen' ? 'bg-blue-500 text-white shadow-md' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
            title="Bút vẽ"
          >
            <PenTool className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-xl transition-all ${tool === 'eraser' ? 'bg-blue-500 text-white shadow-md' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
            title="Cục tẩy"
          >
            <Eraser className="w-5 h-5" />
          </button>
        </div>
        
        <div className="w-px h-6 bg-white/10"></div>
        
        {/* Colors (Chỉ hiện khi đang chọn Pen) */}
        <div className={`flex items-center gap-2 transition-opacity ${tool === 'eraser' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          {['#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7'].map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent hover:scale-110'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input 
            type="color" 
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-7 h-7 rounded overflow-hidden cursor-pointer bg-transparent border-0 outline-none ml-1"
            title="Chọn màu tùy chỉnh"
          />
        </div>
        
        <div className="w-px h-6 bg-white/10"></div>
        
        {/* Size slider */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-white/50"></div>
          <input 
            type="range" 
            min="1" 
            max="30" 
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="w-24 accent-blue-500"
          />
          <div className="w-4 h-4 rounded-full bg-white/50"></div>
        </div>
        
        <div className="w-px h-6 bg-white/10"></div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button 
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Lưu thành ảnh"
            onClick={() => {
              const link = document.createElement('a');
              link.download = 'whiteboard.png';
              link.href = canvasRef.current.toDataURL();
              link.click();
            }}
          >
            <Download className="w-5 h-5" />
          </button>
          
          <button 
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl transition-all"
            title="Xóa toàn bộ bảng"
            onClick={() => {
              if (window.confirm('Bạn có chắc muốn xóa toàn bộ nội dung bảng trắng?')) {
                const canvas = canvasRef.current;
                contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
                socket.emit('whiteboard:clear', { channel_id: channelId });
              }
            }}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
        
      </div>
      
      {/* Canvas Area */}
      <div className="flex-1 cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={finishDrawing}
          onMouseLeave={finishDrawing}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
}
