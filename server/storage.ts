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
import fs from "fs/promises";
import path from "path";

// --- CONSTANTES UTILISATEUR "CODEUR" (OXVA 0.4Ω + e-CG) ---
const USER_CONSTANTS = {
  V_MAX_COIL: 45.0,      // Capacité théorique max (ml) avant carbone
  S_COEFF: 0.75,         // Coefficient e-CG (très propre)
  PUFF_RATIO: 100.4      // Taffes pour 1 ml (Ta stat réelle)
};

export interface IStorage {
  getAppState(): Promise<AppStateResponse>;
  addEntry(entry: InsertEntry): Promise<DailyLog>;
  resetCoil(coil: InsertCoil): Promise<CurrentCoilStatus>;
}

interface JsonData {
  coils: Coil[];
  entries: Entry[];
}

export class JSONFileStorage implements IStorage {
  private filePath = path.join(process.cwd(), "data.json");
  private data: JsonData | null = null;

  private async loadData(): Promise<JsonData> {
    if (this.data) return this.data;
    try {
      const content = await fs.readFile(this.filePath, "utf-8");
      this.data = JSON.parse(content);
    } catch (e) {
      this.data = { coils: [], entries: [] };
      await this.saveData();
    }
    return this.data!;
  }

  private async saveData() {
    if (!this.data) return;
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async getAppState(): Promise<AppStateResponse> {
    const data = await this.loadData();
    const activeCoil = data.coils.find(c => c.isActive);

    let resistance_actuelle: CurrentCoilStatus | null = null;
    let logs_quotidiens: DailyLog[] = [];

    if (activeCoil) {
      const coilEntries = data.entries
        .filter(e => e.coilId === activeCoil.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // --- ALGORITHME DE CALCUL V2.0 ---
      const totalPuffs = coilEntries.reduce((sum, e) => sum + e.puffs, 0);
      const totalMlAdded = coilEntries.reduce((sum, e) => sum + e.mlAdded, 0);
      
      // 1. Calcul Consommation Réelle
      const consumedMl = totalPuffs / USER_CONSTANTS.PUFF_RATIO;
      
      // 2. Stock Liquide Restant
      const mlRestants = Math.max(0, Math.round((totalMlAdded - consumedMl) * 10) / 10);

      // 3. Formule d'Usure "Chimique"
      // U = (V_actuel / V_max) * S * 100
      const usureRaw = (consumedMl / USER_CONSTANTS.V_MAX_COIL) * USER_CONSTANTS.S_COEFF * 100;
      const usurePourcent = Math.min(100, Math.round(usureRaw * 10) / 10);

      // 4. Projection Autonomie (Taffes restantes avant 100% usure)
      const maxMlLife = USER_CONSTANTS.V_MAX_COIL / USER_CONSTANTS.S_COEFF; // = 60ml
      const maxPuffsLife = maxMlLife * USER_CONSTANTS.PUFF_RATIO; // = ~6000 taffes
      const taffesRestants = Math.max(0, Math.floor(maxPuffsLife - totalPuffs));

      const latestEntry = coilEntries[0];
      const currentOhms = latestEntry?.measuredOhms ?? activeCoil.initialOhms;

      resistance_actuelle = {
        id: activeCoil.id,
        name: activeCoil.name,
        date_debut: activeCoil.startedAt,
        compteur_pod: totalPuffs,
        taffes_restants: taffesRestants,
        ml_restants: mlRestants,
        usure_pourcent: usurePourcent,
        ohms_initial: activeCoil.initialOhms,
        ohms_actuel: currentOhms,
      };

      logs_quotidiens = coilEntries.map(e => ({
        date: e.date,
        taffes: e.puffs,
        ml_ajoutes: e.mlAdded,
        ohms: e.measuredOhms,
      }));
    }

    const historyCoils = data.coils
      .filter(c => !c.isActive)
      .sort((a, b) => {
        const dateA = a.endedAt ? new Date(a.endedAt).getTime() : 0;
        const dateB = b.endedAt ? new Date(b.endedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);

    const historique: HistoricalCoil[] = historyCoils.map(c => ({
      id: c.id,
      name: c.name,
      date_debut: c.startedAt,
      duree_jours: c.totalDurationDays || 0,
      taffes_total: c.totalPuffs || 0,
    }));

    return { resistance_actuelle, historique, logs_quotidiens };
  }

  async addEntry(entry: InsertEntry): Promise<DailyLog> {
    const data = await this.loadData();
    const nextId = (data.entries.length > 0 ? Math.max(...data.entries.map(e => e.id)) : 0) + 1;
    const newEntry: Entry = {
      ...entry,
      id: nextId,
      createdAt: new Date(),
      mlAdded: entry.mlAdded ?? 0,
    };
    data.entries.push(newEntry);
    await this.saveData();
    return { date: newEntry.date, taffes: newEntry.puffs, ml_ajoutes: newEntry.mlAdded, ohms: newEntry.measuredOhms };
  }

  async resetCoil(newCoilData: InsertCoil): Promise<CurrentCoilStatus> {
    const data = await this.loadData();
    const activeCoil = data.coils.find(c => c.isActive);

    if (activeCoil) {
      const coilEntries = data.entries.filter(e => e.coilId === activeCoil.id);
      const totalPuffs = coilEntries.reduce((sum, e) => sum + e.puffs, 0);
      const startDate = new Date(activeCoil.startedAt);
      const endDate = new Date();
      const durationDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));

      activeCoil.isActive = false;
      activeCoil.endedAt = endDate.toISOString().split('T')[0];
      activeCoil.totalPuffs = totalPuffs;
      activeCoil.totalDurationDays = durationDays;
    }

    const nextId = (data.coils.length > 0 ? Math.max(...data.coils.map(c => c.id)) : 0) + 1;
    const newCoil: Coil = {
      ...newCoilData,
      id: nextId,
      isActive: true,
      endedAt: null,
      totalPuffs: null,
      totalDurationDays: null,
    };
    data.coils.push(newCoil);
    await this.saveData();

    // Calcul autonomie initiale correcte
    const maxMlLife = USER_CONSTANTS.V_MAX_COIL / USER_CONSTANTS.S_COEFF;
    const maxPuffsLife = Math.floor(maxMlLife * USER_CONSTANTS.PUFF_RATIO);

    return {
      id: newCoil.id,
      name: newCoil.name,
      date_debut: newCoil.startedAt,
      compteur_pod: 0,
      taffes_restants: maxPuffsLife,
      ml_restants: 0,
      usure_pourcent: 0,
      ohms_initial: newCoil.initialOhms,
      ohms_actuel: newCoil.initialOhms,
    };
  }
}

export const storage = new JSONFileStorage();