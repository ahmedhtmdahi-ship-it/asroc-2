import "dotenv/config";
import { buildApp } from "./app.js";
import { env } from "./env.js";

const app = buildApp();

app
  .listen({ port: env.PORT, host: env.HOST })
  .then((address) => {
    app.log.info(`ASROC API شغّال على ${address}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
