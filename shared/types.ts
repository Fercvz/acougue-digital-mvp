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
export interface Store {
  id: string;
  name: string;
  tagline: string;
  logo: string;
  publicBaseUrl: string;
  kioskEnabled: boolean;
  returnAfterMinutes: number | null;
}
export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}
export interface MeatComponent {
  productId: string;
  gramsPerServing: number;
  prep: string;
}
export interface RecipeVariant {
  id: string;
  name: string;
  image?: string;
  productIds: string[];
  recommendedProductId: string;
  prep: string;
  gramsPerServing: number;
  ingredients: Ingredient[];
  instructions: string[];
  meatComponents?: MeatComponent[];
}
export interface Recipe {
  secondaryImage?: string;
  id: string;
  name: string;
  description: string;
  image: string;
  category: "dia-a-dia" | "churrasco";
  baseServings: number;
  variants: RecipeVariant[];
  active: boolean;
}
export interface RecipeSelection {
  recipeId: string;
  variantId: string;
  servings: number;
  productId: string;
  selectionId?: string;
}
export interface RecipeSnapshot extends RecipeSelection {
  name: string;
  variantName: string;
  image: string;
  ingredients: Ingredient[];
  instructions: string[];
}
export type OrderStatus =
  | "waiting"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";
export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  amount: number;
  unit: "kg" | "unit";
  estimatedWeight: number;
  unitPrice: number;
  prep: string;
  thickness?: string;
  notes?: string;
  recipeId?: string;
  recipeSelectionId?: string;
  status: "accepted" | "rejected";
  rejectionReason?: string;
}
export interface NotificationStatus {
  status: "disabled" | "not_requested" | "pending" | "sent" | "failed";
  message: string;
  sentAt?: number;
  providerId?: string;
}
export interface Order {
  id: string;
  ticket: string;
  token: string;
  status: OrderStatus;
  createdAt: number;
  readyAt?: number;
  deliveredAt?: number;
  customer?: string;
  phone?: string;
  whatsappOptIn: boolean;
  items: OrderItem[];
  estimatedTotal: number;
  notification: NotificationStatus;
  recipes: RecipeSnapshot[];
  idempotencyKey?: string;
  requestHash?: string;
}
export interface Media {
  id: string;
  name: string;
  folder: string;
  url: string;
  createdAt: number;
}
export interface Capabilities {
  storage: "local" | "postgres";
  whatsappConfigured: boolean;
  publicBaseUrl: string;
  demonstration: boolean;
}
export type OperationalOrder = Omit<
  Order,
  "phone" | "token" | "idempotencyKey" | "requestHash"
>;
export interface AppState {
  store: Store;
  products: Product[];
  recipes: Recipe[];
  orders: OperationalOrder[];
  media: Media[];
  capabilities: Capabilities;
}
export interface DatabaseState
  extends Omit<AppState, "capabilities" | "orders"> {
  nextTicket: number;
  orders: Order[];
}
export interface NewOrderInput {
  customer?: string;
  phone?: string;
  whatsappOptIn: boolean;
  items: {
    productId: string;
    amount: number;
    unit: "kg" | "unit";
    prep: string;
    thickness?: string;
    notes?: string;
    recipeId?: string;
    recipeSelectionId?: string;
  }[];
  recipeSelections?: RecipeSelection[];
}
