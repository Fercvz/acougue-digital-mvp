import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { createApp } from "./app.js";
import { Repository } from "./repository.js";
import { whatsappConfigured } from "./whatsapp.js";
import { recipeMeats } from "../shared/recipe-selection.js";

// Tests must never send real WhatsApp messages, even on a configured workstation.
process.env.WHATSAPP_ENABLED = "false";
let runtime: Awaited<ReturnType<typeof createApp>>;
let server: Server;
let directory: string;
let base: string;
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "acougue-test-"));
  runtime = await createApp({
    dataDir: path.join(directory, "data"),
    photoDir: path.join(directory, "photos"),
  });
  server = runtime.app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await runtime.close();
  const resolved = path.resolve(directory);
  assert.ok(resolved.startsWith(path.resolve(tmpdir()) + path.sep));
  await rm(resolved, { recursive: true, force: true });
});
async function api(
  route: string,
  method = "GET",
  body?: unknown,
  key?: string,
) {
  const response = await fetch(base + route, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: (await response.json()) as any };
}
const input = () => ({
  customer: "Cliente Teste",
  phone: "11999990000",
  whatsappOptIn: true,
  items: [
    { productId: "picanha", amount: 0.5, unit: "kg", prep: "Bifes" },
    {
      productId: "patinho",
      amount: 4,
      unit: "unit",
      prep: "Bifes",
      thickness: "Média",
    },
  ],
});

test("central state, kg/unit estimates, genuine QR and no real notification", async () => {
  assert.equal(whatsappConfigured(), false);
  const result = await api(
    "/api/orders",
    "POST",
    input(),
    "estimate-order-001",
  );
  assert.equal(result.status, 201);
  assert.equal(result.body.order.estimatedTotal, 58.89);
  assert.equal(result.body.order.items[1].estimatedWeight, 0.6);
  assert.equal(result.body.order.notification.status, "disabled");
  assert.match(result.body.trackingUrl, /\/acompanhar\/[a-f0-9]{48}$/);
  assert.match(result.body.qrDataUrl, /^data:image\/png;base64,/);
  assert.equal(
    Buffer.from(result.body.qrDataUrl.split(",")[1], "base64")
      .subarray(1, 4)
      .toString(),
    "PNG",
  );
  const state = await api("/api/state");
  assert.ok(state.body.orders.some((o: any) => o.id === result.body.order.id));
  const operational = state.body.orders.find(
    (o: any) => o.id === result.body.order.id,
  );
  assert.equal(operational.phone, undefined);
  assert.equal(operational.token, undefined);
  assert.equal(operational.customer, "Cliente Teste");
  const tracking = await api("/api/track/" + result.body.order.token);
  assert.equal(tracking.body.order.phone, undefined);
  assert.equal(tracking.body.order.customer, undefined);
  assert.equal(tracking.body.order.idempotencyKey, undefined);
});

test("barbecue kits scale all meats and sauces and preserve the anonymous checkout", async () => {
  const state = await runtime.repo.read();
  const cases = [
    {
      id: "churrasco-dia-a-dia",
      products: ["alcatra", "linguica", "coxa"],
      weights: [0.6, 0.6, 0.6],
      total: 52.02,
      sauce: "Molho de alho pronto",
      sauceAmount: 100,
    },
    {
      id: "churrasco",
      products: ["contrafile", "linguica", "coxa"],
      weights: [1, 0.4, 0.4],
      total: 66.62,
      sauce: "Vinagrete pronto",
      sauceAmount: 240,
    },
    {
      id: "churrasco-impressionar",
      products: ["picanha", "carre-suino", "linguica"],
      weights: [1.2, 0.6, 0.4],
      total: 115.98,
      sauce: "Chimichurri pronto",
      sauceAmount: 80,
    },
  ];
  for (const item of cases) {
    const recipe = state.recipes.find((r) => r.id === item.id)!;
    const variant = recipe.variants[0];
    const selectionId = `kit-${item.id}`;
    const selectedMeats = recipeMeats(variant, variant.recommendedProductId, 4);
    assert.deepEqual(
      selectedMeats.map((m) => m.productId),
      item.products,
    );
    assert.deepEqual(
      selectedMeats.map((m) => m.amount),
      item.weights,
    );
    const result = await api(
      "/api/orders",
      "POST",
      {
        whatsappOptIn: false,
        items: selectedMeats.map((m) => ({
          ...m,
          recipeId: recipe.id,
          recipeSelectionId: selectionId,
        })),
        recipeSelections: [
          {
            recipeId: recipe.id,
            variantId: variant.id,
            productId: variant.recommendedProductId,
            servings: 4,
            selectionId,
          },
        ],
      },
      selectionId,
    );
    assert.equal(result.status, 201);
    assert.equal(result.body.order.estimatedTotal, item.total);
    assert.equal(result.body.order.customer, undefined);
    assert.equal(result.body.order.phone, undefined);
    const tracking = await api(`/api/track/${result.body.order.token}`);
    assert.equal(
      tracking.body.recipes[0].ingredients.find(
        (i: any) => i.name === item.sauce,
      ).amount,
      item.sauceAmount,
    );
    assert.equal(tracking.body.recipes[0].servings, 4);
    assert.equal(tracking.body.order.items.length, 3);
    assert.deepEqual(
      recipeMeats(variant, variant.recommendedProductId, 8).map(
        (m) => m.amount,
      ),
      item.weights.map((w) => w * 2),
    );
  }
});

test("quantity orders reject non-steak preparations and fractional steaks without saving", async () => {
  const before = await runtime.repo.read();
  const statePath = path.join(directory, "data", "state.json");
  const savedBefore = await readFile(statePath, "utf8");
  const invalidItems = [
    { productId: "patinho", amount: 4, unit: "unit", prep: "Moído" },
    { productId: "patinho", amount: 4, unit: "unit", prep: "Cubos" },
    { productId: "peito-frango", amount: 4, unit: "unit", prep: "Filés" },
    { productId: "linguica", amount: 4, unit: "unit", prep: "Inteira" },
    { productId: "patinho", amount: 1.5, unit: "unit", prep: "Bifes" },
  ];
  for (const [index, item] of invalidItems.entries()) {
    const result = await api(
      "/api/orders",
      "POST",
      {
        whatsappOptIn: false,
        // A valid preceding item must not result in a partially saved order.
        items: [input().items[0], item],
      },
      `invalid-quantity-${index}`,
    );
    assert.equal(result.status, 400, `${item.productId}: ${item.prep}`);
    assert.match(result.body.error, /bifes/i);
    if (!Number.isInteger(item.amount))
      assert.match(result.body.error, /inteira/i);
  }
  const after = await runtime.repo.read();
  assert.equal(after.nextTicket, before.nextTicket);
  assert.deepEqual(after.orders, before.orders);
  assert.equal(await readFile(statePath, "utf8"), savedBefore);
});

test("steaks accept quantity or weight while ground meat still accepts weight", async () => {
  const result = await api(
    "/api/orders",
    "POST",
    {
      whatsappOptIn: false,
      items: [
        { productId: "patinho", amount: 4, unit: "unit", prep: "Bifes" },
        { productId: "patinho", amount: 0.5, unit: "kg", prep: "Bifes" },
        { productId: "patinho", amount: 0.75, unit: "kg", prep: "Moído" },
      ],
    },
    "steak-quantity-and-weight",
  );
  assert.equal(result.status, 201);
  assert.deepEqual(
    result.body.order.items.map((item: any) => item.estimatedWeight),
    [0.6, 0.5, 0.75],
  );
  assert.equal(result.body.order.estimatedTotal, 73.82);
});

test("partial item rejection recalculates estimate; all rejected cancels", async () => {
  const {
    body: { order },
  } = await api("/api/orders", "POST", input(), "rejected-order-001");
  const partially = await api(
    `/api/orders/${order.id}/items/${order.items[0].id}`,
    "PATCH",
    { status: "rejected", rejectionReason: "Sem estoque" },
  );
  assert.equal(partially.body.estimatedTotal, 23.94);
  assert.equal(partially.body.status, "waiting");
  const tracked = await api("/api/track/" + order.token);
  assert.equal(tracked.body.order.items[0].rejectionReason, "Sem estoque");
  assert.equal(tracked.body.shoppingList.length, 1);
  const all = await api(
    `/api/orders/${order.id}/items/${order.items[1].id}`,
    "PATCH",
    { status: "rejected" },
  );
  assert.equal(all.body.estimatedTotal, 0);
  assert.equal(all.body.status, "cancelled");
  const ready = await api(`/api/orders/${order.id}`, "PATCH", {
    status: "ready",
  });
  assert.equal(ready.status, 409);
});

test("simultaneous retries create a single ticket; changed input with same key conflicts", async () => {
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      api("/api/orders", "POST", input(), "retry-order-001"),
    ),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.equal(new Set(results.map((r) => r.body.order.id)).size, 1);
  const changed = input();
  changed.items[0].amount = 1;
  assert.equal(
    (await api("/api/orders", "POST", changed, "retry-order-001")).status,
    409,
  );
});

test("ready orders remain ready without configured policy; store may opt into return", async () => {
  const {
    body: { order },
  } = await api(
    "/api/orders",
    "POST",
    { ...input(), whatsappOptIn: false },
    "ready-order-001",
  );
  assert.equal(
    (await api(`/api/orders/${order.id}`, "PATCH", { status: "preparing" }))
      .status,
    200,
  );
  assert.equal(
    (await api(`/api/orders/${order.id}`, "PATCH", { status: "ready" })).status,
    200,
  );
  await runtime.repo.mutate((data) => {
    data.orders.find((o) => o.id === order.id)!.readyAt =
      Date.now() - 31 * 60000;
  });
  await runtime.applyReturnPolicy();
  assert.equal(
    (await runtime.repo.read()).orders.find((o) => o.id === order.id)!.status,
    "ready",
  );
  await api("/api/store", "PATCH", { returnAfterMinutes: 30 });
  await runtime.applyReturnPolicy();
  assert.equal(
    (await runtime.repo.read()).orders.find((o) => o.id === order.id)!.status,
    "waiting",
  );
  await api("/api/store", "PATCH", { returnAfterMinutes: null });
});

test("recipe snapshot and grocery quantities survive later recipe edits", async () => {
  const result = await api(
    "/api/orders",
    "POST",
    {
      whatsappOptIn: false,
      items: [
        {
          productId: "alcatra",
          amount: 0.6,
          unit: "kg",
          prep: "Tiras",
          recipeId: "estrogonofe",
        },
      ],
      recipeSelections: [
        {
          recipeId: "estrogonofe",
          variantId: "carne",
          servings: 4,
          productId: "alcatra",
        },
      ],
    },
    "recipe-order-001",
  );
  assert.equal(result.status, 201);
  await api("/api/recipes/estrogonofe", "PATCH", {
    name: "Nome alterado depois",
  });
  const tracked = await api("/api/track/" + result.body.order.token);
  assert.equal(tracked.body.recipes[0].name, "Estrogonofe");
  assert.equal(
    tracked.body.shoppingList.find((i: any) => i.name === "Arroz").amount,
    240,
  );
});

test("two versions of the same recipe keep independent grocery portions after refusal", async () => {
  const result = await api(
    "/api/orders",
    "POST",
    {
      whatsappOptIn: false,
      items: [
        {
          productId: "alcatra",
          amount: 0.6,
          unit: "kg",
          prep: "Tiras",
          recipeId: "estrogonofe",
          recipeSelectionId: "beef-group",
        },
        {
          productId: "peito-frango",
          amount: 0.3,
          unit: "kg",
          prep: "Cubos",
          recipeId: "estrogonofe",
          recipeSelectionId: "chicken-group",
        },
      ],
      recipeSelections: [
        {
          recipeId: "estrogonofe",
          variantId: "carne",
          servings: 4,
          productId: "alcatra",
          selectionId: "beef-group",
        },
        {
          recipeId: "estrogonofe",
          variantId: "frango",
          servings: 2,
          productId: "peito-frango",
          selectionId: "chicken-group",
        },
      ],
    },
    "recipe-groups-001",
  );
  assert.equal(result.status, 201);
  const order = result.body.order;
  await api(`/api/orders/${order.id}/items/${order.items[0].id}`, "PATCH", {
    status: "rejected",
  });
  const tracked = await api("/api/track/" + order.token);
  assert.equal(
    tracked.body.shoppingList.find((i: any) => i.name === "Arroz").amount,
    120,
  );
  assert.equal(
    tracked.body.shoppingList.filter((i: any) => i.section === "acougue")
      .length,
    1,
  );
});

test("uploads validate content, size and folders; successful uploads persist centrally", async () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfuoAAAAASUVORK5CYII=",
    "base64",
  );
  async function upload(bytes: Buffer, folder: string, name = "foto.png") {
    const form = new FormData();
    form.append("folder", folder);
    form.append("photo", new Blob([new Uint8Array(bytes)]), name);
    const response = await fetch(base + "/api/media", {
      method: "POST",
      body: form,
    });
    return { status: response.status, body: (await response.json()) as any };
  }
  assert.equal(
    (await upload(Buffer.from('<svg onload="alert(1)"></svg>'), "marca"))
      .status,
    400,
  );
  assert.equal((await upload(png, "../../escape")).status, 400);
  assert.equal(
    (await upload(Buffer.alloc(8 * 1024 * 1024 + 1), "marca")).status,
    400,
  );
  const good = await upload(png, "marca");
  assert.equal(good.status, 201);
  assert.match(good.body.url, /^\/fotos\/marca\/[a-f0-9-]+\.png$/);
  const served = await fetch(base + good.body.url);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), png);
  const data = JSON.parse(
    await readFile(path.join(directory, "data", "state.json"), "utf8"),
  );
  assert.ok(data.media.some((m: any) => m.id === good.body.id));
});

test("persistence survives reopening; unavailable products and foreign mutations are blocked", async () => {
  const reopened = new Repository(path.join(directory, "data"));
  await reopened.init();
  assert.ok((await reopened.read()).orders.length >= 5);
  await reopened.close();
  await api("/api/products/picanha", "PATCH", { available: false });
  assert.equal(
    (await api("/api/orders", "POST", input(), "unavailable-order-001")).status,
    409,
  );
  await api("/api/products/picanha", "PATCH", { available: true });
  const foreign = await fetch(base + "/api/store", {
    method: "PATCH",
    headers: {
      Origin: "https://example.invalid",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "Malicious" }),
  });
  assert.equal(foreign.status, 403);
});

test("removing a preparation used by an active recipe fails atomically with recipe name", async () => {
  const before = await runtime.repo.read();
  const product = before.products.find((p) => p.id === "alcatra")!;
  const recipe = before.recipes.find((r) => r.id === "estrogonofe")!;
  const result = await api("/api/products/alcatra", "PATCH", {
    price: 99.9,
    preps: ["Bifes"],
  });
  assert.equal(result.status, 400);
  assert.ok(result.body.error.includes(recipe.name));
  const after = (await runtime.repo.read()).products.find(
    (p) => p.id === "alcatra",
  )!;
  assert.equal(after.price, product.price);
  assert.deepEqual(after.preps, product.preps);
  assert.equal(
    (
      await api("/api/products/alcatra", "PATCH", {
        preps: [...product.preps, "Peça fatiada"],
      })
    ).status,
    200,
  );
  const stored = JSON.parse(
    await readFile(path.join(directory, "data", "state.json"), "utf8"),
  );
  assert.equal(
    stored.products.find((p: any) => p.id === "alcatra").price,
    product.price,
  );
});

test("offal can be managed and ordered by weight, with a photo", async () => {
  const created = await api("/api/products", "POST", {
    id: "moela-verificacao",
    name: "Moela de frango",
    category: "miudos",
    price: 16.9,
    available: true,
    image: "/fotos/produtos/miudos/moela.jpg",
    description: "",
    preps: ["Inteira", "Pedaços"],
    unitWeight: 0.05,
  });
  assert.equal(created.status, 201);
  const result = await api("/api/orders", "POST", {
    whatsappOptIn: false,
    items: [
      {
        productId: "moela-verificacao",
        amount: 0.75,
        unit: "kg",
        prep: "Pedaços",
      },
    ],
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.order.estimatedTotal, 12.68);
  assert.equal(result.body.order.items[0].name, "Moela de frango");
  const state = await api("/api/state");
  assert.equal(
    state.body.products.find((p: any) => p.id === "moela-verificacao").category,
    "miudos",
  );
});

test("recipe version photos persist and each order keeps the chosen photo", async () => {
  const state = await runtime.repo.read();
  const source = structuredClone(
    state.recipes.find((r) => r.id === "estrogonofe")!,
  );
  source.id = "teste-fotos-receita";
  source.image = "/fotos/receitas/estrogonofe-carne.jpg";
  source.variants[0].image = ""; // Old recipes and versions without photos still use the main image.
  source.variants[1].image = "/fotos/receitas/estrogonofe-frango.jpg";
  assert.equal((await api("/api/recipes", "POST", source)).status, 201);
  const snapshots: { token: string; image: string }[] = [];
  for (const variant of source.variants) {
    const result = await api("/api/orders", "POST", {
      whatsappOptIn: false,
      items: [
        {
          productId: variant.recommendedProductId,
          amount: 0.6,
          unit: "kg",
          prep: variant.prep,
          recipeId: source.id,
        },
      ],
      recipeSelections: [
        {
          recipeId: source.id,
          variantId: variant.id,
          servings: 4,
          productId: variant.recommendedProductId,
        },
      ],
    });
    assert.equal(result.status, 201);
    const expected = variant.image || source.image;
    assert.equal(result.body.order.recipes[0].image, expected);
    snapshots.push({ token: result.body.order.token, image: expected });
  }
  source.variants[1].image = "/fotos/receitas/outra-foto.jpg";
  assert.equal(
    (
      await api(`/api/recipes/${source.id}`, "PATCH", {
        variants: source.variants,
      })
    ).status,
    200,
  );
  const saved = await api("/api/state");
  assert.equal(
    saved.body.recipes.find((r: any) => r.id === source.id).variants[1].image,
    "/fotos/receitas/outra-foto.jpg",
  );
  for (const snapshot of snapshots) {
    const tracking = await api(`/api/track/${snapshot.token}`);
    assert.equal(tracking.body.order.recipes[0].image, snapshot.image);
  }
});
