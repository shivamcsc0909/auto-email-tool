import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginView from './components/LoginView';
import Sidebar, { NavTab } from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardView from './components/dashboard/DashboardView';
import LeadsView from './components/leads/LeadsView';
import CampaignsView from './components/campaigns/CampaignsView';
import TemplatesView from './components/templates/TemplatesView';
import SendersView from './components/senders/SendersView';
import SuppressionView from './components/suppression/SuppressionView';
import LogsView from './components/logs/LogsView';
import AnalyticsView from './components/analytics/AnalyticsView';
import SettingsView from './components/settings/SettingsView';
import ImportWizardModal from './components/leads/ImportWizardModal';
import CampaignWizardModal from './components/campaigns/CampaignWizardModal';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from './lib/api';

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [sendMode, setSendMode] = useState<string>('DRY_RUN');

  useEffect(() => {
    // Check backend health for live send mode
    apiFetch<any>('/health')
      .then((data) => {
        if (data?.mode) setSendMode(data.mode);
      })
      .catch(() => {});
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="flex items-center space-x-3 mb-2">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xl font-bold tracking-tight">RankRiseUSA Outreach</span>
        </div>
        <p className="text-sm text-slate-400">Verifying session security...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const getTabTitle = (tab: NavTab): string => {
    switch (tab) {
      case 'dashboard':
        return 'Executive Overview';
      case 'leads':
        return 'Lead Directory & Normalization';
      case 'campaigns':
        return 'Outreach Campaigns';
      case 'templates':
        return 'Email Templates & Signatures';
      case 'senders':
        return 'Multi-Sender Account Management';
      case 'suppression':
        return 'Suppression & Do-Not-Contact List';
      case 'logs':
        return 'Send Logs & Compliance Auditing';
      case 'analytics':
        return 'Outreach Analytics & Throughput';
      case 'settings':
        return 'Configuration & OAuth Setup';
      default:
        return 'RankRiseUSA Platform';
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans antialiased text-slate-800">
      {/* Fixed Sidebar */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={getTabTitle(currentTab)}
          sendMode={sendMode}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenCampaignModal={() => setIsCampaignModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardView
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'leads' && (
              <LeadsView onOpenImport={() => setIsImportModalOpen(true)} />
            )}

            {currentTab === 'campaigns' && <CampaignsView />}

            {currentTab === 'templates' && <TemplatesView />}

            {currentTab === 'senders' && <SendersView />}

            {currentTab === 'suppression' && <SuppressionView />}

            {currentTab === 'logs' && <LogsView />}

            {currentTab === 'analytics' && <AnalyticsView />}

            {currentTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          if (currentTab === 'leads' || currentTab === 'dashboard') {
            // Trigger refresh by updating tab or re-fetching
            window.dispatchEvent(new CustomEvent('leads-updated'));
          }
        }}
      />

      <CampaignWizardModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        onSuccess={() => {
          setIsCampaignModalOpen(false);
          setCurrentTab('campaigns');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
