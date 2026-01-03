
import { db } from "./db";
import {
  coils,
  entries,
  type InsertCoil,
  type InsertEntry,
  type CurrentCoilStatus,
  type HistoricalCoil,
  type DailyLog,
  type AppStateResponse
} from "@shared/schema";
import { eq, desc, asc, and } from "drizzle-orm";

export interface IStorage {
  getAppState(): Promise<AppStateResponse>;
  addEntry(entry: InsertEntry): Promise<DailyLog>;
  resetCoil(coil: InsertCoil): Promise<CurrentCoilStatus>;
}

export class DatabaseStorage implements IStorage {
  async getAppState(): Promise<AppStateResponse> {
    // 1. Get active coil
    const activeCoil = await db.query.coils.findFirst({
      where: eq(coils.isActive, true),
    });

    let resistance_actuelle: CurrentCoilStatus | null = null;
    let logs_quotidiens: DailyLog[] = [];

    if (activeCoil) {
      // Get entries for active coil
      const coilEntries = await db.query.entries.findMany({
        where: eq(entries.coilId, activeCoil.id),
        orderBy: [desc(entries.date)],
      });

      // Calculate stats
      const totalPuffs = coilEntries.reduce((sum, e) => sum + e.puffs, 0);
      const totalMl = coilEntries.reduce((sum, e) => sum + e.mlAdded, 0);
      const latestEntry = coilEntries[0];
      const currentOhms = latestEntry?.measuredOhms ?? activeCoil.initialOhms;
      
      // Calculate derived stats
      // Spec: usure = 100 - ((taffes_restants / 3500) * 100)
      // So: taffes_restants = 3500 - totalPuffs
      const maxPuffs = 3500;
      const taffesRestants = Math.max(0, maxPuffs - totalPuffs);
      const usurePourcent = Math.min(100, Math.round(((totalPuffs) / maxPuffs) * 100 * 10) / 10);
      
      // ML calculation: 
      // Spec: ml_consommes_jour = compteur_pod * 0.0035 (This formula in spec seems to imply total consumption?)
      // Spec says: "ml_restants: 4.8".
      // Let's assume we track a "tank" level or similar? 
      // Actually, spec says: "Plein liquide... ml_ajoutes".
      // Let's track a "virtual tank" that starts at 0? Or maybe we just track remaining capacity if we knew consumption rate?
      // Spec: "ml_restants" is a field. "ml_consommes_jour = compteur_pod * 0.0035"
      // Wait, "compteur_pod" is total puffs. 
      // Let's implement a simple logic: Start with 0, add MLs. 
      // Consumption = totalPuffs * 0.0035 (3.5ml per 1000 puffs).
      // Remaining = TotalAdded - Consumption.
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
    const historyCoils = await db.query.coils.findMany({
      where: eq(coils.isActive, false),
      orderBy: [desc(coils.endedAt)],
      limit: 5,
    });

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
    const [newEntry] = await db.insert(entries).values(entry).returning();
    return {
      date: newEntry.date,
      taffes: newEntry.puffs,
      ml_ajoutes: newEntry.mlAdded,
      ohms: newEntry.measuredOhms,
    };
  }

  async resetCoil(newCoilData: InsertCoil): Promise<CurrentCoilStatus> {
    // 1. Archive current
    const activeCoil = await db.query.coils.findFirst({
      where: eq(coils.isActive, true),
    });

    if (activeCoil) {
      // Calculate final stats
      const coilEntries = await db.query.entries.findMany({
        where: eq(entries.coilId, activeCoil.id),
      });
      const totalPuffs = coilEntries.reduce((sum, e) => sum + e.puffs, 0);
      const startDate = new Date(activeCoil.startedAt);
      const endDate = new Date();
      const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));

      await db.update(coils)
        .set({
          isActive: false,
          endedAt: endDate.toISOString().split('T')[0],
          totalPuffs,
          totalDurationDays: durationDays,
        })
        .where(eq(coils.id, activeCoil.id));
    }

    // 2. Create new
    const [newCoil] = await db.insert(coils).values({
      ...newCoilData,
      isActive: true,
    }).returning();

    // Return status (empty initially)
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

export const storage = new DatabaseStorage();
