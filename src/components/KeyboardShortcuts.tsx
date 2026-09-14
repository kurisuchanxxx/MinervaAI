'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { defineMessages, useT } from '@/lib/i18n';

const MESSAGES = defineMessages({
  en: {
    fullscreen: 'Toggle fullscreen',
    share: 'Share current view',
    layers: 'Toggle layer panel',
    markets: 'Toggle markets panel',
    intel: 'Toggle intel feed',
    reset: 'Reset to global view',
    help: 'Show this help',
    close: 'Close panels / popups',
    title: 'SHORTCUTS',
    footer: 'PRESS [?] OR [ESC] TO CLOSE',
  },
  it: {
    fullscreen: 'Attiva/disattiva schermo intero',
    share: 'Condividi vista corrente',
    layers: 'Mostra/nascondi pannello livelli',
    markets: 'Mostra/nascondi pannello mercati',
    intel: 'Mostra/nascondi feed intel',
    reset: 'Torna alla vista globale',
    help: 'Mostra questo aiuto',
    close: 'Chiudi pannelli / popup',
    title: 'SCORCIATOIE',
    footer: 'PREMI [?] O [ESC] PER CHIUDERE',
  },
});

const SHORTCUTS = [
  { key: 'F', desc: 'fullscreen' },
  { key: 'S', desc: 'share' },
  { key: 'L', desc: 'layers' },
  { key: 'M', desc: 'markets' },
  { key: 'I', desc: 'intel' },
  { key: 'R', desc: 'reset' },
  { key: '?', desc: 'help' },
  { key: 'ESC', desc: 'close' },
] as const;

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useT(MESSAGES);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) setIsOpen(p => !p);
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[500] flex items-center justify-center pointer-events-auto"
          onClick={() => setIsOpen(false)}
        >
          <div className="absolute inset-0 bg-[var(--bg-void)]/80 backdrop-blur-sm" />
          <motion.div
            onClick={e => e.stopPropagation()}
            className="relative glass-panel p-6 w-[320px] osiris-glow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-[var(--gold-primary)]" />
                <span className="text-sm font-mono font-bold text-[var(--text-heading)] tracking-wider">{t('title')}</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {SHORTCUTS.map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]">{t(s.desc)}</span>
                  <kbd className="px-2 py-0.5 rounded text-[9px] font-mono font-bold text-[var(--gold-primary)] bg-[var(--bg-void)] border border-[var(--border-primary)]">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center text-[9px] font-mono text-[var(--text-muted)] tracking-widest">
              {t('footer')}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
