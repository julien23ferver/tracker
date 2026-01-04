
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
      // File doesn't exist or invalid, initialize empty
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
    
    // 1. Get active coil
    const activeCoil = data.coils.find(c => c.isActive);

    let resistance_actuelle: CurrentCoilStatus | null = null;
    let logs_quotidiens: DailyLog[] = [];

    if (activeCoil) {
      // Get entries for active coil
      const coilEntries = data.entries
        .filter(e => e.coilId === activeCoil.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate stats
      const totalPuffs = coilEntries.reduce((sum, e) => sum + e.puffs, 0);
      const totalMl = coilEntries.reduce((sum, e) => sum + e.mlAdded, 0);
      const latestEntry = coilEntries[0];
      const currentOhms = latestEntry?.measuredOhms ?? activeCoil.initialOhms;
      
      const maxPuffs = 3500;
      const taffesRestants = Math.max(0, maxPuffs - totalPuffs);
      const usurePourcent = Math.min(100, Math.round(((totalPuffs) / maxPuffs) * 100 * 10) / 10);
      
      const consumptionRate = 0.0035; // ml per puff
      const consumedMl = totalPuffs * consumptionRate;
      const mlRestants = Math.max(0, Math.round((totalMl - consumedMl) * 10) / 10);

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

    // 2. Get history
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

    return {
      resistance_actuelle,
      historique,
      logs_quotidiens
    };
  }

  async addEntry(entry: InsertEntry): Promise<DailyLog> {
    const data = await this.loadData();
    const newEntry: Entry = {
      ...entry,
      id: (data.entries.length > 0 ? Math.max(...data.entries.map(e => e.id)) : 0) + 1,
      createdAt: new Date(),
      mlAdded: entry.mlAdded ?? 0,
    };
    
    data.entries.push(newEntry);
    await this.saveData();

    return {
      date: newEntry.date,
      taffes: newEntry.puffs,
      ml_ajoutes: newEntry.mlAdded,
      ohms: newEntry.measuredOhms,
    };
  }

  async resetCoil(newCoilData: InsertCoil): Promise<CurrentCoilStatus> {
    const data = await this.loadData();

    // 1. Archive current
    const activeCoil = data.coils.find(c => c.isActive);

    if (activeCoil) {
      // Calculate final stats
      const coilEntries = data.entries.filter(e => e.coilId === activeCoil.id);
      const totalPuffs = coilEntries.reduce((sum, e) => sum + e.puffs, 0);
      const startDate = new Date(activeCoil.startedAt);
      const endDate = new Date();
      const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));

      activeCoil.isActive = false;
      activeCoil.endedAt = endDate.toISOString().split('T')[0];
      activeCoil.totalPuffs = totalPuffs;
      activeCoil.totalDurationDays = durationDays;
    }

    // 2. Create new
    const newCoil: Coil = {
      ...newCoilData,
      id: (data.coils.length > 0 ? Math.max(...data.coils.map(c => c.id)) : 0) + 1,
      isActive: true,
      endedAt: null,
      totalPuffs: null,
      totalDurationDays: null,
    };

    data.coils.push(newCoil);
    await this.saveData();

    // Return status
    return {
      id: newCoil.id,
      name: newCoil.name,
      date_debut: newCoil.startedAt,
      compteur_pod: 0,
      taffes_restants: 3500,
      ml_restants: 0,
      usure_pourcent: 0,
      ohms_initial: newCoil.initialOhms,
      ohms_actuel: newCoil.initialOhms,
    };
  }
}

export const storage = new JSONFileStorage();

