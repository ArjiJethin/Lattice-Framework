import React, { useState, useMemo } from 'react';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewPage } from './pages/OverviewPage';
import { ModelLabPage } from './pages/ModelLabPage';
import { OptimizationLabPage } from './pages/OptimizationLabPage';
import { ExperimentsPage } from './pages/ExperimentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { CandidateDetailsModal } from './components/overview/CandidateDetailsModal';
import { useOverviewData } from './lib/api/client';
import { useModelLibrary } from './hooks/useModelLibrary';
import { ConfigurationCandidate } from './types';

export default function App(): React.ReactElement {
  const [activeNav, setActiveNav] = useState<NavItemKey>('overview');
  const [inspectingCandidate, setInspectingCandidate] = useState<ConfigurationCandidate | null>(null);
  const overviewData = useOverviewData();
  const modelLibrary = useModelLibrary();

  const currentActiveModel = useMemo(() => {
    return {
      name: modelLibrary.selectedModel?.name || overviewData.activeModel.name,
      quantization: modelLibrary.selectedVariant?.name || overviewData.activeModel.quantization,
      runtime: overviewData.activeModel.runtime,
      status: overviewData.activeModel.status,
    };
  }, [modelLibrary.selectedModel, modelLibrary.selectedVariant, overviewData.activeModel]);

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
    <div className="flex h-screen w-screen overflow-hidden lattice-window-bg text-[#222938] font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeNav={activeNav}
        onNavigate={setActiveNav}
        activeModel={currentActiveModel}
        backendState={overviewData.backendState}
      />

      {/* Main Content Workspace Area */}
      <div
        className={`flex-1 h-screen min-w-0 ${activeNav === 'model-lab' ? 'overflow-hidden' : 'overflow-y-auto'
          } overflow-x-hidden relative flex flex-col scroll-smooth`}
      >
        {activeNav === 'overview' ? (
          <OverviewPage
            data={overviewData}
            onViewCandidateDetails={(cand) => setInspectingCandidate(cand)}
            onToggleFullscreen={handleToggleFullscreen}
            onNavigate={setActiveNav}
          />
        ) : activeNav === 'model-lab' ? (
          <ModelLabPage
            backendState={overviewData.backendState}
            onRefreshConnection={overviewData.refreshConnection}
            onNavigate={setActiveNav}
            modelLibrary={modelLibrary}
          />
        ) : activeNav === 'optimization-lab' ? (
          <OptimizationLabPage
            selectedModel={modelLibrary.selectedModel}
            selectedVariant={modelLibrary.selectedVariant}
            allModels={modelLibrary.models}
            summaryStats={modelLibrary.summaryStats}
            backendState={overviewData.backendState}
            onRefreshConnection={overviewData.refreshConnection}
            onNavigate={setActiveNav}
          />
        ) : activeNav === 'experiments' ? (
          <ExperimentsPage
            selectedModel={modelLibrary.selectedModel}
            selectedVariant={modelLibrary.selectedVariant}
            summaryStats={modelLibrary.summaryStats}
            backendState={overviewData.backendState}
            onRefreshConnection={overviewData.refreshConnection}
            onNavigate={setActiveNav}
          />
        ) : activeNav === 'settings' ? (
          <SettingsPage
            summaryStats={modelLibrary.summaryStats}
            backendState={overviewData.backendState}
            onRefreshConnection={overviewData.refreshConnection}
            onToggleDemoMode={overviewData.toggleDemoMode}
            onNavigate={setActiveNav}
          />
        ) : (
          <div className="flex-1 flex flex-col min-h-full">
            <Header
              backendState={overviewData.backendState}
              onRefreshConnection={overviewData.refreshConnection}
              onToggleFullscreen={handleToggleFullscreen}
            />
            <main className="flex-1 flex flex-col min-h-0">
              <PlaceholderPage
                navKey={activeNav}
                onBackToOverview={() => setActiveNav('overview')}
              />
            </main>
          </div>
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