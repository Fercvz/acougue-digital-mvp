import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { isSteakPreparation } from "../shared/preparation.js";
import type {
  DatabaseState,
  NewOrderInput,
  Order,
  Recipe,
  RecipeSnapshot,
} from "../shared/types.js";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const text = z.string().trim().min(1).max(150);
const image = z
  .string()
  .max(1000)
  .refine(
    (v) => !v || v.startsWith("/fotos/"),
    "Escolha uma imagem da biblioteca de fotos.",
  );
const safeUrl = z
  .string()
  .url()
  .refine((v) => /^https?:\/\//i.test(v), "Use uma URL HTTP ou HTTPS.");
export const storePatch = z
  .object({
    name: text,
    tagline: z.string().trim().max(200),
    logo: image,
    publicBaseUrl: safeUrl,
    kioskEnabled: z.boolean(),
    returnAfterMinutes: z.number().int().min(1).max(1440).nullable(),
  })
  .partial();
export const productSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(80)
    .optional(),
  name: text,
  category: z.enum(["bovina", "frango", "suina", "embutidos", "miudos"]),
  price: z.number().positive().max(10000),
  available: z.boolean(),
  image,
  description: z.string().trim().max(600),
  preps: z.array(text).min(1).max(20),
  unitWeight: z.number().positive().max(20),
  promotion: z
    .object({ label: text, oldPrice: z.number().positive().max(10000) })
    .nullable()
    .optional()
    .transform((value) => value ?? undefined),
});
const ingredient = z.object({
  name: text,
  amount: z.number().positive().max(10000),
  unit: text,
});
export const recipeSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(80)
    .optional(),
  name: text,
  description: z.string().trim().max(600),
  image,
  secondaryImage: image.optional(),
  category: z.enum(["dia-a-dia", "churrasco"]),
  baseServings: z.number().int().min(1).max(100),
  active: z.boolean(),
  variants: z
    .array(
      z.object({
        id: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .max(80),
        name: text,
        image: image.optional(),
        productIds: z.array(text).min(1).max(30),
        recommendedProductId: text,
        prep: text,
        gramsPerServing: z.number().positive().max(5000),
        ingredients: z.array(ingredient).max(40),
        instructions: z
          .array(z.string().trim().min(1).max(1500))
          .min(1)
          .max(30),
        meatComponents: z
          .array(
            z.object({
              productId: text,
              gramsPerServing: z.number().positive().max(5000),
              prep: text,
            }),
          )
          .min(1)
          .max(20)
          .optional(),
      }),
    )
    .min(1)
    .max(12),
});
export const newOrderSchema = z.object({
  customer: z.string().trim().max(80).optional(),
  phone: z.string().max(30).optional(),
  whatsappOptIn: z.boolean().default(false),
  items: z
    .array(
      z.object({
        productId: text,
        amount: z.number().positive().max(100),
        unit: z.enum(["kg", "unit"]),
        prep: text,
        thickness: z.string().trim().max(80).optional(),
        notes: z.string().trim().max(500).optional(),
        recipeId: text.optional(),
        recipeSelectionId: text.optional(),
      }),
    )
    .min(1)
    .max(50),
  recipeSelections: z
    .array(
      z.object({
        recipeId: text,
        variantId: text,
        servings: z.number().int().min(1).max(100),
        productId: text,
        selectionId: text.optional(),
      }),
    )
    .max(20)
    .optional(),
});
export const round = (v: number) =>
  Math.round((v + Number.EPSILON) * 100) / 100;
export function recompute(order: Order) {
  order.estimatedTotal = round(
    order.items
      .filter((i) => i.status === "accepted")
      .reduce((sum, i) => sum + i.estimatedWeight * i.unitPrice, 0),
  );
  if (order.items.every((i) => i.status === "rejected"))
    order.status = "cancelled";
}
export function normalizePhone(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  if (!/^[1-9]\d{10,14}$/.test(digits))
    throw new ApiError(400, "Informe um WhatsApp com DDD válido.");
  return digits;
}
export function validateRecipe(recipe: Recipe, data: DatabaseState) {
  const ids = new Set<string>();
  for (const variant of recipe.variants) {
    if (ids.has(variant.id))
      throw new ApiError(
        400,
        "As versões da receita precisam de identificadores diferentes.",
      );
    ids.add(variant.id);
    if (!variant.productIds.includes(variant.recommendedProductId))
      throw new ApiError(
        400,
        "A carne recomendada deve estar entre as opções da receita.",
      );
    for (const id of variant.productIds) {
      const p = data.products.find((x) => x.id === id);
      if (!p) throw new ApiError(400, "Uma das carnes da receita não existe.");
      if (!p.preps.includes(variant.prep))
        throw new ApiError(
          400,
          `${p.name} não oferece o preparo ${variant.prep}.`,
        );
    }
    for (const part of variant.meatComponents || []) {
      const p = data.products.find((x) => x.id === part.productId);
      if (!p || !p.preps.includes(part.prep))
        throw new ApiError(400, "Revise as carnes e preparos da composição.");
    }
    if (
      variant.meatComponents?.length &&
      (variant.meatComponents[0].productId !== variant.recommendedProductId ||
        variant.meatComponents[0].prep !== variant.prep)
    )
      throw new ApiError(
        400,
        "A primeira carne da composição deve ser a recomendada, com o mesmo preparo da versão.",
      );
  }
}
export function makeOrder(
  data: DatabaseState,
  input: NewOrderInput,
  key?: string,
): { order: Order; created: boolean } {
  const requestHash = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
  if (key) {
    const prior = data.orders.find((o) => o.idempotencyKey === key);
    if (prior) {
      if (prior.requestHash !== requestHash)
        throw new ApiError(
          409,
          "Esta confirmação já foi usada para outro pedido.",
        );
      return { order: prior, created: false };
    }
  }
  if (!data.store.kioskEnabled)
    throw new ApiError(409, "Novos pedidos estão pausados. Procure o balcão.");
  const phone = input.whatsappOptIn
    ? normalizePhone(input.phone || "")
    : undefined;
  const items = input.items.map((item) => {
    const product = data.products.find((p) => p.id === item.productId);
    if (!product || !product.available)
      throw new ApiError(
        409,
        `${product?.name || "Este produto"} está indisponível. Revise seu pedido.`,
      );
    if (!product.preps.includes(item.prep))
      throw new ApiError(
        400,
        `O preparo escolhido não está disponível para ${product.name}.`,
      );
    if (item.unit === "unit") {
      if (!isSteakPreparation(item.prep))
        throw new ApiError(
          400,
          "Pedidos por quantidade estão disponíveis apenas para bifes. Escolha por peso para outros preparos.",
        );
      if (!Number.isInteger(item.amount))
        throw new ApiError(400, "A quantidade de bifes deve ser inteira.");
    }
    return {
      ...item,
      id: randomUUID(),
      name: product.name,
      estimatedWeight:
        Math.round(
          (item.unit === "kg"
            ? item.amount
            : item.amount * product.unitWeight) * 1000,
        ) / 1000,
      unitPrice: product.price,
      status: "accepted" as const,
    };
  });
  const selectionIds = new Set<string>();
  const recipes: RecipeSnapshot[] = (input.recipeSelections || []).map(
    (selection) => {
      if (selection.selectionId) {
        if (selectionIds.has(selection.selectionId))
          throw new ApiError(400, "Há uma receita duplicada na confirmação.");
        selectionIds.add(selection.selectionId);
      }
      const recipe = data.recipes.find(
        (r) => r.id === selection.recipeId && r.active,
      );
      const variant = recipe?.variants.find(
        (v) => v.id === selection.variantId,
      );
      if (
        !recipe ||
        !variant ||
        !variant.productIds.includes(selection.productId)
      )
        throw new ApiError(
          400,
          "Uma das opções de receita mudou. Revise o pedido.",
        );
      if (
        !items.some(
          (i) =>
            i.recipeId === recipe.id &&
            i.productId === selection.productId &&
            (!selection.selectionId ||
              i.recipeSelectionId === selection.selectionId),
        )
      )
        throw new ApiError(
          400,
          "Inclua a carne escolhida para a receita no pedido.",
        );
      return {
        ...selection,
        name: recipe.name,
        variantName: variant.name,
        image: variant.image || recipe.image,
        ingredients: variant.ingredients.map((i) => ({
          ...i,
          amount: round(i.amount * selection.servings),
        })),
        instructions: [...variant.instructions],
      };
    },
  );
  const order: Order = {
    id: randomUUID(),
    ticket: `A${String(data.nextTicket++).padStart(3, "0")}`,
    token: randomBytes(24).toString("hex"),
    status: "waiting",
    createdAt: Date.now(),
    customer: input.customer || undefined,
    phone,
    whatsappOptIn: input.whatsappOptIn,
    items,
    estimatedTotal: 0,
    recipes,
    notification: {
      status: input.whatsappOptIn ? "pending" : "not_requested",
      message: input.whatsappOptIn
        ? "Verificando envio pelo WhatsApp."
        : "Acompanhe pelo QR code ou pelo painel.",
    },
    idempotencyKey: key,
    requestHash,
  };
  recompute(order);
  data.orders.push(order);
  return { order, created: true };
}
export function shoppingList(order: Order) {
  const entries: {
    name: string;
    amount: number;
    unit: string;
    section: "acougue" | "mercado";
  }[] = [];
  for (const item of order.items.filter((i) => i.status === "accepted"))
    entries.push({
      name: item.name,
      amount: item.estimatedWeight,
      unit: "kg",
      section: "acougue",
    });
  for (const recipe of order.recipes) {
    if (
      !order.items.some(
        (i) =>
          i.recipeId === recipe.recipeId &&
          i.status === "accepted" &&
          (!recipe.selectionId || i.recipeSelectionId === recipe.selectionId),
      )
    )
      continue;
    for (const ingredient of recipe.ingredients)
      entries.push({ ...ingredient, section: "mercado" });
  }
  const combined = new Map<string, (typeof entries)[number]>();
  for (const entry of entries) {
    const key = `${entry.section}:${entry.name.toLocaleLowerCase("pt-BR")}:${entry.unit}`;
    const prior = combined.get(key);
    if (prior) prior.amount = round(prior.amount + entry.amount);
    else combined.set(key, { ...entry });
  }
  return [...combined.values()];
}
export function sanitizeOrder(order: Order) {
  const {
    customer: _customer,
    phone: _phone,
    idempotencyKey: _key,
    requestHash: _hash,
    ...publicOrder
  } = order;
  return publicOrder;
}
