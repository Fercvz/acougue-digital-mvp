import "dotenv/config";
import path from "node:path";
import { createApp } from "./app.js";

const port = Number(process.env.PORT || 3001);
const runtime = await createApp({
  dataDir: path.resolve(process.env.DATA_DIR || "server/data"),
  photoDir: path.resolve("public/fotos"),
  databaseUrl: process.env.DATABASE_URL,
  distDir: path.resolve("dist"),
});
const server = runtime.app.listen(port, "0.0.0.0", () =>
  console.log(
    `Açougue Digital: API em http://localhost:${port} — armazenamento ${runtime.repo.storage}. Demonstração: acesso unificado sem autenticação.`,
  ),
);
const policyTimer = setInterval(
  () =>
    runtime
      .applyReturnPolicy()
      .catch((error) =>
        console.error("Falha ao aplicar política de retirada:", error.message),
      ),
  60000,
);
policyTimer.unref();
async function stop() {
  clearInterval(policyTimer);
  server.close();
  await runtime.close();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
