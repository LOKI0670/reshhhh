import React, { useState, useCallback } from 'react';
import { IntroPage } from './components/IntroPage';
import { MirrorView } from './components/MirrorView';
import { PookieGreetingModal } from './components/PookieGreetingModal';
import { useSettings } from './hooks/useSettings';
import { CameraService } from './services/CameraService';
import type { AppScreen } from './types';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('intro');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showPookieGreeting, setShowPookieGreeting] = useState(true);
  const { settings, updateSettings } = useSettings();

  const enterMirror = useCallback(() => {
    setIsDemoMode(false);
    setScreen('mirror');
  }, []);

  const enterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setScreen('mirror');
  }, []);

  const exitMirror = useCallback(() => {
    setScreen('intro');
  }, []);

  const dismissPookieGreeting = useCallback(() => {
    setShowPookieGreeting(false);
  }, []);

  const openPookieGreeting = useCallback(() => {
    setShowPookieGreeting(true);
  }, []);

  return (
    <>
      {/* Personalized Welcome Popup for Pookie before entering */}
      <PookieGreetingModal
        isOpen={showPookieGreeting}
        onEnter={dismissPookieGreeting}
      />

      {screen === 'intro' && (
        <IntroPage
          onEnterMirror={enterMirror}
          onDemoMode={enterDemoMode}
          onShowPookieMessage={openPookieGreeting}
          isSupported={CameraService.isSupported()}
        />
      )}
      {screen === 'mirror' && (
        <MirrorView
          key={isDemoMode ? 'demo' : 'live'}
          settings={settings}
          onSettingsUpdate={updateSettings}
          isDemoMode={isDemoMode}
          onExit={exitMirror}
          onShowPookieMessage={openPookieGreeting}
        />
      )}
    </>
  );
};

export default App;
