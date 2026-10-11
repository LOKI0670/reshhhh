// ============================================================
// MIST — StrokeHistory Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { StrokeHistory } from '../engine/StrokeHistory';

function makeImageData(value: number): ImageData {
  const data = new Uint8ClampedArray([value, value, value, 255]);
  return { data, width: 1, height: 1 } as ImageData;
}

describe('StrokeHistory', () => {
  let history: StrokeHistory;

  beforeEach(() => {
    history = new StrokeHistory(5);
  });

  it('starts with empty undo/redo stacks', () => {
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.undoCount).toBe(0);
    expect(history.redoCount).toBe(0);
  });

  it('can push and undo', () => {
    const snap1 = makeImageData(10);
    history.push(snap1);
    expect(history.canUndo()).toBe(true);

    const current = makeImageData(20);
    const restored = history.undo(current);
    expect(restored).not.toBeNull();
    expect(restored!.data[0]).toBe(10);
  });

  it('undo puts current into redo stack', () => {
    history.push(makeImageData(10));
    expect(history.canRedo()).toBe(false);

    history.undo(makeImageData(20));
    expect(history.canRedo()).toBe(true);
  });

  it('can redo after undo', () => {
    history.push(makeImageData(10));
    const beforeUndo = makeImageData(30);
    history.undo(beforeUndo);

    const current = makeImageData(10);
    const redone = history.redo(current);
    expect(redone).not.toBeNull();
    expect(redone!.data[0]).toBe(30);
  });

  it('new push clears redo stack', () => {
    history.push(makeImageData(10));
    history.undo(makeImageData(20));
    expect(history.canRedo()).toBe(true);

    history.push(makeImageData(30));
    expect(history.canRedo()).toBe(false);
  });

  it('respects max history limit', () => {
    for (let i = 0; i < 10; i++) {
      history.push(makeImageData(i));
    }
    expect(history.undoCount).toBeLessThanOrEqual(5);
  });

  it('clear empties both stacks', () => {
    history.push(makeImageData(10));
    history.push(makeImageData(20));
    history.clear();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it('undo returns null when stack is empty', () => {
    expect(history.undo(makeImageData(0))).toBeNull();
  });

  it('redo returns null when future stack is empty', () => {
    expect(history.redo(makeImageData(0))).toBeNull();
  });

  it('multiple undo/redo sequence works correctly', () => {
    const s1 = makeImageData(1);
    const s2 = makeImageData(2);
    const s3 = makeImageData(3);

    history.push(s1);
    history.push(s2);
    history.push(s3);

    // Undo 3 → s3 restored
    const r3 = history.undo(makeImageData(99));
    expect(r3!.data[0]).toBe(3);

    // Undo 2 → s2 restored
    const r2 = history.undo(makeImageData(3));
    expect(r2!.data[0]).toBe(2);

    // Redo → back to s3
    const redo1 = history.redo(makeImageData(2));
    expect(redo1!.data[0]).toBe(3);
  });
});
