import { z } from "zod";

const stringMapSchema = z.record(z.string(), z.string());
const messagesSchema = z
  .object({
    errors: z
      .object({
        invalidRequest: z.string().min(1),
        invalidCsv: z.string().min(1),
        payloadTooLarge: z.string().min(1),
        originNotAllowed: z.string().min(1),
        notFound: z.string().min(1),
        rateLimited: z.string().min(1),
        server: z.string().min(1),
      })
      .strict(),
    reports: stringMapSchema,
    importIssues: stringMapSchema,
    categories: stringMapSchema,
  })
  .catchall(z.string());

export const contentModelSchema = z
  .object({
    version: z.number().int().positive(),
    appId: z.literal("wealthtrack"),
    locale: z.string().min(2),
    messages: messagesSchema,
    data: z
      .object({
        app: z
          .object({
            name: z.string().min(1),
            descriptor: z.string().min(1),
            description: z.string().min(1),
            apiBaseUrl: z.string().url(),
            allowedOrigins: z.array(z.string().url()).min(1),
            currency: z.string().length(3),
            timezone: z.string().min(1),
            themeStorageKey: z.string().min(1),
            defaultTheme: z.enum(["light", "dark"]),
          })
          .strict(),
        api: z
          .object({
            rateLimit: z.number().int().positive(),
            rateWindowMs: z.number().int().positive(),
          })
          .strict(),
        navigation: z
          .array(
            z
              .object({
                id: z.enum([
                  "overview",
                  "transactions",
                  "budgets",
                  "goals",
                  "recurring",
                  "import",
                ]),
                label: z.string().min(1),
                icon: z.string().min(1),
              })
              .strict(),
          )
          .min(1),
        periods: z
          .array(
            z
              .object({
                id: z.string().min(1),
                label: z.string().min(1),
                days: z.number().int().positive(),
              })
              .strict(),
          )
          .min(1),
        filters: z
          .object({
            defaultPeriodId: z.string().min(1),
          })
          .strict(),
        categories: z
          .array(
            z
              .object({
                id: z.string().min(1),
                kind: z.enum(["income", "expense", "transfer"]),
                color: z.string().min(1),
              })
              .strict(),
          )
          .min(1),
        csv: z
          .object({
            headers: z.array(z.string()).length(6),
            maximumRows: z.number().int().positive(),
            maximumBytes: z.number().int().positive(),
            sampleFileName: z.string().min(1),
            templateRows: z.array(z.array(z.string())),
          })
          .strict(),
        seed: z
          .object({
            version: z.number().int().positive(),
            accounts: z
              .array(
                z
                  .object({
                    id: z.string().min(1),
                    name: z.string().min(1),
                    type: z.string().min(1),
                    currency: z.string().length(3),
                    openingBalanceCents: z.number().int(),
                  })
                  .strict(),
              )
              .min(1),
            transactions: z.array(
              z
                .object({
                  id: z.string().min(1),
                  daysAgo: z.number().int().nonnegative(),
                  description: z.string().min(1),
                  category: z.string().min(1),
                  accountId: z.string().min(1),
                  amountCents: z
                    .number()
                    .int()
                    .refine((amount) => amount !== 0),
                  currency: z.string().length(3),
                })
                .strict(),
            ),
            budgets: z.array(
              z
                .object({
                  id: z.string().min(1),
                  categoryId: z.string().min(1),
                  limitCents: z.number().int().nonnegative(),
                  displayOrder: z.number().int().positive(),
                })
                .strict(),
            ),
            goals: z.array(
              z
                .object({
                  id: z.string().min(1),
                  name: z.string().min(1),
                  savedCents: z.number().int().nonnegative(),
                  targetCents: z.number().int().positive(),
                  targetDate: z.string().min(1),
                  displayOrder: z.number().int().positive(),
                })
                .strict(),
            ),
            bills: z.array(
              z
                .object({
                  id: z.string().min(1),
                  name: z.string().min(1),
                  categoryId: z.string().min(1),
                  amountCents: z.number().int().positive(),
                  accountId: z.string().min(1),
                  cadence: z.string().min(1),
                  dueInDays: z.number().int().nonnegative(),
                  displayOrder: z.number().int().positive(),
                })
                .strict(),
            ),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export const publicModelSchema = contentModelSchema.transform((envelope) => ({
  modelVersion: envelope.version,
  app: { ...envelope.data.app, locale: envelope.locale },
  api: envelope.data.api,
  navigation: envelope.data.navigation,
  copy: envelope.messages,
  periods: envelope.data.periods,
  filters: envelope.data.filters,
  categories: envelope.data.categories,
  csv: envelope.data.csv,
  seed: envelope.data.seed,
}));

const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  currency: z.string(),
  openingBalanceCents: z.number().int(),
  balanceCents: z.number().int(),
});
const transactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string(),
  category: z.string(),
  accountId: z.string(),
  amountCents: z.number().int(),
  currency: z.string(),
  source: z.string(),
});
const seriesPointSchema = z.object({
  date: z.string(),
  amountCents: z.number().int(),
});
const categorySpendingSchema = z.object({
  id: z.string(),
  amountCents: z.number().int(),
});

export const financeSummarySchema = z.object({
  periodDays: z.number().int(),
  cashPositionCents: z.number().int(),
  incomeCents: z.number().int(),
  spendingCents: z.number().int(),
  netCashFlowCents: z.number().int(),
  savingsRatePct: z.number(),
  accounts: z.array(accountSchema),
  series: z.array(seriesPointSchema),
  categories: z.array(categorySpendingSchema),
  transactions: z.array(transactionSchema),
});
export const accountListSchema = z.array(accountSchema);
export const transactionListSchema = z.array(transactionSchema);
export const budgetListSchema = z.array(
  z.object({
    id: z.string(),
    categoryId: z.string(),
    limitCents: z.number().int(),
    spentCents: z.number().int(),
    remainingCents: z.number().int(),
  }),
);
export const goalListSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    savedCents: z.number().int(),
    targetCents: z.number().int(),
    targetDate: z.string(),
  }),
);
export const billListSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    categoryId: z.string(),
    amountCents: z.number().int(),
    accountId: z.string(),
    cadence: z.string(),
    nextDue: z.string(),
  }),
);
const importPreviewRowSchema = z.object({
  date: z.string(),
  description: z.string(),
  category: z.string(),
  accountId: z.string(),
  amountCents: z.number().int(),
  currency: z.string(),
});
export const importPreviewSchema = z.object({
  validRows: z.array(importPreviewRowSchema),
  invalidRows: z.array(
    z.object({ rowNumber: z.number().int(), code: z.string() }),
  ),
  validCount: z.number().int(),
  invalidCount: z.number().int(),
  netAmountCents: z.number().int(),
});
export const importResultSchema = z.object({
  idempotencyKey: z.string(),
  importedAt: z.string(),
  rowsAdded: z.number().int(),
  totalNetCents: z.number().int(),
  replayed: z.boolean(),
});
export const healthSchema = z.object({
  status: z.string(),
  service: z.string(),
  storage: z.string(),
});
