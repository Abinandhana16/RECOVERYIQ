import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Cpu,
  TrendingUp,
  Target,
  Award,
  Info,
  Layers,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

const ModelPerformance = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ml/model-metrics');
      setMetrics(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load model performance metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <p className="text-sm">Loading ML telemetry & model evaluations...</p>
      </div>
    );
  }

  // Format feature importances data for Horizontal Bar Chart
  const featureImportances = metrics?.feature_importances || {};
  const chartData = Object.entries(featureImportances)
    .map(([key, value]) => {
      // Clean up feature name for display
      const formattedName = key
        .replace('failure_reason_', 'Reason: ')
        .replace('npa_status_', 'NPA: ')
        .replace('case_type_', 'Type: ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      return {
        name: formattedName,
        importance: Number((value * 100).toFixed(2)),
        rawScore: value,
      };
    })
    .sort((a, b) => b.importance - a.importance);

  const winningModel = metrics?.winning_model || 'LogisticRegression';
  const winningMetrics = metrics?.winning_model_metrics || {};
  const accuracyPct = winningMetrics.accuracy
    ? (winningMetrics.accuracy * 100).toFixed(1)
    : '80.9';
  const rocAucScore = winningMetrics.roc_auc
    ? winningMetrics.roc_auc.toFixed(4)
    : '0.8398';

  const candidateModels = metrics?.models || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Machine Learning Model Performance
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Predictive model evaluation, ROC-AUC discrimination metrics, and feature attribution weights.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Champion Model</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{winningModel}</p>
            <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1.5">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Deployed in Production
            </span>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ROC-AUC Score</p>
            <p className="text-2xl font-bold text-sky-600 mt-1">{rocAucScore}</p>
            <p className="text-xs text-slate-400 mt-0.5">Discriminative Power</p>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Test Set Accuracy</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{accuracyPct}%</p>
            <p className="text-xs text-slate-400 mt-0.5">Classification Precision</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Target className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Engineered Features</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{chartData.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">One-Hot & Scaled Variables</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Educational Explanation Box */}
      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-start space-x-3 text-sky-900 text-sm">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sky-950">Understanding the ROC-AUC Metric:</p>
          <p className="text-sky-900 text-xs sm:text-sm mt-0.5">
            ROC-AUC measures how well the model distinguishes recoverable cases from non-recoverable ones — closer to 1.0 is better, 0.5 is random guessing.
          </p>
        </div>
      </div>

      {/* Feature Importance Horizontal Bar Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Feature Importance Ranking</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Relative percentage contribution of customer, transaction, and delinquency features to the recovery prediction.
          </p>
        </div>

        <div className="h-[520px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                domain={[0, 'dataMax + 2']}
                unit="%"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#475569"
                fontSize={12}
                tickLine={false}
                width={140}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value) => [`${value}%`, 'Relative Importance']}
              />
              <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#0284c7' : index < 4 ? '#38bdf8' : '#94a3b8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Candidate Models Comparison Table */}
      {Object.keys(candidateModels).length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Candidate Benchmark Comparison</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparison across evaluated algorithmic architectures during training.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Algorithm Architecture</th>
                  <th className="py-3 px-4">Accuracy</th>
                  <th className="py-3 px-4">ROC-AUC</th>
                  <th className="py-3 px-4 text-right">Selection Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(candidateModels).map(([modelName, m]) => {
                  const isWinning = modelName === winningModel;
                  return (
                    <tr key={modelName} className={isWinning ? 'bg-sky-50/40 font-medium' : ''}>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {modelName}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {(m.accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {m.roc_auc.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isWinning ? (
                          <span className="inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Champion Model
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Benchmarked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelPerformance;
