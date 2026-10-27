import React from 'react';
import {
  LayoutDashboard,
  Users,
  Send,
  FileText,
  MailCheck,
  Ban,
  ScrollText,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'leads'
  | 'campaigns'
  | 'templates'
  | 'senders'
  | 'suppression'
  | 'logs'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export default function Sidebar({ currentTab, onSelectTab }: SidebarProps) {
  const { user, logout } = useAuth();

  const navItems: Array<{ tab: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { tab: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { tab: 'leads', label: 'Leads', icon: Users },
    { tab: 'campaigns', label: 'Campaigns', icon: Send },
    { tab: 'templates', label: 'Templates', icon: FileText },
    { tab: 'senders', label: 'Email Accounts', icon: MailCheck },
    { tab: 'suppression', label: 'Suppression', icon: Ban },
    { tab: 'logs', label: 'Queue & Logs', icon: ScrollText },
    { tab: 'analytics', label: 'Analytics', icon: BarChart3 },
    { tab: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none">
      {/* Brand logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="p-2 bg-blue-600 rounded-xl mr-3">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight leading-none">RankRiseUSA</h1>
          <span className="text-[11px] text-blue-400 font-medium tracking-wide uppercase">Outreach Automation</span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => onSelectTab(item.tab)}
              className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* User profile footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-blue-700/50 flex items-center justify-center font-bold text-xs text-blue-200 uppercase">
            {user?.name?.substring(0, 2) || 'AD'}
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Admin'}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Logout"
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
