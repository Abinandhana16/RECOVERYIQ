import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100 text-center">
        <div className="inline-flex p-3.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm mb-5">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <span className="inline-block text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 mb-2">
          Error 404
        </span>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Page Not Found
        </h1>

        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          The requested recovery resource or decision portal page does not exist or has been moved.
        </p>

        <div className="mt-8">
          <Link
            to="/dashboard"
            className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-md shadow-sky-200 transition-all inline-flex items-center justify-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
