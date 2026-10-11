// ============================================================
// MIST — Intro Page Component
// ============================================================

import React from 'react';
import '../styles/intro.css';

interface IntroPageProps {
  onEnterMirror: () => void;
  onDemoMode: () => void;
  onShowPookieMessage?: () => void;
  isSupported: boolean;
}

export const IntroPage: React.FC<IntroPageProps> = ({
  onEnterMirror,
  onDemoMode,
  onShowPookieMessage,
  isSupported,
}) => {
  return (
    <div className="intro-page" role="main">
      {/* Ambient fog background blobs */}
      <div className="intro-fog-blob" aria-hidden="true" />
      <div className="intro-fog-blob" aria-hidden="true" />
      <div className="intro-fog-blob" aria-hidden="true" />

      <div className="intro-content">
        {/* Logo */}
        <div className="intro-logo">
          <div className="intro-logo-mark" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="14" cy="14" rx="12" ry="10" stroke="rgba(168,184,216,0.5)" strokeWidth="1" fill="none"/>
              <ellipse cx="14" cy="14" rx="7" ry="5.5" stroke="rgba(168,184,216,0.3)" strokeWidth="1" fill="none"/>
              <circle cx="14" cy="14" r="2" fill="rgba(168,184,216,0.6)"/>
              <path d="M4 14c3-4 6-6 10-6s7 2 10 6" stroke="rgba(168,184,216,0.2)" strokeWidth="0.5" fill="none"/>
            </svg>
          </div>
          <h1 className="intro-logo-name">MIST</h1>
          <p className="intro-tagline">Your mirror. Your mood. Your moment.</p>
        </div>

        {onShowPookieMessage && (
          <button
            className="intro-pookie-badge-btn"
            onClick={onShowPookieMessage}
            id="open-pookie-msg-btn"
            aria-label="View message for Pookie"
          >
            <span>🎀</span>
            <span>A Special Message for Pookie</span>
            <span>✨</span>
          </button>
        )}

        <div className="intro-divider" aria-hidden="true" />

        {/* Headline */}
        <div>
          <p className="intro-headline">"Find yourself in the mist."</p>
        </div>

        {/* Subtitle */}
        <p className="intro-subtitle">
          A little fog, a little imagination.<br/>
          Wipe, write, and reveal your reflection.
        </p>

        {/* Three-step guide */}
        <div className="intro-steps" role="list" aria-label="How it works">
          {[
            { n: '1', label: 'Look into your mirror' },
            { n: '2', label: 'Draw by pinching fingers in the air or wiping screen' },
            { n: '3', label: 'Reveal your reflection & save your creation' },
          ].map((step) => (
            <div key={step.n} className="intro-step" role="listitem">
              <div className="intro-step-number" aria-hidden="true">{step.n}</div>
              <span className="intro-step-label">{step.label}</span>
            </div>
          ))}
        </div>

        <div className="intro-divider" aria-hidden="true" />

        {/* Actions */}
        <div className="intro-actions">
          {isSupported ? (
            <>
              <button
                className="btn btn-primary"
                onClick={onEnterMirror}
                id="enter-mirror-btn"
                aria-label="Enter My Mirror — this will request camera access"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="8" cy="8" r="2" fill="currentColor"/>
                </svg>
                Enter My Mirror
              </button>

              <p className="intro-permission-note" role="note">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1"/>
                  <path d="M6 5.5v3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  <circle cx="6" cy="4" r="0.5" fill="currentColor"/>
                </svg>
                Camera access required — processed locally, never uploaded
              </p>

              <button
                className="btn btn-ghost"
                onClick={onDemoMode}
                id="demo-mode-btn"
                aria-label="Try Demo Mode without camera"
              >
                Try Demo Mode
              </button>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
                Camera not supported in this browser. Try Demo Mode below.
              </p>
              <button
                className="btn btn-primary"
                onClick={onDemoMode}
                id="demo-mode-btn"
              >
                Try Demo Mode
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
