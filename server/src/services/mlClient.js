const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Request recovery probability prediction from the Python ML service.
 * @param {Object} caseData
 * @param {string} caseData.case_type - 'transaction' or 'loan'
 * @param {number} caseData.amount_due - Amount due
 * @param {number} caseData.days_overdue - Days overdue
 * @param {string} caseData.npa_status - NPA status
 * @param {number} caseData.payment_history_score - Credit score (0-1)
 * @param {number} caseData.total_past_defaults - Number of past defaults
 * @param {string} caseData.failure_reason - Failure reason
 * @returns {Promise<{ recovery_probability: number, risk_tier: string }>}
 */
async function getPrediction(caseData) {
  try {
    const payload = {
      case_type: caseData.case_type,
      amount_due: Number(caseData.amount_due),
      days_overdue: Number(caseData.days_overdue),
      npa_status: caseData.npa_status || 'Standard',
      payment_history_score: Number(caseData.payment_history_score),
      total_past_defaults: Number(caseData.total_past_defaults || 0),
      failure_reason: caseData.failure_reason || 'insufficient_funds',
    };

    const response = await axios.post(`${ML_SERVICE_URL}/predict`, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.data && typeof response.data.recovery_probability === 'number') {
      return {
        recovery_probability: response.data.recovery_probability,
        risk_tier: response.data.risk_tier,
      };
    }

    throw new Error('Invalid response format received from ML service');
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error(
        `ML Service is unreachable at ${ML_SERVICE_URL}. Please ensure the ML service is running on port 8000.`
      );
    }
    if (error.response) {
      throw new Error(
        `ML Service error (${error.response.status}): ${JSON.stringify(error.response.data)}`
      );
    }
    throw new Error(`Failed to get ML prediction: ${error.message}`);
  }
}

/**
 * Retrieve trained model metrics and feature importances from Python ML service.
 * @returns {Promise<Object>}
 */
async function getModelMetrics() {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/model-metrics`, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error(
        `ML Service is unreachable at ${ML_SERVICE_URL}. Please ensure the ML service is running on port 8000.`
      );
    }
    if (error.response) {
      throw new Error(
        `ML Service error (${error.response.status}): ${JSON.stringify(error.response.data)}`
      );
    }
    throw new Error(`Failed to fetch ML model metrics: ${error.message}`);
  }
}

module.exports = {
  getPrediction,
  getModelMetrics,
};
