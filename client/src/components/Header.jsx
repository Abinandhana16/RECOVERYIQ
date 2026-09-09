import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, User as UserIcon } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-200">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Recovery<span className="text-sky-600">IQ</span>
          </span>
          <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            Decision Engine
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <UserIcon className="w-4 h-4 text-slate-500" />
          <span className="font-semibold">{user?.name || 'Agent'}</span>
          <span className="text-xs uppercase px-1.5 py-0.2 bg-sky-100 text-sky-700 font-bold rounded">
            {user?.role || 'agent'}
          </span>
        </div>

        <button
          onClick={logout}
          className="flex items-center space-x-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-200 transition-colors"
          title="Log out"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
