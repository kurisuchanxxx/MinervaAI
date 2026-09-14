'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import MinervaLogo from '@/components/MinervaLogo';
import { API_GROUPS, ENDPOINT_COUNT, endpointId, groupBlurb, groupTitle } from './apiCatalog';
import { Callout, Code, CodeBlock, Pre, Section } from './docsPrimitives';
import EndpointCard from './EndpointCard';
import CommandPalette, { buildPaletteItems } from './CommandPalette';
import { defineMessages, LanguageToggle, useLang, useT } from '@/lib/i18n';

const MESSAGES = defineMessages({
  en: {
    /* Section titles */
    overview: 'Overview',
    quickstart: 'Quick Start',
    selfHosting: 'Self-Hosting',
    configuration: 'Configuration',
    interface: 'Interface Guide',
    shortcuts: 'Keyboard Shortcuts',
    conventions: 'Conventions',
    /* Chrome */
    guide: 'Guide',
    apiReference: 'API Reference',
    searchDocs: 'Search documentation',
    search: 'Search',
    githubRepo: 'GitHub repository',
    launchMap: 'Launch Map',
    toggleNav: 'Toggle navigation',
    sidebarEndpoints: 'endpoints, no key required.',
    previous: '← Previous',
    next: 'Next →',
    reportIssue: 'Report an issue',
    mitLicensed: 'MIT Licensed',
    onThisPage: 'On this page',
    backToTop: 'Back to top',
    /* Hero */
    heroLine1: 'Build on the',
    heroLine2: 'MinervaAI platform',
    heroBody:
      'MinervaAI aggregates aviation, maritime, seismic, conflict, cyber, and OSINT feeds onto a single GPU-rendered map — and exposes every one of them as a plain HTTP endpoint. This is the same API the dashboard runs on. There is no separate, privileged internal tier.',
    statEndpoints: 'Endpoints',
    statFeeds: 'Live feeds',
    statKeys: 'Keys required',
    /* Snippet labels */
    fetchAircraft: 'Fetch live aircraft',
    aggregateCounters: 'Aggregate counters',
    subdomainEnum: 'Passive subdomain enumeration',
    localDev: 'Local development',
    buildTest: 'Build and test',
    /* Callout titles */
    noCredentials: 'No credentials needed',
    tryFirst: 'Try before you write code',
    secretsHygiene: 'Secrets hygiene',
    responsibleUse: 'Responsible use',
    /* Configuration */
    readByApp: 'Read by the application',
    optionalKeys: 'Optional — higher rate limits only',
    cfgScanner:
      'Points at the separate RECON scanner backend. SCANNER_KEY must equal that backend’s OSIRIS_KEY. Leave both empty to disable RECON — /api/scanner then returns 503 by design.',
    cfgIngest:
      'Shared secret for /api/sdk/ingest. The endpoint fails closed: while this is unset, ingestion is disabled and returns 503.',
    cfgTelegram:
      'Comma-separated public Telegram channel names (no @) for the Telegram OSINT layer, overriding the curated default set.',
    cfgPort: 'Host port the UI is published on. The container itself always listens on 3000.',
    /* Interface guide */
    uiLayerPanel: 'Layer Panel',
    uiLayerPanelDesc: 'The left rail. Switches individual feeds on and off, and carries the theme selector.',
    uiRecon: 'RECON Toolkit',
    uiReconDesc:
      'DNS, WHOIS, certificate transparency, IP and ASN enrichment, breach checks, sanctions, CVE lookup, port scanning.',
    uiIntel: 'Intel Feed',
    uiIntelDesc: 'A running stream of incoming events across every enabled feed.',
    uiDossier: 'Region Dossier',
    uiDossierDesc: 'Right-click the map for a composite summary of that location from every feed covering it.',
    uiGraph: 'Entity Graph',
    uiGraphDesc: 'Link analysis, expanding one node at a time into its neighbours.',
    uiStatus: 'Status Bar',
    uiStatusDesc: 'Community and docs links on the left, then a live ticker of prices and significant seismic events.',
    /* Shortcuts */
    kbFullscreen: 'Toggle fullscreen',
    kbShare: 'Share current view',
    kbLayers: 'Toggle layer panel',
    kbMarkets: 'Toggle markets panel',
    kbIntel: 'Toggle intel feed',
    kbReset: 'Reset to global view',
    kbHelp: 'Show help',
    kbClose: 'Close panels / popups',
    /* Conventions */
    convErrors: 'Errors',
    convErrorsDesc:
      'Failures return a non-2xx status with an `error` key, often alongside `detail` carrying the upstream message. Most routes proxy third parties, so treat upstream failure as normal — check response.ok before reading the body.',
    convCaching: 'Caching',
    convCachingDesc:
      'Routes set their own Cache-Control TTLs: typically 45–60s for fast-moving feeds, up to a day for static reference data. Polling faster than the TTL gains nothing but load. Where a route advertises refreshInterval, use it.',
    convRate: 'Rate limits',
    convRateDesc:
      'The three AI endpoints allow 5 requests per minute per IP and return 429 beyond that. Other routes are bounded indirectly by their upstream sources.',
    convTimestamps: 'Timestamps',
    convTimestampsDesc: 'Every timestamp field is ISO 8601 in UTC.',
  },
  it: {
    overview: 'Panoramica',
    quickstart: 'Guida rapida',
    selfHosting: 'Self-hosting',
    configuration: 'Configurazione',
    interface: 'Guida all’interfaccia',
    shortcuts: 'Scorciatoie da tastiera',
    conventions: 'Convenzioni',
    guide: 'Guida',
    apiReference: 'Riferimento API',
    searchDocs: 'Cerca nella documentazione',
    search: 'Cerca',
    githubRepo: 'Repository GitHub',
    launchMap: 'Apri mappa',
    toggleNav: 'Mostra/nascondi navigazione',
    sidebarEndpoints: 'endpoint, nessuna chiave richiesta.',
    previous: '← Precedente',
    next: 'Successivo →',
    reportIssue: 'Segnala un problema',
    mitLicensed: 'Licenza MIT',
    onThisPage: 'In questa pagina',
    backToTop: 'Torna su',
    heroLine1: 'Costruisci sulla',
    heroLine2: 'piattaforma MinervaAI',
    heroBody:
      'MinervaAI aggrega feed di aviazione, traffico marittimo, sismologia, conflitti, cyber e OSINT su un’unica mappa renderizzata via GPU, ed espone ognuno di essi come semplice endpoint HTTP. È la stessa API su cui gira la dashboard: non esiste un livello interno separato e privilegiato.',
    statEndpoints: 'Endpoint',
    statFeeds: 'Feed live',
    statKeys: 'Chiavi richieste',
    fetchAircraft: 'Aerei in tempo reale',
    aggregateCounters: 'Contatori aggregati',
    subdomainEnum: 'Enumerazione passiva dei sottodomini',
    localDev: 'Sviluppo locale',
    buildTest: 'Build e test',
    noCredentials: 'Nessuna credenziale necessaria',
    tryFirst: 'Provalo prima di scrivere codice',
    secretsHygiene: 'Gestione dei segreti',
    responsibleUse: 'Uso responsabile',
    readByApp: 'Lette dall’applicazione',
    optionalKeys: 'Facoltative: solo per rate limit più alti',
    cfgScanner:
      'Punta al backend separato dello scanner RECON. SCANNER_KEY deve coincidere con OSIRIS_KEY di quel backend. Lasciale entrambe vuote per disattivare RECON: in quel caso /api/scanner restituisce 503, come previsto.',
    cfgIngest:
      'Segreto condiviso per /api/sdk/ingest. L’endpoint è fail closed: finché non è impostata, l’ingest è disattivato e restituisce 503.',
    cfgTelegram:
      'Nomi di canali Telegram pubblici separati da virgola (senza @) per il layer OSINT Telegram; sostituiscono il set predefinito.',
    cfgPort: 'Porta dell’host su cui è esposta la UI. Il container resta sempre in ascolto sulla 3000.',
    uiLayerPanel: 'Pannello livelli',
    uiLayerPanelDesc: 'La barra a sinistra. Attiva e disattiva i singoli feed e contiene il selettore del tema.',
    uiRecon: 'Toolkit RECON',
    uiReconDesc:
      'DNS, WHOIS, certificate transparency, arricchimento IP e ASN, verifica dei data breach, sanzioni, ricerca CVE, port scanning.',
    uiIntel: 'Feed intel',
    uiIntelDesc: 'Un flusso continuo degli eventi in arrivo da tutti i feed attivi.',
    uiDossier: 'Dossier regionale',
    uiDossierDesc: 'Clic destro sulla mappa per una sintesi composita di quel punto, da tutti i feed che lo coprono.',
    uiGraph: 'Grafo delle entità',
    uiGraphDesc: 'Analisi dei collegamenti, espandendo un nodo alla volta nei suoi vicini.',
    uiStatus: 'Barra di stato',
    uiStatusDesc: 'A sinistra i link alla community e alla documentazione, poi un ticker live di prezzi ed eventi sismici rilevanti.',
    kbFullscreen: 'Attiva/disattiva schermo intero',
    kbShare: 'Condividi vista corrente',
    kbLayers: 'Mostra/nascondi pannello livelli',
    kbMarkets: 'Mostra/nascondi pannello mercati',
    kbIntel: 'Mostra/nascondi feed intel',
    kbReset: 'Torna alla vista globale',
    kbHelp: 'Mostra l’aiuto',
    kbClose: 'Chiudi pannelli / popup',
    convErrors: 'Errori',
    convErrorsDesc:
      'In caso di errore viene restituito uno status non-2xx con una chiave `error`, spesso accompagnata da `detail` con il messaggio upstream. La maggior parte delle route fa da proxy verso terze parti, quindi considera normali i fallimenti upstream: controlla response.ok prima di leggere il body.',
    convCaching: 'Caching',
    convCachingDesc:
      'Ogni route imposta i propri TTL di Cache-Control: in genere 45–60s per i feed che cambiano rapidamente, fino a un giorno per i dati di riferimento statici. Un polling più frequente del TTL aggiunge solo carico. Quando una route indica refreshInterval, usalo.',
    convRate: 'Rate limit',
    convRateDesc:
      'I tre endpoint AI consentono 5 richieste al minuto per IP e oltre quella soglia restituiscono 429. Le altre route sono limitate indirettamente dalle rispettive sorgenti upstream.',
    convTimestamps: 'Timestamp',
    convTimestampsDesc: 'Tutti i campi timestamp sono in formato ISO 8601, in UTC.',
  },
});

type MessageKey = keyof typeof MESSAGES.en;

const GUIDE_SECTIONS: { id: string; key: MessageKey }[] = [
  { id: 'overview', key: 'overview' },
  { id: 'quickstart', key: 'quickstart' },
  { id: 'self-hosting', key: 'selfHosting' },
  { id: 'configuration', key: 'configuration' },
  { id: 'interface', key: 'interface' },
  { id: 'shortcuts', key: 'shortcuts' },
];

/** Section ids in page order — language-independent, used by the scroll-spy. */
const ALL_SECTION_IDS = [...GUIDE_SECTIONS.map(s => s.id), 'api', ...API_GROUPS.map(g => `api-${g.id}`)];
const FALLBACK_ORIGIN = 'https://minervaai-steel.vercel.app';

export default function DocsClient() {
  const [active, setActive] = useState('overview');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN);
  const mainRef = useRef<HTMLElement>(null);
  const { lang } = useLang();
  const t = useT(MESSAGES);

  const GUIDE = useMemo(() => GUIDE_SECTIONS.map(s => ({ id: s.id, title: t(s.key) })), [t]);
  const API_SECTIONS = useMemo(
    () => [
      { id: 'api', title: t('conventions') },
      ...API_GROUPS.map(g => ({ id: `api-${g.id}`, title: groupTitle(g, lang) })),
    ],
    [t, lang]
  );
  const ALL_SECTIONS = useMemo(() => [...GUIDE, ...API_SECTIONS], [GUIDE, API_SECTIONS]);

  const paletteItems = useMemo(() => buildPaletteItems(ALL_SECTIONS, lang), [ALL_SECTIONS, lang]);

  /* Snippets should reference the instance the reader is actually on. */
  useEffect(() => setOrigin(window.location.origin), []);

  /* Belt-and-braces scroll unlock: globals.css handles this via :has(),
     but release the lock imperatively for engines without :has() support. */
  useEffect(() => {
    const supportsHas = typeof CSS !== 'undefined' && CSS.supports?.('selector(:has(*))');
    if (supportsHas) return;
    const { documentElement: html, body } = document;
    const prev = { html: html.style.cssText, body: body.style.cssText };
    for (const el of [html, body]) {
      el.style.height = 'auto';
      el.style.overflowY = 'auto';
      el.style.overflowX = 'hidden';
    }
    return () => {
      html.style.cssText = prev.html;
      body.style.cssText = prev.body;
    };
  }, []);

  /* Scroll-spy + reading progress. */
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -72% 0px', threshold: 0 }
    );
    ALL_SECTION_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  /* ⌘K / Ctrl-K, and "/" as a plain-keyboard alternative. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Close the mobile drawer once a destination is chosen. */
  const closeNav = useCallback(() => setNavOpen(false), []);

  const activeIdx = ALL_SECTIONS.findIndex(s => s.id === active);
  const prev = activeIdx > 0 ? ALL_SECTIONS[activeIdx - 1] : null;
  const next = activeIdx >= 0 && activeIdx < ALL_SECTIONS.length - 1 ? ALL_SECTIONS[activeIdx + 1] : null;

  const navLink = (s: { id: string; title: string }) => (
    <a
      key={s.id}
      href={`#${s.id}`}
      onClick={closeNav}
      className={`relative block pl-4 pr-3 py-[7px] text-[12.5px] rounded-r-md transition-all duration-200 ${
        active === s.id
          ? 'text-[var(--gold-primary)] bg-[var(--gold-primary)]/[0.07] font-medium'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.03]'
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-full transition-all duration-200 ${
          active === s.id ? 'h-[70%] bg-[var(--gold-primary)]' : 'h-0 bg-transparent'
        }`}
      />
      {s.title}
    </a>
  );

  return (
    <div className="docs-root min-h-screen bg-[var(--bg-void)] text-[var(--text-primary)] antialiased">
      {/* Ambient wash — keeps the page from reading as a flat black slab */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(900px 480px at 12% -8%, rgba(212,175,55,0.07), transparent 65%), radial-gradient(760px 420px at 92% 4%, rgba(0,229,255,0.05), transparent 62%)',
        }}
      />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />

      {/* ── Header ── */}
      <header className="sticky top-0 z-[300] border-b border-white/[0.06] bg-[var(--bg-void)]/85 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <MinervaLogo className="w-6 h-6 text-[var(--gold-primary)] transition-all group-hover:drop-shadow-[0_0_10px_rgba(212,175,55,0.6)]" />
            <span className="flex flex-col leading-none">
              <span className="text-[12px] font-bold tracking-[0.3em] text-[var(--gold-primary)] font-mono">
                MinervaAI
              </span>
              <span className="text-[9px] font-mono tracking-[0.22em] text-[var(--text-muted)] uppercase mt-[3px]">
                Docs
              </span>
            </span>
          </Link>

          <div className="flex-1" />

          {/* Palette trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="group flex items-center gap-2 px-3 h-8 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:border-[var(--gold-primary)]/30 hover:bg-white/[0.04] transition-colors"
            aria-label={t('searchDocs')}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--gold-primary)] transition-colors" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="hidden sm:inline text-[11.5px] text-[var(--text-muted)] font-mono">{t('search')}</span>
            <kbd className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-[var(--text-muted)]">
              ⌘K
            </kbd>
          </button>

          <a
            href="https://github.com/kurisuchanxxx/MinervaAI"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('githubRepo')}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
              <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
            </svg>
          </a>

          <LanguageToggle className="shrink-0 rounded-lg" />

          <Link
            href="/"
            className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-mono tracking-[0.15em] uppercase px-3 h-8 rounded-lg border border-[var(--gold-primary)]/30 bg-[var(--gold-primary)]/[0.08] text-[var(--gold-primary)] hover:bg-[var(--gold-primary)]/[0.18] transition-colors"
          >
            {t('launchMap')}
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>

          <button
            onClick={() => setNavOpen(v => !v)}
            aria-label={t('toggleNav')}
            aria-expanded={navOpen}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.08] text-[var(--text-muted)] hover:text-[var(--gold-primary)]"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {navOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>

        {/* Reading progress */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent">
          <div
            className="h-full bg-gradient-to-r from-[var(--gold-primary)] to-[var(--cyan-primary)] transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Mobile drawer scrim */}
      {navOpen && (
        <div className="lg:hidden fixed inset-0 top-14 z-[250] bg-black/60 backdrop-blur-sm" onClick={closeNav} />
      )}

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 flex gap-8 xl:gap-12">
        {/* ── Left sidebar ── */}
        <nav
          className={`${
            navOpen
              ? 'translate-x-0 opacity-100'
              : '-translate-x-4 opacity-0 pointer-events-none lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto'
          } fixed lg:sticky top-14 left-0 bottom-0 lg:bottom-auto z-[260] lg:z-auto w-64 lg:w-56 shrink-0 lg:h-[calc(100vh-3.5rem)] overflow-y-auto styled-scrollbar bg-[var(--bg-void)] lg:bg-transparent border-r lg:border-r-0 border-white/[0.06] py-6 pr-2 pl-2 lg:pl-0 transition-all duration-200`}
        >
          <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-[var(--text-muted)]/70 pl-4 mb-2">
            {t('guide')}
          </div>
          {GUIDE.map(navLink)}

          <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-[var(--text-muted)]/70 pl-4 mb-2 mt-7">
            {t('apiReference')}
          </div>
          {API_SECTIONS.map(navLink)}

          <div className="mt-8 mx-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed">
              <span className="text-[var(--gold-primary)] font-bold">{ENDPOINT_COUNT}</span> {t('sidebarEndpoints')}
            </div>
          </div>
        </nav>

        {/* ── Content ── */}
        <main ref={mainRef} className="flex-1 min-w-0 py-12 lg:py-16 max-w-3xl">
          {/* Hero */}
          <div className="mb-20">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[var(--cyan-primary)]/20 bg-[var(--cyan-primary)]/[0.05] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--alert-green)] animate-pulse" />
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[var(--text-secondary)]">
                Open Source · MIT
              </span>
            </div>

            <h1 className="text-[38px] md:text-[52px] leading-[1.05] font-bold tracking-[-0.02em] mb-5">
              <span className="text-[var(--text-heading)]">{t('heroLine1')}</span>
              <br />
              <span className="bg-gradient-to-r from-[var(--gold-primary)] via-[#F0D060] to-[var(--cyan-primary)] bg-clip-text text-transparent">
                {t('heroLine2')}
              </span>
            </h1>

            <p className="text-[15px] leading-[1.75] text-[var(--text-secondary)] max-w-[42rem]">
              {t('heroBody')}
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <a
                href="#quickstart"
                className="inline-flex items-center gap-2 px-4 h-10 rounded-lg text-[11px] font-mono tracking-wider uppercase border border-[var(--gold-primary)]/40 bg-[var(--gold-primary)]/10 text-[var(--gold-primary)] hover:bg-[var(--gold-primary)]/20 transition-colors"
              >
                {t('quickstart')}
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
              <a
                href="#api"
                className="inline-flex items-center gap-2 px-4 h-10 rounded-lg text-[11px] font-mono tracking-wider uppercase border border-white/[0.1] bg-white/[0.02] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors"
              >
                {t('apiReference')}
              </a>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-10">
              {[
                { n: String(ENDPOINT_COUNT), l: t('statEndpoints') },
                { n: '20+', l: t('statFeeds') },
                { n: '0', l: t('statKeys') },
              ].map(s => (
                <div key={s.l} className="rounded-xl border border-white/[0.07] bg-white/[0.015] px-4 py-3">
                  <div className="text-[24px] font-bold text-[var(--gold-primary)] font-mono leading-none">{s.n}</div>
                  <div className="text-[11px] font-mono tracking-[0.15em] uppercase text-[var(--text-muted)] mt-1.5">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── GUIDE ── */}
          <Section id="overview" eyebrow={t('guide')} title={t('overview')}>
            {lang === 'it' ? (
              <>
                <p>
                  Ogni dato sulla mappa è renderizzato in WebGL tramite MapLibre GL: è questo che permette
                  all’interfaccia di gestire migliaia di entità simultanee a 60fps. L’applicazione è un’app Next.js: la
                  mappa e l’HUD girano nel browser, e ogni feed live viene normalizzato da una route sotto{' '}
                  <Code>/api</Code> prima di arrivare al client.
                </p>
                <p>
                  Questo confine è voluto. Le sorgenti upstream differiscono per formati, rate limit e policy CORS, quindi
                  il livello API assorbe queste differenze e restituisce JSON coerente.
                </p>
              </>
            ) : (
              <>
                <p>
                  Every data point on the map is rendered through WebGL via MapLibre GL, which is what lets the interface
                  hold thousands of concurrent entities at 60fps. The application is a Next.js app: the map and HUD run in
                  the browser, and each live feed is normalised by a route under <Code>/api</Code> before it reaches the
                  client.
                </p>
                <p>
                  That boundary is deliberate. Upstream sources disagree about formats, rate limits, and CORS policy, so
                  the API layer absorbs those differences and hands back consistent JSON.
                </p>
              </>
            )}
            <Callout tone="good" title={t('noCredentials')}>
              {lang === 'it'
                ? 'Aviazione, traffico marittimo, satelliti, incendi, terremoti, meteo, notizie e dati CVE provengono tutti da feed pubblici senza chiave. Le chiavi servono solo per lo scanner RECON opzionale e per alzare i rate limit.'
                : 'Aviation, maritime, satellites, fires, earthquakes, weather, news, and CVE data all come from public keyless feeds. Keys only matter for the optional RECON scanner and for raising rate limits.'}
            </Callout>
          </Section>

          <Section id="quickstart" eyebrow={t('guide')} title={t('quickstart')}>
            {lang === 'it' ? (
              <p>
                Ogni endpoint di lettura è una semplice <Code>GET</Code> che restituisce JSON. Niente di quanto segue
                richiede autenticazione: puoi incollare tutto direttamente in un terminale.
              </p>
            ) : (
              <p>
                Every read endpoint is a plain <Code>GET</Code> returning JSON. Nothing below needs authentication —
                paste any of it into a terminal.
              </p>
            )}
            <CodeBlock
              label={t('fetchAircraft')}
              tabs={[
                { label: 'cURL', lang: 'bash', code: `curl -s ${origin}/api/flights | jq '.commercial_flights | length'` },
                {
                  label: 'JavaScript',
                  lang: 'javascript',
                  code: `const res = await fetch("${origin}/api/flights");
const { commercial_flights, military_flights } = await res.json();
console.log(commercial_flights.length, "commercial;", military_flights.length, "military");`,
                },
                {
                  label: 'Python',
                  lang: 'python',
                  code: `import requests

data = requests.get("${origin}/api/flights").json()
print(len(data["commercial_flights"]), "commercial")`,
                },
              ]}
            />
            {lang === 'it' ? (
              <p>
                Se ti servono solo i numeri e non la geometria, <Code>/api/stats</Code> è l’endpoint giusto da
                interrogare periodicamente: riduce i feed pesanti a una manciata di contatori.
              </p>
            ) : (
              <p>
                If you only need magnitudes rather than geometry, <Code>/api/stats</Code> is the right endpoint to poll —
                it collapses the heavy feeds into a handful of counters.
              </p>
            )}
            <Pre label={t('aggregateCounters')} lang="bash">{`curl -s ${origin}/api/stats
# { "stats": { "flights": 9241, "sats": 2043, "cctv": 2117,
#              "weather": 58, "nuclear": 191, "incidents": 412 },
#   "timestamp": "2026-07-29T12:00:00Z" }`}</Pre>
            <p>
              {lang === 'it'
                ? 'Le lookup OSINT accettano ciascuna un solo soggetto, quindi si combinano facilmente in una pipeline:'
                : 'The OSINT lookups each take one subject, so they compose cleanly in a pipeline:'}
            </p>
            <Pre label={t('subdomainEnum')} lang="bash">{`curl -s "${origin}/api/osint/certs?domain=example.com" | jq -r '.subdomains[]'`}</Pre>
            <Callout tone="info" title={t('tryFirst')}>
              {lang === 'it' ? (
                <>
                  Ogni endpoint GET nel riferimento qui sotto ha un pulsante <strong>Invia richiesta</strong> che lo
                  esegue su questa istanza e mostra la risposta live.
                </>
              ) : (
                <>
                  Every GET endpoint in the reference below has a <strong>Send request</strong> button that runs it against
                  this instance and shows the live response.
                </>
              )}
            </Callout>
          </Section>

          <Section id="self-hosting" eyebrow={t('guide')} title={t('selfHosting')}>
            <p>
              {lang === 'it'
                ? 'MinervaAI richiede Node 20+ e nessun database. Per un’istanza locale bastano tre comandi:'
                : 'MinervaAI needs Node 20+ and no database. A local instance is three commands:'}
            </p>
            <Pre label={t('localDev')} lang="bash">{`git clone https://github.com/kurisuchanxxx/MinervaAI.git
cd osiris
npm install
npm run dev        # http://localhost:3000`}</Pre>
            <p>
              {lang === 'it'
                ? 'Per una build di produzione, o per eseguire i controlli:'
                : 'For a production build, or to run the checks:'}
            </p>
            <Pre label={t('buildTest')} lang="bash">{`npm run build && npm start
npm run lint
npm test           # vitest
npm run test:live  # includes tests that hit live upstream feeds`}</Pre>
            {lang === 'it' ? (
              <p>
                Nel repository sono inclusi un <Code>Dockerfile</Code> e un <Code>docker-compose.yml</Code>. All’interno
                il container resta sempre in ascolto sulla porta 3000; <Code>OSIRIS_PORT</Code> determina la porta
                dell’host su cui viene esposto.
              </p>
            ) : (
              <p>
                A <Code>Dockerfile</Code> and <Code>docker-compose.yml</Code> ship with the repository. The container
                always listens on port 3000 internally; <Code>OSIRIS_PORT</Code> controls the host port it is published
                on.
              </p>
            )}
            <Pre label="Docker" lang="bash">{`cp .env.example .env
docker compose up -d`}</Pre>
          </Section>

          <Section id="configuration" eyebrow={t('guide')} title={t('configuration')}>
            {lang === 'it' ? (
              <p>
                Copia <Code>.env.example</Code> in <Code>.env</Code>. Leggi quel file prima di compilare qualsiasi valore:
                la maggior parte delle chiavi elencate è riservata a sorgenti future e non viene usata dal codice
                attuale.
              </p>
            ) : (
              <p>
                Copy <Code>.env.example</Code> to <Code>.env</Code>. Read that file before filling anything in — most of
                the keys it lists are reserved for future sources and are not consumed by the current code.
              </p>
            )}
            <h3 className="text-[12px] font-mono tracking-[0.15em] uppercase text-[var(--text-primary)] pt-2">
              {t('readByApp')}
            </h3>
            <div className="space-y-2">
              {[
                { k: 'SCANNER_URL / SCANNER_KEY', v: t('cfgScanner') },
                { k: 'SDK_INGEST_KEY', v: t('cfgIngest') },
                { k: 'OSIRIS_TELEGRAM_CHANNELS', v: t('cfgTelegram') },
                { k: 'OSIRIS_PORT', v: t('cfgPort') },
              ].map(row => (
                <div
                  key={row.k}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-3.5 hover:border-white/[0.13] transition-colors"
                >
                  <div className="font-mono text-[11.5px] text-[var(--gold-primary)] mb-1.5">{row.k}</div>
                  <div className="text-[12.5px] leading-[1.7] text-[var(--text-secondary)]">{row.v}</div>
                </div>
              ))}
            </div>
            <h3 className="text-[12px] font-mono tracking-[0.15em] uppercase text-[var(--text-primary)] pt-4">
              {t('optionalKeys')}
            </h3>
            <p>
              <Code>FIRMS_API_KEY</Code>, <Code>OPENSKY_CLIENT_ID</Code>, <Code>OPENSKY_CLIENT_SECRET</Code>,{' '}
              <Code>N2YO_API_KEY</Code>, <Code>AIS_API_KEY</Code>.{' '}
              {lang === 'it'
                ? 'Vengono usati i feed pubblici senza chiave, a meno che tu non modifichi il codice per preferire queste.'
                : 'The public keyless feeds are used unless you extend the code to prefer these.'}
            </p>
            <Callout tone="warn" title={t('secretsHygiene')}>
              {lang === 'it' ? (
                <>
                  Genera i segreti con <Code>openssl rand -hex 32</Code>. Non fare mai commit di un <Code>.env</Code>{' '}
                  compilato: nel version control va solo <Code>.env.example</Code>.
                </>
              ) : (
                <>
                  Generate secrets with <Code>openssl rand -hex 32</Code>. Never commit a populated <Code>.env</Code> —
                  only <Code>.env.example</Code> belongs in version control.
                </>
              )}
            </Callout>
          </Section>

          <Section id="interface" eyebrow={t('guide')} title={t('interface')}>
            <p>
              {lang === 'it'
                ? 'La mappa occupa tutto il viewport e ogni controllo fluttua sopra di essa. I pannelli si attivano e disattivano invece di essere pagine a sé, così puoi comporre esattamente il quadro che ti serve e scartare il resto.'
                : 'The map fills the viewport and every control floats above it. Panels are toggles rather than destinations, so you can build up exactly the picture you need and drop the rest.'}
            </p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {[
                { k: t('uiLayerPanel'), v: t('uiLayerPanelDesc') },
                { k: t('uiRecon'), v: t('uiReconDesc') },
                { k: t('uiIntel'), v: t('uiIntelDesc') },
                { k: t('uiDossier'), v: t('uiDossierDesc') },
                { k: t('uiGraph'), v: t('uiGraphDesc') },
                { k: t('uiStatus'), v: t('uiStatusDesc') },
              ].map(row => (
                <div
                  key={row.k}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-3.5 hover:border-[var(--cyan-primary)]/25 transition-colors"
                >
                  <div className="font-mono text-[11.5px] text-[var(--cyan-primary)] mb-1.5">{row.k}</div>
                  <div className="text-[12.5px] leading-[1.7] text-[var(--text-secondary)]">{row.v}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="shortcuts" eyebrow={t('guide')} title={t('shortcuts')}>
            {lang === 'it' ? (
              <p>
                Premi <Code>?</Code> in qualsiasi momento all’interno dell’applicazione per visualizzare questo elenco.
              </p>
            ) : (
              <p>
                Press <Code>?</Code> at any time inside the application to bring up this list.
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { key: 'F', desc: t('kbFullscreen') },
                { key: 'S', desc: t('kbShare') },
                { key: 'L', desc: t('kbLayers') },
                { key: 'M', desc: t('kbMarkets') },
                { key: 'I', desc: t('kbIntel') },
                { key: 'R', desc: t('kbReset') },
                { key: '?', desc: t('kbHelp') },
                { key: 'ESC', desc: t('kbClose') },
              ].map(s => (
                <div
                  key={s.key}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.015] px-3.5 py-2.5"
                >
                  <kbd className="font-mono text-[10px] min-w-[2.4rem] text-center px-2 py-1 rounded-md border border-[var(--gold-primary)]/30 bg-[var(--gold-primary)]/[0.08] text-[var(--gold-primary)]">
                    {s.key}
                  </kbd>
                  <span className="text-[12.5px] text-[var(--text-secondary)]">{s.desc}</span>
                </div>
              ))}
            </div>
            {lang === 'it' ? (
              <p className="pt-2">
                In questa documentazione, <Code>⌘K</Code> (o <Code>/</Code>) apre la ricerca da qualsiasi punto della
                pagina.
              </p>
            ) : (
              <p className="pt-2">
                In these docs, <Code>⌘K</Code> (or <Code>/</Code>) opens search from anywhere on the page.
              </p>
            )}
          </Section>

          {/* ── API REFERENCE ── */}
          <Section id="api" eyebrow={t('apiReference')} title={t('conventions')}>
            {lang === 'it' ? (
              <p>
                Tutte le route si trovano sotto <Code>/api</Code>, su qualunque origin serva l’applicazione. Le letture
                sono <Code>GET</Code>, le scritture sono <Code>POST</Code> con body JSON. Nessuna richiede autenticazione,
                tranne <Code>/api/sdk/ingest</Code> e <Code>/api/github-webhook</Code>.
              </p>
            ) : (
              <p>
                All routes live under <Code>/api</Code> on whatever origin serves the application. Reads are{' '}
                <Code>GET</Code>, writes are <Code>POST</Code> with a JSON body. Nothing requires authentication except{' '}
                <Code>/api/sdk/ingest</Code> and <Code>/api/github-webhook</Code>.
              </p>
            )}
            <div className="space-y-2.5">
              {[
                { k: t('convErrors'), v: t('convErrorsDesc') },
                { k: t('convCaching'), v: t('convCachingDesc') },
                { k: t('convRate'), v: t('convRateDesc') },
                { k: t('convTimestamps'), v: t('convTimestampsDesc') },
              ].map(row => (
                <div key={row.k} className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-3.5">
                  <div className="font-mono text-[11.5px] text-[var(--gold-primary)] mb-1.5">{row.k}</div>
                  <div className="text-[12.5px] leading-[1.7] text-[var(--text-secondary)]">{row.v}</div>
                </div>
              ))}
            </div>
            <Callout tone="warn" title={t('responsibleUse')}>
              {lang === 'it' ? (
                <>
                  Lo scanner RECON e <Code>/api/osint/sweep</Code> generano traffico verso i target che indichi. Usali
                  solo su infrastrutture di tua proprietà o per cui hai un’autorizzazione scritta a eseguire test. Le
                  altre route OSINT sono passive e interrogano dataset di terze parti, non il soggetto stesso.
                </>
              ) : (
                <>
                  The RECON scanner and <Code>/api/osint/sweep</Code> generate traffic against the targets you name. Only
                  point them at infrastructure you own or have written authorisation to test. The remaining OSINT routes
                  are passive and query third-party datasets rather than the subject itself.
                </>
              )}
            </Callout>
          </Section>

          {API_GROUPS.map(group => (
            <Section key={group.id} id={`api-${group.id}`} eyebrow={t('apiReference')} title={groupTitle(group, lang)}>
              <p>{groupBlurb(group, lang)}</p>
              <div className="space-y-2.5 pt-1">
                {group.endpoints.map(ep => (
                  <EndpointCard key={endpointId(ep)} ep={ep} origin={origin} />
                ))}
              </div>
            </Section>
          ))}

          {/* Prev / next */}
          {(prev || next) && (
            <div className="grid sm:grid-cols-2 gap-3 mt-4 mb-12">
              {prev ? (
                <a
                  href={`#${prev.id}`}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 hover:border-[var(--gold-primary)]/30 transition-colors"
                >
                  <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-[var(--text-muted)] mb-1">
                    {t('previous')}
                  </div>
                  <div className="text-[12px] text-[var(--text-primary)]">{prev.title}</div>
                </a>
              ) : (
                <div />
              )}
              {next && (
                <a
                  href={`#${next.id}`}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 hover:border-[var(--gold-primary)]/30 transition-colors sm:text-right"
                >
                  <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-[var(--text-muted)] mb-1">
                    {t('next')}
                  </div>
                  <div className="text-[12px] text-[var(--text-primary)]">{next.title}</div>
                </a>
              )}
            </div>
          )}

          {/* Footer */}
          <footer className="border-t border-white/[0.06] pt-6 pb-16 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-mono text-[var(--text-muted)]">
            {[
              { href: 'https://github.com/kurisuchanxxx/MinervaAI', label: 'GitHub' },
              { href: 'https://github.com/kurisuchanxxx/MinervaAI/issues', label: t('reportIssue') },
            ].map(l => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--gold-primary)] transition-colors"
              >
                {l.label}
              </a>
            ))}
            <span className="ml-auto opacity-60">{t('mitLicensed')}</span>
          </footer>
        </main>

        {/* ── Right rail: on this page ── */}
        <aside className="hidden xl:block w-52 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto styled-scrollbar py-16">
          <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-[var(--text-muted)]/70 mb-3">
            {t('onThisPage')}
          </div>
          <div className="space-y-0.5">
            {ALL_SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`block text-[11.5px] py-1 transition-colors ${
                  active === s.id
                    ? 'text-[var(--gold-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {s.title}
              </a>
            ))}
          </div>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="mt-6 flex items-center gap-1.5 text-[11px] font-mono tracking-[0.15em] uppercase text-[var(--text-muted)] hover:text-[var(--gold-primary)] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m18 15-6-6-6 6" />
            </svg>
            {t('backToTop')}
          </button>
        </aside>
      </div>
    </div>
  );
}
