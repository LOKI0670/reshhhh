// ============================================================
// MIST — Stroke History (Undo/Redo)
// Manages canvas snapshots for undo/redo without storing
// unlimited full-resolution images.
// ============================================================

import { MAX_HISTORY_ENTRIES } from '../utils/constants';
import type { HistoryEntry } from '../types';

export class StrokeHistory {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries: number = MAX_HISTORY_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  /** Push a snapshot onto the undo stack */
  push(imageData: ImageData): void {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      imageData,
      timestamp: Date.now(),
    };

    this.past.push(entry);
    this.future = []; // Clear redo stack on new action

    // Trim oldest entries beyond the limit
    if (this.past.length > this.maxEntries) {
      this.past.shift();
    }
  }

  /** Undo: return the previous state, saving the current for redo */
  undo(current: ImageData): ImageData | null {
    if (this.past.length === 0) return null;

    const entry = this.past.pop()!;

    // Save current state to redo stack
    this.future.push({
      id: crypto.randomUUID(),
      imageData: current,
      timestamp: Date.now(),
    });

    if (this.future.length > this.maxEntries) {
      this.future.shift();
    }

    return entry.imageData;
  }

  /** Redo: restore a previously undone state */
  redo(current: ImageData): ImageData | null {
    if (this.future.length === 0) return null;

    const entry = this.future.pop()!;

    // Save current state to undo stack
    this.past.push({
      id: crypto.randomUUID(),
      imageData: current,
      timestamp: Date.now(),
    });

    if (this.past.length > this.maxEntries) {
      this.past.shift();
    }

    return entry.imageData;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }

  get undoCount(): number {
    return this.past.length;
  }

  get redoCount(): number {
    return this.future.length;
  }
}
