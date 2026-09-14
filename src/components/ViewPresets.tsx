'use client';

import { motion } from 'framer-motion';
import { Globe, MapPin } from 'lucide-react';
import { defineMessages, useT } from '@/lib/i18n';

interface ViewPresetsProps {
  onNavigate: (lat: number, lng: number, zoom: number) => void;
}

const MESSAGES = defineMessages({
  en: {
    title: 'REGION PRESETS',
    hotCount: '{n} HOT',
    global: 'GLOBAL',
    europe: 'EUROPE',
    middleEast: 'MIDDLE EAST',
    eastAsia: 'EAST ASIA',
    americas: 'AMERICAS',
    ukraine: 'UKRAINE',
    africa: 'AFRICA',
    seAsia: 'S.E. ASIA',
    arctic: 'ARCTIC',
    india: 'INDIA',
    australia: 'AUSTRALIA',
    sudan: 'SUDAN',
  },
  it: {
    title: 'PRESET REGIONALI',
    hotCount: '{n} CALDE',
    global: 'GLOBALE',
    europe: 'EUROPA',
    middleEast: 'MEDIO ORIENTE',
    eastAsia: 'ASIA ORIENTALE',
    americas: 'AMERICHE',
    ukraine: 'UCRAINA',
    africa: 'AFRICA',
    seAsia: 'SUD-EST ASIA',
    arctic: 'ARTICO',
    india: 'INDIA',
    australia: 'AUSTRALIA',
    sudan: 'SUDAN',
  },
});

type PresetKey = keyof typeof MESSAGES.en;

const PRESETS: { id: PresetKey; lat: number; lng: number; zoom: number; icon: string; hot?: boolean }[] = [
  { id: 'global', lat: 20, lng: 0, zoom: 2.5, icon: '🌍' },
  { id: 'europe', lat: 48, lng: 10, zoom: 4, icon: '🇪🇺' },
  { id: 'middleEast', lat: 30, lng: 45, zoom: 4.5, icon: '🔥', hot: true },
  { id: 'eastAsia', lat: 35, lng: 120, zoom: 4, icon: '🌏' },
  { id: 'americas', lat: 25, lng: -90, zoom: 3, icon: '🌎' },
  { id: 'ukraine', lat: 49, lng: 32, zoom: 6, icon: '⚔️', hot: true },
  { id: 'africa', lat: 5, lng: 20, zoom: 3.5, icon: '🌍' },
  { id: 'seAsia', lat: 10, lng: 110, zoom: 4.5, icon: '🌏' },
  { id: 'arctic', lat: 75, lng: 0, zoom: 3.5, icon: '❄️' },
  { id: 'india', lat: 22, lng: 78, zoom: 4.5, icon: '🇮🇳' },
  { id: 'australia', lat: -25, lng: 134, zoom: 4, icon: '🇦🇺' },
  { id: 'sudan', lat: 15, lng: 30, zoom: 5.5, icon: '⚠️', hot: true },
];

export default function ViewPresets({ onNavigate }: ViewPresetsProps) {
  const t = useT(MESSAGES);
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.7, duration: 0.6 }}
      className="glass-panel p-2.5 pointer-events-auto"
    >
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
        <span className="hud-text text-[11px] text-[var(--text-primary)] tracking-widest">{t('title')}</span>
        <span className="gotham-tag gotham-tag--critical" style={{ fontSize: '9px', padding: '1px 4px', marginLeft: 'auto' }}>
          {t('hotCount', { n: PRESETS.filter(p => p.hot).length })}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => onNavigate(p.lat, p.lng, p.zoom)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-mono tracking-wider border border-transparent hover:border-[var(--border-primary)] hover:text-[var(--gold-primary)] transition-all hover:scale-[1.02] active:scale-[0.98] ${p.hot ? 'text-[var(--alert-red)] hover:border-[var(--alert-red)]/30 hover:bg-[var(--alert-red)]/5' : 'text-[var(--text-muted)] hover:bg-[var(--hover-accent)]'}`}
          >
            <span className="text-[10px] flex-shrink-0">{p.icon}</span>
            <span>{t(p.id)}</span>
            {p.hot && <span className="w-1.5 h-1.5 rounded-full bg-[var(--alert-red)] animate-osiris-pulse ml-auto flex-shrink-0" />}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
