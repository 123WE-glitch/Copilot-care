import { createBackendApp } from './bootstrap/createBackendApp';
import { createRuntime } from './bootstrap/createRuntime';
import { loadLocalEnv } from './config/loadLocalEnv';

loadLocalEnv();

const port = Number(process.env.PORT ?? process.env.APP_PORT ?? 3001);
const runtime = createRuntime();
const app = createBackendApp(runtime);

if (require.main === module) {
  app.listen(port, () => {
    // Keep runtime output minimal and deterministic.
    console.log(`[copilot-care] backend listening on :${port}`);
  });
}

export { app };
