import { createBackendApp } from '../../bootstrap/createBackendApp';
import { createRuntime } from '../../bootstrap/createRuntime';

describe('Architecture Smoke - composition root', () => {
  it('wires runtime dependencies into express app', () => {
    const runtime = createRuntime();
    const app = createBackendApp(runtime);

    expect(runtime.triageUseCase).toBeDefined();
    expect(runtime.architecture.experts.metabolic).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });
});
