import { z } from "zod";
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
} from "../../shared/domain";
import { mediaFolders } from "../../shared/media";
import type { Order, OrderStatus, Recipe } from "../../shared/types";
import type { DemoRepository } from "./repository";

export interface DemoOptions {
  repository: DemoRepository;
  baseUrl: string;
  qr: (value: string) => Promise<string>;
  onImages?: (images: Record<string, string>) => void;
}
const transitions: Record<OrderStatus, OrderStatus[]> = {
  waiting: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};
const orderPatch = z.object({
  status: z.enum(["waiting", "preparing", "ready", "delivered", "cancelled"]),
});
const itemPatch = z.object({
  status: z.enum(["accepted", "rejected"]),
  rejectionReason: z.string().trim().max(200).optional(),
});
const publicOrder = (order: Order) => {
  const { token: _token, ...result } = sanitizeOrder(order);
  return result;
};

/** No network calls or WhatsApp credentials in the Pages presentation. */
export function createDemoApi({
  repository,
  baseUrl,
  qr,
  onImages,
}: DemoOptions) {
  const trackingUrl = (token: string) =>
    `${baseUrl.replace(/\/$/, "")}/#/acompanhar/${encodeURIComponent(token)}`;
  async function execute(
    path: string,
    options: RequestInit = {},
  ): Promise<unknown> {
    const method = (options.method || "GET").toUpperCase();
    const body =
      typeof options.body === "string" ? JSON.parse(options.body) : undefined;
    const route = path.split("?")[0];
    if (route === "/api/state" && method === "GET") {
      let snapshot = await repository.read();
      const minutes = snapshot.state.store.returnAfterMinutes;
      if (
        minutes &&
        snapshot.state.orders.some(
          (o) =>
            o.status === "ready" &&
            o.readyAt &&
            Date.now() - o.readyAt >= minutes * 60000,
        )
      ) {
        await repository.mutate(({ state }) => {
          const limit = state.store.returnAfterMinutes;
          if (!limit) return;
          for (const order of state.orders) {
            if (
              order.status === "ready" &&
              order.readyAt &&
              Date.now() - order.readyAt >= limit * 60000
            ) {
              order.status = "waiting";
              delete order.readyAt;
            }
          }
        });
        snapshot = await repository.read();
      }
      onImages?.(snapshot.images);
      return {
        ...snapshot.state,
        orders: snapshot.state.orders.map(publicOrder),
        capabilities: {
          storage: "browser",
          browserDemo: true,
          demonstration: true,
          whatsappConfigured: false,
          publicBaseUrl: baseUrl,
        },
      };
    }
    if (route === "/api/orders" && method === "POST") {
      // A local presentation has no reason to collect a customer's contact details.
      const input = newOrderSchema.parse({
        ...body,
        customer: undefined,
        phone: undefined,
        whatsappOptIn: false,
      });
      const key =
        new Headers(options.headers).get("Idempotency-Key") || undefined;
      if (key && !/^[a-zA-Z0-9_-]{8,100}$/.test(key))
        throw new ApiError(400, "Chave de confirmação inválida.");
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(input)),
      );
      const hash = Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      const order = await repository.mutate(({ state }) => {
        const result = makeOrder(state, input, key, {
          randomUUID: () => crypto.randomUUID(),
          token: () =>
            Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) =>
              b.toString(16).padStart(2, "0"),
            ).join(""),
          requestHash: () => hash,
        });
        result.order.notification = {
          status: "disabled",
          message:
            "Demonstração: pedido salvo neste navegador. Nenhum WhatsApp será enviado.",
        };
        return result.order;
      });
      const url = trackingUrl(order.token);
      return {
        order: sanitizeOrder(order),
        trackingUrl: url,
        qrDataUrl: await qr(url),
      };
    }
    const orderMatch = route.match(
      /^\/api\/orders\/([^/]+)(?:\/items\/([^/]+))?$/,
    );
    if (orderMatch && method === "PATCH") {
      const patch = orderMatch[2]
        ? itemPatch.parse(body)
        : orderPatch.parse(body);
      return repository.mutate(({ state }) => {
        const order = state.orders.find((o) => o.id === orderMatch[1]);
        if (!order) throw new ApiError(404, "Pedido não encontrado.");
        if (orderMatch[2]) {
          const itemUpdate = patch as z.infer<typeof itemPatch>;
          if (["ready", "delivered"].includes(order.status))
            throw new ApiError(
              409,
              "Revise os itens antes de marcar o pedido como pronto.",
            );
          const item = order.items.find((i) => i.id === orderMatch[2]);
          if (!item) throw new ApiError(404, "Item não encontrado.");
          item.status = itemUpdate.status;
          item.rejectionReason =
            item.status === "rejected"
              ? itemUpdate.rejectionReason || "Produto indisponível"
              : undefined;
          if (order.status === "cancelled" && item.status === "accepted")
            order.status = "waiting";
          recompute(order);
        } else {
          const status = (patch as z.infer<typeof orderPatch>).status;
          if (
            status !== order.status &&
            !transitions[order.status].includes(status)
          )
            throw new ApiError(
              409,
              "Esta mudança de situação não está disponível.",
            );
          if (status === "ready" && order.status !== "ready")
            order.readyAt = Date.now();
          if (status === "delivered") order.deliveredAt = Date.now();
          order.status = status;
        }
        return publicOrder(order);
      });
    }
    const trackMatch = route.match(/^\/api\/track\/([^/]+)$/);
    if (trackMatch && method === "GET") {
      const { state } = await repository.read();
      const order = state.orders.find(
        (o) => o.token === decodeURIComponent(trackMatch[1]),
      );
      if (!order)
        throw new ApiError(
          404,
          "Este pedido de demonstração está salvo apenas no navegador em que foi criado.",
        );
      const url = trackingUrl(order.token);
      return {
        order: sanitizeOrder(order),
        store: { name: state.store.name },
        recipes: order.recipes,
        shoppingList: shoppingList(order),
        trackingUrl: url,
        qrDataUrl: await qr(url),
      };
    }
    if (route === "/api/qr" && method === "GET") {
      const value = z
        .string()
        .min(1)
        .max(2000)
        .parse(new URL(path, baseUrl).searchParams.get("text"));
      return { qrDataUrl: await qr(value) };
    }
    if (route === "/api/store" && method === "PATCH") {
      const patch = storePatch.parse(body);
      return repository.mutate(({ state }) =>
        Object.assign(state.store, patch, { publicBaseUrl: baseUrl }),
      );
    }
    const productMatch = route.match(/^\/api\/products(?:\/([^/]+))?$/);
    if (productMatch && method === "POST" && !productMatch[1]) {
      const input = productSchema.parse(body);
      return repository.mutate(({ state }) => {
        const product = {
          ...input,
          id: input.id || `produto-${crypto.randomUUID()}`,
        };
        if (state.products.some((p) => p.id === product.id))
          throw new ApiError(409, "Este produto já existe.");
        state.products.push(product);
        return product;
      });
    }
    if (productMatch?.[1] && method === "PATCH") {
      const patch = productSchema.omit({ id: true }).partial().parse(body);
      return repository.mutate(({ state }) => {
        const product = state.products.find((p) => p.id === productMatch[1]);
        if (!product) throw new ApiError(404, "Produto não encontrado.");
        Object.assign(product, patch);
        if (patch.preps)
          for (const recipe of state.recipes.filter((r) => r.active)) {
            try {
              validateRecipe(recipe, state);
            } catch (error) {
              throw new ApiError(
                400,
                `A alteração afeta a receita "${recipe.name}": ${(error as Error).message}`,
              );
            }
          }
        return product;
      });
    }
    const recipeMatch = route.match(/^\/api\/recipes(?:\/([^/]+))?$/);
    if (recipeMatch && method === "POST" && !recipeMatch[1]) {
      const input = recipeSchema.parse(body);
      return repository.mutate(({ state }) => {
        const recipe = {
          ...input,
          id: input.id || `receita-${crypto.randomUUID()}`,
        };
        if (state.recipes.some((r) => r.id === recipe.id))
          throw new ApiError(409, "Esta receita já existe.");
        validateRecipe(recipe, state);
        state.recipes.push(recipe);
        return recipe;
      });
    }
    if (recipeMatch?.[1] && method === "PATCH") {
      const patch = recipeSchema.omit({ id: true }).partial().parse(body);
      return repository.mutate(({ state }) => {
        const index = state.recipes.findIndex((r) => r.id === recipeMatch[1]);
        if (index < 0) throw new ApiError(404, "Receita não encontrada.");
        const recipe = { ...state.recipes[index], ...patch } as Recipe;
        validateRecipe(recipe, state);
        state.recipes[index] = recipe;
        return recipe;
      });
    }
    if (
      route === "/api/media" &&
      method === "POST" &&
      options.body instanceof FormData
    ) {
      const folder = z.enum(mediaFolders).parse(options.body.get("folder"));
      const file = options.body.get("photo");
      if (!(file instanceof File) || file.size > 8 * 1024 * 1024)
        throw new ApiError(
          400,
          "Escolha uma foto JPG, PNG ou WebP de até 8 MB.",
        );
      const bytes = new Uint8Array(await file.arrayBuffer());
      const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
        (b, i) => bytes[i] === b,
      );
      const signature = (start: number, end: number) =>
        String.fromCharCode(...bytes.subarray(start, end));
      const ext =
        bytes.length > 12 &&
        bytes[0] === 255 &&
        bytes[1] === 216 &&
        bytes[2] === 255
          ? "jpg"
          : bytes.length > 24 && png && signature(12, 16) === "IHDR"
            ? "png"
            : bytes.length > 16 &&
                signature(0, 4) === "RIFF" &&
                signature(8, 12) === "WEBP"
              ? "webp"
              : null;
      if (!ext)
        throw new ApiError(
          400,
          "Arquivo inválido. Envie uma imagem JPG, PNG ou WebP.",
        );
      const id = crypto.randomUUID();
      const media = {
        id,
        name: file.name.slice(0, 150),
        folder,
        url: `/fotos/${folder}/demo-${id}.${ext}`,
        createdAt: Date.now(),
      };
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      const dataUrl = `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${btoa(binary)}`;
      await repository.mutate((data) => {
        data.images[media.url] = dataUrl;
        data.state.media.unshift(media);
      });
      onImages?.((await repository.read()).images);
      return media;
    }
    throw new ApiError(
      404,
      "Esta operação não está disponível na demonstração.",
    );
  }
  return async <T>(path: string, options?: RequestInit): Promise<T> => {
    try {
      return (await execute(path, options)) as T;
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new Error(error.issues.map((issue) => issue.message).join(" "));
      throw error;
    }
  };
}
