
import { pgTable, text, serial, integer, boolean, timestamp, real, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const coils = pgTable("coils", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "R#3"
  startedAt: date("started_at").notNull(),
  initialOhms: real("initial_ohms").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  // Archived stats for history
  endedAt: date("ended_at"),
  totalPuffs: integer("total_puffs"),
  totalDurationDays: integer("total_duration_days"),
});

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  coilId: integer("coil_id").notNull(),
  date: date("date").notNull(),
  puffs: integer("puffs").notNull(), // Daily puffs
  mlAdded: real("ml_added").notNull().default(0),
  measuredOhms: real("measured_ohms").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const coilsRelations = relations(coils, ({ many }) => ({
  entries: many(entries),
}));

export const entriesRelations = relations(entries, ({ one }) => ({
  coil: one(coils, {
    fields: [entries.coilId],
    references: [coils.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertCoilSchema = createInsertSchema(coils).omit({ id: true, endedAt: true, totalPuffs: true, totalDurationDays: true });
export const insertEntrySchema = createInsertSchema(entries).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===
export type Coil = typeof coils.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type InsertCoil = z.infer<typeof insertCoilSchema>;
export type InsertEntry = z.infer<typeof insertEntrySchema>;

// Complex Response Types (matching the spec's JSON structure)
export interface CurrentCoilStatus {
  id: number;
  name: string;
  date_debut: string;
  compteur_pod: number; // Total puffs on this coil
  taffes_restants: number;
  ml_restants: number;
  usure_pourcent: number;
  ohms_initial: number;
  ohms_actuel: number;
}

export interface HistoricalCoil {
  id: number;
  name: string;
  date_debut: string;
  duree_jours: number;
  taffes_total: number;
}

export interface DailyLog {
  date: string;
  taffes: number;
  ml_ajoutes: number;
  ohms: number;
}

export interface AppStateResponse {
  resistance_actuelle: CurrentCoilStatus | null;
  historique: HistoricalCoil[];
  logs_quotidiens: DailyLog[];
}
