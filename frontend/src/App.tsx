import React, { useState } from 'react';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewPage } from './pages/OverviewPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { CandidateDetailsModal } from './components/overview/CandidateDetailsModal';
import { useOverviewData } from './lib/api/client';
import { ConfigurationCandidate } from './types';

export default function App(): React.ReactElement {
  const [activeNav, setActiveNav] = useState<NavItemKey>('overview');
  const [inspectingCandidate, setInspectingCandidate] = useState<ConfigurationCandidate | null>(null);
  const overviewData = useOverviewData();

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden lattice-window-bg text-[#18213B] font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeNav={activeNav}
        onNavigate={setActiveNav}
        activeModel={overviewData.activeModel}
        backendState={overviewData.backendState}
      />

      {/* Main Content Workspace Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {activeNav === 'overview' ? (
          <OverviewPage
            data={overviewData}
            onViewCandidateDetails={(cand) => setInspectingCandidate(cand)}
            onToggleFullscreen={handleToggleFullscreen}
          />
        ) : (
          <>
            <Header
              backendState={overviewData.backendState}
              onRefreshConnection={overviewData.refreshConnection}
              onToggleFullscreen={handleToggleFullscreen}
            />
            <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              <PlaceholderPage
                navKey={activeNav}
                onBackToOverview={() => setActiveNav('overview')}
              />
            </main>
          </>
        )}
      </div>

      {/* Candidate Full Constraints & Details Modal */}
      <CandidateDetailsModal
        candidate={inspectingCandidate}
        onClose={() => setInspectingCandidate(null)}
      />
    </div>
  );
}
