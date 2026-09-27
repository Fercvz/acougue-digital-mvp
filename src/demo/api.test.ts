import { test } from "node:test";
import assert from "node:assert/strict";
import { seedState } from "../../shared/seed";
import { recipeMeats } from "../../shared/recipe-selection";
import { createDemoApi } from "./api";
import type { DemoData, DemoRepository } from "./repository";

function setup() {
  const baseUrl = "https://fercvz.github.io/acougue-digital-mvp/";
  let stored: DemoData = { state: seedState(baseUrl), images: {} };
  let queue = Promise.resolve();
  const repository: DemoRepository = {
    async read() {
      await queue;
      return structuredClone(stored);
    },
    mutate<T>(update: (data: DemoData) => T): Promise<T> {
      const task = queue.then(() => {
        const copy = structuredClone(stored);
        const result = update(copy);
        stored = copy;
        return structuredClone(result);
      });
      queue = task.then(
        () => {},
        () => {},
      );
      return task;
    },
  };
  const qrValues: string[] = [];
  const factory = () =>
    createDemoApi({
      repository,
      baseUrl,
      qr: async (value) => {
        qrValues.push(value);
        return "data:image/png;base64,demo";
      },
    });
  const api = factory();
  const call = (path: string, method = "GET", body?: unknown, key?: string) =>
    api<any>(path, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: key ? { "Idempotency-Key": key } : undefined,
    });
  return { call, api, repository, qrValues, factory };
}
const basicOrder = () => ({
  whatsappOptIn: false,
  items: [
    { productId: "picanha", amount: 0.5, unit: "kg", prep: "Bifes" },
    { productId: "patinho", amount: 0.25, unit: "kg", prep: "Moído" },
  ],
});

test("Pages demo completes an order, refusal, preparation and pickup without contact data", async () => {
  const { call, factory, repository, qrValues } = setup();
  const state = await call("/api/state");
  assert.equal(state.products.length, 42);
  assert.equal(state.capabilities.browserDemo, true);
  assert.equal(state.capabilities.whatsappConfigured, false);
  const receipt = await call("/api/orders", "POST", {
    ...basicOrder(),
    whatsappOptIn: true,
    phone: "11999990000",
    customer: "Teste",
  });
  assert.equal(receipt.order.estimatedTotal, 44.93);
  assert.match(
    receipt.trackingUrl,
    /^https:\/\/fercvz.github.io\/acougue-digital-mvp\/#\/acompanhar\/[a-f0-9]+$/,
  );
  assert.equal(qrValues[0], receipt.trackingUrl);
  const saved = (await repository.read()).state.orders[0];
  assert.equal(saved.phone, undefined);
  assert.equal(saved.customer, undefined);
  assert.equal(saved.notification.status, "disabled");
  await call(`/api/orders/${saved.id}/items/${saved.items[1].id}`, "PATCH", {
    status: "rejected",
    rejectionReason: "Sem estoque",
  });
  await call(`/api/orders/${saved.id}`, "PATCH", { status: "preparing" });
  await call(`/api/orders/${saved.id}`, "PATCH", { status: "ready" });
  const otherTab = factory();
  const tracked: any = await otherTab(`/api/track/${saved.token}`);
  assert.equal(tracked.order.status, "ready");
  assert.equal(tracked.order.estimatedTotal, 34.95);
  assert.equal(tracked.shoppingList.length, 1);
  await call(`/api/orders/${saved.id}`, "PATCH", { status: "delivered" });
  assert.equal((await call("/api/state")).orders[0].status, "delivered");
});

test("Pages demo preserves duplicate confirmation protection and rolls back invalid orders", async () => {
  const { call, repository } = setup();
  const results = await Promise.all([
    call("/api/orders", "POST", basicOrder(), "same-demo-order-001"),
    call("/api/orders", "POST", basicOrder(), "same-demo-order-001"),
  ]);
  assert.equal(results[0].order.id, results[1].order.id);
  assert.equal((await repository.read()).state.orders.length, 1);
  await assert.rejects(
    call("/api/orders", "POST", {
      ...basicOrder(),
      items: [{ productId: "patinho", amount: 2, unit: "unit", prep: "Moído" }],
    }),
    /apenas para bifes/,
  );
  assert.equal((await repository.read()).state.nextTicket, 2);
  await assert.rejects(
    call("/api/products/alcatra", "PATCH", { price: 999, preps: ["Bifes"] }),
    /receita/,
  );
  assert.equal(
    (await repository.read()).state.products.find((p) => p.id === "alcatra")!
      .price,
    44.9,
  );
});

test("Pages demo preserves kit quantities, recipe snapshots and management changes", async () => {
  const { call, repository } = setup();
  const kit = (await repository.read()).state.recipes.find(
    (r) => r.id === "churrasco-impressionar",
  )!;
  const variant = kit.variants[0];
  const items = recipeMeats(variant, variant.recommendedProductId, 4).map(
    (item) => ({ ...item, recipeId: kit.id }),
  );
  const receipt = await call("/api/orders", "POST", {
    whatsappOptIn: false,
    items,
    recipeSelections: [
      {
        recipeId: kit.id,
        variantId: variant.id,
        servings: 4,
        productId: variant.recommendedProductId,
      },
    ],
  });
  assert.equal(receipt.order.estimatedTotal, 115.98);
  assert.deepEqual(
    receipt.order.items.map((i: any) => i.estimatedWeight),
    [1.2, 0.6, 0.4],
  );
  await call(`/api/recipes/${kit.id}`, "PATCH", {
    image: "/fotos/receitas/nova.jpg",
  });
  const tracking = await call(`/api/track/${receipt.order.token}`);
  assert.equal(tracking.order.recipes[0].image, kit.image);
  assert.ok(
    tracking.shoppingList.some(
      (i: any) => i.name === "Chimichurri pronto" && i.amount === 80,
    ),
  );
  await call("/api/store", "PATCH", {
    name: "Mercado demonstração",
    publicBaseUrl: "https://example.com",
  });
  const state = await call("/api/state");
  assert.equal(state.store.name, "Mercado demonstração");
  assert.equal(
    state.store.publicBaseUrl,
    "https://fercvz.github.io/acougue-digital-mvp/",
  );
});

test("Pages photos stay in browser storage and reject unsupported content", async () => {
  const { api, call, repository } = setup();
  const png = new Uint8Array(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lR8AAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const upload = (bytes: Uint8Array, folder: string) => {
    const form = new FormData();
    form.append("folder", folder);
    form.append("photo", new Blob([bytes as BlobPart]), "foto.png");
    return api<any>("/api/media", { method: "POST", body: form });
  };
  await assert.rejects(
    upload(new TextEncoder().encode("<svg>unsafe</svg>"), "marca"),
    /Arquivo inválido/,
  );
  await assert.rejects(upload(png, "../../escape"));
  const media = await upload(png, "produtos/miudos");
  await call("/api/products/moela", "PATCH", { image: media.url });
  assert.match(
    (await repository.read()).images[media.url],
    /^data:image\/png;base64,/,
  );
  assert.equal(
    (await call("/api/state")).products.find((p: any) => p.id === "moela")
      .image,
    media.url,
  );
});
