import { app } from '../../index';

describe('Architecture Smoke - backend entry', () => {
  it('exports an express application instance', () => {
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });
});
