/**
 * ═══════════════════════════════════════════════════════════════
 *  MinervaAI — API Catalog
 *  Machine-readable description of every public route under /api.
 *  Kept in sync by hand with src/app/api/ * /route.ts
 * ═══════════════════════════════════════════════════════════════
 */

import type { Lang } from '@/lib/i18n';

export type HttpMethod = 'GET' | 'POST';

export interface ApiParam {
  name: string;
  required?: boolean;
  desc: string;
  /** Italian `desc`; falls back to `desc` when absent */
  descIt?: string;
  example?: string;
}

export interface ApiEndpoint {
  /** Path relative to the deployment origin, e.g. `/api/flights` */
  path: string;
  method: HttpMethod | HttpMethod[];
  summary: string;
  /** Italian `summary`; falls back to `summary` when absent */
  summaryIt?: string;
  /** Query-string parameters (GET) */
  params?: ApiParam[];
  /** Top-level keys present on a 2xx response */
  returns: string[];
  /** Free-form notes: caching, auth, upstream source, failure modes */
  notes?: string;
  /** Italian `notes`; falls back to `notes` when absent */
  notesIt?: string;
  /** Environment variables the route reads */
  env?: string[];
  /** Pretty-printed JSON request body, for POST routes */
  bodyExample?: string;
  /** True when the route needs a credential the docs cannot supply */
  requiresAuth?: boolean;
}

/** Stable DOM id / deep-link anchor for an endpoint. */
export function endpointId(ep: ApiEndpoint): string {
  const method = Array.isArray(ep.method) ? ep.method[0] : ep.method;
  return `ep-${method}-${ep.path.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`.toLowerCase();
}

/** Example request URL with required params filled from their documented examples. */
export function sampleUrl(ep: ApiEndpoint, origin = ''): string {
  const qs = (ep.params || [])
    .filter(p => p.required || p.example)
    .map(p => `${p.name}=${encodeURIComponent((p.example || '').split(' | ')[0] || 'value')}`)
    .join('&');
  return `${origin}${ep.path}${qs ? `?${qs}` : ''}`;
}

export interface ApiGroup {
  id: string;
  title: string;
  /** Italian `title`; falls back to `title` when absent */
  titleIt?: string;
  blurb: string;
  /** Italian `blurb`; falls back to `blurb` when absent */
  blurbIt?: string;
  endpoints: ApiEndpoint[];
}

/* Localized accessors — Italian when available, English otherwise. */
export const groupTitle = (g: ApiGroup, lang: Lang) => (lang === 'it' && g.titleIt) || g.title;
export const groupBlurb = (g: ApiGroup, lang: Lang) => (lang === 'it' && g.blurbIt) || g.blurb;
export const endpointSummary = (ep: ApiEndpoint, lang: Lang) => (lang === 'it' && ep.summaryIt) || ep.summary;
export const endpointNotes = (ep: ApiEndpoint, lang: Lang) => (lang === 'it' && ep.notesIt) || ep.notes;
export const paramDesc = (p: ApiParam, lang: Lang) => (lang === 'it' && p.descIt) || p.desc;

export const API_GROUPS: ApiGroup[] = [
  {
    id: 'system',
    title: 'System',
    titleIt: 'Sistema',
    blurb: 'Liveness and aggregate counters. Safe to poll from monitoring.',
    blurbIt: 'Liveness e contatori aggregati. Si possono interrogare periodicamente dal monitoraggio senza problemi.',
    endpoints: [
      {
        path: '/api/health',
        method: 'GET',
        summary: 'Liveness probe. Never touches an upstream feed, so it stays fast under load.',
        summaryIt: 'Sonda di liveness. Non interroga mai un feed upstream, quindi resta veloce anche sotto carico.',
        returns: ['status', 'platform', 'version', 'uptime', 'timestamp', 'endpoints'],
        notes: '`status` is the literal string `operational`. `uptime` is process uptime in seconds.',
        notesIt: '`status` è la stringa letterale `operational`. `uptime` è l’uptime del processo in secondi.',
      },
      {
        path: '/api/stats',
        method: 'GET',
        summary:
          'Fans out to the heavy feeds in parallel and returns only the counts — roughly 100 bytes instead of 10 MB of GeoJSON.',
        summaryIt:
          'Interroga in parallelo i feed più pesanti e restituisce solo i conteggi: circa 100 byte invece di 10 MB di GeoJSON.',
        returns: ['stats', 'timestamp'],
        notes:
          '`stats` contains `flights`, `sats`, `cctv`, `weather`, `nuclear`, `incidents`. Cached `s-maxage=30, stale-while-revalidate=60`, so 10k concurrent dashboard boots collapse into one upstream fetch per minute.',
        notesIt:
          '`stats` contiene `flights`, `sats`, `cctv`, `weather`, `nuclear`, `incidents`. In cache con `s-maxage=30, stale-while-revalidate=60`, quindi 10k avvii simultanei della dashboard si riducono a una sola fetch upstream al minuto.',
      },
    ],
  },
  {
    id: 'aviation-space',
    title: 'Aviation & Space',
    titleIt: 'Aviazione e spazio',
    blurb: 'Aircraft, orbital objects, and heliophysics.',
    blurbIt: 'Aeromobili, oggetti orbitali ed eliofisica.',
    endpoints: [
      {
        path: '/api/flights',
        method: 'GET',
        summary: 'Live ADS-B aircraft, bucketed by class.',
        summaryIt: 'Aeromobili ADS-B in tempo reale, suddivisi per categoria.',
        returns: ['commercial_flights', 'private_flights', 'private_jets', 'military_flights', 'source'],
        notes:
          'Keyless via adsb.lol. Each bucket is an array; sum them for a total. `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` are reserved for higher rate limits and are not required.',
        notesIt:
          'Senza chiave tramite adsb.lol. Ogni gruppo è un array; sommali per ottenere il totale. `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` servono solo per rate limit più alti e non sono obbligatori.',
      },
      {
        path: '/api/satellites',
        method: 'GET',
        summary: 'Tracked orbital objects with TLE-derived positions.',
        summaryIt: 'Oggetti orbitali tracciati, con posizioni calcolate dai TLE.',
        returns: ['satellites', 'total', 'category_counts', 'raw_count', 'timestamp'],
        notes: 'Sourced from celestrak.org. `category_counts` breaks the set down by mission type.',
        notesIt: 'Dati da celestrak.org. `category_counts` suddivide l’insieme per tipo di missione.',
      },
      {
        path: '/api/space-weather',
        method: 'GET',
        summary: 'Geomagnetic conditions and solar flare activity from NOAA SWPC.',
        summaryIt: 'Condizioni geomagnetiche e attività dei brillamenti solari da NOAA SWPC.',
        returns: [
          'kp_index',
          'kp_timestamp',
          'storm_level',
          'storm_color',
          'solar_flares',
          'alerts',
          'timestamp',
        ],
        notes: '`storm_color` is a hex string the HUD renders directly, so clients need no severity lookup table.',
        notesIt: '`storm_color` è una stringa esadecimale che l’HUD usa direttamente, quindi i client non hanno bisogno di una tabella di severità.',
      },
    ],
  },
  {
    id: 'earth',
    title: 'Earth & Environment',
    titleIt: 'Terra e ambiente',
    blurb: 'Seismic, fire, atmospheric, and orbital-imagery feeds.',
    blurbIt: 'Feed sismici, incendi, dati atmosferici e immagini satellitari.',
    endpoints: [
      {
        path: '/api/earthquakes',
        method: 'GET',
        summary: 'Recent seismic events from the USGS feed.',
        summaryIt: 'Eventi sismici recenti dal feed USGS.',
        returns: ['earthquakes', 'total', 'timestamp'],
        notes: 'M2.5+ over the trailing day. Each event carries `magnitude`, `place`, `depth`, `time`, `tsunami`, `alert`.',
        notesIt: 'M2.5+ nelle ultime 24 ore. Ogni evento include `magnitude`, `place`, `depth`, `time`, `tsunami`, `alert`.',
      },
      {
        path: '/api/fires',
        method: 'GET',
        summary: 'Active wildfire hotspots from NASA FIRMS.',
        summaryIt: 'Focolai di incendi attivi da NASA FIRMS.',
        returns: ['fires', 'total', 'source', 'timestamp'],
        env: ['FIRMS_API_KEY'],
        notes: 'Uses the keyless FIRMS CSV by default; the key only matters if you switch to the per-area API.',
        notesIt: 'Di default usa il CSV FIRMS senza chiave; la chiave serve solo se passi all’API per area.',
      },
      {
        path: '/api/weather',
        method: 'GET',
        summary: 'Severe weather and natural events from NASA EONET.',
        summaryIt: 'Maltempo ed eventi naturali da NASA EONET.',
        returns: ['events', 'total', 'timestamp'],
      },
      {
        path: '/api/air-quality',
        method: 'GET',
        summary: 'Ground station air quality readings.',
        summaryIt: 'Misurazioni della qualità dell’aria dalle stazioni a terra.',
        returns: ['stations', 'total', 'timestamp'],
      },
      {
        path: '/api/radar',
        method: 'GET',
        summary: 'GPS interference and navigation outage reporting.',
        summaryIt: 'Segnalazioni di interferenze GPS e interruzioni della navigazione.',
        returns: ['outages', 'total', 'source', 'timestamp'],
      },
      {
        path: '/api/sentinel',
        method: 'GET',
        summary: 'Sentinel satellite imagery scenes covering a point.',
        summaryIt: 'Scene di immagini satellitari Sentinel che coprono un punto.',
        params: [
          { name: 'lat', required: true, desc: 'Latitude of the point of interest.', descIt: 'Latitudine del punto di interesse.', example: '51.5072' },
          { name: 'lng', required: true, desc: 'Longitude of the point of interest.', descIt: 'Longitudine del punto di interesse.', example: '-0.1276' },
          { name: 'radius', desc: 'Search radius in kilometres.', descIt: 'Raggio di ricerca in chilometri.', example: '50' },
          { name: 'days', desc: 'How far back to search, in days.', descIt: 'Quanto indietro cercare, in giorni.', example: '30' },
        ],
        returns: ['scenes', 'timestamp'],
      },
    ],
  },
  {
    id: 'geopolitical',
    title: 'Geopolitical',
    titleIt: 'Geopolitica',
    blurb: 'Conflict zones, frontlines, event streams, and country-level risk.',
    blurbIt: 'Zone di conflitto, linee del fronte, flussi di eventi e rischio per paese.',
    endpoints: [
      {
        path: '/api/conflicts',
        method: 'GET',
        summary: 'Active conflict zones joined with live incident reporting.',
        summaryIt: 'Zone di conflitto attive, incrociate con le segnalazioni di incidenti in tempo reale.',
        returns: [
          'zones',
          'activeWarzones',
          'liveEvents',
          'totalZones',
          'totalLiveEvents',
          'sources',
          'refreshInterval',
          'timestamp',
        ],
        notes: '`refreshInterval` is the server’s recommended client poll interval in milliseconds — honour it rather than hard-coding your own.',
        notesIt: '`refreshInterval` è l’intervallo di polling consigliato dal server, in millisecondi: rispettalo invece di impostarne uno fisso nel codice.',
      },
      {
        path: '/api/frontlines',
        method: 'GET',
        summary: 'Frontline geometry for active theatres.',
        summaryIt: 'Geometria delle linee del fronte nei teatri attivi.',
        returns: ['frontlines', 'timestamp'],
      },
      {
        path: '/api/gdelt',
        method: 'GET',
        summary: 'Geocoded world events from the GDELT project.',
        summaryIt: 'Eventi mondiali geocodificati dal progetto GDELT.',
        returns: ['events', 'total', 'source', 'timestamp'],
      },
      {
        path: '/api/country-risk',
        method: 'GET',
        summary: 'Per-country risk scoring alongside market session state.',
        summaryIt: 'Punteggio di rischio per paese, insieme allo stato delle sessioni di mercato.',
        returns: ['countries', 'exchanges', 'open_exchanges', 'total_exchanges', 'timestamp'],
      },
      {
        path: '/api/region-dossier',
        method: 'GET',
        summary: 'Composite intelligence summary for a map location — the panel behind a map right-click.',
        summaryIt: 'Sintesi di intelligence composita per un punto della mappa: il pannello che si apre con il clic destro.',
        params: [
          { name: 'lat', required: true, desc: 'Latitude of the region.', descIt: 'Latitudine della regione.', example: '48.3794' },
          { name: 'lng', required: true, desc: 'Longitude of the region.', descIt: 'Longitudine della regione.', example: '31.1656' },
        ],
        returns: ['coordinates', '…dossier sections'],
      },
    ],
  },
  {
    id: 'media-markets',
    title: 'Media & Markets',
    titleIt: 'Media e mercati',
    blurb: 'News aggregation, live broadcast streams, and financial instruments.',
    blurbIt: 'Aggregazione di notizie, trasmissioni in diretta e strumenti finanziari.',
    endpoints: [
      {
        path: '/api/news',
        method: 'GET',
        summary: 'Aggregated OSINT news items.',
        summaryIt: 'Notizie OSINT aggregate.',
        returns: ['news', 'total', 'timestamp'],
      },
      {
        path: '/api/live-news',
        method: 'GET',
        summary: '24/7 broadcast streams grouped by category.',
        summaryIt: 'Trasmissioni in diretta 24/7 raggruppate per categoria.',
        returns: ['feeds', 'categories', 'total', 'timestamp'],
      },
      {
        path: '/api/markets',
        method: 'GET',
        summary: 'Defence-sector equities and commodities.',
        summaryIt: 'Titoli azionari del settore difesa e materie prime.',
        returns: ['stocks', 'timestamp'],
      },
      {
        path: '/api/crypto',
        method: 'GET',
        summary: 'Spot prices for the assets shown in the status ticker.',
        summaryIt: 'Prezzi spot degli asset mostrati nel ticker della barra di stato.',
        returns: ['…price series'],
      },
      {
        path: '/api/scm-suppliers',
        method: 'GET',
        summary: 'Supply-chain suppliers with criticality flags.',
        summaryIt: 'Fornitori della supply chain con indicatori di criticità.',
        returns: ['suppliers', 'total', 'critical_count', 'timestamp'],
      },
    ],
  },
  {
    id: 'surveillance',
    title: 'Surveillance & Infrastructure',
    titleIt: 'Sorveglianza e infrastrutture',
    blurb: 'Camera networks, fixed infrastructure, maritime traffic, and tile/stream proxies.',
    blurbIt: 'Reti di telecamere, infrastrutture fisse, traffico marittimo e proxy per tile e stream.',
    endpoints: [
      {
        path: '/api/cctv',
        method: 'GET',
        summary: 'Public camera networks, optionally filtered by region or radius.',
        summaryIt: 'Reti di telecamere pubbliche, filtrabili per regione o per raggio.',
        params: [
          { name: 'region', desc: 'Restrict to a named provider region.', descIt: 'Limita a una regione del provider indicata per nome.', example: 'london' },
          { name: 'lat', desc: 'Latitude for a radius search.', descIt: 'Latitudine per la ricerca per raggio.', example: '51.5072' },
          { name: 'lng', desc: 'Longitude for a radius search.', descIt: 'Longitudine per la ricerca per raggio.', example: '-0.1276' },
          { name: 'radius', desc: 'Radius in kilometres. Requires `lat` and `lng`.', descIt: 'Raggio in chilometri. Richiede `lat` e `lng`.', example: '25' },
        ],
        returns: ['cameras', 'regions', 'total', 'timestamp'],
      },
      {
        path: '/api/cctv/stream-status',
        method: 'GET',
        summary: 'Probes whether a camera stream is reachable before the player commits to it.',
        summaryIt: 'Verifica se lo stream di una telecamera è raggiungibile prima che il player lo carichi.',
        params: [{ name: 'url', required: true, desc: 'Stream URL to probe.', descIt: 'URL dello stream da verificare.' }],
        returns: ['available', 'blocked', 'provider', 'reason'],
        notes: '`blocked` distinguishes an upstream refusing our origin from a stream that is simply offline.',
        notesIt: '`blocked` distingue un upstream che rifiuta la nostra origin da uno stream semplicemente offline.',
      },
      {
        path: '/api/cctv/proxy',
        method: 'GET',
        summary: 'Same-origin proxy for camera streams that set restrictive CORS headers.',
        summaryIt: 'Proxy same-origin per gli stream delle telecamere che impostano header CORS restrittivi.',
        params: [{ name: 'url', required: true, desc: 'Upstream stream URL.', descIt: 'URL dello stream upstream.' }],
        returns: ['domain', 'failed', 'error'],
        notes: 'Allow-listed by domain. Not a general-purpose open proxy.',
        notesIt: 'Consentito solo per i domini in allowlist. Non è un open proxy di uso generale.',
      },
      {
        path: '/api/infrastructure',
        method: 'GET',
        summary: 'Fixed strategic infrastructure — nuclear sites, plants, and facilities.',
        summaryIt: 'Infrastrutture strategiche fisse: siti nucleari, centrali e impianti.',
        returns: ['infrastructure', 'total', 'timestamp'],
      },
      {
        path: '/api/maritime',
        method: 'GET',
        summary: 'Ports, chokepoints, and vessel positions.',
        summaryIt: 'Porti, colli di bottiglia marittimi e posizioni delle navi.',
        returns: ['ports', 'chokepoints', 'ships', 'total_ports', 'total_chokepoints', 'total_ships', 'timestamp'],
        env: ['AIS_API_KEY'],
      },
      {
        path: '/api/arcgis',
        method: 'GET',
        summary: 'Queries a configured ArcGIS feature service.',
        summaryIt: 'Interroga un feature service ArcGIS configurato.',
        params: [
          { name: 'service', desc: 'Service identifier to query.', descIt: 'Identificativo del servizio da interrogare.' },
          { name: 'q', desc: 'Attribute query string.', descIt: 'Query sugli attributi.' },
          { name: 'bbox', desc: 'Bounding box filter, `minLng,minLat,maxLng,maxLat`.', descIt: 'Filtro bounding box, `minLng,minLat,maxLng,maxLat`.' },
        ],
        returns: ['…feature collection'],
      },
      {
        path: '/api/proxy-tiles',
        method: 'GET',
        summary: 'Same-origin raster tile proxy for basemaps that block cross-origin reads.',
        summaryIt: 'Proxy same-origin per tile raster, per le basemap che bloccano le letture cross-origin.',
        params: [{ name: 'url', required: true, desc: 'Upstream tile URL.', descIt: 'URL della tile upstream.' }],
        returns: ['…binary tile'],
      },
      {
        path: '/api/geo',
        method: 'GET',
        summary: 'Geolocates the calling client by IP.',
        summaryIt: 'Geolocalizza il client chiamante tramite IP.',
        returns: ['status', 'query', 'city', 'regionName', 'country', 'lat', 'lon', 'isp', 'org'],
      },
    ],
  },
  {
    id: 'cyber',
    title: 'Cyber Threat',
    titleIt: 'Minacce cyber',
    blurb: 'Vulnerability, attack, and malware telemetry.',
    blurbIt: 'Telemetria su vulnerabilità, attacchi e malware.',
    endpoints: [
      {
        path: '/api/cyber-threats',
        method: 'GET',
        summary: 'Recent CVE disclosures with rollup statistics.',
        summaryIt: 'CVE pubblicate di recente, con statistiche aggregate.',
        returns: ['threats', 'stats'],
      },
      {
        path: '/api/cyber-attacks',
        method: 'GET',
        summary: 'Observed attack events for the live threat map.',
        summaryIt: 'Attacchi osservati per la mappa delle minacce in tempo reale.',
        returns: ['attacks', 'total'],
      },
      {
        path: '/api/malware',
        method: 'GET',
        summary: 'Live malware hosts from abuse.ch URLhaus, geolocated per address.',
        summaryIt: 'Host malware attivi da abuse.ch URLhaus, geolocalizzati per indirizzo.',
        returns: ['threats', 'total', 'cursor', 'last_poll', 'stream', 'source', 'timestamp'],
      },
      {
        path: '/api/malware/stream',
        method: 'GET',
        summary:
          'Server-sent events for the malware layer: a snapshot on connect, then new detections as URLhaus reports them.',
        summaryIt:
          'Server-Sent Events per il layer malware: uno snapshot alla connessione, poi le nuove rilevazioni man mano che URLhaus le segnala.',
        returns: ['snapshot', 'detections', 'status', 'heartbeat'],
      },
    ],
  },
  {
    id: 'osint',
    title: 'OSINT Toolkit',
    titleIt: 'Toolkit OSINT',
    blurb:
      'The lookup tools behind the RECON panel. Every route takes a single subject and returns a normalised result, so they compose well in scripts.',
    blurbIt:
      'Gli strumenti di lookup dietro il pannello RECON. Ogni route accetta un singolo soggetto e restituisce un risultato normalizzato, quindi si combinano bene negli script.',
    endpoints: [
      {
        path: '/api/osint/dns',
        method: 'GET',
        summary: 'Resolves A, AAAA, MX, NS, TXT, and SOA records.',
        summaryIt: 'Risolve i record A, AAAA, MX, NS, TXT e SOA.',
        params: [{ name: 'domain', required: true, desc: 'Domain to resolve.', descIt: 'Dominio da risolvere.', example: 'example.com' }],
        returns: ['…record sets'],
      },
      {
        path: '/api/osint/whois',
        method: 'GET',
        summary: 'Registration and registrar detail for a domain.',
        summaryIt: 'Dati di registrazione e registrar di un dominio.',
        params: [{ name: 'domain', required: true, desc: 'Domain to look up.', descIt: 'Dominio da cercare.', example: 'example.com' }],
        returns: ['…registration record'],
      },
      {
        path: '/api/osint/certs',
        method: 'GET',
        summary: 'Certificate transparency search — an effective passive subdomain enumerator.',
        summaryIt: 'Ricerca nei log di Certificate Transparency: un metodo efficace per enumerare passivamente i sottodomini.',
        params: [{ name: 'domain', required: true, desc: 'Apex domain to search.', descIt: 'Dominio apex da cercare.', example: 'example.com' }],
        returns: ['certificates', 'subdomains', 'total_certs', 'unique_subdomains', 'timestamp'],
      },
      {
        path: '/api/osint/ip',
        method: 'GET',
        summary: 'Geolocation, ASN, and network ownership for an address.',
        summaryIt: 'Geolocalizzazione, ASN e proprietario della rete di un indirizzo.',
        params: [{ name: 'ip', required: true, desc: 'IPv4 or IPv6 address.', descIt: 'Indirizzo IPv4 o IPv6.', example: '8.8.8.8' }],
        returns: ['…address record'],
      },
      {
        path: '/api/osint/shodan',
        method: 'GET',
        summary: 'Exposed services, banners, and known vulnerabilities for a host.',
        summaryIt: 'Servizi esposti, banner e vulnerabilità note di un host.',
        params: [{ name: 'ip', required: true, desc: 'Address to query.', descIt: 'Indirizzo da interrogare.', example: '8.8.8.8' }],
        returns: ['status', 'ports', 'hostnames', 'cpes', 'vulns', 'tags', 'detail'],
      },
      {
        path: '/api/osint/bgp',
        method: 'GET',
        summary: 'ASN, prefix, and peering relationships.',
        summaryIt: 'ASN, prefissi e relazioni di peering.',
        params: [{ name: 'query', required: true, desc: 'ASN, prefix, or IP.', descIt: 'ASN, prefisso o IP.', example: 'AS15169' }],
        returns: ['…routing record'],
      },
      {
        path: '/api/osint/mac',
        method: 'GET',
        summary: 'Resolves a MAC address or OUI prefix to its hardware vendor.',
        summaryIt: 'Risale dal MAC address o dal prefisso OUI al produttore dell’hardware.',
        params: [{ name: 'mac', required: true, desc: 'MAC address or OUI prefix.', descIt: 'MAC address o prefisso OUI.', example: '00:1A:2B:3C:4D:5E' }],
        returns: ['mac', 'prefix', 'vendor', 'address', 'detail'],
      },
      {
        path: '/api/osint/phone',
        method: 'GET',
        summary: 'Validates and classifies a phone number in E.164 form.',
        summaryIt: 'Valida e classifica un numero di telefono in formato E.164.',
        params: [{ name: 'number', required: true, desc: 'Number in international format.', descIt: 'Numero in formato internazionale.', example: '+442071234567' }],
        returns: [
          'valid',
          'number',
          'country_code',
          'region',
          'line_type',
          'national',
          'international',
          'lat',
          'query',
        ],
      },
      {
        path: '/api/osint/github',
        method: 'GET',
        summary: 'Public profile metadata for a GitHub account.',
        summaryIt: 'Metadati del profilo pubblico di un account GitHub.',
        params: [{ name: 'user', required: true, desc: 'GitHub username.', descIt: 'Username GitHub.', example: 'torvalds' }],
        returns: ['username', 'name', 'bio', 'company', 'location', 'blog', 'email', 'twitter', 'public_repos'],
      },
      {
        path: '/api/osint/leaks',
        method: 'GET',
        summary: 'Checks an address against known breach corpora.',
        summaryIt: 'Verifica se un indirizzo compare in data breach noti.',
        params: [{ name: 'email', required: true, desc: 'Email address to check.', descIt: 'Indirizzo email da verificare.' }],
        returns: ['breached', 'breaches', 'data_exposed', 'detail'],
      },
      {
        path: '/api/osint/hudsonrock',
        method: 'GET',
        summary: 'Reports whether an asset appears in Hudson Rock\'s infostealer corpus — machines compromised by credential-stealing malware.',
        summaryIt: 'Indica se un asset compare nel database infostealer di Hudson Rock, cioè macchine compromesse da malware che rubano credenziali.',
        params: [
          { name: 'query', required: true, desc: 'Email, domain, username or phone number.', descIt: 'Email, dominio, username o numero di telefono.', example: 'tesla.com' },
          { name: 'type', required: false, desc: 'Pins the asset type instead of inferring it: email, domain, username or phone.', descIt: 'Forza il tipo di asset invece di dedurlo: email, domain, username o phone.', example: 'domain' },
        ],
        returns: ['query', 'type', 'compromised', 'stealers', 'total_corporate_services', 'total_user_services', 'totalStealers', 'employees', 'users'],
      },
      {
        path: '/api/osint/cve',
        method: 'GET',
        summary: 'Full NVD record for a single CVE identifier.',
        summaryIt: 'Record NVD completo per un singolo identificativo CVE.',
        params: [{ name: 'cve', required: true, desc: 'CVE ID.', descIt: 'ID della CVE.', example: 'CVE-2021-44228' }],
        returns: ['id', 'description', 'cvss', 'cvss_vector', 'severity', 'published', 'references', 'source'],
      },
      {
        path: '/api/osint/sanctions',
        method: 'GET',
        summary: 'Searches the OpenSanctions mirror of the US OFAC SDN list.',
        summaryIt: 'Cerca nel mirror OpenSanctions della lista SDN dell’OFAC statunitense.',
        params: [
          { name: 'query', required: true, desc: 'Name of a person, organisation, or vessel.', descIt: 'Nome di una persona, organizzazione o nave.' },
          { name: 'schema', desc: 'Entity type filter.', descIt: 'Filtro per tipo di entità.', example: 'Person | Organization | Vessel' },
          { name: 'limit', desc: 'Maximum results to return.', descIt: 'Numero massimo di risultati.', example: '10' },
        ],
        returns: ['schema', 'total', 'source', 'timestamp'],
      },
      {
        path: '/api/osint/threats',
        method: 'GET',
        summary: 'Reputation and threat-intel enrichment for an indicator.',
        summaryIt: 'Arricchimento di reputazione e threat intelligence per un indicatore.',
        params: [{ name: 'query', required: true, desc: 'IP, domain, or file hash.', descIt: 'IP, dominio o hash di un file.' }],
        returns: ['…enrichment record'],
      },
      {
        path: '/api/osint/sweep',
        method: 'GET',
        summary: 'Sweeps a single address or a CIDR range for reachable hosts.',
        summaryIt: 'Scansiona un singolo indirizzo o un range CIDR alla ricerca di host raggiungibili.',
        params: [
          { name: 'ip', desc: 'Single address to sweep.', descIt: 'Singolo indirizzo da scansionare.' },
          { name: 'cidr', desc: 'CIDR range to sweep. Use instead of `ip`.', descIt: 'Range CIDR da scansionare. In alternativa a `ip`.', example: '192.0.2.0/24' },
        ],
        returns: ['target_ip', '…sweep results'],
        notes: 'Only sweep ranges you are authorised to test.',
        notesIt: 'Scansiona solo range che sei autorizzato a testare.',
      },
    ],
  },
  {
    id: 'recon',
    title: 'Recon Scanner',
    titleIt: 'Scanner Recon',
    blurb: 'Active scanning, delegated to a separate backend so the web tier never runs scans itself.',
    blurbIt: 'Scansione attiva, delegata a un backend separato: il livello web non esegue mai scansioni direttamente.',
    endpoints: [
      {
        path: '/api/scanner',
        method: 'GET',
        summary: 'Runs a scan against a target via the MinervaAI scanner backend.',
        summaryIt: 'Esegue una scansione su un target tramite il backend scanner di MinervaAI.',
        params: [
          {
            name: 'type',
            required: true,
            desc: 'Scan type.',
            descIt: 'Tipo di scansione.',
            example: 'quick | ssl | headers | rdns | subdomains | tech | whois | geoloc | vuln',
          },
          { name: 'target', required: true, desc: 'Host, domain, or address to scan.', descIt: 'Host, dominio o indirizzo da scansionare.' },
        ],
        returns: ['detail', 'hint', 'failed', 'error'],
        env: ['SCANNER_URL', 'SCANNER_KEY'],
        notes:
          'Returns 503 when `SCANNER_URL` / `SCANNER_KEY` are unset — that is the supported way to disable RECON. `SCANNER_KEY` must equal the backend’s `OSIRIS_KEY`.',
        notesIt:
          'Restituisce 503 quando `SCANNER_URL` / `SCANNER_KEY` non sono impostate: è il modo previsto per disattivare RECON. `SCANNER_KEY` deve coincidere con `OSIRIS_KEY` del backend.',
      },
    ],
  },
  {
    id: 'graph',
    title: 'Entity Graph',
    titleIt: 'Grafo delle entità',
    blurb: 'Link analysis over entities surfaced elsewhere in the platform.',
    blurbIt: 'Analisi dei collegamenti tra le entità emerse nel resto della piattaforma.',
    endpoints: [
      {
        path: '/api/entity/expand',
        method: 'GET',
        summary: 'Expands one graph node into its neighbours.',
        summaryIt: 'Espande un nodo del grafo nei suoi vicini.',
        params: [
          { name: 'id', required: true, desc: 'Entity identifier to expand.', descIt: 'Identificativo dell’entità da espandere.' },
          { name: 'type', required: true, desc: 'Entity type, which selects the expansion strategy.', descIt: 'Tipo di entità, che determina la strategia di espansione.' },
        ],
        returns: ['…nodes and edges'],
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI Analysis',
    titleIt: 'Analisi AI',
    blurb:
      'Gemini-backed correlation over feed data you supply. All three are POST, all three are rate limited to 5 requests per minute per IP.',
    blurbIt:
      'Correlazione basata su Gemini sui dati dei feed che fornisci. Tutti e tre sono POST e hanno un rate limit di 5 richieste al minuto per IP.',
    endpoints: [
      {
        path: '/api/ai/analyze',
        method: 'POST',
        summary: 'Cross-feed correlation and threat assessment over an intelligence context.',
        summaryIt: 'Correlazione tra feed e valutazione delle minacce su un contesto di intelligence.',
        returns: ['…analysis'],
        notes:
          'Body is an `IntelligenceContext`. Exceeding the limit returns 429. Feed it straight from the read endpoints — the shape matches what they return.',
        notesIt:
          'Il body è un `IntelligenceContext`. Oltre il limite restituisce 429. Puoi passargli direttamente l’output degli endpoint di lettura: la struttura coincide.',
        bodyExample: `{
  "earthquakes": [],
  "news": [],
  "threats": [],
  "cyberAlerts": [],
  "timestamp": "2026-07-29T12:00:00Z"
}`,
      },
      {
        path: '/api/ai/briefing',
        method: 'POST',
        summary: 'Structured threat briefing in the style of a daily intelligence product.',
        summaryIt: 'Briefing strutturato sulle minacce, nello stile di un bollettino di intelligence quotidiano.',
        returns: ['…briefing'],
        notes: 'Same `IntelligenceContext` body and same rate limit as `/api/ai/analyze`.',
        notesIt: 'Stesso body `IntelligenceContext` e stesso rate limit di `/api/ai/analyze`.',
        bodyExample: `{
  "earthquakes": [],
  "news": [],
  "threats": [],
  "cyberAlerts": [],
  "timestamp": "2026-07-29T12:00:00Z"
}`,
      },
      {
        path: '/api/ai/overview',
        method: 'POST',
        summary: 'Short headline highlights for the overview panel.',
        summaryIt: 'Brevi punti salienti per il pannello di panoramica.',
        returns: ['highlights', 'generatedAt'],
        bodyExample: `{
  "earthquakes": [],
  "news": [],
  "threats": [],
  "cyberAlerts": [],
  "timestamp": "2026-07-29T12:00:00Z"
}`,
      },
    ],
  },
  {
    id: 'sdk',
    title: 'Polybolos SDK',
    titleIt: 'SDK Polybolos',
    blurb:
      'Push entities from an external platform into the Common Operating Picture, and stream the merged picture back out.',
    blurbIt:
      'Invia entità da una piattaforma esterna al Common Operating Picture e ricevi in streaming il quadro unificato.',
    endpoints: [
      {
        path: '/api/sdk/ingest',
        method: 'POST',
        summary: 'Accepts Polybolos-format entities from an external system and merges them into the map.',
        summaryIt: 'Accetta entità in formato Polybolos da un sistema esterno e le integra nella mappa.',
        returns: ['accepted', 'rejected', 'errors', 'timestamp'],
        env: ['SDK_INGEST_KEY'],
        requiresAuth: true,
        notes:
          'Each entity needs `id`, `position.lat`, and `position.lng`; everything else is defaulted. Stored ids are namespaced to `ext-{source}-{id}`, so two platforms can push the same id safely. Fails closed: 503 when `SDK_INGEST_KEY` is unset, 401 on key mismatch, 400 on a malformed payload.',
        notesIt:
          'Ogni entità richiede `id`, `position.lat` e `position.lng`; tutto il resto ha un valore di default. Gli id salvati hanno il namespace `ext-{source}-{id}`, quindi due piattaforme possono inviare lo stesso id senza conflitti. Fail closed: 503 se `SDK_INGEST_KEY` non è impostata, 401 se la chiave non corrisponde, 400 con un payload non valido.',
        bodyExample: `{
  "source": "lattice",
  "apiKey": "$SDK_INGEST_KEY",
  "entities": [
    {
      "id": "TRK-4471",
      "name": "UNKNOWN SURFACE CONTACT",
      "domain": "SEA",
      "entityType": "TRACK",
      "position": { "lat": 36.14, "lng": -5.35, "heading": 271, "speed": 14.2 },
      "threat": "UNKNOWN",
      "classification": "UNCLASSIFIED",
      "confidence": 0.86
    }
  ]
}`,
      },
      {
        path: '/api/sdk/ingest',
        method: 'GET',
        summary: 'Reports how many external entities are currently held, plus recent ingest history.',
        summaryIt: 'Indica quante entità esterne sono attualmente in memoria, insieme alla cronologia recente degli ingest.',
        returns: ['sdk', 'version', 'entityCount', 'recentIngestions', 'timestamp'],
      },
      {
        path: '/api/sdk/stream',
        method: 'GET',
        summary: 'Server-Sent Events stream of normalised entities as they arrive.',
        summaryIt: 'Stream Server-Sent Events delle entità normalizzate, man mano che arrivano.',
        returns: ['…SSE event stream'],
        notes:
          'Opens with a `status` event carrying `connected`, `entityCount`, `feedCount`, `latticeStatus`, and `lastUpdate`. Consume with `EventSource`, not `fetch`.',
        notesIt:
          'Si apre con un evento `status` che contiene `connected`, `entityCount`, `feedCount`, `latticeStatus` e `lastUpdate`. Va consumato con `EventSource`, non con `fetch`.',
      },
    ],
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    titleIt: 'Webhook',
    blurb: 'Inbound hooks from external services.',
    blurbIt: 'Hook in ingresso da servizi esterni.',
    endpoints: [
      {
        path: '/api/github-webhook',
        method: 'POST',
        summary: 'Receives GitHub repository events.',
        summaryIt: 'Riceve gli eventi di un repository GitHub.',
        returns: ['success', 'message', 'error'],
        requiresAuth: true,
        notes: 'Signature-verified. Unsigned or mismatched deliveries are rejected with 401.',
        notesIt: 'Con verifica della firma. Le consegne non firmate o con firma non valida vengono rifiutate con 401.',
      },
    ],
  },
];

/** Total endpoint count, derived rather than hard-coded so it cannot drift. */
export const ENDPOINT_COUNT = API_GROUPS.reduce((n, g) => n + g.endpoints.length, 0);
