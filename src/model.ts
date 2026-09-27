import { isPagesDemo } from "./environment";
export type Category = "bovina" | "frango" | "suina" | "embutidos" | "miudos";
export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  available: boolean;
  image: string;
  description: string;
  preps: string[];
  unitWeight: number;
  promotion?: { label: string; oldPrice: number };
}
export interface Variant {
  id: string;
  name: string;
  image?: string;
  productIds: string[];
  recommendedProductId: string;
  prep: string;
  gramsPerServing: number;
  ingredients: { name: string; amount: number; unit: string }[];
  instructions: string[];
  meatComponents?: {
    productId: string;
    gramsPerServing: number;
    prep: string;
  }[];
}
export interface Recipe {
  secondaryImage?: string;
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  baseServings: number;
  variants: Variant[];
  active: boolean;
}
export interface Selection {
  selectionId?: string;
  recipeId: string;
  variantId: string;
  servings: number;
  productId: string;
}
export interface CartItem {
  key: string;
  productId: string;
  amount: number;
  unit: "kg" | "unit";
  prep: string;
  thickness?: string;
  notes?: string;
  recipeId?: string;
  recipeSelectionId?: string;
}
export interface OrderItem extends Omit<CartItem, "key"> {
  id: string;
  name: string;
  estimatedWeight: number;
  unitPrice: number;
  status: "accepted" | "rejected";
  rejectionReason?: string;
}
export interface Order {
  id: string;
  ticket: string;
  token: string;
  status: "waiting" | "preparing" | "ready" | "delivered" | "cancelled";
  createdAt: number;
  items: OrderItem[];
  estimatedTotal: number;
  customer?: string;
  notification?: { status: string; message?: string };
}
export interface ApiState {
  store: {
    name: string;
    tagline: string;
    logo: string;
    publicBaseUrl: string;
    kioskEnabled: boolean;
    returnAfterMinutes: number | null;
  };
  products: Product[];
  recipes: Recipe[];
  orders: Order[];
  media: unknown[];
  capabilities: {
    storage: string;
    whatsappConfigured: boolean;
    publicBaseUrl: string;
  };
}
export const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
export const weightLabel = (value: number) =>
  value < 1
    ? `${Math.round(value * 1000)} g`
    : `${Number(value.toFixed(2)).toLocaleString("pt-BR")} kg`;
export const itemWeight = (item: CartItem, product: Product) =>
  item.unit === "unit" ? item.amount * product.unitWeight : item.amount;
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (isPagesDemo) {
    const { demoApi } = await import("./demo");
    return demoApi<T>(path, options);
  }
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, {
    ...options,
    headers,
  });
  const result = await response
    .json()
    .catch(() => ({ error: "O servidor não respondeu como esperado." }));
  if (!response.ok)
    throw new Error(
      result.error || "Não foi possível concluir. Tente novamente.",
    );
  return result as T;
}

export const newId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
