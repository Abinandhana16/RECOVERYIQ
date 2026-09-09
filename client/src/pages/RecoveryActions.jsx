import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Activity,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronRight,
  IndianRupee,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

const ACTION_TYPE_BADGES = {
  reminder: 'bg-sky-50 text-sky-700 border-sky-200',
  payment_link: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  human_followup: 'bg-amber-50 text-amber-700 border-amber-200',
};

const ACTION_TYPE_LABELS = {
  reminder: 'Soft Reminder',
  payment_link: 'Payment Link',
  human_followup: 'Human Followup',
};

const OUTCOME_BADGES = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  fail: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
};

const RecoveryActions = () => {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchActions();
  }, [actionTypeFilter, outcomeFilter]);

  const fetchActions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (actionTypeFilter) params.action_type = actionTypeFilter;
      if (outcomeFilter) params.outcome = outcomeFilter;

      const res = await api.get('/actions', { params });
      setActions(res.data.actions || []);
    } catch (err) {
      setError(err.message || 'Failed to load recovery actions');
    } finally {
      setLoading(false);
    }
  };

  const filteredActions = actions.filter((act) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const customerName = act.case_id?.customer_id?.name?.toLowerCase() || '';
    const caseId = act.case_id?.case_id?.toLowerCase() || '';
    const actionId = act.action_id?.toLowerCase() || '';
    return customerName.includes(q) || caseId.includes(q) || actionId.includes(q);
  });

  // Calculate summary metrics
  const totalActions = actions.length;
  const totalExpectedValue = actions.reduce(
    (sum, act) => sum + (act.expected_recovery_value || 0),
    0
  );
  const successfulCount = actions.filter((act) => act.outcome === 'success').length;
  const pendingCount = actions.filter((act) => act.outcome === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recovery Actions</h1>
        <p className="text-sm text-slate-500 mt-1">
          Audit log and execution history of all AI-driven recovery recommendations.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Actions Taken</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalActions}</p>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected Value Pipeline</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              ₹{totalExpectedValue.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Followups</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer, Case ID, or Action ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase">Filters:</span>
          </div>

          <select
            value={actionTypeFilter}
            onChange={(e) => setActionTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Action Types</option>
            <option value="reminder">Soft Reminder</option>
            <option value="payment_link">Payment Link</option>
            <option value="human_followup">Human Followup</option>
          </select>

          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Outcomes</option>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="fail">Fail</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Actions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
            <Loader2 className="w-7 h-7 animate-spin text-sky-600" />
            <p className="text-sm">Loading action audit trail...</p>
          </div>
        ) : filteredActions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-base font-semibold text-slate-700">No recovery actions found</p>
            <p className="text-xs text-slate-400 mt-1">
              Trigger AI analysis on case details to generate recommendations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Customer & Case</th>
                  <th className="py-3.5 px-4">Action Type</th>
                  <th className="py-3.5 px-4">Expected Value</th>
                  <th className="py-3.5 px-4">Outcome</th>
                  <th className="py-3.5 px-4">AI Rationale</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">View Case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredActions.map((act) => {
                  const customerName = act.case_id?.customer_id?.name || 'Customer';
                  const caseId = act.case_id?.case_id || act.case_id?._id || 'Case';
                  const caseMongoId = act.case_id?._id || act.case_id;

                  return (
                    <tr
                      key={act.action_id || act._id}
                      onClick={() => caseMongoId && navigate(`/cases/${caseMongoId}`)}
                      className="hover:bg-slate-50/90 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-sky-600">
                        <div>{customerName}</div>
                        <div className="text-xs font-normal text-slate-400 font-mono">{caseId}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md border ${
                            ACTION_TYPE_BADGES[act.action_type] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {ACTION_TYPE_LABELS[act.action_type] || act.action_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        ₹{act.expected_recovery_value?.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border capitalize ${
                            OUTCOME_BADGES[act.outcome] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {act.outcome}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-xs text-slate-600 line-clamp-2" title={act.ai_explanation}>
                          {act.ai_explanation || 'No rationale available'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {act.createdAt
                          ? new Date(act.createdAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center text-xs font-semibold text-sky-600 group-hover:translate-x-0.5 transition-transform">
                          <span>Details</span>
                          <ChevronRight className="w-4 h-4 ml-0.5" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecoveryActions;
