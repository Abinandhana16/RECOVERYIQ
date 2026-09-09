import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Sparkles,
  Bot,
  Copy,
  Check,
  Loader2,
  Clock,
  CheckCircle2,
  AlertOctagon,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

const NPA_BADGES = {
  Standard: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'SMA-0': 'bg-sky-50 text-sky-700 border-sky-200',
  'SMA-1': 'bg-amber-50 text-amber-700 border-amber-200',
  'SMA-2': 'bg-orange-50 text-orange-700 border-orange-200',
  NPA: 'bg-red-50 text-red-700 border-red-200',
};

const ACTION_LABELS = {
  reminder: 'Soft Automated Reminder (WhatsApp/SMS)',
  payment_link: 'Frictionless RazorPay Payment Link',
  human_followup: 'Senior Recovery Specialist Followup',
};

const CaseDetails = () => {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCaseDetails();
  }, [id]);

  const fetchCaseDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/cases/${id}`);
      setCaseData(res.data.case);
      setActions(res.data.actions || []);

      // If an action already exists and case is action_recommended, pre-populate analysis view with latest action
      if (res.data.actions && res.data.actions.length > 0) {
        const latest = res.data.actions[0];
        setAnalysisResult({
          recovery_probability: res.data.case.recovery_probability,
          risk_tier:
            (res.data.case.recovery_probability || 0) > 0.7
              ? 'High'
              : (res.data.case.recovery_probability || 0) >= 0.4
              ? 'Medium'
              : 'Low',
          decision: {
            action_type: latest.action_type,
            expected_recovery_value: latest.expected_recovery_value,
          },
          ai_explanation: latest.ai_explanation,
          ai_message: latest.ai_message,
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load case details');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setError('');
    try {
      const res = await api.post(`/cases/${id}/analyze`);
      setCaseData(res.data.case);
      setAnalysisResult({
        recovery_probability: res.data.prediction.recovery_probability,
        risk_tier: res.data.prediction.risk_tier,
        decision: res.data.decision,
        ai_explanation: res.data.ai_explanation,
        ai_message: res.data.ai_message,
      });
      // Refresh actions list
      if (res.data.action) {
        setActions((prev) => [res.data.action, ...prev]);
      }
    } catch (err) {
      setError(err.message || 'AI Analysis execution failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <p className="text-sm">Loading recovery case dossier...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <AlertOctagon className="w-10 h-10 text-amber-500 mx-auto mb-2" />
        <p className="text-base font-bold text-slate-800">Case record not found</p>
        <Link to="/cases" className="text-sm text-sky-600 hover:underline mt-2 inline-block">
          Return to cases list
        </Link>
      </div>
    );
  }

  const customer = caseData.customer_id || {};
  const probPercentage = analysisResult?.recovery_probability !== undefined && analysisResult?.recovery_probability !== null
    ? (analysisResult.recovery_probability * 100).toFixed(1)
    : caseData.recovery_probability !== null && caseData.recovery_probability !== undefined
    ? (caseData.recovery_probability * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/cases"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Case {caseData.case_id}
              </h1>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  NPA_BADGES[caseData.npa_status] || 'bg-slate-100 text-slate-700'
                }`}
              >
                {caseData.npa_status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Type: <span className="capitalize font-semibold">{caseData.case_type}</span> | Status: <span className="capitalize font-semibold">{caseData.case_status.replace('_', ' ')}</span>
            </p>
          </div>
        </div>

        {/* Primary AI Trigger Button */}
        <button
          onClick={handleRunAnalysis}
          disabled={analyzing}
          className="py-2.5 px-5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-md shadow-sky-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing Recovery Model...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Run AI Decision Engine</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Grid of Profile & Overdue Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Customer Profile</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Name</span>
              <span className="font-semibold text-slate-900">{customer.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Phone</span>
              <span className="font-medium text-slate-800">{customer.phone || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Email</span>
              <span className="font-medium text-slate-800">{customer.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Payment History Score</span>
              <span className="font-bold text-slate-900">
                {customer.payment_history_score !== undefined
                  ? `${(customer.payment_history_score * 100).toFixed(0)}/100`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Total Past Defaults</span>
              <span className="font-semibold text-slate-800">{customer.total_past_defaults ?? 0}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Relationship Length</span>
              <span className="font-semibold text-slate-800">
                {customer.relationship_length} months
              </span>
            </div>
          </div>
        </div>

        {/* Case & Delinquency Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">Delinquency Summary</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Amount Due</span>
              <span className="text-lg font-extrabold text-slate-900">
                ₹{caseData.amount_due?.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Days Overdue</span>
              <span className="font-bold text-red-600">{caseData.days_overdue} days</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Failure Reason</span>
              <span className="font-medium px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                {caseData.failure_reason}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">NPA Regulatory Stage</span>
              <span className="font-semibold text-slate-800">{caseData.npa_status}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Case Registered</span>
              <span className="text-slate-600">
                {new Date(caseData.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Outcome Section */}
      {analysisResult && (
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm ring-1 ring-sky-500/10 space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Bot className="w-6 h-6 text-sky-600" />
            <h2 className="text-lg font-bold text-slate-900">AI Recovery Recommendation</h2>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase">Recovery Probability</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{probPercentage}%</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    analysisResult.risk_tier === 'High'
                      ? 'bg-emerald-100 text-emerald-800'
                      : analysisResult.risk_tier === 'Medium'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {analysisResult.risk_tier || 'Risk'} Tier
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase">Recommended Action</p>
              <p className="text-base font-bold text-sky-700 mt-1 capitalize">
                {analysisResult.decision?.action_type?.replace('_', ' ')}
              </p>
              <p className="text-[11px] text-slate-500">
                {ACTION_LABELS[analysisResult.decision?.action_type] || ''}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase">Expected Recovery Value</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                ₹{analysisResult.decision?.expected_recovery_value?.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* AI Explanation Box */}
          <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100">
            <p className="text-xs font-bold uppercase text-sky-900 tracking-wider mb-1.5 flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-sky-600" />
              Engine Decision Rationale (Gemini AI)
            </p>
            <p className="text-sm text-slate-800 leading-relaxed">
              {analysisResult.ai_explanation}
            </p>
          </div>

          {/* AI Message / Agent Script with Copy Button */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                Personalized Communication Script / Brief
              </p>
              <button
                onClick={() => copyToClipboard(analysisResult.ai_message)}
                className="flex items-center space-x-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied to clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-4 bg-slate-900 text-slate-100 rounded-xl text-sm font-mono whitespace-pre-wrap select-all leading-relaxed shadow-inner">
              {analysisResult.ai_message}
            </div>
          </div>
        </div>
      )}

      {/* Past Actions Audit Trail */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="w-5 h-5 text-slate-500" />
          <h2 className="text-base font-bold text-slate-900">Recovery Action History</h2>
        </div>

        {actions.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-2">
            No recovery actions have been triggered for this case yet. Click "Run AI Decision Engine" above.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {actions.map((act) => (
              <div key={act.action_id || act._id} className="py-3.5 flex flex-col sm:flex-row justify-between gap-2 text-sm">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 capitalize">
                      {act.action_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{act.action_id}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{act.ai_explanation}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-emerald-600">
                    ₹{act.expected_recovery_value?.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(act.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseDetails;
