/**
 * Standard API response helper.
 */
class ApiResponse {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {*} data
   */
  constructor(statusCode, message, data = null) {
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }

  /**
   * Send this response via Express res object.
   */
  send(res, statusCode) {
    return res.status(statusCode || (this.success ? 200 : 500)).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }
}

module.exports = ApiResponse;
