import { createHash, randomBytes, randomUUID } from "node:crypto";
import { makeOrder as createOrder } from "../shared/domain.js";
import type { DatabaseState, NewOrderInput } from "../shared/types.js";

export * from "../shared/domain.js";
export function makeOrder(
  data: DatabaseState,
  input: NewOrderInput,
  key?: string,
) {
  return createOrder(data, input, key, {
    randomUUID,
    token: () => randomBytes(24).toString("hex"),
    requestHash: (value) =>
      createHash("sha256").update(JSON.stringify(value)).digest("hex"),
  });
}
