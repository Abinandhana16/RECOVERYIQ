const { GoogleGenerativeAI } = require('@google/generative-ai');

function getGenerativeModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

/**
 * Fallback generator for decision explanation if AI service is offline or key is missing.
 */
function getFallbackExplanation(caseData, prediction, decision) {
  const probPercent = ((prediction?.recovery_probability || 0) * 100).toFixed(1);
  const actionType = decision?.action_type || 'payment_link';
  const customerName = caseData?.name || caseData?.customer_id?.name || 'Customer';
  const daysOverdue = caseData?.days_overdue || 0;
  const npaStatus = caseData?.npa_status || 'Standard';

  if (actionType === 'human_followup') {
    return `Given the high-risk classification (${npaStatus} with ${daysOverdue} days overdue and ${probPercent}% estimated recovery probability), manual intervention by a senior recovery specialist is required to negotiate an amicable settlement.`;
  } else if (actionType === 'reminder') {
    return `With a strong credit profile and high estimated recovery probability of ${probPercent}%, an automated soft reminder is the most cost-effective and non-intrusive recovery strategy for ${customerName}.`;
  } else {
    return `With a moderate recovery probability of ${probPercent}% and overdue amount of ₹${caseData?.amount_due}, sending an instant frictionless payment link maximizes conversion without incurring high agent intervention costs.`;
  }
}

/**
 * Fallback generator for customer message / agent note if AI service is offline or key is missing.
 */
function getFallbackDraftMessage(caseData, decision) {
  const customerName = caseData?.name || caseData?.customer_id?.name || 'Customer';
  const amount = caseData?.amount_due ? `₹${Number(caseData.amount_due).toLocaleString('en-IN')}` : 'your pending amount';
  const caseId = caseData?.case_id || 'your account';
  const actionType = decision?.action_type || 'payment_link';

  if (actionType === 'reminder') {
    return `Hi ${customerName}, this is a gentle reminder that your pending payment of ${amount} for Ref #${caseId} is due. Please clear it today to maintain an excellent credit standing.`;
  } else if (actionType === 'payment_link') {
    return `Hi ${customerName}, your payment of ${amount} is currently overdue. Click here to instantly clear your balance via RazorPay secure checkout: https://rzp.io/l/recovery-${caseId}`;
  } else {
    return `[Agent Briefing Note] Customer: ${customerName} | Balance: ${amount} | Overdue: ${caseData?.days_overdue} days (${caseData?.npa_status}). Objective: Contact customer empathetically, understand root cause of failure (${caseData?.failure_reason || 'unspecified'}), and offer structured settlement or restructured EMI options.`;
  }
}

/**
 * Generate a 2-3 sentence plain-English explanation of why this action was recommended.
 * @param {Object} caseData
 * @param {Object} prediction
 * @param {Object} decision
 * @returns {Promise<string>}
 */
async function explainDecision(caseData, prediction, decision) {
  const model = getGenerativeModel();
  if (!model) {
    return getFallbackExplanation(caseData, prediction, decision);
  }

  const prompt = `
You are an expert credit recovery AI analyst for RazorPay RecoveryIQ.
Explain in 2-3 concise, professional sentences why the following recovery action was recommended:

Case Details:
- Customer Name: ${caseData.name || caseData.customer_id?.name || 'Customer'}
- Case Type: ${caseData.case_type}
- Amount Due: ₹${caseData.amount_due}
- Days Overdue: ${caseData.days_overdue}
- NPA Status: ${caseData.npa_status}
- Failure Reason: ${caseData.failure_reason}
- Credit History Score: ${caseData.payment_history_score || caseData.customer_id?.payment_history_score}
- Past Defaults: ${caseData.total_past_defaults || caseData.customer_id?.total_past_defaults}
- Predicted Recovery Probability: ${(prediction.recovery_probability * 100).toFixed(1)}% (${prediction.risk_tier} tier)
- Recommended Action: ${decision.action_type}
- Expected Recovery Value: ₹${decision.expected_recovery_value}

Provide only the 2-3 sentence explanation with no greetings or markdown headers.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text || getFallbackExplanation(caseData, prediction, decision);
  } catch (error) {
    console.warn('Gemini explanation error, using fallback:', error.message);
    return getFallbackExplanation(caseData, prediction, decision);
  }
}

/**
 * Draft a short, personalized customer-facing message or human agent brief.
 * @param {Object} caseData
 * @param {Object} decision
 * @returns {Promise<string>}
 */
async function draftMessage(caseData, decision) {
  const model = getGenerativeModel();
  if (!model) {
    return getFallbackDraftMessage(caseData, decision);
  }

  const actionType = decision.action_type;
  const customerName = caseData.name || caseData.customer_id?.name || 'Customer';
  const amount = caseData.amount_due;
  const caseId = caseData.case_id;

  let messageObjective = '';
  if (actionType === 'reminder') {
    messageObjective = 'Draft a polite, respectful SMS/WhatsApp reminder to the customer asking them to settle their pending balance.';
  } else if (actionType === 'payment_link') {
    messageObjective = `Draft a direct, helpful payment link message with link placeholder https://rzp.io/l/recovery-${caseId} enabling the customer to pay immediately.`;
  } else {
    messageObjective = 'Draft an internal briefing note for a human recovery collection officer detailing talking points, customer empathy, and restructuring suggestions.';
  }

  const prompt = `
You are RecoveryIQ's automated communication engine.
${messageObjective}

Context:
- Customer Name: ${customerName}
- Overdue Amount: ₹${amount}
- Case Ref: ${caseId}
- Days Overdue: ${caseData.days_overdue}
- Recommended Action: ${actionType}

Format: Return only the message text itself. Keep it concise, professional, and compliant with financial communications.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text || getFallbackDraftMessage(caseData, decision);
  } catch (error) {
    console.warn('Gemini draft message error, using fallback:', error.message);
    return getFallbackDraftMessage(caseData, decision);
  }
}

module.exports = {
  explainDecision,
  draftMessage,
};
