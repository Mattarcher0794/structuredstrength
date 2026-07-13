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
  const [isComparing, setIsComparing] = useState(false);
  const [compareIndex, setCompareIndex] = useState(0);

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

  // Set default compareIndex when entering compare mode
  useEffect(() => {
    if (isComparing && photos.length >= 2) {
      setCompareIndex(photos.length - 2);
    }
  }, [isComparing, photos.length]);

  const current = photos[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === photos.length - 1;
  const canCompare = photos.length >= 2;

  // Compare mode: latest is fixed on the right, left navigates all except latest
  const latestPhoto = photos.length > 0 ? photos[photos.length - 1] : null;
  const comparablePhotos = photos.slice(0, -1); // everything except the latest
  const comparePhoto = comparablePhotos[compareIndex];
  const isCompareFirst = compareIndex === 0;
  const isCompareLast = compareIndex === comparablePhotos.length - 1;

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
          onClick={() => navigate("/progress-photos", { replace: true })}
          className="text-white text-sm underline underline-offset-4"
        >
          Back to photos
        </button>
      </div>
    );
  }

  if (isComparing && latestPhoto && comparePhoto) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-950 select-none">
        {/* Top bar */}
        <div className="relative flex items-center justify-center px-4 pt-6 pb-3">
          <button
            onClick={() => setIsComparing(false)}
            className="absolute left-4 flex items-center justify-center h-10 w-10 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <p className="text-white/80 text-xs font-medium uppercase tracking-widest">
            Compare · {angle}
          </p>
        </div>

        {/* Two columns */}
        <div className="flex-1 flex gap-2 px-2 min-h-0">
          {/* Left column — navigable */}
          <div className="flex-1 flex flex-col items-center min-h-0">
            <p className="text-white/70 text-[10px] font-medium uppercase tracking-widest mb-2">
              {format(new Date(comparePhoto.taken_at), "d MMM yyyy")}
            </p>
            <div className="flex-1 flex items-center justify-center min-h-0 w-full">
              <img
                src={comparePhoto.photo_url}
                alt={`${angle} - ${format(new Date(comparePhoto.taken_at), "d MMM yyyy")}`}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
            {/* Left column arrows */}
            <div className="flex items-center justify-center gap-4 py-3">
              {!isCompareFirst ? (
                <button
                  onClick={() => setCompareIndex((i) => i - 1)}
                  className="flex items-center justify-center h-11 w-11 rounded-full bg-black/40 active:bg-black/60 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
              ) : (
                <div className="h-11 w-11" />
              )}
              {!isCompareLast ? (
                <button
                  onClick={() => setCompareIndex((i) => i + 1)}
                  className="flex items-center justify-center h-11 w-11 rounded-full bg-black/40 active:bg-black/60 transition-colors"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              ) : (
                <div className="h-11 w-11" />
              )}
            </div>
          </div>

          {/* Right column — fixed latest */}
          <div className="flex-1 flex flex-col items-center min-h-0">
            <p className="text-white/70 text-[10px] font-medium uppercase tracking-widest mb-2">
              {format(new Date(latestPhoto.taken_at), "d MMM yyyy")}
            </p>
            <div className="flex-1 flex items-center justify-center min-h-0 w-full">
              <img
                src={latestPhoto.photo_url}
                alt={`${angle} - ${format(new Date(latestPhoto.taken_at), "d MMM yyyy")}`}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
            {/* Spacer to match left column arrows height */}
            <div className="py-3">
              <div className="h-11" />
            </div>
          </div>
        </div>

        {/* Dot indicator for left column */}
        <div className="flex items-center justify-center gap-1.5 pb-6">
          {comparablePhotos.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === compareIndex ? "bg-primary" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Single photo view
  return (
    <div className="flex flex-col min-h-screen bg-gray-950 select-none">
      {/* Top bar */}
      <div className="relative flex items-center justify-center px-4 pt-6 pb-3">
        <button
          onClick={() => navigate("/progress-photos", { replace: true })}
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
        {!isFirst && (
          <button
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="absolute left-3 z-10 flex items-center justify-center h-11 w-11 rounded-full bg-black/40 active:bg-black/60 transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        )}

        {current && (
          <img
            src={current.photo_url}
            alt={`${angle} - ${format(new Date(current.taken_at), "d MMM yyyy")}`}
            className="max-w-full max-h-[70vh] object-contain rounded-xl"
          />
        )}

        {!isLast && (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="absolute right-3 z-10 flex items-center justify-center h-11 w-11 rounded-full bg-black/40 active:bg-black/60 transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        )}
      </div>

      {/* Compare button + dot indicator */}
      <div className="px-5 pb-2">
        {canCompare && (
          <button
            onClick={() => setIsComparing(true)}
            className="w-full py-3 rounded-full bg-primary text-white text-sm font-medium active:opacity-80 transition-opacity"
          >
            Compare
          </button>
        )}
      </div>
      <div className="flex items-center justify-center gap-1.5 pb-6">
        {photos.map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === currentIndex ? "bg-primary" : "bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
