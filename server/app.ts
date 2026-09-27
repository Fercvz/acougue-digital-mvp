import express from "express";
import multer from "multer";
import QRCode from "qrcode";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Media, Order, Recipe } from "../shared/types.js";
import {
  ApiError,
  makeOrder,
  newOrderSchema,
  productSchema,
  recipeSchema,
  recompute,
  sanitizeOrder,
  shoppingList,
  storePatch,
  validateRecipe,
} from "./domain.js";
import { Repository } from "./repository.js";
import { notifyWhatsApp, whatsappConfigured } from "./whatsapp.js";

export const mediaFolders = [
  "produtos/bovina",
  "produtos/frango",
  "produtos/suina",
  "produtos/embutidos",
  "produtos/miudos",
  "receitas",
  "marca",
  "promocoes",
] as const;
interface AppOptions {
  dataDir: string;
  photoDir: string;
  databaseUrl?: string;
  distDir?: string;
}
export async function createApp(options: AppOptions) {
  const repo = new Repository(options.dataDir, options.databaseUrl);
  await repo.init();
  await Promise.all(
    mediaFolders.map((folder) =>
      mkdir(path.join(options.photoDir, folder), { recursive: true }),
    ),
  );
  const app = express();
  app.disable("x-powered-by");
  const listeners = new Set<express.Response>();
  function changed() {
    for (const client of listeners) client.write(`event: update\ndata: {}\n\n`);
  }
  const trackingUrl = (base: string, token: string) =>
    `${base.replace(/\/$/, "")}/acompanhar/${token}`;
  const qr = (value: string) =>
    QRCode.toDataURL(value, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "M",
    });
  const operationalOrder = ({
    phone: _phone,
    token: _token,
    idempotencyKey: _key,
    requestHash: _hash,
    ...order
  }: Order) => order;
  app.use(express.json({ limit: "256kb" }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
    // The presentation exposes all roles on one origin; do not permit foreign websites to mutate it.
    const origin = req.get("Origin");
    if (origin && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      try {
        if (new URL(origin).host !== req.get("Host")) throw new Error();
      } catch {
        res.status(403).json({ error: "Origem da solicitação não permitida." });
        return;
      }
    }
    next();
  });
  app.use(
    "/fotos",
    express.static(options.photoDir, {
      dotfiles: "deny",
      fallthrough: false,
      maxAge: "1h",
    }),
  );

  async function mediaList(persisted: Media[]) {
    const media = [...persisted];
    const known = new Set(media.map((m) => m.url));
    for (const folder of mediaFolders) {
      const files = await readdir(path.join(options.photoDir, folder), {
        withFileTypes: true,
      });
      for (const file of files) {
        if (!file.isFile() || !/\.(jpg|jpeg|png|webp)$/i.test(file.name))
          continue;
        const url = `/fotos/${folder}/${file.name}`;
        if (known.has(url)) continue;
        const info = await stat(path.join(options.photoDir, folder, file.name));
        media.push({
          id: url,
          name: file.name,
          folder,
          url,
          createdAt: info.mtimeMs,
        });
      }
    }
    return media.sort((a, b) => b.createdAt - a.createdAt);
  }
  app.get("/api/state", async (_req, res) => {
    const data = await repo.read();
    res.json({
      store: data.store,
      products: data.products,
      recipes: data.recipes,
      orders: data.orders.map(operationalOrder),
      media: await mediaList(data.media),
      capabilities: {
        storage: repo.storage,
        whatsappConfigured: whatsappConfigured(),
        publicBaseUrl: data.store.publicBaseUrl,
        demonstration: true,
      },
    });
  });
  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write("event: connected\ndata: {}\n\n");
    listeners.add(res);
    const keepalive = setInterval(() => res.write(": heartbeat\n\n"), 25000);
    keepalive.unref();
    req.on("close", () => {
      clearInterval(keepalive);
      listeners.delete(res);
    });
  });
  app.get("/api/qr", async (req, res) => {
    const value = z.string().min(1).max(2000).parse(req.query.text);
    res.json({ qrDataUrl: await qr(value) });
  });
  app.post("/api/orders", async (req, res) => {
    const input = newOrderSchema.parse(req.body);
    const key = req.get("Idempotency-Key");
    if (key && !/^[a-zA-Z0-9_-]{8,100}$/.test(key))
      throw new ApiError(400, "Chave de confirmação inválida.");
    const { order, created } = await repo.mutate((data) =>
      makeOrder(data, input, key),
    );
    const data = await repo.read();
    const url = trackingUrl(data.store.publicBaseUrl, order.token);
    if (created) {
      const result = await notifyWhatsApp(order, url, "received");
      order.notification = result;
      await repo.mutate((data) => {
        const saved = data.orders.find((o) => o.id === order.id)!;
        saved.notification = result;
      });
      changed();
    }
    res.status(created ? 201 : 200).json({
      order: sanitizeOrder(order),
      trackingUrl: url,
      qrDataUrl: await qr(url),
    });
  });
  app.patch("/api/orders/:id", async (req, res) => {
    const { status } = z
      .object({
        status: z.enum([
          "waiting",
          "preparing",
          "ready",
          "delivered",
          "cancelled",
        ]),
      })
      .parse(req.body);
    let notify = false;
    const order = await repo.mutate((data) => {
      const order = data.orders.find((o) => o.id === req.params.id);
      if (!order) throw new ApiError(404, "Pedido não encontrado.");
      const transitions: Record<Order["status"], Order["status"][]> = {
        waiting: ["preparing", "cancelled"],
        preparing: ["ready", "cancelled"],
        ready: ["delivered", "cancelled"],
        delivered: [],
        cancelled: [],
      };
      if (
        status !== order.status &&
        !transitions[order.status].includes(status)
      )
        throw new ApiError(
          409,
          "Esta mudança de situação não está disponível.",
        );
      if (status === "ready" && order.status !== "ready") {
        order.readyAt = Date.now();
        notify = true;
      }
      if (status === "delivered") order.deliveredAt = Date.now();
      order.status = status;
      return order;
    });
    if (notify) {
      const data = await repo.read();
      const result = await notifyWhatsApp(
        order,
        trackingUrl(data.store.publicBaseUrl, order.token),
        "ready",
      );
      order.notification = result;
      await repo.mutate((data) => {
        data.orders.find((o) => o.id === order.id)!.notification = result;
      });
    }
    changed();
    res.json(operationalOrder(order));
  });
  app.patch("/api/orders/:id/items/:itemId", async (req, res) => {
    const patch = z
      .object({
        status: z.enum(["accepted", "rejected"]),
        rejectionReason: z.string().trim().max(200).optional(),
      })
      .parse(req.body);
    if (patch.status === "rejected" && !patch.rejectionReason)
      patch.rejectionReason = "Produto indisponível";
    const order = await repo.mutate((data) => {
      const order = data.orders.find((o) => o.id === req.params.id);
      if (!order) throw new ApiError(404, "Pedido não encontrado.");
      if (order.status === "delivered" || order.status === "ready")
        throw new ApiError(
          409,
          "Revise os itens antes de marcar o pedido como pronto.",
        );
      const item = order.items.find((i) => i.id === req.params.itemId);
      if (!item) throw new ApiError(404, "Item não encontrado.");
      item.status = patch.status;
      item.rejectionReason =
        patch.status === "rejected" ? patch.rejectionReason : undefined;
      if (order.status === "cancelled" && patch.status === "accepted")
        order.status = "waiting";
      recompute(order);
      return order;
    });
    changed();
    res.json(operationalOrder(order));
  });
  app.get("/api/track/:token", async (req, res) => {
    const data = await repo.read();
    const order = data.orders.find((o) => o.token === req.params.token);
    if (!order)
      throw new ApiError(404, "Pedido não encontrado. Confira o QR code.");
    const url = trackingUrl(data.store.publicBaseUrl, order.token);
    res.json({
      order: sanitizeOrder(order),
      store: { name: data.store.name, logo: data.store.logo },
      recipes: order.recipes,
      shoppingList: shoppingList(order),
      trackingUrl: url,
      qrDataUrl: await qr(url),
    });
  });
  app.patch("/api/store", async (req, res) => {
    const patch = storePatch.parse(req.body);
    const store = await repo.mutate((data) => Object.assign(data.store, patch));
    changed();
    res.json(store);
  });
  app.post("/api/products", async (req, res) => {
    const input = productSchema.parse(req.body);
    const product = await repo.mutate((data) => {
      const product = { ...input, id: input.id || `produto-${randomUUID()}` };
      if (data.products.some((p) => p.id === product.id))
        throw new ApiError(409, "Este produto já existe.");
      data.products.push(product);
      return product;
    });
    changed();
    res.status(201).json(product);
  });
  app.patch("/api/products/:id", async (req, res) => {
    const patch = productSchema.omit({ id: true }).partial().parse(req.body);
    const product = await repo.mutate((data) => {
      const product = data.products.find((p) => p.id === req.params.id);
      if (!product) throw new ApiError(404, "Produto não encontrado.");
      Object.assign(product, patch);
      if (patch.preps) {
        for (const recipe of data.recipes.filter(
          (r) =>
            r.active &&
            r.variants.some(
              (v) =>
                v.productIds.includes(product.id) ||
                v.meatComponents?.some((c) => c.productId === product.id),
            ),
        )) {
          try {
            validateRecipe(recipe, data);
          } catch (error) {
            throw new ApiError(
              400,
              `A alteração afeta a receita "${recipe.name}": ${(error as Error).message} Ajuste a receita primeiro.`,
            );
          }
        }
      }
      return product;
    });
    changed();
    res.json(product);
  });
  app.post("/api/recipes", async (req, res) => {
    const input = recipeSchema.parse(req.body);
    const recipe = await repo.mutate((data) => {
      const recipe = { ...input, id: input.id || `receita-${randomUUID()}` };
      if (data.recipes.some((r) => r.id === recipe.id))
        throw new ApiError(409, "Esta receita já existe.");
      validateRecipe(recipe, data);
      data.recipes.push(recipe);
      return recipe;
    });
    changed();
    res.status(201).json(recipe);
  });
  app.patch("/api/recipes/:id", async (req, res) => {
    const patch = recipeSchema.omit({ id: true }).partial().parse(req.body);
    const recipe = await repo.mutate((data) => {
      const index = data.recipes.findIndex((r) => r.id === req.params.id);
      if (index < 0) throw new ApiError(404, "Receita não encontrada.");
      const recipe = { ...data.recipes[index], ...patch } as Recipe;
      validateRecipe(recipe, data);
      data.recipes[index] = recipe;
      return recipe;
    });
    changed();
    res.json(recipe);
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 2 },
  });
  app.post("/api/media", upload.single("photo"), async (req, res) => {
    const folder = z.enum(mediaFolders).parse(req.body.folder);
    if (!req.file)
      throw new ApiError(400, "Escolha uma foto JPG, PNG ou WebP.");
    const file = req.file;
    const b = file.buffer;
    let ext: string | undefined;
    if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
      ext = "jpg";
    if (
      b.length > 24 &&
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      b.toString("ascii", 12, 16) === "IHDR"
    )
      ext = "png";
    if (
      b.length > 16 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP"
    )
      ext = "webp";
    if (!ext)
      throw new ApiError(
        400,
        "Arquivo inválido. Envie uma imagem JPG, PNG ou WebP.",
      );
    const id = randomUUID();
    const filename = `${id}.${ext}`;
    await writeFile(path.join(options.photoDir, folder, filename), b, {
      flag: "wx",
    });
    const media: Media = {
      id,
      name: path.basename(file.originalname).slice(0, 150),
      folder,
      url: `/fotos/${folder}/${filename}`,
      createdAt: Date.now(),
    };
    await repo.mutate((data) => {
      data.media.push(media);
    });
    changed();
    res.status(201).json(media);
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Recurso não encontrado." }),
  );
  if (options.distDir) {
    app.use(express.static(options.distDir));
    app.get("/acompanhar/:token", (_req, res) =>
      res.sendFile(path.join(options.distDir!, "index.html")),
    );
  }
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: error.issues[0]?.message || "Confira os campos informados.",
        });
        return;
      }
      if (error instanceof multer.MulterError) {
        res.status(400).json({
          error:
            error.code === "LIMIT_FILE_SIZE"
              ? "A foto deve ter no máximo 8 MB."
              : "Não foi possível carregar a foto.",
        });
        return;
      }
      if (error instanceof ApiError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      if (error instanceof SyntaxError) {
        res.status(400).json({ error: "Solicitação inválida." });
        return;
      }
      if ((error as { status?: number })?.status === 404) {
        res.status(404).json({ error: "Arquivo não encontrado." });
        return;
      }
      console.error("Falha no servidor:", (error as Error)?.message);
      res.status(500).json({
        error: "Não foi possível concluir a operação. Tente novamente.",
      });
    },
  );
  async function applyReturnPolicy() {
    const data = await repo.read();
    const minutes = data.store.returnAfterMinutes;
    if (!minutes) return;
    if (
      !data.orders.some(
        (o) =>
          o.status === "ready" &&
          o.readyAt &&
          Date.now() - o.readyAt >= minutes * 60000,
      )
    )
      return;
    await repo.mutate((state) => {
      const configured = state.store.returnAfterMinutes;
      if (!configured) return;
      for (const order of state.orders) {
        if (
          order.status === "ready" &&
          order.readyAt &&
          Date.now() - order.readyAt >= configured * 60000
        ) {
          order.status = "waiting";
          delete order.readyAt;
        }
      }
    });
    changed();
  }
  return {
    app,
    repo,
    applyReturnPolicy,
    close: async () => {
      for (const listener of listeners) listener.end();
      await repo.close();
    },
  };
}
