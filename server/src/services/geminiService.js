const axios = require('axios');

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || 'http://localhost:8000';

const MAX_RETRIES = 2;
const RETRY_DELAY = 1500;

/**
 * Wait before retrying a failed ML request.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check whether an error is temporary and worth retrying.
 */
function isRetryableError(error) {
  if (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT'
  ) {
    return true;
  }

  const status = error.response?.status;

  return status === 502 || status === 503 || status === 504;
}

/**
 * Request recovery probability prediction from the Python ML service.
 *
 * Automatically retries temporary ML service failures.
 *
 * @param {Object} caseData
 * @returns {Promise<{ recovery_probability: number, risk_tier: string }>}
 */
async function getPrediction(caseData) {
  const payload = {
    case_type: caseData.case_type,
    amount_due: Number(caseData.amount_due),
    days_overdue: Number(caseData.days_overdue),
    npa_status: caseData.npa_status || 'Standard',
    payment_history_score: Number(caseData.payment_history_score),
    total_past_defaults: Number(caseData.total_past_defaults || 0),
    failure_reason: caseData.failure_reason || 'insufficient_funds',
  };

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(
        `${ML_SERVICE_URL}/predict`,
        payload,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (
        response.data &&
        typeof response.data.recovery_probability === 'number'
      ) {
        return {
          recovery_probability: response.data.recovery_probability,
          risk_tier: response.data.risk_tier,
        };
      }

      throw new Error(
        'Invalid response format received from ML service'
      );
    } catch (error) {
      lastError = error;

      const shouldRetry =
        isRetryableError(error) && attempt < MAX_RETRIES;

      if (shouldRetry) {
        console.warn(
          `ML prediction request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}). ` +
          `Retrying in ${RETRY_DELAY}ms...`
        );

        await sleep(RETRY_DELAY);
        continue;
      }

      break;
    }
  }

  // Final user-friendly error
  if (
    lastError?.code === 'ECONNREFUSED' ||
    lastError?.code === 'ENOTFOUND' ||
    lastError?.code === 'ECONNABORTED' ||
    lastError?.code === 'ETIMEDOUT'
  ) {
    throw new Error(
      'AI prediction service is temporarily unavailable. Please try again in a few moments.'
    );
  }

  if (lastError?.response) {
    const status = lastError.response.status;

    if (status === 502 || status === 503 || status === 504) {
      throw new Error(
        'AI prediction service is temporarily unavailable. Please try again in a few moments.'
      );
    }

    throw new Error(
      `ML Service error (${status}). Please try again later.`
    );
  }

  throw new Error(
    `Unable to get AI prediction: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Retrieve trained model metrics and feature importances
 * from the Python ML service.
 *
 * @returns {Promise<Object>}
 */
async function getModelMetrics() {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(
        `${ML_SERVICE_URL}/model-metrics`,
        {
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      lastError = error;

      const shouldRetry =
        isRetryableError(error) && attempt < MAX_RETRIES;

      if (shouldRetry) {
        console.warn(
          `ML metrics request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}). ` +
          `Retrying in ${RETRY_DELAY}ms...`
        );

        await sleep(RETRY_DELAY);
        continue;
      }

      break;
    }
  }

  if (
    lastError?.code === 'ECONNREFUSED' ||
    lastError?.code === 'ENOTFOUND' ||
    lastError?.code === 'ECONNABORTED' ||
    lastError?.code === 'ETIMEDOUT'
  ) {
    throw new Error(
      'AI model service is temporarily unavailable. Please try again in a few moments.'
    );
  }

  if (lastError?.response) {
    const status = lastError.response.status;

    if (status === 502 || status === 503 || status === 504) {
      throw new Error(
        'AI model service is temporarily unavailable. Please try again in a few moments.'
      );
    }

    throw new Error(
      `ML Service error (${status}). Please try again later.`
    );
  }

  throw new Error(
    `Unable to fetch ML model metrics: ${
      lastError?.message || 'Unknown error'
    }`
  );
}

module.exports = {
  getPrediction,
  getModelMetrics,
};