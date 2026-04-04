'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

/**
 * Hook for registering keyboard shortcuts
 * Supports ctrl/cmd, shift, and alt modifiers
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const requiresCtrlOrMeta = shortcut.ctrl || shortcut.meta;
        const isCtrlOrMetaMatch = requiresCtrlOrMeta
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey;
        const isShiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const isAltMatch = shortcut.alt ? event.altKey : !event.altKey;
        const isKeyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (isCtrlOrMetaMatch && isShiftMatch && isAltMatch && isKeyMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Common keyboard shortcuts configuration
 */
export const commonShortcuts = {
  newPost: { key: 'n', ctrl: true, description: 'New Post' },
  save: { key: 's', ctrl: true, description: 'Save' },
  search: { key: 'k', ctrl: true, description: 'Search' },
  settings: { key: ',', ctrl: true, description: 'Settings' },
  refresh: { key: 'r', ctrl: true, description: 'Refresh' },
  escape: { key: 'Escape', description: 'Close/Cancel' },
  overview: { key: '1', ctrl: true, description: 'Go to Overview' },
  contentLab: { key: '2', ctrl: true, description: 'Go to Content Lab' },
  schedule: { key: '3', ctrl: true, description: 'Go to Schedule' },
  analytics: { key: '4', ctrl: true, description: 'Go to Analytics' },
} as const;
