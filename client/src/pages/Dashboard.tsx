import { useAppState } from "@/hooks/use-vape-tracker";
import { StatusBanner } from "@/components/StatusBanner";
import { MetricCard } from "@/components/MetricCard";
import { DailyEntryForm } from "@/components/DailyEntryForm";
import { ResetDialog } from "@/components/ResetDialog";
import { HistoryAccordion } from "@/components/HistoryAccordion";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Cigarette, Droplets, Zap, Calendar, TrendingUp } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export default function Dashboard() {
  const { data: state, isLoading, error } = useAppState();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !state) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="bg-destructive/10 p-4 rounded-full w-fit mx-auto text-destructive">
            <Zap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">Erreur de chargement</h2>
          <p className="text-muted-foreground">Impossible de récupérer les données. Veuillez vérifier votre connexion ou réessayer.</p>
        </div>
      </div>
    );
  }

  const { resistance_actuelle: current, historique, logs_quotidiens } = state;

  // Derived calculations
  const wearColor = current?.usure_pourcent && current.usure_pourcent > 80 
    ? "bg-destructive" 
    : current?.usure_pourcent && current.usure_pourcent > 60 
      ? "bg-amber-500" 
      : "bg-emerald-500";
      
  const isDanger = (current?.usure_pourcent || 0) > 80;
  const isWarning = (current?.usure_pourcent || 0) > 60;
  
  // Ohms warning: current > initial + 0.05
  const ohmsWarning = current && (current.ohms_actuel > current.ohms_initial + 0.05);
  
  // Calculate average puffs per day for current coil
  const daysActive = current ? Math.max(1, Math.floor((new Date().getTime() - new Date(current.date_debut).getTime()) / (1000 * 60 * 60 * 24))) : 1;
  const avgPuffs = current ? Math.round(current.compteur_pod / daysActive) : 0;

  // Simple linear prediction
  const estimatedDaysRemaining = current 
    ? Math.max(0, Math.floor(current.taffes_restants / (avgPuffs || 1))) 
    : 0;
  const predictedEndDate = addDays(new Date(), estimatedDaysRemaining);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Vape Tracker</h1>
            <p className="text-muted-foreground font-medium">Suivi d'utilisation et maintenance</p>
          </div>
          {current && (
            <div className="bg-white px-4 py-2 rounded-lg border border-border/50 shadow-sm flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                {current.name.substring(0, 3)}
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Résistance Actuelle</div>
                <div className="font-bold text-slate-900">{current.name}</div>
              </div>
            </div>
          )}
        </header>

        {!current ? (
          <div className="bg-white p-12 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center text-center space-y-6 shadow-sm">
            <div className="bg-slate-100 p-6 rounded-full">
              <Zap className="w-12 h-12 text-slate-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Aucune résistance active</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">Commencez par initialiser une nouvelle résistance pour commencer le suivi.</p>
            </div>
            <div className="w-full max-w-xs">
              <ResetDialog />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Status (7 cols on large) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Status Banner */}
              <StatusBanner 
                isWarning={isDanger || isWarning} 
                message={isDanger ? "🔴 CHANGE MAINTENANT (Usure critique)" : isWarning ? "⚠️ Prévoir changement bientôt" : "✅ TOUT VA BIEN"} 
              />
              
              {/* Ohms specific warning */}
              {ohmsWarning && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                  <Zap className="w-5 h-5" />
                  <span className="font-medium">Résistance instable : {current.ohms_actuel}Ω (Initial: {current.ohms_initial}Ω)</span>
                </div>
              )}

              {/* Wear Card */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border/60 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <TrendingUp className="w-32 h-32" />
                </div>
                
                <div className="relative z-10">
                  <h2 className="text-xl font-bold font-display text-slate-900 mb-6 flex items-center gap-2">
                    État d'usure
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white font-bold ml-2 ${wearColor}`}>
                      {current.usure_pourcent.toFixed(1)}%
                    </span>
                  </h2>
                  
                  <div className="space-y-2 mb-8">
                    <div className="flex justify-between text-sm font-medium mb-1">
                      <span className="text-muted-foreground">Progression de vie</span>
                      <span className={`${(current.usure_pourcent || 0) > 80 ? "text-destructive" : "text-emerald-600"}`}>
                        {current.usure_pourcent.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={current.usure_pourcent} className="h-4 bg-slate-100" indicatorClassName={wearColor} />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>Neuf</span>
                      <span>Critique (80%)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <div className="text-muted-foreground text-xs font-bold uppercase mb-1 flex items-center gap-1">
                        <Cigarette className="w-3 h-3" /> Taffes
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{current.compteur_pod}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <div className="text-muted-foreground text-xs font-bold uppercase mb-1 flex items-center gap-1">
                        <Droplets className="w-3 h-3" /> Conso
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{current.ml_restants.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">ml est.</span></div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <div className="text-muted-foreground text-xs font-bold uppercase mb-1 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Ohms
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{current.ohms_actuel}Ω</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <div className="text-muted-foreground text-xs font-bold uppercase mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Jours
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{daysActive}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Predictions Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <MetricCard 
                   label="Changement estimé" 
                   value={format(predictedEndDate, "d MMM", { locale: fr })}
                   subValue={`dans ~${estimatedDaysRemaining}j`}
                   icon={<Calendar className="w-5 h-5" />}
                 />
                 <MetricCard 
                   label="Utilisation Moyenne" 
                   value={avgPuffs}
                   subValue="taffes/jour"
                   icon={<TrendingUp className="w-5 h-5" />}
                   className="bg-blue-50/50 border-blue-100"
                 />
              </div>

              <ResetDialog />
              <HistoryAccordion history={historique} />
            </div>

            {/* Right Column: Input Form (5 cols on large) */}
            <div className="lg:col-span-5 relative">
              <div className="sticky top-6 space-y-6">
                <DailyEntryForm 
                  coilId={current.id} 
                  currentOhms={current.ohms_actuel} 
                />
                
                {/* Mini Log Feed */}
                <div className="bg-white rounded-2xl border border-border/50 p-6 shadow-sm">
                  <h3 className="font-bold font-display text-lg mb-4 text-slate-800">Derniers ajouts</h3>
                  <div className="space-y-4">
                    {logs_quotidiens.slice(0, 5).map((log, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-2 rounded-lg transition-colors -mx-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-sm">
                            {format(parseISO(log.date), "EEE d MMM", { locale: fr })}
                          </span>
                          <span className="text-xs text-muted-foreground">{log.taffes} taffes</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {log.ml_ajoutes > 0 && (
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                              <Droplets className="w-3 h-3" /> +{log.ml_ajoutes}ml
                            </span>
                          )}
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            {log.ohms}Ω
                          </span>
                        </div>
                      </div>
                    ))}
                    {logs_quotidiens.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4 italic">Aucune donnée pour cette résistance</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-12 w-48 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-80 w-full rounded-3xl" />
          </div>
          <div className="lg:col-span-5">
             <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
