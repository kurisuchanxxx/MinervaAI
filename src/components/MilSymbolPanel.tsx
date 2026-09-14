'use client';

import { useMemo, useState } from 'react';
import { Crosshair, Download, Trash2, X } from 'lucide-react';
import { defineMessages, useT } from '@/lib/i18n';
import {
  AFFILIATION_COLOR,
  AFFILIATIONS,
  ECHELONS,
  SYMBOL_KINDS,
  symbolDataUrl,
  symbolsToGeoJSON,
  type Affiliation,
  type Echelon,
  type PlacedSymbol,
  type SymbolGroup,
} from '@/lib/milsym';
import { downloadFile } from '@/lib/aoi-export';

/**
 * NATO (APP-6 / 2525C) annotation. Pick affiliation, unit type and echelon,
 * then click the map to place. Symbols persist with the rest of the operator's
 * markup and export as GeoJSON carrying the SIDC.
 */

const MESSAGES = defineMessages({
  en: {
    title: 'NATO SYMBOLS',
    affiliation: 'Affiliation',
    friend: 'Friendly', hostile: 'Hostile', neutral: 'Neutral', unknown: 'Unknown',
    type: 'Type',
    echelon: 'Echelon',
    echNone: 'None', echA: 'Team', echB: 'Squad', echC: 'Section', echD: 'Platoon',
    echE: 'Company', echF: 'Battalion', echG: 'Regiment', echH: 'Brigade',
    label: 'Label (optional)',
    labelPlaceholder: 'e.g. 1 BTG',
    place: 'CLICK MAP TO PLACE',
    placing: 'CLICK ON THE MAP…',
    cancel: 'Cancel',
    placed: 'Placed ({n})',
    none: 'No symbols placed yet.',
    remove: 'Remove',
    clearAll: 'Clear all',
    exportGeo: 'Export GeoJSON',
    groundGroup: 'GROUND', airGroup: 'AIR', seaGroup: 'SEA', installationGroup: 'INSTALLATIONS',
    infantry: 'Infantry', mechInfantry: 'Mech. infantry', armour: 'Armour', artillery: 'Artillery',
    recon: 'Recon', airDefence: 'Air defence', sam: 'SAM', missile: 'Missile', engineer: 'Engineer',
    signal: 'Signal', supply: 'Supply', medical: 'Medical', headquarters: 'Headquarters',
    fighter: 'Fighter', attackAir: 'Attack', transportAir: 'Transport', tankerAir: 'Tanker',
    isrAir: 'ISR / AEW', helicopter: 'Helicopter', uav: 'UAV',
    surfaceCombatant: 'Surface combatant', carrier: 'Carrier', patrolBoat: 'Patrol boat', submarine: 'Submarine',
    installation: 'Installation', airfield: 'Airfield',
  },
  it: {
    title: 'SIMBOLI NATO',
    affiliation: 'Affiliazione',
    friend: 'Amico', hostile: 'Ostile', neutral: 'Neutrale', unknown: 'Sconosciuto',
    type: 'Tipo',
    echelon: 'Livello',
    echNone: 'Nessuno', echA: 'Squadra', echB: 'Squadriglia', echC: 'Sezione', echD: 'Plotone',
    echE: 'Compagnia', echF: 'Battaglione', echG: 'Reggimento', echH: 'Brigata',
    label: 'Etichetta (facoltativa)',
    labelPlaceholder: 'es. 1 BTG',
    place: 'CLICCA SULLA MAPPA PER POSIZIONARE',
    placing: 'CLICCA SULLA MAPPA…',
    cancel: 'Annulla',
    placed: 'Posizionati ({n})',
    none: 'Nessun simbolo posizionato.',
    remove: 'Rimuovi',
    clearAll: 'Cancella tutti',
    exportGeo: 'Esporta GeoJSON',
    groundGroup: 'TERRESTRE', airGroup: 'AEREO', seaGroup: 'NAVALE', installationGroup: 'INSTALLAZIONI',
    infantry: 'Fanteria', mechInfantry: 'Fanteria mecc.', armour: 'Corazzati', artillery: 'Artiglieria',
    recon: 'Ricognizione', airDefence: 'Difesa aerea', sam: 'Missili SAM', missile: 'Missili', engineer: 'Genio',
    signal: 'Trasmissioni', supply: 'Rifornimenti', medical: 'Sanità', headquarters: 'Comando',
    fighter: 'Caccia', attackAir: 'Attacco', transportAir: 'Trasporto', tankerAir: 'Aerocisterna',
    isrAir: 'Ricognizione / AEW', helicopter: 'Elicottero', uav: 'Drone',
    surfaceCombatant: 'Unità di superficie', carrier: 'Portaerei', patrolBoat: 'Pattugliatore', submarine: 'Sottomarino',
    installation: 'Installazione', airfield: 'Aeroporto',
  },
});

type MsgKey = keyof typeof MESSAGES.en & string;

const GROUP_LABEL: Record<SymbolGroup, MsgKey> = {
  ground: 'groundGroup',
  air: 'airGroup',
  sea: 'seaGroup',
  installation: 'installationGroup',
};

const ECHELON_LABEL: Record<Echelon, MsgKey> = {
  '': 'echNone', A: 'echA', B: 'echB', C: 'echC', D: 'echD', E: 'echE', F: 'echF', G: 'echG', H: 'echH',
};

interface Props {
  symbols: PlacedSymbol[];
  placing: boolean;
  /** Told what to place next; the page starts placement mode. */
  onStartPlacing: (spec: { kindId: string; affiliation: Affiliation; echelon: Echelon; label?: string }) => void;
  onCancelPlacing: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function MilSymbolPanel({ symbols, placing, onStartPlacing, onCancelPlacing, onRemove, onClear }: Props) {
  const t = useT(MESSAGES);
  const [affiliation, setAffiliation] = useState<Affiliation>('hostile');
  const [kindId, setKindId] = useState('infantry');
  const [echelon, setEchelon] = useState<Echelon>('');
  const [label, setLabel] = useState('');

  const preview = useMemo(() => symbolDataUrl({ kindId, affiliation, echelon }, 42), [kindId, affiliation, echelon]);
  const grouped = useMemo(() => {
    const groups: { group: SymbolGroup; kinds: typeof SYMBOL_KINDS }[] = [];
    for (const kind of SYMBOL_KINDS) {
      const entry = groups.find(g => g.group === kind.group);
      if (entry) entry.kinds.push(kind);
      else groups.push({ group: kind.group, kinds: [kind] });
    }
    return groups;
  }, []);

  return (
    <div className="glass-panel pointer-events-auto flex flex-col overflow-hidden w-72 max-h-[70vh]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.3)]">
        <Crosshair className="w-3.5 h-3.5 text-[var(--cyan-primary)]" />
        <span className="hud-text text-[11px] text-[var(--text-primary)]">{t('title')}</span>
      </div>

      <div className="px-3 py-3 overflow-y-auto flex-1 min-h-0 flex flex-col gap-3">
        {/* Affiliation */}
        <div>
          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('affiliation')}</span>
          <div className="grid grid-cols-4 gap-1 mt-1">
            {AFFILIATIONS.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => setAffiliation(a)}
                className={`py-1.5 rounded text-[9px] font-mono tracking-wider border transition-colors ${affiliation === a ? 'border-current bg-white/10' : 'border-white/10 hover:bg-white/5'}`}
                style={{ color: affiliation === a ? AFFILIATION_COLOR[a] : 'var(--text-muted)' }}
              >
                {t(a)}
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('type')}</span>
          <div className="mt-1 flex flex-col gap-2">
            {grouped.map(({ group, kinds }) => (
              <div key={group}>
                <span className="text-[8px] font-mono tracking-widest text-[var(--text-muted)]/60">{t(GROUP_LABEL[group])}</span>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {kinds.map(k => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setKindId(k.id)}
                      className={`px-1.5 py-1 rounded text-[9px] font-mono text-left border transition-colors truncate ${kindId === k.id ? 'border-[var(--cyan-primary)]/60 bg-[var(--cyan-primary)]/10 text-[var(--cyan-primary)]' : 'border-white/10 text-[var(--text-muted)] hover:bg-white/5'}`}
                      title={t(k.id as MsgKey)}
                    >
                      {t(k.id as MsgKey)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Echelon */}
        <div>
          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('echelon')}</span>
          <select
            value={echelon}
            onChange={e => setEchelon(e.target.value as Echelon)}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--cyan-primary)]/60"
          >
            {ECHELONS.map(e => (
              <option key={e || 'none'} value={e}>{t(ECHELON_LABEL[e])}</option>
            ))}
          </select>
        </div>

        {/* Label */}
        <div>
          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('label')}</span>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder={t('labelPlaceholder')}
            maxLength={24}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--cyan-primary)]/60"
          />
        </div>

        {/* Preview + place */}
        <div className="flex items-center gap-3 border-t border-white/[0.06] pt-3">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="w-11 h-11 object-contain" />
          )}
          {placing ? (
            <button
              type="button"
              onClick={onCancelPlacing}
              className="flex-1 flex items-center justify-center gap-2 rounded border border-[var(--alert-red)]/40 bg-[var(--alert-red)]/10 py-2 text-[9px] font-mono font-bold tracking-widest text-[var(--alert-red)] hover:bg-[var(--alert-red)]/20"
            >
              <X className="w-3 h-3" /> {t('placing')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStartPlacing({ kindId, affiliation, echelon, label: label.trim() || undefined })}
              className="flex-1 rounded border border-[var(--cyan-primary)]/40 bg-[var(--cyan-primary)]/10 py-2 text-[9px] font-mono font-bold tracking-widest text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/20"
            >
              {t('place')}
            </button>
          )}
        </div>

        {/* Placed list */}
        <div className="border-t border-white/[0.06] pt-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
            {symbols.length ? t('placed', { n: symbols.length }) : t('none')}
          </span>
          <div className="mt-1 flex flex-col gap-1">
            {symbols.map(sym => {
              const url = symbolDataUrl(sym, 22);
              return (
                <div key={sym.id} className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)]">
                  {url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                  )}
                  <span className="truncate flex-1">{sym.label || t(sym.kindId as MsgKey)}</span>
                  <span className="opacity-50 tabular-nums">{sym.lat.toFixed(2)}, {sym.lng.toFixed(2)}</span>
                  <button type="button" onClick={() => onRemove(sym.id)} title={t('remove')} aria-label={t('remove')} className="p-1 hover:text-[var(--alert-red)]">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {symbols.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.2)]">
          <button
            type="button"
            onClick={() => downloadFile('minerva-symbols.geojson', JSON.stringify(symbolsToGeoJSON(symbols), null, 2), 'application/geo+json')}
            className="flex-1 flex items-center justify-center gap-1.5 rounded border border-white/10 py-1.5 text-[9px] font-mono tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10"
          >
            <Download className="w-3 h-3" /> {t('exportGeo')}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="px-2 py-1.5 rounded border border-white/10 text-[9px] font-mono tracking-widest text-[var(--text-muted)] hover:text-[var(--alert-red)] hover:bg-white/10"
          >
            {t('clearAll')}
          </button>
        </div>
      )}
    </div>
  );
}
