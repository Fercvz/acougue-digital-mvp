import { seedState as createSeed } from "../shared/seed.js";

export function seedState() {
  return createSeed(process.env.PUBLIC_BASE_URL || "http://localhost:3000");
}
