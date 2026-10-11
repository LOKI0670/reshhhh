// ============================================================
// MIST — Pookie Greeting Welcome Modal
// Displays the sweet personalized welcome message before entering the site
// ============================================================

import React, { useEffect, useRef } from 'react';
import '../styles/pookie-modal.css';

interface PookieGreetingModalProps {
  isOpen: boolean;
  onEnter: () => void;
}

export const PookieGreetingModal: React.FC<PookieGreetingModalProps> = ({
  isOpen,
  onEnter,
}) => {
  const enterBtnRef = useRef<HTMLButtonElement>(null);

  // Focus enter button when modal opens & handle Enter/Escape keys
  useEffect(() => {
    if (isOpen) {
      enterBtnRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          onEnter();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onEnter]);

  if (!isOpen) return null;

  return (
    <div
      className="pookie-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pookie-modal-title"
      aria-describedby="pookie-message-content"
    >
      {/* Decorative ambient particles */}
      <span className="pookie-sparkle-particle" style={{ top: '15%', left: '18%', animationDelay: '0s' }}>
        ✨
      </span>
      <span className="pookie-sparkle-particle" style={{ top: '70%', left: '15%', animationDelay: '1.2s' }}>
        🌸
      </span>
      <span className="pookie-sparkle-particle" style={{ top: '22%', right: '16%', animationDelay: '0.8s' }}>
        💖
      </span>
      <span className="pookie-sparkle-particle" style={{ top: '68%', right: '20%', animationDelay: '2.1s' }}>
        ✨
      </span>

      <div className="pookie-card">
        <div className="pookie-card-glow" aria-hidden="true" />

        {/* Top ribbon badge */}
        <div className="pookie-badge">
          <span className="pookie-badge-sparkle">🎀</span>
          <span>A Special Message For You</span>
          <span className="pookie-badge-sparkle">🎀</span>
        </div>

        {/* Bow Icon Header */}
        <div className="pookie-icon-container" aria-hidden="true">
          <span className="pookie-main-bow">🎀</span>
        </div>

        {/* Title */}
        <h2 id="pookie-modal-title" className="pookie-title">
          Hey Pookie! 💖
        </h2>

        {/* The Exact Message Content */}
        <div className="pookie-message-box">
          <p id="pookie-message-content" className="pookie-message-text">
            Heeelloooo ma pookie🎀🎀🎀... konjam mokkaya dhan irukum adjust panniko🫥🫥🫥
          </p>
        </div>

        {/* Action Button */}
        <div className="pookie-actions">
          <button
            ref={enterBtnRef}
            className="pookie-btn-enter"
            onClick={onEnter}
            id="pookie-enter-site-btn"
            aria-label="Enter website and explore the mirror"
          >
            <span>Enter Mirror</span>
            <span aria-hidden="true">🪞✨</span>
          </button>
          <p className="pookie-sub-note">
            <span>Made with love & magic</span>
            <span>•</span>
            <span>Press Enter to continue</span>
          </p>
        </div>
      </div>
    </div>
  );
};
