import {
  type InsertCoil,
  type InsertEntry,
  type CurrentCoilStatus,
  type HistoricalCoil,
  type DailyLog,
  type AppStateResponse,
  type Coil,
  type Entry
} from "@shared/schema";

const STORAGE_KEY = "vape_tracker_data_v13_calibrated";

// --- CONSTANTES UTILISATEUR "CODEUR" ---
const USER_CONSTANTS = {
  V_MAX_COIL: 45.0,      // Capacité théorique max (ml)
  S_COEFF: 0.75,         // Coefficient e-CG (Fouling factor)
  PUFF_RATIO: 100.4,     // Taffes pour 1 ml (Calibré)
  WEAR_LIMIT: 100        // Seuil max usure (%)
};

interface JsonData {
  coils: Coil[];
  entries: Entry[];
}

class LocalStorageManager {
  private loadData(): JsonData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return this.initializeData();
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to load data from localStorage", e);
      return this.initializeData();
    }
  }

  private saveData(data: JsonData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save data to localStorage", e);
    }
  }

  private initializeData(): JsonData {
    const emptyData: JsonData = {
      coils: [
        {
          id: 1,
          name: "R#1 (Crash Test)",
          startedAt: "2025-12-15",
          endedAt: "2025-12-24",
          initialOhms: 0.6,
          isActive: false,
          totalPuffs: 570,
          totalDurationDays: 9
        },
        {
          id: 2,
          name: "R#2 (Backup - 2ml dedans)",
          startedAt: "2025-12-25",
          endedAt: "2026-01-01",
          initialOhms: 0.4,
          isActive: false,
          totalPuffs: 979,
          totalDurationDays: 7
        },
        {
          id: 3,
          name: "R#3 (Optimisée)",
          startedAt: "2026-01-01", // Calibré au 1er janvier pour lissage moyenne
          initialOhms: 0.4,
          isActive: true,
          endedAt: null,
          totalPuffs: null,
          totalDurationDays: null
        }
      ],
      entries: [
        {
          id: 1, coilId: 1, date: "2025-12-24", puffs: 570, mlAdded: 10, measuredOhms: 0.6,
          createdAt: new Date("2025-12-24T12:00:00Z")
        },
        {
          id: 2, coilId: 2, date: "2026-01-01", puffs: 979, mlAdded: 10, measuredOhms: 0.4,
          createdAt: new Date("2026-01-01T12:00:00Z")
        },
        {
          id: 3, coilId: 3, date: "2026-01-03", puffs: 559, mlAdded: 10, // Réajusté à 10ml (Flacon entier)
          measuredOhms: 0.4,
          createdAt: new Date("2026-01-03T12:00:00Z")
        },
        {
          id: 4, coilId: 3, date: "2026-01-04", puffs: 24, mlAdded: 0, measuredOhms: 0.4,
          createdAt: new Date("2026-01-04T10:00:00Z")
        }
      ]
    };
    
    this.saveData(emptyData);
    return emptyData;
  }

  getAppState(): AppStateResponse {
    const data = this.loadData();
    const activeCoil = data.coils.find(c => c.isActive);
    let resistance_actuelle: CurrentCoilStatus | null = null;
    let logs_quotidiens: DailyLog[] = [];

    if (activeCoil) {
      const coilEntries = data.entries
        .filter(e => e.coilId === activeCoil.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const totalPuffs = coilEntries.reduce((sum, e) => sum + e.puffs, 0);
      const totalMlAdded = coilEntries.reduce((sum, e) => sum + e.mlAdded, 0);
      
      const consumedMl = totalPuffs / USER_CONSTANTS.PUFF_RATIO;
      const usureRaw = (consumedMl / USER_CONSTANTS.V_MAX_COIL) * USER_CONSTANTS.S_COEFF * 100;
      const usurePourcent = Math.min(100, Math.round(usureRaw * 10) / 10);

      const maxMlLife = USER_CONSTANTS.V_MAX_COIL / USER_CONSTANTS.S_COEFF;
      const maxPuffsLife = maxMlLife * USER_CONSTANTS.PUFF_RATIO;
      const taffesRestants = Math.max(0, Math.floor(maxPuffsLife - totalPuffs));

      const mlRestants = Math.max(0, Math.round((totalMlAdded - consumedMl) * 10) / 10);

      resistance_actuelle = {
        id: activeCoil.id,
        name: activeCoil.name,
        date_debut: activeCoil.startedAt,
        compteur_pod: totalPuffs,
        taffes_restants: taffesRestants,
        ml_restants: mlRestants,
        usure_pourcent: usurePourcent,
        ohms_initial: activeCoil.initialOhms,
        ohms_actuel: coilEntries[0]?.measuredOhms ?? activeCoil.initialOhms,
      };

      logs_quotidiens = coilEntries.map(e => ({
        date: e.date,
        taffes: e.puffs,
        ml_ajoutes: e.mlAdded,
        ohms: e.measuredOhms,
      }));
    }

    const historique = data.coils
      .filter(c => !c.isActive)
      .sort((a, b) => (b.id - a.id))
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        date_debut: c.startedAt,
        duree_jours: c.totalDurationDays || 0,
        taffes_total: c.totalPuffs || 0,
      }));

    return { resistance_actuelle, historique, logs_quotidiens };
  }

  addEntry(entry: InsertEntry): DailyLog {
    const data = this.loadData();
    const safeEntry: Entry = {
      ...entry,
      id: (data.entries.length > 0 ? Math.max(...data.entries.map(e => e.id)) : 0) + 1,
      createdAt: new Date(),
      mlAdded: Number(entry.mlAdded) || 0,
      puffs: Number(entry.puffs),
      measuredOhms: Number(entry.measuredOhms),
      coilId: Number(entry.coilId)
    };
    data.entries.push(safeEntry);
    this.saveData(data);
    return { date: safeEntry.date, taffes: safeEntry.puffs, ml_ajoutes: safeEntry.mlAdded, ohms: safeEntry.measuredOhms };
  }

  resetCoil(newCoilData: InsertCoil): CurrentCoilStatus {
    const data = this.loadData();
    const activeCoil = data.coils.find(c => c.isActive);
    if (activeCoil) {
      const coilEntries = data.entries.filter(e => e.coilId === activeCoil.id);
      activeCoil.isActive = false;
      activeCoil.endedAt = new Date().toISOString().split('T')[0];
      activeCoil.totalPuffs = coilEntries.reduce((sum, e) => sum + e.puffs, 0);
      activeCoil.totalDurationDays = Math.max(1, Math.ceil((new Date().getTime() - new Date(activeCoil.startedAt).getTime()) / (1000 * 3600 * 24)));
    }
    const newCoil: Coil = { ...newCoilData, id: (data.coils.length > 0 ? Math.max(...data.coils.map(c => c.id)) : 0) + 1, isActive: true, initialOhms: Number(newCoilData.initialOhms), endedAt: null, totalPuffs: null, totalDurationDays: null };
    data.coils.push(newCoil);
    this.saveData(data);
    const maxMlLife = USER_CONSTANTS.V_MAX_COIL / USER_CONSTANTS.S_COEFF;
    const maxPuffsLife = Math.floor(maxMlLife * USER_CONSTANTS.PUFF_RATIO);
    return { id: newCoil.id, name: newCoil.name, date_debut: newCoil.startedAt, compteur_pod: 0, taffes_restants: maxPuffsLife, ml_restants: 0, usure_pourcent: 0, ohms_initial: newCoil.initialOhms, ohms_actuel: newCoil.initialOhms };
  }
}
export const storage = new LocalStorageManager();