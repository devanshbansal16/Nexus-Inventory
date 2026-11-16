describe('CIMS Backend', () => {
  it('placeholder test - should pass', () => {
    expect(true).toBe(true);
  });

  it('should export the express app', () => {
    const app = require('../src/app');
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });
});
