import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  FileText,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Loader2,
} from 'lucide-react';

const NPA_COLORS = {
  Standard: '#10b981', // green
  'SMA-0': '#38bdf8',  // sky
  'SMA-1': '#fbbf24',  // amber
  'SMA-2': '#f97316',  // orange
  NPA: '#ef4444',      // red
};

const Dashboard = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await api.get('/api/cases');
        setCases(res.data.cases || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch recovery cases');
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  // Compute KPI metrics
  const totalCases = cases.length;
  const totalAmountDue = cases.reduce((sum, c) => sum + (c.amount_due || 0), 0);
  
  const casesWithProb = cases.filter((c) => c.recovery_probability !== null && c.recovery_probability !== undefined);
  const avgRecoveryProb = casesWithProb.length > 0
    ? (casesWithProb.reduce((sum, c) => sum + c.recovery_probability, 0) / casesWithProb.length) * 100
    : 0;

  const npaCasesCount = cases.filter((c) => c.npa_status === 'NPA').length;

  // Compute NPA distribution for Bar Chart
  const npaStatusOrder = ['Standard', 'SMA-0', 'SMA-1', 'SMA-2', 'NPA'];
  const npaDistribution = npaStatusOrder.map((status) => ({
    name: status,
    count: cases.filter((c) => c.npa_status === status).length,
  }));

  // Recent 5 cases
  const recentCases = [...cases].slice(0, 5);

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <p className="text-sm">Loading recovery dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recovery Executive Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Overview of default risk tiers, NPA progression, and AI recovery decision metrics.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Active Cases</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCases}</p>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Overdue Amount</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              ₹{totalAmountDue.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Recovery Prob</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {avgRecoveryProb > 0 ? `${avgRecoveryProb.toFixed(1)}%` : 'N/A'}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cases in NPA</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{npaCasesCount}</p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Charts and Recent Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* NPA Distribution Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Cases by NPA Status Category</h2>
              <p className="text-xs text-slate-500">Distribution across regulatory delinquency stages</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={npaDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value) => [`${value} cases`, 'Volume']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {npaDistribution.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={NPA_COLORS[entry.name] || '#0284c7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Cases List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Recent Cases</h2>
              <Link
                to="/cases"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center"
              >
                View all <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>

            {recentCases.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No active recovery cases found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentCases.map((c) => (
                  <Link
                    key={c._id || c.case_id}
                    to={`/cases/${c._id || c.case_id}`}
                    className="py-3 flex items-center justify-between group hover:bg-slate-50 px-2 rounded-lg transition"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-sky-600 transition">
                        {c.customer_id?.name || 'Customer'}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                        <span>{c.case_type}</span>
                        <span>•</span>
                        <span>{c.days_overdue}d overdue</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">
                        ₹{c.amount_due?.toLocaleString('en-IN')}
                      </p>
                      <span
                        className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded uppercase mt-0.5"
                        style={{
                          backgroundColor: `${NPA_COLORS[c.npa_status]}20`,
                          color: NPA_COLORS[c.npa_status],
                        }}
                      >
                        {c.npa_status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Link
              to="/cases"
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center transition"
            >
              Go to Case Pipeline
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
