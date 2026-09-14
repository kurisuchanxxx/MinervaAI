'use client';

/**
 * Minimal bilingual (Italian / English) support.
 *
 * Italian is the default. The choice is remembered in localStorage and mirrored
 * onto <html lang>. Each component owns its strings next to itself:
 *
 *   const MESSAGES = defineMessages({
 *     en: { title: 'Layers', count: '{n} active' },
 *     it: { title: 'Livelli', count: '{n} attivi' },
 *   });
 *
 *   const t = useT(MESSAGES);
 *   t('count', { n: 3 });
 *
 * Keys are type-checked against the English dictionary, and defineMessages
 * makes a key missing from (or extra in) `it` a compile error.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'it' | 'en';
export const LANGS: Lang[] = ['it', 'en'];
export const DEFAULT_LANG: Lang = 'it';
const STORAGE_KEY = 'minerva.lang';

type Dict = Record<string, string>;
/** A per-component dictionary: `it` must carry every key `en` has. */
export type Messages<D extends Dict = Dict> = { en: D; it: { [K in keyof D]: string } };
export type Vars = Record<string, string | number>;

/** Declares a component's dictionary; `it` is checked against `en`'s keys. */
export function defineMessages<D extends Dict>(messages: { en: D; it: NoInfer<{ [K in keyof D]: string }> }): Messages<D> {
  return messages;
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({ lang: DEFAULT_LANG, setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'it' || saved === 'en') setLangState(saved);
    } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode */ }
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageContextValue {
  return useContext(LanguageContext);
}

/** Replaces `{name}` placeholders. */
export function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Non-hook lookup, for code that already knows the language. */
export function translate<D extends Dict>(messages: Messages<D>, lang: Lang, key: keyof D & string, vars?: Vars): string {
  const table = messages[lang] as Dict;
  return format(table[key] ?? (messages.en as Dict)[key] ?? key, vars);
}

/** Returns a `t(key, vars?)` bound to the current language. */
export function useT<D extends Dict>(messages: Messages<D>) {
  const { lang } = useLang();
  return useCallback(
    (key: keyof D & string, vars?: Vars) => translate(messages, lang, key, vars),
    [messages, lang],
  );
}

/** Inline pick for one-off strings: `pick(lang, { it: 'Chiudi', en: 'Close' })`. */
export function pick(lang: Lang, variants: Record<Lang, string>): string {
  return variants[lang];
}

/** Locale tag for toLocaleString / Intl. */
export function localeOf(lang: Lang): string {
  return lang === 'it' ? 'it-IT' : 'en-US';
}

/** Compact IT / EN switch styled for the HUD. */
export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      role="group"
      aria-label={lang === 'it' ? 'Lingua' : 'Language'}
      className={`pointer-events-auto glass-panel flex items-center overflow-hidden text-[9px] font-mono tracking-widest ${className}`}
    >
      {LANGS.map(l => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2 py-1 transition-colors ${lang === l ? 'bg-[var(--gold-primary)]/20 text-[var(--gold-primary)] font-bold' : 'text-[var(--text-muted)] hover:text-white'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
