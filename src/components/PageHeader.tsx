import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  opacity: number;
}

export function PageHeader({ title, showBack = false, opacity }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 'env(safe-area-inset-top)',
        zIndex: 50,
        backgroundColor: `rgba(245, 242, 239, ${opacity})`,
        boxShadow: `0 1px 0 rgba(0,0,0,${opacity * 0.06}), 0 2px 8px rgba(0,0,0,${opacity * 0.04})`,
        pointerEvents: opacity > 0.5 ? 'auto' : 'none',
      }}
    >
      <div className="flex items-center justify-center h-11 px-4 relative">
        {/* Back button — always visible, never fades */}
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 flex items-center"
            style={{
              color: '#2C2925',
              opacity: 1,
              pointerEvents: 'auto',
              zIndex: 1,
            }}
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {/* Title — fades in with scroll */}
        <span
          className="text-sm font-medium tracking-wide"
          style={{
            color: '#2C2925',
            opacity,
            transition: 'opacity 0.15s ease',
          }}
        >
          {title}
        </span>
      </div>
    </div>
  );
}
