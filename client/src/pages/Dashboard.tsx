import { useState } from "react";
import { useAppState } from "@/hooks/use-vape-tracker";
import { StatusBanner } from "@/components/StatusBanner";
import { MetricCard } from "@/components/MetricCard";
import { DailyEntryForm } from "@/components/DailyEntryForm";
import { ResetDialog } from "@/components/ResetDialog";
import { DailyUsageChart } from "@/components/DailyUsageChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Cigarette, Droplets, Zap, Calendar, TrendingUp, Home, BarChart2, Settings, Plus, Activity } from "lucide-react";
import { format, addDays, parseISO, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: state, isLoading, error } = useAppState();
  const [currentView, setCurrentView] = useState<"home" | "journal" | "settings">("home");
  const [isEntryOpen, setIsEntryOpen] = useState(false);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !state) {
    return (
      <div className="flex h-screen items-center justify-center p-4 bg-slate-50">
        <div className="text-center space-y-4 max-w-md">
          <div className="bg-destructive/10 p-4 rounded-full w-fit mx-auto text-destructive">
            <Zap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">Erreur</h2>
          <p className="text-muted-foreground">Impossible de charger les données.</p>
        </div>
      </div>
    );
  }

  const { resistance_actuelle: current, historique, logs_quotidiens } = state;

  // --- CALCULS ---
  const historyTotal = historique.reduce((acc, coil) => acc + (coil.taffes_total || 0), 0);
  const currentTotal = current ? current.compteur_pod : 0;
  const deviceTotalPuffs = historyTotal + currentTotal;

  // Puffs Aujourd'hui
  const today = new Date();
  const todayLogs = logs_quotidiens.filter(log => isSameDay(parseISO(log.date), today));
  const todayPuffs = todayLogs.reduce((acc, log) => acc + log.taffes, 0);

  // Health Color
  const healthPercent = current ? (100 - current.usure_pourcent) : 0;
  const wearColor = current?.usure_pourcent && current.usure_pourcent > 80 
    ? "text-destructive" 
    : current?.usure_pourcent && current.usure_pourcent > 60 
      ? "text-amber-500" 
      : "text-emerald-500";
  
  const strokeColor = current?.usure_pourcent && current.usure_pourcent > 80 
  ? "#ef4444" // red-500
  : current?.usure_pourcent && current.usure_pourcent > 60 
    ? "#f59e0b" // amber-500
    : "#10b981"; // emerald-500

  // Predictions
  const avgPuffs = 150; // Target
  const estimatedDaysRemaining = current 
    ? Math.max(0, Math.floor(current.taffes_restants / avgPuffs)) 
    : 0;
  const predictedEndDate = addDays(new Date(), estimatedDaysRemaining);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      
      {/* HEADER COMMUN */}
      <div className="bg-white px-6 pt-8 pb-4 border-b border-slate-100 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Vape Tracker</h1>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {format(today, "EEEE d MMMM", { locale: fr })}
            </p>
          </div>
          {current && (
            <div className="bg-slate-900 text-white px-3 py-1.5 rounded-full text-xs font-bold font-mono">
              {deviceTotalPuffs} total
            </div>
          )}
        </div>
      </div>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        
        {/* === VUE ACCUEIL === */}
        {currentView === "home" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {!current ? (
               <div className="bg-white p-8 rounded-3xl shadow-sm text-center space-y-4">
                 <p className="text-muted-foreground">Aucune résistance active.</p>
                 <ResetDialog />
               </div>
            ) : (
              <>
                {/* BIG HEALTH GAUGE */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    {/* SVG Circular Progress */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="96" cy="96" r="88" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                      <circle 
                        cx="96" cy="96" r="88" 
                        stroke={strokeColor} 
                        strokeWidth="12" 
                        fill="transparent" 
                        strokeDasharray={2 * Math.PI * 88}
                        strokeDashoffset={2 * Math.PI * 88 * (1 - healthPercent / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Santé</span>
                      <span className={cn("text-5xl font-black tracking-tighter", wearColor)}>
                        {healthPercent.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Text */}
                  <div className="mt-6 text-center">
                    <p className="text-sm font-medium text-slate-500">
                      {current.usure_pourcent > 80 ? "Changement nécessaire !" : "Fonctionnement optimal"}
                    </p>
                  </div>
                </div>

                {/* TODAY STATS */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary text-primary-foreground rounded-3xl p-6 shadow-lg shadow-primary/20 flex flex-col justify-between h-40">
                    <div className="bg-white/20 w-fit p-2 rounded-xl">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-primary-foreground/80 text-xs font-bold uppercase tracking-wider block mb-1">Aujourd'hui</span>
                      <span className="text-4xl font-black tracking-tight">{todayPuffs}</span>
                      <span className="text-xs ml-1 opacity-80">taffes</span>
                    </div>
                  </div>

                  <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-40">
                    <div className="bg-slate-100 w-fit p-2 rounded-xl">
                      <Droplets className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Restant</span>
                      <span className="text-3xl font-bold tracking-tight">{current.ml_restants.toFixed(1)}</span>
                      <span className="text-sm ml-1 text-slate-500 font-medium">ml</span>
                    </div>
                  </div>
                </div>

                {/* FAB (Floating Action Button) for Entry */}
                <Dialog open={isEntryOpen} onOpenChange={setIsEntryOpen}>
                  <DialogTrigger asChild>
                    <button className="w-full bg-slate-900 text-white rounded-2xl py-4 font-bold text-lg shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                      <Plus className="w-6 h-6" />
                      Nouveau Relevé
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Mise à jour compteur</DialogTitle>
                    </DialogHeader>
                    <DailyEntryForm 
                      coilId={current.id} 
                      currentOhms={current.ohms_actuel} 
                      currentTotalPuffs={deviceTotalPuffs}
                      onSuccess={() => setIsEntryOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        )}

        {/* === VUE JOURNAL === */}
        {currentView === "journal" && (
           <div className="space-y-6 animate-in fade-in duration-500">
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-primary" />
                  Activité (7 jours)
                </h3>
                <DailyUsageChart data={logs_quotidiens} />
             </div>

             <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-lg mb-6 text-slate-800">Historique</h3>
                <div className="space-y-4">
                  {logs_quotidiens.map((log, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-sm">
                          {format(parseISO(log.date), "EEE d MMM", { locale: fr })}
                        </span>
                        <span className="text-xs text-muted-foreground">{log.taffes} taffes</span>
                      </div>
                      <div className="flex items-center gap-2">
                         {log.ml_ajoutes > 0 && (
                            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-full">
                              +{log.ml_ajoutes}ml
                            </span>
                          )}
                          <span className="text-xs font-mono text-slate-400">{log.ohms}Ω</span>
                      </div>
                    </div>
                  ))}
                  {logs_quotidiens.length === 0 && <p className="text-center text-sm text-slate-400">Rien à afficher</p>}
                </div>
             </div>
           </div>
        )}

        {/* === VUE REGLAGES === */}
        {currentView === "settings" && current && (
          <div className="space-y-6 animate-in fade-in duration-500">
             
             {/* Info Card */}
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Informations Résistance
                </h3>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-xs font-bold text-slate-400 uppercase">Ohms Init.</p>
                    <p className="text-xl font-bold text-slate-800">{current.ohms_initial}Ω</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl">
                     <p className="text-xs font-bold text-slate-400 uppercase">Ohms Actuel</p>
                     <p className={cn("text-xl font-bold", current.ohms_actuel > current.ohms_initial + 0.05 ? "text-amber-500" : "text-slate-800")}>
                       {current.ohms_actuel}Ω
                     </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl col-span-2">
                     <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                       <Calendar className="w-3 h-3" /> Fin estimée
                     </p>
                     <p className="text-xl font-bold text-slate-800">
                       {format(predictedEndDate, "d MMMM yyyy", { locale: fr })}
                     </p>
                     <p className="text-xs text-slate-500 mt-1">dans environ {estimatedDaysRemaining} jours</p>
                  </div>
                </div>
             </div>

             <div className="bg-white p-6 rounded-3xl border border-dashed border-slate-200">
                <h3 className="font-bold text-lg text-slate-800 mb-2">Zone de maintenance</h3>
                <p className="text-sm text-slate-500 mb-6">À utiliser uniquement lorsque vous changez physiquement la résistance.</p>
                <ResetDialog />
             </div>
          </div>
        )}

      </main>

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 pb-safe pt-2 px-6 h-20 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)] z-50 flex justify-around items-start">
        <button 
          onClick={() => setCurrentView("home")}
          className={cn("flex flex-col items-center gap-1 p-2 transition-colors", currentView === "home" ? "text-primary" : "text-slate-400 hover:text-slate-600")}
        >
          <Home className={cn("w-6 h-6", currentView === "home" && "fill-current")} />
          <span className="text-[10px] font-bold">Accueil</span>
        </button>

        <button 
          onClick={() => setCurrentView("journal")}
          className={cn("flex flex-col items-center gap-1 p-2 transition-colors", currentView === "journal" ? "text-primary" : "text-slate-400 hover:text-slate-600")}
        >
          <BarChart2 className={cn("w-6 h-6", currentView === "journal" && "fill-current")} />
          <span className="text-[10px] font-bold">Journal</span>
        </button>

        <button 
          onClick={() => setCurrentView("settings")}
          className={cn("flex flex-col items-center gap-1 p-2 transition-colors", currentView === "settings" ? "text-primary" : "text-slate-400 hover:text-slate-600")}
        >
          <Settings className={cn("w-6 h-6", currentView === "settings" && "fill-current")} />
          <span className="text-[10px] font-bold">Réglages</span>
        </button>
      </nav>

    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-8">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-64 w-full rounded-[2rem]" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    </div>
  );
}
