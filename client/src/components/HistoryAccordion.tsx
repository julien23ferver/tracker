import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HistoricalCoil } from "@shared/schema";
import { History, Calendar, Cigarette, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface HistoryAccordionProps {
  history: HistoricalCoil[];
}

export function HistoryAccordion({ history }: HistoryAccordionProps) {
  if (history.length === 0) return null;

  return (
    <div className="mt-8 bg-white rounded-2xl p-6 border border-border/50 shadow-sm">
      <div className="flex items-center gap-2 mb-4 text-muted-foreground font-medium">
        <History className="w-5 h-5" />
        <h3>Historique des Résistances</h3>
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        {history.map((coil) => (
          <AccordionItem key={coil.id} value={`item-${coil.id}`} className="border-b border-border/50 last:border-0">
            <AccordionTrigger className="hover:no-underline hover:bg-slate-50 px-4 rounded-lg transition-colors">
              <div className="flex items-center gap-4 w-full text-left">
                <span className="font-bold text-primary font-display">{coil.name}</span>
                <span className="text-sm text-muted-foreground font-normal">
                  {format(parseISO(coil.date_debut), "d MMM yyyy", { locale: fr })}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-50 p-3 rounded-lg flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Cigarette className="w-3 h-3" /> Total Taffes
                  </span>
                  <span className="font-bold text-lg">{coil.taffes_total.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Durée
                  </span>
                  <span className="font-bold text-lg">{coil.duree_jours} jours</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Moyenne
                  </span>
                  <span className="font-bold text-lg">
                    {Math.round(coil.taffes_total / Math.max(1, coil.duree_jours))} /j
                  </span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
