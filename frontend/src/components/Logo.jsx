import React from 'react';
import { Box } from 'lucide-react';

export default function Logo({ className = "w-8 h-8", textClassName = "text-xl" }) {
  return (
    <div className="flex items-center justify-center gap-2 select-none">
      <div className="relative flex items-center justify-center">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-white blur-md opacity-50 rounded-full"></div>
        <Box className={`relative text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] ${className}`} />
      </div>
      <span className={`font-extrabold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${textClassName}`}>
        Study<span className="text-pink-300">Box</span>
      </span>
    </div>
  );
}
