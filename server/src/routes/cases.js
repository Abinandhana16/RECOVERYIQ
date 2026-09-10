const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');

const Customer = require('../models/Customer');
const RecoveryCase = require('../models/RecoveryCase');
const RecoveryAction = require('../models/RecoveryAction');

const mlClient = require('../services/mlClient');
const decisionEngine = require('../services/decisionEngine');
const geminiService = require('../services/geminiService');
const authMiddleware = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Protect all /api/cases routes with JWT authentication
router.use(authMiddleware);

/**
 * Helper to generate human-readable unique IDs
 */
function generateId(prefix = 'CASE') {
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  const timestampPart = Date.now().toString(36).toUpperCase();
  return `${prefix}-${timestampPart}-${randomPart}`;
}

/**
 * Helper to resolve case by MongoDB _id or custom case_id
 */
async function findCaseByIdOrCaseId(idParam) {
  let query = { case_id: idParam };
  if (mongoose.Types.ObjectId.isValid(idParam)) {
    query = { $or: [{ _id: idParam }, { case_id: idParam }] };
  }
  return RecoveryCase.findOne(query).populate('customer_id');
}

/**
 * Flexible column extractor for Excel/CSV parsing
 */
function getField(row, aliases) {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const matchedKey = keys.find(
      (k) => k.toLowerCase().replace(/[\s_-]+/g, '') === alias.toLowerCase().replace(/[\s_-]+/g, '')
    );
    if (
      matchedKey !== undefined &&
      row[matchedKey] !== undefined &&
      row[matchedKey] !== null &&
      String(row[matchedKey]).trim() !== ''
    ) {
      return row[matchedKey];
    }
  }
  return null;
}

/**
 * Normalize NPA status from string
 */
function normalizeNpaStatus(val, daysOverdue) {
  if (!val) {
    if (daysOverdue > 90) return 'NPA';
    if (daysOverdue > 60) return 'SMA-2';
    if (daysOverdue > 30) return 'SMA-1';
    if (daysOverdue > 0) return 'SMA-0';
    return 'Standard';
  }
  const clean = String(val).toUpperCase().trim();
  if (clean.includes('NPA')) return 'NPA';
  if (clean.includes('SMA-2') || clean.includes('SMA2')) return 'SMA-2';
  if (clean.includes('SMA-1') || clean.includes('SMA1')) return 'SMA-1';
  if (clean.includes('SMA-0') || clean.includes('SMA0')) return 'SMA-0';
  return 'Standard';
}

/**
 * POST /api/cases/bulk-upload
 * Bulk import cases from uploaded Excel or CSV spreadsheet (Admin only)
 */
router.post('/bulk-upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Please provide an Excel or CSV file in the "file" field.' });
    }

    // Parse Excel workbook from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ error: 'The uploaded spreadsheet contains no sheets.' });
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ error: 'The uploaded sheet is empty.' });
    }

    let createdCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let index = 0; index < rawRows.length; index++) {
      const row = rawRows[index];
      const rowNum = index + 2; // Accounting for 1-based index and header row

      const name = getField(row, ['name', 'customer_name', 'customer', 'fullname', 'full_name']);
      const phone = getField(row, ['phone', 'mobile', 'phone_number', 'contact', 'contact_number']);
      const email = getField(row, ['email', 'email_address', 'mail']);
      const amountDueRaw = getField(row, ['amount_due', 'amount', 'balance', 'overdue_amount', 'outstanding']);
      const daysOverdueRaw = getField(row, ['days_overdue', 'overdue_days', 'days', 'dpd']);
      const caseTypeRaw = getField(row, ['case_type', 'type', 'category']);
      const scoreRaw = getField(row, ['payment_history_score', 'credit_score', 'score', 'history_score']);
      const defaultsRaw = getField(row, ['total_past_defaults', 'past_defaults', 'defaults']);
      const tenureRaw = getField(row, ['relationship_length', 'relationship_months', 'tenure', 'months']);
      const failureReasonRaw = getField(row, ['failure_reason', 'reason', 'failure', 'drop_reason']);
      const npaStatusRaw = getField(row, ['npa_status', 'npa', 'npa_stage', 'status']);

      // Check required fields
      if (!name || !email || amountDueRaw === null || daysOverdueRaw === null) {
        skippedCount++;
        errors.push({
          row: rowNum,
          error: 'Missing required fields (requires name, email, amount_due, days_overdue)',
        });
        continue;
      }

      const amountDue = Number(amountDueRaw);
      const daysOverdue = Number(daysOverdueRaw);

      if (isNaN(amountDue) || isNaN(daysOverdue) || amountDue < 0 || daysOverdue < 0) {
        skippedCount++;
        errors.push({
          row: rowNum,
          error: 'Invalid numeric value for amount_due or days_overdue',
        });
        continue;
      }

      // Format payment history score (0-1)
      let paymentHistoryScore = scoreRaw !== null ? Number(scoreRaw) : 0.75;
      if (isNaN(paymentHistoryScore)) paymentHistoryScore = 0.75;
      if (paymentHistoryScore > 1) paymentHistoryScore = paymentHistoryScore / 100;
      paymentHistoryScore = Math.max(0, Math.min(1, paymentHistoryScore));

      const totalPastDefaults = defaultsRaw !== null && !isNaN(Number(defaultsRaw)) ? Number(defaultsRaw) : 0;
      const relationshipLength = tenureRaw !== null && !isNaN(Number(tenureRaw)) ? Number(tenureRaw) : 12;

      // Normalize case type
      let caseType = 'transaction';
      if (caseTypeRaw) {
        const ct = String(caseTypeRaw).toLowerCase();
        if (ct.includes('loan') || ct.includes('emi') || ct.includes('credit')) {
          caseType = 'loan';
        }
      }

      const failureReason = failureReasonRaw ? String(failureReasonRaw).trim() : 'insufficient_funds';
      const npaStatus = normalizeNpaStatus(npaStatusRaw, daysOverdue);
      const normalizedEmail = String(email).toLowerCase().trim();

      try {
        // 1. Find or create Customer
        let customerDoc = await Customer.findOne({ email: normalizedEmail });
        if (!customerDoc) {
          customerDoc = new Customer({
            customer_id: generateId('CUST'),
            name: String(name).trim(),
            phone: phone ? String(phone).trim() : '+91 90000 00000',
            email: normalizedEmail,
            payment_history_score: paymentHistoryScore,
            total_past_defaults: totalPastDefaults,
            relationship_length: relationshipLength,
          });
          await customerDoc.save();
        }

        // 2. Create RecoveryCase
        const newCase = new RecoveryCase({
          case_id: generateId('CASE'),
          customer_id: customerDoc._id,
          case_type: caseType,
          amount_due: amountDue,
          days_overdue: daysOverdue,
          failure_reason: failureReason,
          npa_status: npaStatus,
          case_status: 'open',
          recovery_probability: null,
        });
        await newCase.save();
        createdCount++;
      } catch (rowErr) {
        skippedCount++;
        errors.push({
          row: rowNum,
          error: rowErr.message || 'Database error processing row',
        });
      }
    }

    return res.status(200).json({
      message: `Bulk import completed: ${createdCount} cases created, ${skippedCount} skipped.`,
      created: createdCount,
      skipped: skippedCount,
      errors,
    });
  } catch (error) {
    console.error('Error during bulk-upload:', error);
    return res.status(500).json({ error: error.message || 'Error processing spreadsheet file' });
  }
});

/**
 * GET /api/cases/export
 * Download current cases as an Excel (.xlsx) file (Admin only)
 */
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const filter = {};
    if (req.query.case_status) filter.case_status = req.query.case_status;
    if (req.query.npa_status) filter.npa_status = req.query.npa_status;
    if (req.query.case_type) filter.case_type = req.query.case_type;

    const cases = await RecoveryCase.find(filter)
      .populate('customer_id')
      .sort({ createdAt: -1 });

    const rows = cases.map((c) => ({
      'Case ID': c.case_id || '',
      'Customer Name': c.customer_id?.name || 'Unknown',
      'Phone': c.customer_id?.phone || '',
      'Email': c.customer_id?.email || '',
      'Case Type': c.case_type ? c.case_type.toUpperCase() : '',
      'Amount Due (INR)': c.amount_due || 0,
      'Days Overdue': c.days_overdue || 0,
      'Failure Reason': c.failure_reason || '',
      'NPA Status': c.npa_status || 'Standard',
      'Recovery Probability':
        c.recovery_probability !== null && c.recovery_probability !== undefined
          ? `${(c.recovery_probability * 100).toFixed(1)}%`
          : 'Pending Analysis',
      'Case Status': c.case_status ? c.case_status.replace('_', ' ').toUpperCase() : 'OPEN',
      'Created At': c.createdAt ? new Date(c.createdAt).toISOString() : '',
    }));

    // Create workbook & worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
    const colWidths = [
      { wch: 22 }, // Case ID
      { wch: 22 }, // Customer Name
      { wch: 18 }, // Phone
      { wch: 28 }, // Email
      { wch: 14 }, // Case Type
      { wch: 18 }, // Amount Due
      { wch: 14 }, // Days Overdue
      { wch: 22 }, // Failure Reason
      { wch: 14 }, // NPA Status
      { wch: 22 }, // Recovery Probability
      { wch: 20 }, // Case Status
      { wch: 24 }, // Created At
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Recovery Cases');

    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=recoveryiq-cases.xlsx'
    );

    return res.status(200).send(excelBuffer);
  } catch (error) {
    console.error('Error exporting cases to Excel:', error);
    return res.status(500).json({ error: error.message || 'Error generating Excel export' });
  }
});

/**
 * GET /api/cases/upload-template
 * Download a sample Excel template for bulk case uploads (Admin only)
 */
router.get('/upload-template', requireAdmin, (req, res) => {
  try {
    const sampleHeaders = [
      {
        'Customer Name': 'Sample Customer',
        'Phone': '+91 98000 00000',
        'Email': 'customer@example.com',
        'Payment History Score': 0.85,
        'Total Past Defaults': 0,
        'Relationship Length': 24,
        'Case Type': 'transaction',
        'Amount Due': 5000,
        'Days Overdue': 15,
        'Failure Reason': 'insufficient_funds',
        'NPA Status': 'SMA-0',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleHeaders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=recoveryiq-upload-template.xlsx'
    );

    return res.status(200).send(excelBuffer);
  } catch (error) {
    console.error('Error generating template:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate template' });
  }
});

/**
 * POST /api/cases
 * Create a new Customer (if new) and RecoveryCase from request body.
 */
router.post('/', async (req, res) => {
  try {
    const {
      // Customer fields
      customer_id,
      name,
      phone,
      email,
      payment_history_score,
      total_past_defaults,
      relationship_length,

      // Case fields
      case_id,
      case_type,
      amount_due,
      days_overdue,
      failure_reason,
      npa_status,
    } = req.body;

    if (!case_type || amount_due === undefined || days_overdue === undefined) {
      return res.status(400).json({
        error: 'Missing required case fields (case_type, amount_due, days_overdue).',
      });
    }

    // 1. Find or create Customer
    let customerDoc = null;
    const finalCustId = customer_id || generateId('CUST');

    customerDoc = await Customer.findOne({ customer_id: finalCustId });

    if (!customerDoc) {
      if (!name || !phone || !email || payment_history_score === undefined || relationship_length === undefined) {
        return res.status(400).json({
          error: 'New customer requires: name, phone, email, payment_history_score, relationship_length.',
        });
      }

      customerDoc = new Customer({
        customer_id: finalCustId,
        name,
        phone,
        email,
        payment_history_score: Number(payment_history_score),
        total_past_defaults: Number(total_past_defaults || 0),
        relationship_length: Number(relationship_length),
      });
      await customerDoc.save();
    }

    // 2. Create RecoveryCase
    const newCase = new RecoveryCase({
      case_id: case_id || generateId('CASE'),
      customer_id: customerDoc._id,
      case_type,
      amount_due: Number(amount_due),
      days_overdue: Number(days_overdue),
      failure_reason: failure_reason || 'insufficient_funds',
      npa_status: npa_status || 'Standard',
      case_status: 'open',
    });

    await newCase.save();
    const populatedCase = await RecoveryCase.findById(newCase._id).populate('customer_id');

    return res.status(201).json({
      message: 'Recovery case created successfully',
      case: populatedCase,
    });
  } catch (error) {
    console.error('Error creating case:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cases
 * List all cases with query filters (case_status, npa_status, case_type).
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.case_status) {
      filter.case_status = req.query.case_status;
    }
    if (req.query.npa_status) {
      filter.npa_status = req.query.npa_status;
    }
    if (req.query.case_type) {
      filter.case_type = req.query.case_type;
    }

    const cases = await RecoveryCase.find(filter)
      .populate('customer_id')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      total: cases.length,
      cases,
    });
  } catch (error) {
    console.error('Error fetching cases:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cases/:id
 * Get one case with its customer info and past actions populated.
 */
router.get('/:id', async (req, res) => {
  try {
    const recoveryCase = await findCaseByIdOrCaseId(req.params.id);
    if (!recoveryCase) {
      return res.status(400).json({ error: 'Case not found' });
    }

    const actions = await RecoveryAction.find({ case_id: recoveryCase._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      case: recoveryCase,
      actions,
    });
  } catch (error) {
    console.error('Error fetching case details:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cases/:id/analyze
 * The main endpoint:
 * 1. Fetch case & customer data
 * 2. Call mlClient.getPrediction
 * 3. Save recovery_probability to the case
 * 4. Call decisionEngine.decideAction
 * 5. Call geminiService for explanation and message
 * 6. Save a new RecoveryAction document
 * 7. Update case_status to "action_recommended"
 * 8. Return full combined result
 */
router.post('/:id/analyze', async (req, res) => {
  try {
    const recoveryCase = await findCaseByIdOrCaseId(req.params.id);
    if (!recoveryCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const customer = recoveryCase.customer_id;
    if (!customer) {
      return res.status(400).json({ error: 'Associated customer details missing from case' });
    }

    // 1. Prepare ML feature payload
    const mlPayload = {
      case_type: recoveryCase.case_type,
      amount_due: recoveryCase.amount_due,
      days_overdue: recoveryCase.days_overdue,
      npa_status: recoveryCase.npa_status,
      payment_history_score: customer.payment_history_score,
      total_past_defaults: customer.total_past_defaults,
      failure_reason: recoveryCase.failure_reason,
    };

    // 2. Call ML Service
    const prediction = await mlClient.getPrediction(mlPayload);

    // 3. Update recovery probability on the case
    recoveryCase.recovery_probability = prediction.recovery_probability;

    // 4. Determine recommended action via Decision Engine
    const decision = decisionEngine.decideAction(
      prediction.recovery_probability,
      recoveryCase.npa_status,
      recoveryCase.amount_due
    );

    // Combine case & customer info for Gemini prompt context
    const fullCaseContext = {
      ...recoveryCase.toObject(),
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      payment_history_score: customer.payment_history_score,
      total_past_defaults: customer.total_past_defaults,
    };

    // 5. Call Gemini Service in parallel for explanation and personalized message
    const [ai_explanation, ai_message] = await Promise.all([
      geminiService.explainDecision(fullCaseContext, prediction, decision),
      geminiService.draftMessage(fullCaseContext, decision),
    ]);

    // 6. Save new RecoveryAction document
    const newAction = new RecoveryAction({
      action_id: generateId('ACT'),
      case_id: recoveryCase._id,
      action_type: decision.action_type,
      expected_recovery_value: decision.expected_recovery_value,
      chosen: true,
      outcome: 'pending',
      ai_explanation,
      ai_message,
    });
    await newAction.save();

    // 7. Update case status
    recoveryCase.case_status = 'action_recommended';
    await recoveryCase.save();

    // 8. Return full combined result
    return res.status(200).json({
      message: 'Case analysis completed successfully',
      case: recoveryCase,
      prediction,
      decision,
      ai_explanation,
      ai_message,
      action: newAction,
    });
  } catch (error) {
    console.error('Error analyzing case:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error during case analysis',
    });
  }
});

module.exports = router;
