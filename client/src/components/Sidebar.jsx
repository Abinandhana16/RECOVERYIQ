import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Activity, Cpu } from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Recovery Cases', path: '/cases', icon: FolderKanban },
    { name: 'Recovery Actions', path: '/actions', icon: Activity },
    { name: 'Model Performance', path: '/model-performance', icon: Cpu },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      <div className="p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-3">
          Navigation
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-slate-800">
        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
          <p className="text-xs font-semibold text-slate-300">RecoveryIQ</p>
          <p className="text-xs text-slate-400 mt-0.5">Automated Recovery & NPA Risk Mitigation</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
