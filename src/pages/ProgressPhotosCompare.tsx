import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function ProgressPhotosCompare() {
  const { angle } = useParams<{ angle: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialIndex = parseInt(searchParams.get("index") ?? "0", 10);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["progress-photos-angle", user?.id, angle],
    queryFn: async () => {
      const { data } = await supabase
        .from("progress_photos")
        .select("*")
        .eq("user_id", user!.id)
        .eq("angle", angle!)
        .order("taken_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!user && !!angle,
  });

  // Clamp index when data loads
  useEffect(() => {
    if (photos.length > 0 && currentIndex >= photos.length) {
      setCurrentIndex(photos.length - 1);
    }
  }, [photos.length, currentIndex]);

  const current = photos[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === photos.length - 1;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-gray-950 px-6 text-center">
        <p className="text-white/70 text-sm mb-6">No {angle} photos yet</p>
        <button
          onClick={() => navigate("/progress-photos")}
          className="text-white text-sm underline underline-offset-4"
        >
          Back to photos
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 select-none">
      {/* Top bar */}
      <div className="relative flex items-center justify-center px-4 pt-6 pb-3">
        <button
          onClick={() => navigate("/progress-photos")}
          className="absolute left-4 flex items-center justify-center h-10 w-10 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        {current && (
          <p className="text-white/80 text-xs font-medium uppercase tracking-widest">
            {format(new Date(current.taken_at), "d MMM yyyy")} · {angle}
          </p>
        )}
      </div>

      {/* Photo + arrows */}
      <div className="flex-1 relative flex items-center justify-center px-2">
        {/* Left arrow */}
        {!isFirst && (
          <button
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="absolute left-3 z-10 flex items-center justify-center h-11 w-11 rounded-full bg-black/40 active:bg-black/60 transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        )}

        {/* Photo */}
        {current && (
          <img
            src={current.photo_url}
            alt={`${angle} - ${format(new Date(current.taken_at), "d MMM yyyy")}`}
            className="max-w-full max-h-[70vh] object-contain rounded-xl"
          />
        )}

        {/* Right arrow */}
        {!isLast && (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="absolute right-3 z-10 flex items-center justify-center h-11 w-11 rounded-full bg-black/40 active:bg-black/60 transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        )}
      </div>

      {/* Dot indicator */}
      <div className="flex items-center justify-center gap-1.5 py-6">
        {photos.map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === currentIndex ? "bg-[#C4899A]" : "bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
