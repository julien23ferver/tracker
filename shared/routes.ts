
import { z } from 'zod';
import { insertEntrySchema, insertCoilSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// Response schema definitions for Swagger/Docs (simplified for now)
const currentCoilStatusSchema = z.object({
  id: z.number(),
  name: z.string(),
  date_debut: z.string(),
  compteur_pod: z.number(),
  taffes_restants: z.number(),
  ml_restants: z.number(),
  usure_pourcent: z.number(),
  ohms_initial: z.number(),
  ohms_actuel: z.number(),
}).nullable();

const historicalCoilSchema = z.object({
  id: z.number(),
  name: z.string(),
  date_debut: z.string(),
  duree_jours: z.number(),
  taffes_total: z.number(),
});

const dailyLogSchema = z.object({
  date: z.string(),
  taffes: z.number(),
  ml_ajoutes: z.number(),
  ohms: z.number(),
});

const appStateResponseSchema = z.object({
  resistance_actuelle: currentCoilStatusSchema,
  historique: z.array(historicalCoilSchema),
  logs_quotidiens: z.array(dailyLogSchema),
});

export const api = {
  state: {
    get: {
      method: 'GET' as const,
      path: '/api/state',
      responses: {
        200: appStateResponseSchema,
      },
    },
  },
  entries: {
    create: {
      method: 'POST' as const,
      path: '/api/entries',
      input: insertEntrySchema,
      responses: {
        201: dailyLogSchema,
        400: errorSchemas.validation,
      },
    },
  },
  coils: {
    reset: {
      method: 'POST' as const,
      path: '/api/coils/reset',
      input: insertCoilSchema,
      responses: {
        201: currentCoilStatusSchema,
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
