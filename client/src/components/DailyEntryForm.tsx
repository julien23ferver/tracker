import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAddEntry } from "@/hooks/use-vape-tracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cigarette, Droplets, Zap, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const entrySchema = z.object({
  puffs: z.coerce.number().min(0),
  mlAdded: z.coerce.number().min(0),
  measuredOhms: z.coerce.number().min(0.01),
  date: z.string(),
});

type EntryFormData = z.infer<typeof entrySchema>;

interface DailyEntryFormProps {
  coilId: number;
  currentOhms: number;
  currentTotalPuffs: number;
  onSuccess?: () => void;
}

export function DailyEntryForm({ coilId, currentOhms, currentTotalPuffs, onSuccess }: DailyEntryFormProps) {
  const mutation = useAddEntry();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      puffs: currentTotalPuffs,
      mlAdded: 0,
      measuredOhms: currentOhms,
      date: format(new Date(), "yyyy-MM-dd"),
    }
  });

  // Watch values
  const watchedPuffs = watch("puffs");

  // Calculate estimated consumption for display only (visual guide)
  const puffDiff = Math.max(0, (watchedPuffs || 0) - currentTotalPuffs);
  // Using the calibrated rate roughly (0.0128) or keeping simple /100 for UI estimation
  const estimatedConsumption = (puffDiff / 100).toFixed(1);

  const onSubmit = (data: EntryFormData) => {
    let dailyPuffs = data.puffs;
    
    if (data.puffs >= currentTotalPuffs) {
      dailyPuffs = data.puffs - currentTotalPuffs;
    } 

    mutation.mutate({
      coilId,
      date: data.date,
      puffs: dailyPuffs,
      mlAdded: data.mlAdded,
      measuredOhms: data.measuredOhms,
    }, {
      onSuccess: () => {
        reset({
          puffs: data.puffs, 
          mlAdded: 0,
          measuredOhms: data.measuredOhms,
          date: format(new Date(), "yyyy-MM-dd"),
        });
        if (onSuccess) onSuccess();
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-border/50 overflow-hidden">
      <div className="bg-primary/5 p-6 border-b border-primary/10">
        <h2 className="text-xl font-bold font-display text-primary flex items-center gap-2">
          <span className="bg-primary text-white p-1 rounded-md"><Save className="w-4 h-4" /></span>
          Relevé Compteur
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
        <div className="space-y-4">
          {/* Taffes Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground/80">
              <Cigarette className="w-4 h-4 text-primary" />
              Compteur Total (Puffs)
            </Label>
            <div className="relative">
                <Input 
                  type="number" 
                  className="h-12 text-lg font-medium bg-slate-50 border-slate-200 focus:bg-white transition-all pr-12"
                  placeholder={currentTotalPuffs.toString()}
                  {...register("puffs")}
                />
                <div className="absolute right-3 top-3 text-xs text-muted-foreground font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                    Diff: +{Math.max(0, (watchedPuffs || 0) - currentTotalPuffs)}
                </div>
            </div>
            {errors.puffs && <p className="text-red-500 text-xs">{errors.puffs.message}</p>}
          </div>

          {/* ML Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground/80">
              <Droplets className="w-4 h-4 text-blue-500" />
              Liquide Ajouté (Remplissage)
            </Label>
            <div className="relative">
                <Input 
                  type="number" 
                  step="0.1"
                  className="h-12 text-lg font-medium bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  placeholder="0.0"
                  {...register("mlAdded")}
                />
                <div className="absolute right-3 top-3 text-[10px] text-muted-foreground bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    Conso. estimée: ~{estimatedConsumption}ml
                </div>
            </div>
            {errors.mlAdded && <p className="text-red-500 text-xs">{errors.mlAdded.message}</p>}
            <p className="text-[10px] text-amber-600 font-medium">Mettre à 0 si pas de remplissage !</p>
          </div>

          {/* Ohms Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground/80">
              <Zap className="w-4 h-4 text-amber-500" />
              Résistance Mesurée (Ω)
            </Label>
            <Input 
              type="number" 
              step="0.01"
              className="h-12 text-lg font-medium bg-slate-50 border-slate-200 focus:bg-white transition-all"
              placeholder="0.15"
              {...register("measuredOhms")}
            />
            {errors.measuredOhms && <p className="text-red-500 text-xs">{errors.measuredOhms.message}</p>}
          </div>
          
          <Input type="date" className="hidden" {...register("date")} />
        </div>

        <Button 
          type="submit" 
          disabled={mutation.isPending}
          className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
        >
          {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
          ENREGISTRER
        </Button>
      </form>
    </div>
  );
}
