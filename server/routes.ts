
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get(api.state.get.path, async (req, res) => {
    const state = await storage.getAppState();
    res.json(state);
  });

  app.post(api.entries.create.path, async (req, res) => {
    try {
      const input = api.entries.create.input.parse(req.body);
      const log = await storage.addEntry(input);
      res.status(201).json(log);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.coils.reset.path, async (req, res) => {
    try {
      const input = api.coils.reset.input.parse(req.body);
      const newStatus = await storage.resetCoil(input);
      res.status(201).json(newStatus);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Seed data if empty
  const state = await storage.getAppState();
  if (!state.resistance_actuelle && state.historique.length === 0) {
    console.log("Seeding database...");
    
    // Create R#1 (History)
    // We can't easily inject history via public API, so we'll just start a fresh R#1
    // Actually, let's create a current R#1
    await storage.resetCoil({
      name: "R#1",
      startedAt: new Date().toISOString().split('T')[0],
      initialOhms: 0.40,
      isActive: true,
    });
    
    // Add some logs to R#1
    const coil = (await storage.getAppState()).resistance_actuelle;
    if (coil) {
      await storage.addEntry({
        coilId: coil.id,
        date: new Date().toISOString().split('T')[0],
        puffs: 150,
        mlAdded: 5,
        measuredOhms: 0.40
      });
    }
  }

  return httpServer;
}
