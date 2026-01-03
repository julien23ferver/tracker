import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetCoil } from "@/hooks/use-vape-tracker";
import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  startedAt: z.string().min(1, "Date requise"),
  initialOhms: z.coerce.number().min(0.1, "Valeur invalide"),
});

type FormData = z.infer<typeof formSchema>;

export function ResetDialog() {
  const [open, setOpen] = useState(false);
  const mutation = useResetCoil();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `R#${Math.floor(Math.random() * 100) + 1}`, // Suggested name
      startedAt: new Date().toISOString().split('T')[0],
      initialOhms: 0.15,
    }
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      name: data.name,
      startedAt: data.startedAt,
      initialOhms: data.initialOhms,
      isActive: true,
    }, {
      onSuccess: () => {
        setOpen(false);
        reset();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mt-6 border-dashed border-2 hover:border-primary hover:text-primary transition-all">
          <RefreshCw className="w-4 h-4 mr-2" />
          Nouvelle Résistance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Installer une nouvelle résistance</DialogTitle>
          <DialogDescription>
            Cette action archivera la résistance actuelle et démarrera un nouveau cycle de suivi.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la résistance</Label>
            <Input id="name" {...register("name")} placeholder="Ex: R#5" />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startedAt">Date début</Label>
              <Input type="date" id="startedAt" {...register("startedAt")} />
              {errors.startedAt && <span className="text-xs text-destructive">{errors.startedAt.message}</span>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="initialOhms">Ohms initiaux</Label>
              <Input 
                type="number" 
                step="0.01" 
                id="initialOhms" 
                {...register("initialOhms")} 
              />
              {errors.initialOhms && <span className="text-xs text-destructive">{errors.initialOhms.message}</span>}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
