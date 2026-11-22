import "dotenv/config";

import {
  randomBytes,
  randomUUID,
  scrypt as nodeScrypt,
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import { rateLimit } from "express-rate-limit";
import express, { type NextFunction, type Request, type Response } from "express";
import { Pool, type PoolClient } from "pg";
import { z } from "zod";

import {
  announcementCreateSchema,
  announcementStatusSchema,
  announcementUpdateSchema,
  assertOwnerRole,
  reviewModerationSchema,
  reviewSubmissionSchema,
} from "./content-workflow.ts";
import {
  assertCanApplyAction,
  assertCanEditPackage,
  packageBatchSchema,
  packageInputSchema,
  calculateCharge,
  WorkflowError,
  type PackageAction,
} from "./package-workflow.ts";

const scrypt = promisify(nodeScrypt);
const sessionDurationMs = 8 * 60 * 60 * 1000;
const actionSchema = z.object({
  barcodeToken: z.string().min(50).max(200),
  action: z.enum(["verify", "payment", "collect"]),
});

type StaffUser = {
  id: string;
  email: string;
  role: "owner" | "admin";
};

declare module "express-serve-static-core" {
  interface Request {
    staffUser?: StaffUser;
  }
}

function requiredEnv(name: string, minimumLength = 1) {
  const value = process.env[name]?.trim();
  if (!value || value.length < minimumLength) {
    throw new Error(`${name} harus diatur dan memiliki minimal ${minimumLength} karakter.`);
  }
  return value;
}

function hashToken(token: string, secret?: string) {
  const hash = secret ? createHmac("sha256", secret) : createHash("sha256");
  return hash.update(token).digest("hex");
}

function createBarcodeToken(packageId: string, secret: string) {
  const signature = createHmac("sha256", secret).update(packageId).digest("hex");
  return `${packageId}.${signature}`;
}

function verifyBarcodeToken(token: string, secret: string) {
  const [packageId, signature, extra] = token.split(".");
  if (
    extra !== undefined ||
    !packageId ||
    !signature ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(packageId)
  ) {
    throw new WorkflowError("Barcode tidak valid.", 400);
  }

  const expected = createHmac("sha256", secret).update(packageId).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "hex");
  } catch {
    throw new WorkflowError("Barcode tidak valid.", 400);
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new WorkflowError("Barcode tidak valid.", 400);
  }
  return packageId;
}

async function passwordHash(password: string) {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function passwordMatches(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), 64)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function cookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return decodeURIComponent(valueParts.join("="));
  }
  return undefined;
}

function setSessionCookie(response: Response, token: string) {
  const secure = process.env["NODE_ENV"] === "production" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `elkana_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionDurationMs / 1000}${secure}`,
  );
}

function clearSessionCookie(response: Response) {
  const secure = process.env["NODE_ENV"] === "production" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `elkana_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`,
  );
}

function sendError(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof z.ZodError) {
    response
      .status(400)
      .json({ error: "Data yang dikirim belum valid.", details: error.flatten() });
    return;
  }
  if (error instanceof WorkflowError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error(error);
  response.status(500).json({ error: "Terjadi kesalahan pada server." });
}

async function seedUser(pool: Pool, email: string, password: string, role: StaffUser["role"]) {
  const normalizedEmail = email.toLowerCase();
  const existing = await pool.query<{ id: string }>("SELECT id FROM staff_users WHERE email = $1", [
    normalizedEmail,
  ]);
  if (existing.rowCount) return;

  await pool.query(
    "INSERT INTO staff_users (id, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
    [randomUUID(), normalizedEmail, await passwordHash(password), role],
  );
}

async function initializeDatabase(pool: Pool) {
  const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  await pool.query(schema);

  const ownerEmail = z.string().email().parse(requiredEnv("OWNER_EMAIL"));
  const ownerPassword = requiredEnv("OWNER_PASSWORD", 12);
  const adminEmail = z.string().email().parse(requiredEnv("ADMIN_EMAIL"));
  const adminPassword = requiredEnv("ADMIN_PASSWORD", 12);
  if (ownerEmail.toLowerCase() === adminEmail.toLowerCase()) {
    throw new Error("OWNER_EMAIL dan ADMIN_EMAIL harus berbeda.");
  }

  await seedUser(pool, ownerEmail, ownerPassword, "owner");
  await seedUser(pool, adminEmail, adminPassword, "admin");
}

function requireStaff(pool: Pool, sessionSecret: string) {
  return async (request: Request, response: Response, next: NextFunction) => {
    const token = cookieValue(request, "elkana_session");
    if (!token) {
      response.status(401).json({ error: "Silakan masuk untuk melanjutkan." });
      return;
    }
    try {
      const result = await pool.query<StaffUser>(
        `SELECT u.id, u.email, u.role
         FROM staff_sessions s
         JOIN staff_users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [hashToken(token, sessionSecret)],
      );
      if (!result.rows[0]) {
        response.status(401).json({ error: "Sesi telah berakhir. Silakan masuk kembali." });
        return;
      }
      request.staffUser = result.rows[0];
      next();
    } catch (error) {
      next(error);
    }
  };
}

function requireOwner(request: Request, _response: Response, next: NextFunction) {
  try {
    assertOwnerRole(request.staffUser!.role);
    next();
  } catch (error) {
    next(error);
  }
}

async function writePackageEvent(
  client: PoolClient,
  packageId: string,
  actorId: string,
  action: "created" | PackageAction,
) {
  await client.query(
    "INSERT INTO package_events (id, package_id, actor_id, action) VALUES ($1, $2, $3, $4)",
    [randomUUID(), packageId, actorId, action],
  );
}

async function startServer() {
  const connectionString = requiredEnv("DATABASE_URL");
  const sessionSecret = requiredEnv("SESSION_SECRET", 32);
  const barcodeSecret = requiredEnv("BARCODE_SECRET", 32);
  const pool = new Pool({ connectionString });
  try {
    await initializeDatabase(pool);
  } catch (error) {
    await pool.end();
    throw error;
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));
  app.get("/api/health", (_request, response) => response.json({ status: "ok" }));

  app.get(
    "/api/public/tracking/:trackingCode",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 60,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    async (request, response, next) => {
      try {
        const trackingCode = z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^ELK-[A-F0-9]{12}$/)
          .parse(request.params["trackingCode"]);
        const result = await pool.query<{
          id: string;
          tracking_code: string;
          destination: string;
          verified_at: Date | null;
          paid_at: Date | null;
          collected_at: Date | null;
          created_at: Date;
        }>(
          `SELECT id, tracking_code, destination, verified_at, paid_at, collected_at, created_at
           FROM packages
           WHERE tracking_code = $1 AND archived_at IS NULL`,
          [trackingCode],
        );
        const packageRow = result.rows[0];
        if (!packageRow) {
          response.json({ tracking: null });
          return;
        }

        const history = await pool.query<{ action: string; created_at: Date }>(
          `SELECT action, created_at FROM package_events
           WHERE package_id = $1 ORDER BY created_at ASC`,
          [packageRow.id],
        );
        const eventLabels: Record<string, string> = {
          created: "Paket diterima di Surabaya",
          verify: "Paket dikirim menuju Flores",
          payment: "Posisi paket diperbarui",
          collect: "Paket berada di titik pengambilan",
        };
        const events = history.rows.map((item) => ({
          label: eventLabels[item.action] ?? "Status paket diperbarui",
          detail: new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Jakarta",
          }).format(item.created_at),
        }));
        const status = packageRow.collected_at
          ? "Sudah diambil"
          : packageRow.paid_at
            ? "Paket sudah tiba di tujuan"
            : packageRow.verified_at
              ? "Paket dalam perjalanan menuju Flores"
              : "Paket diterima di Surabaya";
        const location = packageRow.collected_at
          ? `Paket telah diambil di titik ${packageRow.destination}.`
          : packageRow.paid_at
            ? `Paket berada di titik pengambilan ${packageRow.destination}.`
            : packageRow.verified_at
              ? "Paket dalam perjalanan laut melalui rute Ende menuju Flores."
              : "Paket masih di tempat kumpul admin Surabaya.";

        response.json({
          tracking: {
            code: packageRow.tracking_code,
            status,
            destination: packageRow.destination,
            location,
            events:
              events.length > 0
                ? events
                : [
                    {
                      label: "Paket terdaftar",
                      detail: new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Jakarta",
                      }).format(packageRow.created_at),
                    },
                  ],
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get("/api/public/announcements", async (_request, response, next) => {
    try {
      const result = await pool.query(
        `SELECT id, title, body, created_at
         FROM announcements
         WHERE is_published = true
         ORDER BY created_at DESC
         LIMIT 5`,
      );
      response.json({ announcements: result.rows });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/public/batches", async (_request, response, next) => {
    try {
      const batches = await pool.query<{
        id: string;
        title: string;
        destination: string;
        created_at: Date;
      }>(
        `SELECT id, title, destination, created_at
         FROM package_batches
         ORDER BY created_at DESC`,
      );
      const items = await pool.query<{
        batch_id: string;
        row_number: number;
        name: string;
        pcs: number;
      }>(
        `SELECT batch_id, row_number, name, pcs
         FROM package_batch_items
         ORDER BY batch_id, row_number`,
      );
      const itemsByBatch = new Map<string, typeof items.rows>();
      for (const item of items.rows) {
        const batchItems = itemsByBatch.get(item.batch_id) ?? [];
        batchItems.push(item);
        itemsByBatch.set(item.batch_id, batchItems);
      }
      response.json({
        batches: batches.rows.map((batch) => ({
          ...batch,
          items: itemsByBatch.get(batch.id) ?? [],
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/public/reviews", async (_request, response, next) => {
    try {
      const result = await pool.query(
        `SELECT id, author_name, rating, body, created_at
         FROM customer_reviews
         WHERE status = 'approved'
         ORDER BY created_at DESC
         LIMIT 6`,
      );
      response.json({ reviews: result.rows });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/public/reviews",
    rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 3,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    async (request, response, next) => {
      try {
        const review = reviewSubmissionSchema.parse(request.body);
        const result = await pool.query(
          `INSERT INTO customer_reviews (id, author_name, rating, body)
           VALUES ($1, $2, $3, $4)
           RETURNING id, status`,
          [randomUUID(), review.authorName, review.rating, review.body],
        );
        response.status(201).json({
          review: result.rows[0],
          message: "Ulasan dikirim dan menunggu persetujuan owner.",
        });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/auth/login",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 8,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    async (request, response, next) => {
      try {
        const credentials = z
          .object({ email: z.string().email().max(254), password: z.string().min(1).max(200) })
          .parse(request.body);
        const result = await pool.query<StaffUser & { password_hash: string }>(
          "SELECT id, email, role, password_hash FROM staff_users WHERE email = $1",
          [credentials.email.toLowerCase()],
        );
        const user = result.rows[0];
        if (!user || !(await passwordMatches(credentials.password, user.password_hash))) {
          response.status(401).json({ error: "Email atau kata sandi tidak cocok." });
          return;
        }

        const token = randomBytes(32).toString("hex");
        await pool.query(
          "INSERT INTO staff_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
          [hashToken(token, sessionSecret), user.id, new Date(Date.now() + sessionDurationMs)],
        );
        setSessionCookie(response, token);
        response.json({ user: { id: user.id, email: user.email, role: user.role } });
      } catch (error) {
        next(error);
      }
    },
  );

  app.use("/api", requireStaff(pool, sessionSecret));

  app.get("/api/auth/me", (request, response) => response.json({ user: request.staffUser }));

  app.post("/api/batches", requireOwner, async (request, response, next) => {
    try {
      const input = z
        .object({
          title: z.string().trim().min(2).max(80),
          destination: z.enum(["Bajawa", "Malanuza", "Aimere"]),
          items: z
            .array(
              z.object({
                rowNumber: z.number().int().min(1),
                name: z.string().trim().min(1).max(160),
                pcs: z.number().int().min(0).max(100000),
                weightKg: z.number().min(0).max(100000),
                price: z.number().int().min(0).max(100000000),
                note: z.string().trim().max(500).default(""),
              }),
            )
            .min(1)
            .max(1000),
        })
        .parse(request.body);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const existing = await client.query<{ id: string }>(
          "SELECT id FROM package_batches WHERE title = $1 AND destination = $2",
          [input.title, input.destination],
        );
        let batchId: string;
        if (existing.rows[0]) {
          batchId = existing.rows[0].id;
          await client.query("DELETE FROM package_batch_items WHERE batch_id = $1", [batchId]);
          await client.query(
            "UPDATE package_batches SET created_at = now() WHERE id = $1",
            [batchId],
          );
        } else {
          batchId = randomUUID();
          await client.query(
            `INSERT INTO package_batches (id, title, destination, created_by)
             VALUES ($1, $2, $3, $4)`,
            [batchId, input.title, input.destination, request.staffUser!.id],
          );
        }
        for (const item of input.items) {
          await client.query(
            `INSERT INTO package_batch_items
             (id, batch_id, row_number, name, pcs, weight_kg, price, note)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              randomUUID(),
              batchId,
              item.rowNumber,
              item.name,
              item.pcs,
              item.weightKg,
              item.price,
              item.note,
            ],
          );
        }
        await client.query("COMMIT");
        response.status(201).json({
          batch: { id: batchId, title: input.title, destination: input.destination },
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/batches", async (_request, response, next) => {
    try {
      const result = await pool.query(
        `SELECT b.id, b.title, b.destination, b.created_at, count(i.id)::int AS item_count
         FROM package_batches b
         LEFT JOIN package_batch_items i ON i.batch_id = b.id
         GROUP BY b.id
         ORDER BY b.created_at DESC`,
      );
      response.json({ batches: result.rows });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/logout", async (request, response, next) => {
    const token = cookieValue(request, "elkana_session");
    try {
      if (token) {
        await pool.query("DELETE FROM staff_sessions WHERE token_hash = $1", [
          hashToken(token, sessionSecret),
        ]);
      }
      clearSessionCookie(response);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/announcements", async (_request, response, next) => {
    try {
      const result = await pool.query(
        `SELECT id, title, body, is_published, created_at, updated_at
         FROM announcements ORDER BY created_at DESC`,
      );
      response.json({ announcements: result.rows });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/announcements", requireOwner, async (request, response, next) => {
    try {
      const input = announcementCreateSchema.parse(request.body);
      const result = await pool.query(
        `INSERT INTO announcements (id, title, body, is_published, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, title, body, is_published, created_at, updated_at`,
        [randomUUID(), input.title, input.body, input.isPublished, request.staffUser!.id],
      );
      response.status(201).json({ announcement: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/announcements/:id", requireOwner, async (request, response, next) => {
    try {
      const input = announcementUpdateSchema.parse(request.body);
      const result = await pool.query(
        `UPDATE announcements SET title = $2, body = $3, is_published = $4, updated_at = now()
         WHERE id = $1
         RETURNING id, title, body, is_published, created_at, updated_at`,
        [request.params["id"], input.title, input.body, input.isPublished],
      );
      if (!result.rows[0]) throw new WorkflowError("Informasi tidak ditemukan.", 404);
      response.json({ announcement: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/announcements/:id", requireOwner, async (request, response, next) => {
    try {
      const { isPublished } = announcementStatusSchema.parse(request.body);
      const result = await pool.query(
        `UPDATE announcements SET is_published = $2, updated_at = now()
         WHERE id = $1
         RETURNING id, title, body, is_published, created_at, updated_at`,
        [request.params["id"], isPublished],
      );
      if (!result.rows[0]) throw new WorkflowError("Informasi tidak ditemukan.", 404);
      response.json({ announcement: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/announcements/:id", requireOwner, async (request, response, next) => {
    try {
      const result = await pool.query(
        `UPDATE announcements SET is_published = false, updated_at = now()
         WHERE id = $1
         RETURNING id`,
        [request.params["id"]],
      );
      if (!result.rows[0]) throw new WorkflowError("Informasi tidak ditemukan.", 404);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/reviews", async (request, response, next) => {
    try {
      const status = z
        .enum(["pending", "approved", "rejected"])
        .default("pending")
        .parse(request.query["status"]);
      const result = await pool.query(
        `SELECT id, author_name, rating, body, status, moderated_at, created_at
         FROM customer_reviews
         WHERE status = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [status],
      );
      response.json({ reviews: result.rows });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/reviews/:id/moderation", requireOwner, async (request, response, next) => {
    try {
      const { status } = reviewModerationSchema.parse(request.body);
      const result = await pool.query(
        `UPDATE customer_reviews
         SET status = $2, moderated_by = $3, moderated_at = now()
         WHERE id = $1
         RETURNING id, author_name, rating, body, status, moderated_at, created_at`,
        [request.params["id"], status, request.staffUser!.id],
      );
      if (!result.rows[0]) throw new WorkflowError("Ulasan tidak ditemukan.", 404);
      response.json({ review: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/dashboard", async (_request, response, next) => {
    try {
      const [summary, packages, setting] = await Promise.all([
        pool.query(
          `SELECT count(*) FILTER (WHERE archived_at IS NULL)::int AS total,
            count(*) FILTER (WHERE archived_at IS NULL AND verified_at IS NULL)::int AS awaiting_verification,
            count(*) FILTER (WHERE archived_at IS NULL AND verified_at IS NOT NULL AND paid_at IS NULL)::int AS awaiting_payment,
            count(*) FILTER (WHERE archived_at IS NULL AND paid_at IS NOT NULL AND collected_at IS NULL)::int AS awaiting_pickup,
            coalesce(sum(total_price) FILTER (WHERE paid_at IS NOT NULL), 0)::int AS paid_total
           FROM packages`,
        ),
        pool.query(
          `SELECT id, tracking_code, recipient_name, recipient_phone, sender_name, destination,
            description, weight_kg, price_per_kg, total_price, verified_at, paid_at, collected_at,
            archived_at, created_at
           FROM packages WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 10`,
        ),
        pool.query<{ setting_value: string }>(
          "SELECT setting_value FROM app_settings WHERE setting_key = 'price_per_kg'",
        ),
      ]);
      response.json({
        summary: summary.rows[0],
        packages: packages.rows,
        pricePerKg: Number(setting.rows[0]?.setting_value ?? 8000),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/packages", async (request, response, next) => {
    try {
      const limit = z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .parse(request.query["limit"] ?? "50");
      const offset = z.coerce
        .number()
        .int()
        .min(0)
        .max(1_000_000)
        .default(0)
        .parse(request.query["offset"] ?? "0");
      const archived =
        z.enum(["true", "false"]).default("false").parse(request.query["archived"]) === "true";
      if (archived) assertOwnerRole(request.staffUser!.role);
      const result = await pool.query(
        `SELECT id, tracking_code, recipient_name, recipient_phone, sender_name, destination,
          description, weight_kg, price_per_kg, total_price, verified_at, paid_at, collected_at,
          archived_at, created_at
         FROM packages
         WHERE archived_at IS ${archived ? "NOT " : ""}NULL
         ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit + 1, offset],
      );
      const rows = result.rows.slice(0, limit);
      response.json({
        packages: rows.map((item) => ({
          ...item,
          barcodeToken: createBarcodeToken(item.id, barcodeSecret),
        })),
        hasMore: result.rows.length > limit,
        nextOffset: offset + rows.length,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/packages/bulk", async (request, response, next) => {
    const { packages: inputs } = packageBatchSchema.parse(request.body);
    const staff = request.staffUser!;
    const client = await pool.connect();
    const created: Array<{ package: Record<string, unknown>; barcodeToken: string }> = [];

    try {
      await client.query("BEGIN");
      const setting = await client.query<{ setting_value: string }>(
        "SELECT setting_value FROM app_settings WHERE setting_key = 'price_per_kg' FOR SHARE",
      );
      const pricePerKg = Number(setting.rows[0]?.setting_value);
      if (!Number.isSafeInteger(pricePerKg) || pricePerKg < 1) {
        throw new Error("Tarif per kilogram belum tersedia atau tidak valid.");
      }

      for (const input of inputs) {
        const packageId = randomUUID();
        const trackingCode = `ELK-${randomBytes(6).toString("hex").toUpperCase()}`;
        const barcodeToken = createBarcodeToken(packageId, barcodeSecret);
        const totalPrice = calculateCharge(input.weightKg, pricePerKg);
        const result = await client.query(
          `INSERT INTO packages (
            id, tracking_code, recipient_name, recipient_phone, sender_name, destination,
            description, weight_kg, price_per_kg, total_price, barcode_hash, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id, tracking_code, recipient_name, recipient_phone, sender_name, destination,
            description, weight_kg, price_per_kg, total_price, verified_at, paid_at, collected_at,
            archived_at, created_at`,
          [
            packageId,
            trackingCode,
            input.recipientName,
            input.recipientPhone,
            input.senderName,
            input.destination,
            input.description,
            input.weightKg,
            pricePerKg,
            totalPrice,
            hashToken(barcodeToken),
            staff.id,
          ],
        );
        await writePackageEvent(client, packageId, staff.id, "created");
        created.push({ package: result.rows[0], barcodeToken });
      }

      await client.query("COMMIT");
      response.status(201).json({ packages: created });
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally {
      client.release();
    }
  });

  app.post("/api/packages", async (request, response, next) => {
    const input = packageInputSchema.parse(request.body);
    const staff = request.staffUser!;
    const client = await pool.connect();
    const packageId = randomUUID();
    const trackingCode = `ELK-${randomBytes(6).toString("hex").toUpperCase()}`;
    const barcodeToken = createBarcodeToken(packageId, barcodeSecret);

    try {
      await client.query("BEGIN");
      const setting = await client.query<{ setting_value: string }>(
        "SELECT setting_value FROM app_settings WHERE setting_key = 'price_per_kg' FOR SHARE",
      );
      const pricePerKg = Number(setting.rows[0]?.setting_value);
      if (!Number.isSafeInteger(pricePerKg) || pricePerKg < 1) {
        throw new Error("Tarif per kilogram belum tersedia atau tidak valid.");
      }
      const totalPrice = calculateCharge(input.weightKg, pricePerKg);
      const result = await client.query(
        `INSERT INTO packages (
          id, tracking_code, recipient_name, recipient_phone, sender_name, destination,
          description, weight_kg, price_per_kg, total_price, barcode_hash, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, tracking_code, recipient_name, recipient_phone, sender_name, destination,
          description, weight_kg, price_per_kg, total_price, created_at`,
        [
          packageId,
          trackingCode,
          input.recipientName,
          input.recipientPhone,
          input.senderName,
          input.destination,
          input.description,
          input.weightKg,
          pricePerKg,
          totalPrice,
          hashToken(barcodeToken),
          staff.id,
        ],
      );
      await writePackageEvent(client, packageId, staff.id, "created");
      await client.query("COMMIT");
      response.status(201).json({ package: result.rows[0], barcodeToken });
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally {
      client.release();
    }
  });

  app.put("/api/packages/:id", requireOwner, async (request, response, next) => {
    const input = packageInputSchema.parse(request.body);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{
        id: string;
        price_per_kg: string | number;
        verified_at: string | null;
        paid_at: string | null;
        collected_at: string | null;
        archived_at: string | null;
      }>(
        `SELECT id, price_per_kg, verified_at, paid_at, collected_at, archived_at
         FROM packages WHERE id = $1 FOR UPDATE`,
        [request.params["id"]],
      );
      const existing = result.rows[0];
      if (!existing) throw new WorkflowError("Paket tidak ditemukan.", 404);
      assertCanEditPackage({
        verifiedAt: existing.verified_at,
        paidAt: existing.paid_at,
        collectedAt: existing.collected_at,
        archivedAt: existing.archived_at,
      });
      const totalPrice = calculateCharge(input.weightKg, Number(existing.price_per_kg));
      const updated = await client.query(
        `UPDATE packages
         SET recipient_name = $2, recipient_phone = $3, sender_name = $4, destination = $5,
             description = $6, weight_kg = $7, total_price = $8
         WHERE id = $1
         RETURNING id, tracking_code, recipient_name, recipient_phone, sender_name, destination,
           description, weight_kg, price_per_kg, total_price, verified_at, paid_at, collected_at,
           archived_at, created_at`,
        [
          existing.id,
          input.recipientName,
          input.recipientPhone,
          input.senderName,
          input.destination,
          input.description,
          input.weightKg,
          totalPrice,
        ],
      );
      await client.query("COMMIT");
      response.json({ package: updated.rows[0] });
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally {
      client.release();
    }
  });

  app.delete("/api/packages/:id", requireOwner, async (request, response, next) => {
    try {
      const result = await pool.query(
        `UPDATE packages SET archived_at = now(), archived_by = $2
         WHERE id = $1 AND archived_at IS NULL
         RETURNING id`,
        [request.params["id"], request.staffUser!.id],
      );
      if (!result.rows[0])
        throw new WorkflowError("Paket tidak ditemukan atau sudah diarsipkan.", 404);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/packages/:id/restore", requireOwner, async (request, response, next) => {
    try {
      const result = await pool.query(
        `UPDATE packages SET archived_at = NULL, archived_by = NULL
         WHERE id = $1 AND archived_at IS NOT NULL
         RETURNING id`,
        [request.params["id"]],
      );
      if (!result.rows[0])
        throw new WorkflowError("Paket tidak ditemukan atau tidak diarsipkan.", 404);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/packages/:trackingCode/barcode", async (request, response, next) => {
    try {
      const result = await pool.query<{ id: string }>(
        "SELECT id FROM packages WHERE tracking_code = $1 AND archived_at IS NULL",
        [request.params.trackingCode],
      );
      const packageId = result.rows[0]?.id;
      if (!packageId) {
        response.status(404).json({ error: "Nomor paket tidak ditemukan." });
        return;
      }
      response.json({ barcodeToken: createBarcodeToken(packageId, barcodeSecret) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/packages/scan", async (request, response, next) => {
    const input = actionSchema.parse(request.body);
    const packageId = verifyBarcodeToken(input.barcodeToken, barcodeSecret);
    const client = await pool.connect();
    const staff = request.staffUser!;
    const actionColumn: Record<PackageAction, string> = {
      verify: "verified_at",
      payment: "paid_at",
      collect: "collected_at",
    };
    const actorColumn: Record<PackageAction, string> = {
      verify: "verified_by",
      payment: "paid_by",
      collect: "collected_by",
    };

    try {
      await client.query("BEGIN");
      const result = await client.query(
        `SELECT id, tracking_code, recipient_name, recipient_phone, sender_name, destination,
          description, weight_kg, price_per_kg, total_price, barcode_hash,
          verified_at, paid_at, collected_at
         FROM packages WHERE id = $1 AND archived_at IS NULL FOR UPDATE`,
        [packageId],
      );
      const packageRow = result.rows[0];
      if (!packageRow || hashToken(input.barcodeToken) !== packageRow.barcode_hash.trim()) {
        throw new WorkflowError("Barcode tidak dikenal.", 404);
      }
      assertCanApplyAction(packageRow, input.action);
      await client.query(
        `UPDATE packages SET ${actionColumn[input.action]} = now(), ${actorColumn[input.action]} = $2 WHERE id = $1`,
        [packageId, staff.id],
      );
      await writePackageEvent(client, packageId, staff.id, input.action);
      const updated = await client.query(
        `SELECT id, tracking_code, recipient_name, recipient_phone, sender_name, destination,
          description, weight_kg, price_per_kg, total_price, verified_at, paid_at, collected_at
         FROM packages WHERE id = $1`,
        [packageId],
      );
      await client.query("COMMIT");
      response.json({ package: updated.rows[0], action: input.action });
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally {
      client.release();
    }
  });

  app.get("/api/payments", async (_request, response, next) => {
    try {
      const result = await pool.query(
        `SELECT id, tracking_code, recipient_name, recipient_phone, destination, weight_kg,
          total_price, verified_at, paid_at, collected_at, archived_at, created_at
         FROM packages ORDER BY (paid_at IS NULL) DESC, created_at DESC LIMIT 100`,
      );
      response.json({ packages: result.rows });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/settings/price", async (_request, response, next) => {
    try {
      const result = await pool.query<{ setting_value: string; updated_at: Date }>(
        "SELECT setting_value, updated_at FROM app_settings WHERE setting_key = 'price_per_kg'",
      );
      response.json({
        pricePerKg: Number(result.rows[0]?.setting_value ?? 8000),
        updatedAt: result.rows[0]?.updated_at ?? null,
      });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/settings/price", async (request, response, next) => {
    try {
      const { pricePerKg } = z
        .object({ pricePerKg: z.number().int().min(1).max(100_000_000) })
        .parse(request.body);
      await pool.query(
        `INSERT INTO app_settings (setting_key, setting_value, updated_by, updated_at)
         VALUES ('price_per_kg', $1, $2, now())
         ON CONFLICT (setting_key) DO UPDATE
         SET setting_value = EXCLUDED.setting_value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [String(pricePerKg), request.staffUser!.id],
      );
      response.json({ pricePerKg });
    } catch (error) {
      next(error);
    }
  });

  app.use(sendError);

  const port = Number(process.env["API_PORT"] ?? 3001);
  const host = process.env["API_HOST"] ?? "127.0.0.1";
  const server = app.listen(port, host, () => {
    console.log(`ELKANA API listening on http://${host}:${port}`);
  });

  const shutdown = async () => {
    server.close();
    await pool.end();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error: unknown) => {
  console.error(`Gagal memulai API ELKANA: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
