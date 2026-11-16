/**
 * BaseAdapter — Abstract Base Class for Marketplace Integrations.
 *
 * Provides the unified contract required by CIMS:
 * - receiveOrder(rawPayload)
 * - normalizeOrder(rawOrder)
 * - updateInventory(sku, quantity)
 * - getInventory(sku)
 * - cancelOrder(marketplaceOrderId, reason)
 * - verifyWebhook(signature, body)
 *
 * Includes built-in simulated platform behavior with local mock storage and configurable failure injection.
 */
class BaseAdapter {
  constructor(name, code) {
    if (new.target === BaseAdapter) {
      throw new Error('BaseAdapter is abstract and cannot be instantiated directly');
    }
    this.name = name;
    this.code = code;
    this.isSimulated = true;
    this.simulatedStock = new Map(); // SKU -> quantity
    this.failNextRequest = false;
  }

  /**
   * Set simulated failure for chaos / resilience testing
   */
  setSimulatedFailure(shouldFail) {
    this.failNextRequest = shouldFail;
  }

  /**
   * Check if simulated failure is injected
   */
  checkInjectedFailure() {
    if (this.failNextRequest) {
      this.failNextRequest = false;
      throw new Error(`[${this.name} API Error] 503 Service Unavailable (Simulated Failure for testing)`);
    }
  }

  /**
   * Verify authenticity of incoming webhook
   */
  async verifyWebhook(signature, body) {
    // In simulation mode, accept if provided or fallback
    return true;
  }

  /**
   * Normalize an external platform order into CIMS internal order format
   * Must return { marketplaceOrderId, customer, items: [{ sku, quantity, unitPrice }], totalAmount }
   */
  normalizeOrder(rawOrder) {
    throw new Error(`normalizeOrder() not implemented for ${this.name}`);
  }

  /**
   * Receive incoming order payload, verify, normalize, and return structured order
   */
  async receiveOrder(rawPayload) {
    this.checkInjectedFailure();
    return this.normalizeOrder(rawPayload);
  }

  /**
   * Push stock quantity update to the marketplace
   */
  async updateInventory(sku, quantity) {
    this.checkInjectedFailure();
    this.simulatedStock.set(sku, quantity);
    return {
      marketplace: this.name,
      sku,
      publishedStock: quantity,
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
      isSimulated: this.isSimulated,
    };
  }

  /**
   * Retrieve current stock level as reported by the marketplace
   */
  async getInventory(sku) {
    this.checkInjectedFailure();
    const stock = this.simulatedStock.get(sku) ?? 0;
    return {
      marketplace: this.name,
      sku,
      stock,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Cancel an order on the marketplace
   */
  async cancelOrder(marketplaceOrderId, reason = '') {
    this.checkInjectedFailure();
    return {
      marketplace: this.name,
      marketplaceOrderId,
      cancelled: true,
      reason,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = BaseAdapter;
