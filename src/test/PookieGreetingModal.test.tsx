// ============================================================
// MIST — Pookie Greeting Modal Component Tests
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PookieGreetingModal } from '../components/PookieGreetingModal';

describe('PookieGreetingModal', () => {
  const EXACT_MESSAGE =
    'Heeelloooo ma pookie🎀🎀🎀... konjam mokkaya dhan irukum adjust panniko🫥🫥🫥';

  it('renders nothing when isOpen is false', () => {
    const onEnter = vi.fn();
    render(<PookieGreetingModal isOpen={false} onEnter={onEnter} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog and exact message when isOpen is true', () => {
    const onEnter = vi.fn();
    render(<PookieGreetingModal isOpen={true} onEnter={onEnter} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();

    const message = screen.getByText(EXACT_MESSAGE);
    expect(message).toBeTruthy();

    const enterBtn = screen.getByRole('button', { name: /enter website and explore the mirror/i });
    expect(enterBtn).toBeTruthy();
  });

  it('calls onEnter when Enter Mirror button is clicked', () => {
    const onEnter = vi.fn();
    render(<PookieGreetingModal isOpen={true} onEnter={onEnter} />);

    const enterBtn = screen.getByRole('button', { name: /enter website and explore the mirror/i });
    fireEvent.click(enterBtn);
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it('calls onEnter when Enter or Escape key is pressed', () => {
    const onEnter = vi.fn();
    render(<PookieGreetingModal isOpen={true} onEnter={onEnter} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onEnter).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onEnter).toHaveBeenCalledTimes(2);
  });
});
