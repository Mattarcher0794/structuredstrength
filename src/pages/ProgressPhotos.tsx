import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Camera } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTitleRow } from "@/components/PageTitleRow";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import { toast } from "sonner";
import { format } from "date-fns";
import { BottomSheet } from "@/components/BottomSheet";

const ANGLES = ["front", "side", "back"] as const;
type Angle = (typeof ANGLES)[number];

const ANGLE_CONFIG: Record<Angle, { title: string; instruction: string }> = {
  front: { title: "Front photo", instruction: "Stand facing forward, arms relaxed at your sides" },
  side: { title: "Side photo", instruction: "Stand side-on, arms relaxed at your sides" },
  back: { title: "Back photo", instruction: "Stand facing away, arms relaxed at your sides" },
};

interface PhotoGroup {
  date: string;
  photos: { angle: string; photo_url: string; id: string }[];
}

export default function ProgressPhotos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { scrollRef, opacity, handleScroll } = useScrollHeader();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<Record<Angle, File | null>>({ front: null, side: null, back: null });
  const [previews, setPreviews] = useState<Record<Angle, string | null>>({ front: null, side: null, back: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: allPhotos = [], isLoading } = useQuery({
    queryKey: ["progress-photos", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("progress_photos")
        .select("*")
        .eq("user_id", user!.id)
        .order("taken_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  // Group photos by date
  const grouped: PhotoGroup[] = (() => {
    const map = new Map<string, PhotoGroup>();
    for (const p of allPhotos) {
      const dateKey = format(new Date(p.taken_at), "d MMM yyyy");
      if (!map.has(dateKey)) map.set(dateKey, { date: dateKey, photos: [] });
      map.get(dateKey)!.photos.push({ angle: p.angle, photo_url: p.photo_url, id: p.id });
    }
    return Array.from(map.values());
  })();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const timestamp = Date.now();
      const rows: { user_id: string; photo_url: string; angle: string }[] = [];

      for (const angle of ANGLES) {
        const file = photos[angle];
        if (!file) throw new Error(`Missing ${angle} photo`);

        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user!.id}/${timestamp}-${angle}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("progress-photos")
          .upload(path, file, { contentType: file.type });
        if (uploadError) throw uploadError;

        const { data: urlData } = await supabase.storage
          .from("progress-photos")
          .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

        rows.push({
          user_id: user!.id,
          photo_url: urlData?.signedUrl ?? path,
          angle,
        });
      }

      const { error } = await supabase.from("progress_photos").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-photos", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["progress-photos-latest", user?.id] });
      toast("Check-in saved!");
      closeFlow();
    },
    onError: () => {
      toast("Something went wrong — try again");
    },
  });

  const closeFlow = () => {
    setSheetOpen(false);
    setStep(0);
    setPhotos({ front: null, side: null, back: null });
    setPreviews({ front: null, side: null, back: null });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const angle = ANGLES[step];
    setPhotos((prev) => ({ ...prev, [angle]: file }));
    setPreviews((prev) => ({ ...prev, [angle]: URL.createObjectURL(file) }));
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const currentAngle = ANGLES[step];
  const config = ANGLE_CONFIG[currentAngle];
  const canAdvance = !!photos[currentAngle];
  const isLastStep = step === 2;

  return (
    <>
      <PageHeader title="Progress Photos" showBack opacity={opacity} />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="bg-background"
        style={{ height: '100vh', overflowY: 'auto', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <PageTitleRow title="Progress Photos" showBack />

        {/* Content */}
        <div className="flex-1 px-5 pb-32">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-8 text-center mt-4">
            <p className="text-muted-foreground text-sm">
              No check-ins yet — add your first one
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {grouped.map((group) => (
              <div key={group.date}>
                <p className="text-xs font-medium text-muted-foreground mb-2">{group.date}</p>
                <div className="grid grid-cols-3 gap-2">
                  {ANGLES.map((angle) => {
                    const photo = group.photos.find((p) => p.angle === angle);
                    // Compute index of this entry within all photos of this angle (ASC order)
                    const anglePhotos = allPhotos
                      .filter((p) => p.angle === angle)
                      .sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime());
                    const angleIndex = photo ? anglePhotos.findIndex((p) => p.id === photo.id) : -1;

                    return (
                      <div
                        key={angle}
                        className="aspect-square rounded-xl bg-muted border border-border overflow-hidden"
                        onClick={() => {
                          if (photo && angleIndex >= 0) {
                            navigate(`/progress-photos/compare/${angle}?index=${angleIndex}`);
                          }
                        }}
                      >
                        {photo ? (
                          <img
                            src={photo.photo_url}
                            alt={`${angle} - ${group.date}`}
                            className="w-full h-full object-cover active:opacity-80 transition-opacity cursor-pointer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-1">
                  {ANGLES.map((a) => (
                    <p key={a} className="flex-1 text-[10px] text-center text-muted-foreground capitalize">{a}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 pb-8 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          onClick={() => setSheetOpen(true)}
          className="w-full rounded-2xl py-6 text-base font-medium"
          size="lg"
        >
          Add check-in
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Stepped submission flow */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={closeFlow}
        title="New check-in"
      >
        <div className="pb-4">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-5">
            {ANGLES.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-8 bg-primary" : i < step ? "w-6 bg-primary/40" : "w-6 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="text-center mb-4">
            <p className="text-base font-medium">{config.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{config.instruction}</p>
          </div>

          {/* Photo area */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center gap-2 overflow-hidden transition-colors hover:bg-muted"
          >
            {previews[currentAngle] ? (
              <img
                src={previews[currentAngle]!}
                alt={`${currentAngle} preview`}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <>
                <Camera className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Tap to select photo</p>
              </>
            )}
          </button>

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-4">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="rounded-2xl py-5 flex-1"
                size="lg"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            {isLastStep ? (
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!canAdvance || saveMutation.isPending}
                className="w-full rounded-2xl py-5 text-base font-medium flex-1"
                size="lg"
              >
                {saveMutation.isPending ? "Saving…" : "Save check-in"}
              </Button>
            ) : (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canAdvance}
                className="w-full rounded-2xl py-5 text-base font-medium flex-1"
                size="lg"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </BottomSheet>
      </div>
    </>
  );
}
