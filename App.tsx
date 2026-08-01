
import React, { useState, useEffect, useRef } from 'react';
import { useSagaGamification } from './hooks/useSagaGamification';
import InputSection from './components/InputSection';
import MissionCard from './components/MissionCard';
import FeedbackModal from './components/FeedbackModal';
import ToastNotification from './components/ToastNotification';
import FeatsLog from './components/FeatsLog';
import TutorialOverlay from './components/TutorialOverlay';
import SettingsMenu from './components/SettingsMenu';
import LoadingSpinner from './components/icons/LoadingSpinner';
import { t, placeholderSagas } from './lib/i18n';

type Theme = 'dark' | 'light' | 'mystic';

const App: React.FC = () => {
  // App-level State (Theme, Language, Tutorial)
  const [language, setLanguage] = useState<'en' | 'es'>('es');
  const [theme, setTheme] = useState<Theme>('dark');
  const [tutorialState, setTutorialState] = useState<{ isActive: boolean, type: 'onboarding' | 'mission' }>({ isActive: false, type: 'onboarding' });
  const [placeholders, setPlaceholders] = useState(placeholderSagas['es'][0]);

  // Game Engine Hook
  const {
    sagaInput, setSagaInput, mission, isLoading, isImageLoading, loadingMessage, error,
    backgroundImage, backgroundOpacity, toast, setToast, completedFeats, finalFeedback, setFinalFeedback,
    actions
  } = useSagaGamification(language);

  const isMountedRef = useRef(true);

  // --- Effects for Theme/Tutorial/Language ---
  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-mystic');
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    const langPlaceholders = placeholderSagas[language];
    setPlaceholders(langPlaceholders[Math.floor(Math.random() * langPlaceholders.length)]);
  }, [language]);

  useEffect(() => {
    // Temporarily disabled welcome window as requested
    /*
    const tutorialDone = localStorage.getItem('sagaFlowTutorialDone');
    if (!tutorialDone) setTimeout(() => setTutorialState({ isActive: true, type: 'onboarding' }), 1000);
    */
  }, []);

  useEffect(() => {
      if (mission && !isLoading) {
          const missionTutorialDone = localStorage.getItem('sagaFlowMissionTutorialDone');
          if (!missionTutorialDone) setTimeout(() => setTutorialState({ isActive: true, type: 'mission' }), 800);
      }
  }, [mission, isLoading]);

  const handleCloseTutorial = () => {
      localStorage.setItem(tutorialState.type === 'onboarding' ? 'sagaFlowTutorialDone' : 'sagaFlowMissionTutorialDone', 'true');
      setTutorialState(prev => ({ ...prev, isActive: false }));
  };

  const handleRestartTutorial = () => {
      localStorage.removeItem('sagaFlowTutorialDone');
      localStorage.removeItem('sagaFlowMissionTutorialDone');
      setTutorialState({ isActive: true, type: 'onboarding' });
  };

  const isMissionActive = !!mission || isLoading;

  const getOverlayClass = () => {
    if (!backgroundImage || backgroundOpacity === 0) return 'bg-transparent';
    return theme === 'light' ? 'bg-white/90 backdrop-blur-[8px]' : 'bg-black/80 backdrop-blur-[4px]'; 
  };

  return (
    <div className="min-h-screen h-safe relative overflow-x-hidden transition-colors duration-700">
      
      {/* Dynamic Background Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-[var(--color-bg)]">
        <div className={`absolute inset-0 transition-opacity duration-1000 ${backgroundOpacity > 0 ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[var(--color-ambient-1)] rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob"></div>
            <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-[var(--color-ambient-2)] rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-[var(--color-ambient-3)] rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-4000"></div>
        </div>
        <div 
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out bg-cover bg-center bg-no-repeat animate-ken-burns"
            style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none', opacity: backgroundOpacity }}
        />
      </div>

      <div className={`fixed inset-0 z-0 transition-all duration-1000 pointer-events-none ${getOverlayClass()}`} />

      <TutorialOverlay 
          isActive={tutorialState.isActive} 
          onClose={handleCloseTutorial} 
          language={language}
          type={tutorialState.type}
      />
      
      <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-50">
        <SettingsMenu 
          theme={theme}
          onThemeChange={setTheme}
          language={language}
          onLanguageChange={setLanguage}
          onRestartTutorial={handleRestartTutorial}
        />
      </div>

      <main className="relative z-10 w-full min-h-screen flex flex-col items-center justify-start sm:justify-center p-3 pt-6 sm:p-6 lg:p-8">
        
        <header className={`text-center mb-6 sm:mb-8 transition-all duration-500 ${isMissionActive ? 'scale-90 opacity-80 hidden sm:block' : 'scale-100'}`}>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text drop-shadow-sm leading-tight pb-1"
            style={{ backgroundImage: `linear-gradient(to right, var(--color-header-gradient-from), var(--color-header-gradient-via), var(--color-header-gradient-to))`}}>
            {t('header.title', language)}
          </h1>
          {!isMissionActive && (
             <p className="mt-2 text-[var(--color-text-secondary)] text-sm sm:text-lg animate-fade-in font-medium px-4">{t('header.subtitle', language)}</p>
          )}
        </header>

        <div className="w-full max-w-4xl mx-auto relative">
            
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-50 min-h-[400px] pointer-events-none">
                    <div className="animate-pulse"><LoadingSpinner /></div>
                    <h2 key={loadingMessage} className="mt-6 font-display text-xl sm:text-2xl text-[var(--color-accent)] font-bold tracking-wider animate-fade-in-fast text-center px-4 drop-shadow-md">
                        {loadingMessage}
                    </h2>
                    <p className="text-[var(--color-text-muted)] mt-2 text-xs sm:text-sm font-medium">Motor SagaCore by SagaFlow</p>
                </div>
            )}

            {!isMissionActive ? (
                <div className="animate-slide-up pb-safe">
                    {error && (
                        <div className="mb-6 mx-2 sm:mx-0 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-start gap-3 animate-fade-in text-left shadow-lg backdrop-blur-md">
                             <div className="text-red-400 mt-0.5 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                             </div>
                             <div>
                                 <h3 className="text-red-400 font-bold text-sm uppercase tracking-wider mb-1">
                                    {t('missionCard.errorTitle', language)}
                                 </h3>
                                 <p className="text-white/90 text-sm font-medium leading-relaxed">{error}</p>
                             </div>
                        </div>
                    )}
                    <InputSection
                        sagaInput={sagaInput}
                        setSagaInput={setSagaInput}
                        onGenerate={actions.generateMission}
                        isLoading={isLoading}
                        onClear={actions.clearAll}
                        language={language}
                        placeholders={placeholders}
                    />
                </div>
            ) : (
                !isLoading && (
                    <div className="animate-fade-in w-full pb-24 sm:pb-12">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <button 
                                id="tour-mission-back"
                                onClick={actions.returnToEdit}
                                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] flex items-center gap-2 transition-colors bg-[var(--color-card-bg)] px-3 py-1.5 rounded-full border border-[var(--color-border)] hover:border-[var(--color-accent)] backdrop-blur-md"
                            >
                                {t('inputSection.backButton', language)}
                            </button>
                        </div>
                        
                        <MissionCard
                            mission={mission}
                            isLoading={isLoading}
                            isImageLoading={isImageLoading} 
                            error={error}
                            onToggleObjective={actions.toggleObjective}
                            language={language}
                        />
                        <FeatsLog feats={completedFeats} language={language} />
                        
                        <div className="mt-8 text-center mb-12">
                             <button onClick={actions.clearAll} className="text-[var(--color-destructive)] hover:text-[var(--color-destructive-hover)] text-sm underline decoration-dotted underline-offset-4 transition-colors p-4">
                                 {t('inputSection.clearButton', language)}
                             </button>
                        </div>
                    </div>
                )
            )}
        </div>
      </main>

      {!isMissionActive && (
        <footer className="relative z-10 text-center py-6 text-[var(--color-text-muted)] text-xs sm:text-sm font-medium hidden sm:block">
          <p>{t('app.footer', language)}</p>
        </footer>
      )}

      {toast && (
        <ToastNotification key={toast.id} message={toast.message} onClose={() => setToast(null)} />
      )}

      {(finalFeedback.isLoading || finalFeedback.content) && (
        <FeedbackModal 
          feedback={finalFeedback.content}
          isLoading={finalFeedback.isLoading}
          onClose={() => setFinalFeedback({ content: null, isLoading: false })}
          language={language}
        />
      )}
      
      <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
        @keyframes fade-in-fast { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-fast { animation: fade-in-fast 0.5s ease-out forwards; }
        @keyframes ken-burns { 0% { transform: scale(1); } 100% { transform: scale(1.1); } }
        .animate-ken-burns { animation: ken-burns 20s alternate infinite ease-in-out; }
        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
        .animate-blob { animation: blob 10s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default App;
