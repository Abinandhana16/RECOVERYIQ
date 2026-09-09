/**
 * Action effectiveness factors.
 * Human followup costs more effort so weighted slightly lower despite being for harder cases.
 */
const ACTION_EFFECTIVENESS = {
  reminder: 0.9,
  payment_link: 0.75,
  human_followup: 0.6,
};

/**
 * Determine recommended recovery action and expected recovery value.
 * @param {number} recovery_probability - Predicted probability (0 to 1)
 * @param {string} npa_status - NPA classification ('Standard', 'SMA-0', 'SMA-1', 'SMA-2', 'NPA')
 * @param {number} amount_due - Outstanding recovery amount
 * @returns {{ action_type: 'reminder' | 'payment_link' | 'human_followup', expected_recovery_value: number }}
 */
function decideAction(recovery_probability, npa_status, amount_due) {
  const prob = Number(recovery_probability) || 0;
  const amount = Number(amount_due) || 0;
  const status = (npa_status || '').toUpperCase();

  let action_type;

  // Decision Rules:
  // if npa_status === "NPA" or recovery_probability < 0.3 -> human_followup
  // elif recovery_probability > 0.7 -> reminder
  // else -> payment_link
  if (status === 'NPA' || prob < 0.3) {
    action_type = 'human_followup';
  } else if (prob > 0.7) {
    action_type = 'reminder';
  } else {
    action_type = 'payment_link';
  }

  const factor = ACTION_EFFECTIVENESS[action_type] || 0.75;
  const expected_recovery_value = Number((prob * amount * factor).toFixed(2));

  return {
    action_type,
    expected_recovery_value,
  };
}

module.exports = {
  decideAction,
  ACTION_EFFECTIVENESS,
};
