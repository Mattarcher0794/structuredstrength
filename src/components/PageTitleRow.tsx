import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageTitleRowProps {
  title: string;
  showBack?: boolean;
}

export function PageTitleRow({ title, showBack = false }: PageTitleRowProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 px-5 pt-6 pb-4">
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center flex-shrink-0"
          style={{ color: '#2C2925' }}
        >
          <ChevronLeft size={24} />
        </button>
      )}
      <h1 className="text-2xl font-semibold" style={{ color: '#1A1714' }}>
        {title}
      </h1>
    </div>
  );
}
