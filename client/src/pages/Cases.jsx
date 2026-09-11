import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight,
  Loader2,
  FolderKanban,
  CheckCircle2,
  Clock,
  Zap,
  Upload,
  Download,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';

const NPA_BADGES = {
  Standard: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'SMA-0': 'bg-sky-50 text-sky-700 border-sky-200',
  'SMA-1': 'bg-amber-50 text-amber-700 border-amber-200',
  'SMA-2': 'bg-orange-50 text-orange-700 border-orange-200',
  NPA: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_BADGES = {
  open: 'bg-slate-100 text-slate-700',
  action_recommended: 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold',
  in_progress: 'bg-blue-50 text-blue-700',
  recovered: 'bg-emerald-50 text-emerald-700 font-bold',
  written_off: 'bg-gray-100 text-gray-500',
};

const Cases = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Upload and Export states
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);
  const fileInputRef = useRef(null);

  // Filters
  const [npaFilter, setNpaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchCases();
  }, [npaFilter, statusFilter]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = {};
      if (npaFilter) params.npa_status = npaFilter;
      if (statusFilter) params.case_status = statusFilter;

      const res = await api.get('/api/cases', { params });
      setCases(res.data.cases || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch cases');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    setUploadSummary(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/cases/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadSummary({
        created: res.data.created,
        skipped: res.data.skipped,
        message: res.data.message,
        errors: res.data.errors || [],
      });

      // Refresh case pipeline
      await fetchCases();
    } catch (err) {
      setError(err.message || 'Failed to upload and import Excel file');
    } finally {
      setIsUploading(false);
      // Reset input value so same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    setError('');
    try {
      const params = {};
      if (npaFilter) params.npa_status = npaFilter;
      if (statusFilter) params.case_status = statusFilter;

      const response = await api.get('/api/cases/export', {
        params,
        responseType: 'blob',
      });

      // Create blob and trigger browser download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', 'recoveryiq-cases.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err.message || 'Failed to export cases to Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    if (!searchQuery) return true;
    const name = c.customer_id?.name?.toLowerCase() || '';
    const caseId = c.case_id?.toLowerCase() || '';
    const phone = c.customer_id?.phone || '';
    const q = searchQuery.toLowerCase();
    return name.includes(q) || caseId.includes(q) || phone.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Hidden file input for Excel upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recovery Cases</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse and triage delinquent loans and unpaid transactions.
          </p>
        </div>

        {/* Secondary Import & Export Buttons (Admin only) */}
        {isAdmin && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 font-medium px-3.5 py-2 rounded-xl border border-slate-200 text-sm shadow-sm transition disabled:opacity-60"
              title="Import cases from Excel/CSV"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Upload Excel</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 font-medium px-3.5 py-2 rounded-xl border border-slate-200 text-sm shadow-sm transition disabled:opacity-60"
              title="Export all cases to Excel"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Export to Excel</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Upload Summary Toast / Banner */}
      {uploadSummary && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm relative flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Bulk Import Successful: {uploadSummary.created} case(s) created
                {uploadSummary.skipped > 0 && `, ${uploadSummary.skipped} row(s) skipped`}.
              </p>
              {uploadSummary.errors && uploadSummary.errors.length > 0 && (
                <ul className="list-disc list-inside mt-1 text-xs text-emerald-700 space-y-0.5">
                  {uploadSummary.errors.slice(0, 3).map((err, idx) => (
                    <li key={idx}>Row {err.row}: {err.error}</li>
                  ))}
                  {uploadSummary.errors.length > 3 && (
                    <li>...and {uploadSummary.errors.length - 3} more errors.</li>
                  )}
                </ul>
              )}
            </div>
          </div>
          <button
            onClick={() => setUploadSummary(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer or Case ID..."
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
            value={npaFilter}
            onChange={(e) => setNpaFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All NPA Stages</option>
            <option value="Standard">Standard</option>
            <option value="SMA-0">SMA-0 (1-30d)</option>
            <option value="SMA-1">SMA-1 (31-60d)</option>
            <option value="SMA-2">SMA-2 (61-90d)</option>
            <option value="NPA">NPA (&gt;90d)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="action_recommended">Action Recommended</option>
            <option value="in_progress">In Progress</option>
            <option value="recovered">Recovered</option>
            <option value="written_off">Written Off</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
            <Loader2 className="w-7 h-7 animate-spin text-sky-600" />
            <p className="text-sm">Fetching case pipeline...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FolderKanban className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-base font-semibold text-slate-700">No cases found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Amount Due</th>
                  <th className="py-3.5 px-4">Days Overdue</th>
                  <th className="py-3.5 px-4">NPA Stage</th>
                  <th className="py-3.5 px-4">Recovery Prob.</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCases.map((c) => {
                  const prob = c.recovery_probability !== null && c.recovery_probability !== undefined
                    ? (c.recovery_probability * 100).toFixed(1)
                    : null;
                  
                  return (
                    <tr
                      key={c._id || c.case_id}
                      onClick={() => navigate(`/cases/${c._id || c.case_id}`)}
                      className="hover:bg-slate-50/90 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-sky-600">
                        <div>{c.customer_id?.name || 'Unknown'}</div>
                        <div className="text-xs font-normal text-slate-400">{c.case_id}</div>
                      </td>

                      <td className="py-3.5 px-4 capitalize text-slate-600">
                        {c.case_type}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ₹{c.amount_due?.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {c.days_overdue} days
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md border ${
                            NPA_BADGES[c.npa_status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.npa_status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {prob !== null ? (
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900">{prob}%</span>
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  Number(prob) > 70
                                    ? 'bg-emerald-500'
                                    : Number(prob) >= 40
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(5, Number(prob)))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not Analyzed</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded capitalize ${
                            STATUS_BADGES[c.case_status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.case_status.replace('_', ' ')}
                        </span>
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

export default Cases;
