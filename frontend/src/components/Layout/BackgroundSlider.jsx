import { useState, useEffect } from 'react';

const BACKGROUNDS = [
  '/background1.jpg',
  '/background2.jpg',
  '/background3.jpg',
  '/background4.jpg',
  '/background5.jpg',
  '/background6.jpg'
];

export default function BackgroundSlider({ children }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % BACKGROUNDS.length);
        setNextIndex((prev) => (prev + 1) % BACKGROUNDS.length);
        setIsTransitioning(false);
      }, 1500); // Khớp với thời gian transition
    }, 10000); // 10 giây đổi ảnh 1 lần

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1a1a2e]">
      {/* Ảnh hiện tại */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out"
        style={{ 
          backgroundImage: `url(${BACKGROUNDS[currentIndex]})`,
          opacity: isTransitioning ? 0 : 1 
        }}
      />
      
      {/* Ảnh tiếp theo (ẩn dưới ảnh hiện tại và hiện lên khi ảnh hiện tại mờ đi) */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `url(${BACKGROUNDS[nextIndex]})`,
          zIndex: -1
        }}
      />

      {/* Lớp phủ đen mờ (Overlay) để chữ dễ đọc */}
      <div className="absolute inset-0 bg-black/40 z-0"></div>

      {/* Nội dung trang web */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
