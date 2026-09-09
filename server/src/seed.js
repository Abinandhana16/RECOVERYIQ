const mongoose = require('mongoose');
require('dotenv').config();

const Customer = require('./models/Customer');
const RecoveryCase = require('./models/RecoveryCase');
const RecoveryAction = require('./models/RecoveryAction');
const mlClient = require('./services/mlClient');
const decisionEngine = require('./services/decisionEngine');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recoveryiq';

// 15 realistic customer profiles with Indian names
const SEED_CUSTOMERS = [
  // 1. Standard (0-5 days overdue)
  {
    name: 'Aarav Mehta',
    phone: '+91 98201 45892',
    email: 'aarav.mehta@gmail.com',
    payment_history_score: 0.92,
    total_past_defaults: 0,
    relationship_length: 36,
    case_type: 'transaction',
    amount_due: 4200,
    days_overdue: 2,
    npa_status: 'Standard',
    failure_reason: 'bank_downtime',
    pre_analyze: true,
  },
  {
    name: 'Priya Nair',
    phone: '+91 97451 23689',
    email: 'priya.nair@outlook.com',
    payment_history_score: 0.88,
    total_past_defaults: 0,
    relationship_length: 24,
    case_type: 'transaction',
    amount_due: 8500,
    days_overdue: 4,
    npa_status: 'Standard',
    failure_reason: 'otp_failure',
    pre_analyze: false,
  },
  {
    name: 'Rohan Deshmukh',
    phone: '+91 98902 77412',
    email: 'rohan.deshmukh@yahoo.in',
    payment_history_score: 0.85,
    total_past_defaults: 1,
    relationship_length: 18,
    case_type: 'loan',
    amount_due: 18000,
    days_overdue: 5,
    npa_status: 'Standard',
    failure_reason: 'card_declined',
    pre_analyze: false,
  },

  // 2. SMA-0 (6-30 days overdue)
  {
    name: 'Sneha Kulkarni',
    phone: '+91 98223 90812',
    email: 'sneha.kulkarni@gmail.com',
    payment_history_score: 0.76,
    total_past_defaults: 1,
    relationship_length: 15,
    case_type: 'loan',
    amount_due: 24000,
    days_overdue: 14,
    npa_status: 'SMA-0',
    failure_reason: 'insufficient_funds',
    pre_analyze: true,
  },
  {
    name: 'Vikramaditya Rao',
    phone: '+91 99401 56234',
    email: 'vikram.rao@techcorp.in',
    payment_history_score: 0.81,
    total_past_defaults: 0,
    relationship_length: 42,
    case_type: 'transaction',
    amount_due: 6800,
    days_overdue: 22,
    npa_status: 'SMA-0',
    failure_reason: 'bank_downtime',
    pre_analyze: false,
  },
  {
    name: 'Ananya Chatterjee',
    phone: '+91 98305 11290',
    email: 'ananya.c@gmail.com',
    payment_history_score: 0.70,
    total_past_defaults: 1,
    relationship_length: 12,
    case_type: 'loan',
    amount_due: 16500,
    days_overdue: 28,
    npa_status: 'SMA-0',
    failure_reason: 'missed_emi',
    pre_analyze: false,
  },

  // 3. SMA-1 (31-60 days overdue)
  {
    name: 'Ramesh Kumar',
    phone: '+91 98114 67231',
    email: 'ramesh.kumar82@rediffmail.com',
    payment_history_score: 0.58,
    total_past_defaults: 2,
    relationship_length: 20,
    case_type: 'loan',
    amount_due: 32000,
    days_overdue: 42,
    npa_status: 'SMA-1',
    failure_reason: 'missed_emi',
    pre_analyze: true,
  },
  {
    name: 'Kavita Sundaram',
    phone: '+91 98450 88219',
    email: 'kavita.sundaram@gmail.com',
    payment_history_score: 0.64,
    total_past_defaults: 1,
    relationship_length: 28,
    case_type: 'transaction',
    amount_due: 14500,
    days_overdue: 49,
    npa_status: 'SMA-1',
    failure_reason: 'card_declined',
    pre_analyze: false,
  },
  {
    name: 'Manish Agarwal',
    phone: '+91 94140 76543',
    email: 'manish.agarwal@agarwalbiz.com',
    payment_history_score: 0.52,
    total_past_defaults: 2,
    relationship_length: 9,
    case_type: 'loan',
    amount_due: 45000,
    days_overdue: 56,
    npa_status: 'SMA-1',
    failure_reason: 'insufficient_funds',
    pre_analyze: false,
  },

  // 4. SMA-2 (61-90 days overdue)
  {
    name: 'Deepak Verma',
    phone: '+91 98290 33419',
    email: 'deepak.verma90@gmail.com',
    payment_history_score: 0.41,
    total_past_defaults: 3,
    relationship_length: 16,
    case_type: 'loan',
    amount_due: 58000,
    days_overdue: 72,
    npa_status: 'SMA-2',
    failure_reason: 'missed_emi',
    pre_analyze: true,
  },
  {
    name: 'Neha Singhal',
    phone: '+91 97170 65421',
    email: 'neha.singhal@gmail.com',
    payment_history_score: 0.48,
    total_past_defaults: 2,
    relationship_length: 14,
    case_type: 'transaction',
    amount_due: 21000,
    days_overdue: 79,
    npa_status: 'SMA-2',
    failure_reason: 'insufficient_funds',
    pre_analyze: false,
  },
  {
    name: 'Tariq Mansoor',
    phone: '+91 99065 44190',
    email: 'tariq.mansoor@gmail.com',
    payment_history_score: 0.35,
    total_past_defaults: 3,
    relationship_length: 11,
    case_type: 'loan',
    amount_due: 51000,
    days_overdue: 86,
    npa_status: 'SMA-2',
    failure_reason: 'missed_emi',
    pre_analyze: false,
  },

  // 5. NPA (>90 days overdue)
  {
    name: 'Rajeshwar Patnaik',
    phone: '+91 94370 88201',
    email: 'rajeshwar.patnaik@yahoo.co.in',
    payment_history_score: 0.18,
    total_past_defaults: 4,
    relationship_length: 8,
    case_type: 'loan',
    amount_due: 74000,
    days_overdue: 115,
    npa_status: 'NPA',
    failure_reason: 'insufficient_funds',
    pre_analyze: true,
  },
  {
    name: 'Sunita Banerjee',
    phone: '+91 98310 99401',
    email: 'sunita.banerjee@gmail.com',
    payment_history_score: 0.22,
    total_past_defaults: 4,
    relationship_length: 22,
    case_type: 'loan',
    amount_due: 62000,
    days_overdue: 104,
    npa_status: 'NPA',
    failure_reason: 'missed_emi',
    pre_analyze: false,
  },
  {
    name: 'Gurpreet Singh Gill',
    phone: '+91 98140 12590',
    email: 'gurpreet.gill@gmail.com',
    payment_history_score: 0.29,
    total_past_defaults: 3,
    relationship_length: 19,
    case_type: 'transaction',
    amount_due: 34000,
    days_overdue: 125,
    npa_status: 'NPA',
    failure_reason: 'card_declined',
    pre_analyze: false,
  },
];

async function seedDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully.');

    // 1. Clean slate
    console.log('🧹 Clearing existing Customers, RecoveryCases, and RecoveryActions...');
    await Customer.deleteMany({});
    await RecoveryCase.deleteMany({});
    await RecoveryAction.deleteMany({});
    console.log('✅ Collections cleaned.');

    let customersCreated = 0;
    let casesCreated = 0;
    let actionsCreated = 0;
    let analyzedCount = 0;

    // 2. Insert Customers and Cases
    console.log('\n📦 Seeding 15 realistic recovery cases...');
    
    for (let i = 0; i < SEED_CUSTOMERS.length; i++) {
      const data = SEED_CUSTOMERS[i];
      const custId = `CUST-${(i + 1).toString().padStart(3, '0')}`;
      const caseId = `CASE-REC-${(i + 1).toString().padStart(3, '0')}`;

      // Create Customer
      const customer = new Customer({
        customer_id: custId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        payment_history_score: data.payment_history_score,
        total_past_defaults: data.total_past_defaults,
        relationship_length: data.relationship_length,
      });
      await customer.save();
      customersCreated++;

      // Create RecoveryCase
      const recoveryCase = new RecoveryCase({
        case_id: caseId,
        customer_id: customer._id,
        case_type: data.case_type,
        amount_due: data.amount_due,
        days_overdue: data.days_overdue,
        failure_reason: data.failure_reason,
        npa_status: data.npa_status,
        recovery_probability: null,
        case_status: 'open',
      });
      await recoveryCase.save();
      casesCreated++;

      // Pre-analyze selected 5 cases
      if (data.pre_analyze) {
        let prediction;
        try {
          // Call ML client
          prediction = await mlClient.getPrediction({
            case_type: data.case_type,
            amount_due: data.amount_due,
            days_overdue: data.days_overdue,
            npa_status: data.npa_status,
            payment_history_score: data.payment_history_score,
            total_past_defaults: data.total_past_defaults,
            failure_reason: data.failure_reason,
          });
        } catch (mlErr) {
          console.warn(`  ⚠️ ML service offline, using fallback score for ${data.name}`);
          const estProb = data.npa_status === 'NPA' ? 0.12 : data.npa_status === 'SMA-2' ? 0.28 : data.npa_status === 'SMA-1' ? 0.45 : data.npa_status === 'SMA-0' ? 0.65 : 0.88;
          prediction = {
            recovery_probability: estProb,
            risk_tier: estProb > 0.7 ? 'High' : estProb >= 0.4 ? 'Medium' : 'Low',
          };
        }

        // Apply decision engine
        const decision = decisionEngine.decideAction(
          prediction.recovery_probability,
          data.npa_status,
          data.amount_due
        );

        // Update case
        recoveryCase.recovery_probability = prediction.recovery_probability;
        recoveryCase.case_status = 'action_recommended';
        await recoveryCase.save();

        // Create initial action
        const action = new RecoveryAction({
          action_id: `ACT-SEED-${(i + 1).toString().padStart(3, '0')}`,
          case_id: recoveryCase._id,
          action_type: decision.action_type,
          expected_recovery_value: decision.expected_recovery_value,
          chosen: true,
          outcome: 'pending',
          ai_explanation: `Initial risk assessment: classified as ${data.npa_status} with ${(prediction.recovery_probability * 100).toFixed(1)}% recovery probability. Engine recommends ${decision.action_type.replace('_', ' ')}.`,
          ai_message: `Hi ${data.name}, this is an automated communication regarding your pending ${data.case_type} balance of ₹${data.amount_due.toLocaleString('en-IN')}. Please follow instructions to settle your account.`,
        });
        await action.save();
        actionsCreated++;
        analyzedCount++;

        console.log(`  ✓ Case ${caseId} (${data.name}): Analyzed -> ${decision.action_type} (Prob: ${(prediction.recovery_probability * 100).toFixed(1)}%)`);
      } else {
        console.log(`  • Case ${caseId} (${data.name}): Saved as OPEN (Pending live demo analysis)`);
      }
    }

    console.log('\n=================================================');
    console.log('🎉 RECOVERYIQ DATABASE SEEDING COMPLETE');
    console.log('=================================================');
    console.log(`  • Total Customers Created:      ${customersCreated}`);
    console.log(`  • Total Recovery Cases Created:  ${casesCreated}`);
    console.log(`    - Pre-analyzed ("action_rec"): ${analyzedCount}`);
    console.log(`    - Open (Ready for live demo):  ${casesCreated - analyzedCount}`);
    console.log(`  • Total Recovery Actions Logged: ${actionsCreated}`);
    console.log('=================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error during database seeding:', err);
    process.exit(1);
  }
}

seedDatabase();
