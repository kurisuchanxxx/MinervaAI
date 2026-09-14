'use client';

import { useState, useCallback, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LocateFixed,
  Search, Radar, Globe, Shield, FileText, Radio,
  ChevronDown, ChevronUp, Loader2, AlertTriangle, Server,
  Wifi, Lock, MapPin, Bug, Code, Layers, Network, Fingerprint,
  CheckCircle, XCircle, Clock, ExternalLink, Crosshair,
  Maximize2, Minimize2, Gavel, Bitcoin, Phone, Terminal, ShieldAlert, User, Skull, Monitor, KeyRound
} from 'lucide-react';
import { ipToNumber, numberToIp, calculateSubnetStart, classifyDevice, assessRisk, batchFetch, ShodanInternetDBResponse, SweepDevice } from '@/lib/osint-utils';
import ChainBrief from '@/components/ChainBrief';
import { defineMessages, useT, useLang, localeOf } from '@/lib/i18n';

const MESSAGES = defineMessages({
  en: {
    // groups
    grpNetwork: 'NETWORK & HOST', grpNetworkHint: 'IPs, ports, routing, hardware',
    grpDomain: 'DOMAIN & WEB', grpDomainHint: 'DNS, certificates, site fingerprinting',
    grpIdentity: 'IDENTITY', grpIdentityHint: 'People, handles, accounts',
    grpThreat: 'THREAT & EXPOSURE', grpThreatHint: 'Reputation and breach data',
    grpChain: 'BLOCKCHAIN', grpChainHint: 'Wallets and on-chain incidents',
    // tool labels
    tabScanner: 'PORT SCAN', tabVuln: 'VULN SWEEP', tabShodan: 'SHODAN IOT', tabBgp: 'BGP ROUTE',
    tabMac: 'MAC ADDR', tabSweep: 'IP SWEEP', tabDns: 'DNS', tabWhois: 'WHOIS', tabCerts: 'CERTS',
    tabSsl: 'SSL/TLS', tabSubdomains: 'SUBDOMAINS', tabHeaders: 'HEADERS', tabTech: 'TECH DETECT',
    tabUsername: 'USERNAME', tabGithub: 'GITHUB RECON', tabPhone: 'PHONE INTEL', tabThreats: 'THREATS',
    tabLeaks: 'DATA LEAKS', tabInfostealer: 'INFOSTEALER', tabCrypto: 'CHAIN INTEL',
    // tool blurbs
    blurbScanner: 'Open ports and running services',
    blurbVuln: 'Known CVEs affecting the host',
    blurbShodan: 'Internet-exposed device record',
    blurbBgp: 'Autonomous system and prefixes',
    blurbMac: 'Hardware vendor lookup',
    blurbSweep: 'Scan an entire subnet',
    blurbDns: 'All record types',
    blurbWhois: 'Registrar and ownership',
    blurbCerts: 'Certificate transparency log',
    blurbSsl: 'Cipher and certificate health',
    blurbSubdomains: 'Enumerate attack surface',
    blurbHeaders: 'Security headers audit',
    blurbTech: 'Frameworks and stack',
    blurbUsername: 'Hunt a handle across platforms',
    blurbGithub: 'Profile, repos and contacts',
    blurbPhone: 'Carrier, region and line type',
    blurbThreats: 'Reputation across feeds',
    blurbLeaks: 'Breach exposure for an address',
    blurbInfostealer: 'Hudson Rock malware-compromised assets',
    blurbCrypto: 'Wallet forensics and daily brief',
    // placeholders
    phIpOrHost: 'IP or hostname',
    phIp: 'IP address',
    phIpOrAsn: 'IP or ASN',
    phMac: 'MAC address',
    phSweep: 'Enter IP address (e.g. 8.8.8.8)',
    phDomain: 'Domain name',
    phDomainEnum: 'Domain to enumerate',
    phUrlInspect: 'URL to inspect',
    phUrlFingerprint: 'URL to fingerprint',
    phUsername: 'Username / handle to hunt',
    phGithub: 'GitHub username',
    phPhone: 'Phone number (e.g. +1...)',
    phThreat: 'IP, domain, or hash',
    phEmail: 'Email address',
    phInfostealer: 'Email, domain, username or phone',
    phWallet: 'BTC, ETH or SOL wallet address',
    // errors
    errIpLocation: 'Could not retrieve your IP location.',
    errNetworkDetail: 'Network error: {msg}',
    errSweepFailed: 'Sweep failed ({status})',
    errLookupFailed: 'Lookup failed',
    errNetwork: 'Network error',
    shodanNoRecords: 'No Shodan InternetDB records found',
    // row labels
    lblTarget: 'Target', lblScanType: 'Scan Type', lblDuration: 'Duration', lblTotalCves: 'Total CVEs',
    lblRiskLevel: 'Risk Level', lblDomain: 'Domain', lblARecords: 'A Records', lblRegistrar: 'Registrar',
    lblCreated: 'Created', lblExpires: 'Expires', lblUpdated: 'Updated', lblStatus: 'Status',
    lblNameservers: 'Nameservers', lblTargetIp: 'Target IP', lblHostnames: 'Hostnames', lblOpenPorts: 'Open Ports',
    lblTags: 'Tags', lblQuery: 'Query', lblPrefix: 'Prefix', lblCountry: 'Country', lblDescription: 'Description',
    lblName: 'Name', lblPrefixes: 'Prefixes', lblPeers: 'Peers', lblMacAddress: 'MAC Address', lblVendor: 'Vendor',
    lblValid: 'Valid', lblE164: 'E.164 Format', lblIntl: 'Intl Format', lblNat: 'Nat Format', lblLineType: 'Line Type',
    lblCompany: 'Company', lblLocation: 'Location', lblEmail: 'Email', lblWebsite: 'Website', lblBio: 'Bio',
    lblHandle: 'Handle', lblCoverage: 'Coverage', lblElapsed: 'Elapsed', lblAddress: 'Address', lblBalance: 'Balance',
    lblValueUsd: 'Value (USD)', lblSpotPrice: 'Spot price', lblTransactions: 'Transactions', lblLastActive: 'Last active',
    lblAge: 'Age', lblNote: 'Note', lblTotalIn: 'Total in', lblTotalOut: 'Total out', lblNet: 'Net',
    lblEmailTarget: 'Email Target', lblLastEmployee: 'Last employee', lblLastUser: 'Last user', lblExposedUrls: 'Exposed URLs',
    lblMachines: 'Machines', lblCorpSvcs: 'Corporate svcs', lblUserSvcs: 'User svcs', lblCompromised: 'Compromised',
    lblStealer: 'Stealer', lblMalwarePath: 'Malware path', lblCertificates: 'Certificates', lblIssuer: 'Issuer',
    lblCommonName: 'Common Name', lblNotBefore: 'Not Before', lblNotAfter: 'Not After', lblRiskScore: 'Risk Score',
    lblMalicious: 'Malicious', lblCategory: 'Category', lblReports: 'Reports', lblLastSeen: 'Last Seen',
    lblProtocol: 'Protocol', lblCipher: 'Cipher', lblSubject: 'Subject', lblSans: 'SANs',
    // values
    yes: 'YES', no: 'NO', unknown: 'Unknown', unknownLower: 'unknown', unknownUpper: 'UNKNOWN',
    // headings & misc
    sanctioned: 'SANCTIONED — {source}',
    hudsonCredit: 'Data by Hudson Rock Cavalier · free infostealer intelligence',
    hChainBrief: 'CHAIN INTEL — DAILY BRIEF',
    hHostInfo: 'HOST INFO',
    hOpenPorts: 'OPEN PORTS ({n})',
    hVulnAssessment: 'VULNERABILITY ASSESSMENT',
    hPossibleExploits: 'POSSIBLE EXPLOITS ({n})',
    badgeExploit: 'EXPLOIT',
    sourceValue: 'Source: {src}',
    hDnsRecords: 'DNS RECORDS',
    hWhois: 'WHOIS INTELLIGENCE',
    hShodan: 'SHODAN IOT INTELLIGENCE',
    hVulnerabilities: 'VULNERABILITIES ({n})',
    moreCount: '+{n} more',
    hBgp: 'BGP ROUTING INTELLIGENCE',
    hMac: 'MAC VENDOR LOOKUP',
    hPhone: 'PHONE INTELLIGENCE',
    hGithub: 'GITHUB RECON',
    followers: '{n} followers',
    hRecentRepos: 'RECENT REPOS',
    hUsernameHunt: 'USERNAME HUNT',
    statFound: 'FOUND', statUnsure: 'UNSURE', statBlocked: 'BLOCKED', statChecked: 'CHECKED',
    coverageValue: '{checked} of {total} sites · {ruled} ruled out',
    hConfirmed: 'CONFIRMED ACCOUNTS ({n})',
    hUnverifiable: 'UNVERIFIABLE ({n})',
    unverifiableHelp: 'These sites answered "exists" for a random control handle too, so a hit here is not evidence of an account.',
    hBlocked: 'BLOCKED — NOT CHECKED ({n})',
    blockedHelp: 'These sites refused the lookup, so nothing was learned either way — an account here is neither confirmed nor ruled out.',
    checkManually: 'check manually',
    hUnreachable: 'UNREACHABLE ({n})',
    hNotApplicable: 'NOT APPLICABLE ({n})',
    notApplicableHelp: "{sites} — the handle does not meet these sites' username rules.",
    calibratedNote: 'Every positive re-tested against a random control handle; sites that accepted it are listed as unverifiable. Calibration catches most soft 404s but is not exhaustive — confirm before acting.',
    uncalibratedNote: 'Calibration disabled — positives are unfiltered and include soft 404s.',
    hChainIntel: 'CHAIN INTEL',
    ofacSanctionedWallet: 'OFAC SANCTIONED WALLET',
    riskBadge: 'RISK {score} · {level}',
    priceUnavailable: 'price unavailable',
    lastActiveValue: '{date} ({n}d ago)',
    ageDays: '{n} days',
    ageUnknown: 'unknown — history exceeds sample',
    ambiguousChain: 'Address format is valid on both Bitcoin and Solana; assumed Bitcoin.',
    hFlow: 'FLOW',
    hRiskFactors: 'RISK FACTORS',
    hTopCounterparties: 'TOP COUNTERPARTIES ({n})',
    dirIn: 'IN', dirOut: 'OUT', dirBoth: 'BOTH',
    hTokens: 'TOKENS ({n})',
    hRecentTx: 'RECENT TRANSACTIONS ({n})',
    pending: 'pending',
    fail: 'FAIL',
    coverageLimits: 'COVERAGE LIMITS',
    sourcesValue: 'Sources: {list}',
    sampledFull: ' · sampled {n} tx (full history)',
    sampledPartial: ' · sampled {n} tx of a longer history',
    hDataLeak: 'DATA LEAK SWEEP',
    compromised: 'COMPROMISED',
    secure: 'SECURE',
    hExposedData: 'EXPOSED DATA POINTS',
    hKnownBreaches: 'KNOWN BREACHES ({n})',
    typeEmail: 'EMAIL ADDRESS', typeDomain: 'DOMAIN', typeUsername: 'USERNAME', typePhone: 'PHONE NUMBER', typeTarget: 'TARGET',
    hInfostealer: 'INFOSTEALER EXPOSURE',
    compromisedMachinesFound: 'COMPROMISED MACHINES FOUND',
    noRecords: 'NO RECORDS',
    statEmployees: 'Employees', statUsers: 'Users', statThirdParties: 'Third parties', statTotalMachines: 'Total machines',
    hPasswordStrength: 'EMPLOYEE PASSWORD STRENGTH ({n})',
    passwordSummary: '{weak}% weak or worse · {strong}% strong',
    hStealerFamilies: 'STEALER FAMILIES',
    hTopThirdParty: 'TOP THIRD-PARTY DOMAINS ({n})',
    notFoundInCorpus: 'NOT FOUND IN CORPUS',
    unknownMachine: 'UNKNOWN MACHINE',
    credentialsRedacted: 'Credentials (redacted by Hudson Rock)',
    hCertTransparency: 'CERTIFICATE TRANSPARENCY',
    hThreatIntel: 'THREAT INTELLIGENCE',
    hSsl: 'SSL/TLS ANALYSIS',
    // toolkit chrome
    filterTools: 'Filter tools…',
    noToolMatches: 'No tool matches “{q}”.',
    tracking: 'TRACKING…',
    selfTrack: 'SELF TRACK',
    globalSweep: 'GLOBAL SWEEP',
    dailyBrief: 'DAILY BRIEF',
    walletForensics: 'WALLET FORENSICS',
    scan: 'SCAN',
    quickScan: 'QUICK SCAN', deepScan: 'DEEP SCAN', top1000: 'TOP 1000 PORTS',
    subnetMask: 'SUBNET MASK:',
    sweepingSubnet: 'SWEEPING SUBNET...',
    hostsCount: '{n} hosts',
    devicesFound: 'DEVICES FOUND',
    visualizeOnGlobe: 'VISUALIZE ON GLOBE',
    cvesCount: '{n} CVEs',
    portsList: 'Ports: {list}',
    identifiedVulns: 'Identified Vulnerabilities',
    noReverseDns: 'No reverse DNS',
    fetchingVulnIntel: 'Fetching vulnerability intelligence...',
    weakness: 'Weakness: {cwe}',
    sweptSummary: 'SWEPT {hosts} HOSTS IN {secs}s · ASN {asn}',
    resultsTitle: '{tool} RESULTS',
    recentScans: 'RECENT SCANS',
    modulesCount: '{n} MODULES',
    exitExpanded: 'Exit expanded view (Esc)',
    toolsCount: '{n} TOOLS',
    fullScreen: 'Full Screen',
  },
  it: {
    // groups
    grpNetwork: 'RETE E HOST', grpNetworkHint: 'IP, porte, routing, hardware',
    grpDomain: 'DOMINIO E WEB', grpDomainHint: 'DNS, certificati, fingerprinting dei siti',
    grpIdentity: 'IDENTITÀ', grpIdentityHint: 'Persone, handle, account',
    grpThreat: 'MINACCE ED ESPOSIZIONE', grpThreatHint: 'Reputazione e dati di breach',
    grpChain: 'BLOCKCHAIN', grpChainHint: 'Wallet e incidenti on-chain',
    // tool labels
    tabScanner: 'PORT SCAN', tabVuln: 'SCAN VULN', tabShodan: 'SHODAN IOT', tabBgp: 'ROUTE BGP',
    tabMac: 'IND. MAC', tabSweep: 'SWEEP IP', tabDns: 'DNS', tabWhois: 'WHOIS', tabCerts: 'CERTIFICATI',
    tabSsl: 'SSL/TLS', tabSubdomains: 'SOTTODOMINI', tabHeaders: 'HEADER', tabTech: 'TECNOLOGIE',
    tabUsername: 'USERNAME', tabGithub: 'GITHUB RECON', tabPhone: 'TELEFONO', tabThreats: 'MINACCE',
    tabLeaks: 'DATA LEAK', tabInfostealer: 'INFOSTEALER', tabCrypto: 'CHAIN INTEL',
    // tool blurbs
    blurbScanner: 'Porte aperte e servizi attivi',
    blurbVuln: "CVE note che interessano l'host",
    blurbShodan: 'Scheda del dispositivo esposto su Internet',
    blurbBgp: 'Autonomous system e prefissi',
    blurbMac: 'Ricerca del produttore hardware',
    blurbSweep: "Scansiona un'intera subnet",
    blurbDns: 'Tutti i tipi di record',
    blurbWhois: 'Registrar e intestatario',
    blurbCerts: 'Log di Certificate Transparency',
    blurbSsl: 'Cifratura e stato del certificato',
    blurbSubdomains: 'Enumera la superficie di attacco',
    blurbHeaders: 'Audit degli header di sicurezza',
    blurbTech: 'Framework e stack',
    blurbUsername: 'Cerca un handle su più piattaforme',
    blurbGithub: 'Profilo, repository e contatti',
    blurbPhone: 'Operatore, regione e tipo di linea',
    blurbThreats: 'Reputazione sui feed',
    blurbLeaks: 'Presenza di un indirizzo nei data breach',
    blurbInfostealer: 'Asset compromessi da malware (Hudson Rock)',
    blurbCrypto: 'Analisi forense dei wallet e brief giornaliero',
    // placeholders
    phIpOrHost: 'IP o hostname',
    phIp: 'Indirizzo IP',
    phIpOrAsn: 'IP o ASN',
    phMac: 'Indirizzo MAC',
    phSweep: 'Inserisci indirizzo IP (es. 8.8.8.8)',
    phDomain: 'Nome di dominio',
    phDomainEnum: 'Dominio da enumerare',
    phUrlInspect: 'URL da ispezionare',
    phUrlFingerprint: 'URL da analizzare',
    phUsername: 'Username / handle da cercare',
    phGithub: 'Username GitHub',
    phPhone: 'Numero di telefono (es. +39...)',
    phThreat: 'IP, dominio o hash',
    phEmail: 'Indirizzo email',
    phInfostealer: 'Email, dominio, username o telefono',
    phWallet: 'Indirizzo wallet BTC, ETH o SOL',
    // errors
    errIpLocation: 'Impossibile recuperare la posizione del tuo IP.',
    errNetworkDetail: 'Errore di rete: {msg}',
    errSweepFailed: 'Sweep non riuscito ({status})',
    errLookupFailed: 'Ricerca non riuscita',
    errNetwork: 'Errore di rete',
    shodanNoRecords: 'Nessun record trovato su Shodan InternetDB',
    // row labels
    lblTarget: 'Obiettivo', lblScanType: 'Tipo scan', lblDuration: 'Durata', lblTotalCves: 'CVE totali',
    lblRiskLevel: 'Livello rischio', lblDomain: 'Dominio', lblARecords: 'Record A', lblRegistrar: 'Registrar',
    lblCreated: 'Creato', lblExpires: 'Scadenza', lblUpdated: 'Aggiornato', lblStatus: 'Stato',
    lblNameservers: 'Nameserver', lblTargetIp: 'IP obiettivo', lblHostnames: 'Hostname', lblOpenPorts: 'Porte aperte',
    lblTags: 'Tag', lblQuery: 'Query', lblPrefix: 'Prefisso', lblCountry: 'Paese', lblDescription: 'Descrizione',
    lblName: 'Nome', lblPrefixes: 'Prefissi', lblPeers: 'Peer', lblMacAddress: 'Indirizzo MAC', lblVendor: 'Produttore',
    lblValid: 'Valido', lblE164: 'Formato E.164', lblIntl: 'Formato intern.', lblNat: 'Formato naz.', lblLineType: 'Tipo linea',
    lblCompany: 'Azienda', lblLocation: 'Località', lblEmail: 'Email', lblWebsite: 'Sito web', lblBio: 'Bio',
    lblHandle: 'Handle', lblCoverage: 'Copertura', lblElapsed: 'Tempo', lblAddress: 'Indirizzo', lblBalance: 'Saldo',
    lblValueUsd: 'Valore (USD)', lblSpotPrice: 'Prezzo spot', lblTransactions: 'Transazioni', lblLastActive: 'Ultima attività',
    lblAge: 'Età', lblNote: 'Nota', lblTotalIn: 'Totale entrate', lblTotalOut: 'Totale uscite', lblNet: 'Netto',
    lblEmailTarget: 'Email obiettivo', lblLastEmployee: 'Ultimo dipendente', lblLastUser: 'Ultimo utente', lblExposedUrls: 'URL esposti',
    lblMachines: 'Macchine', lblCorpSvcs: 'Servizi aziendali', lblUserSvcs: 'Servizi utente', lblCompromised: 'Compromissione',
    lblStealer: 'Stealer', lblMalwarePath: 'Percorso malware', lblCertificates: 'Certificati', lblIssuer: 'Emittente',
    lblCommonName: 'Common Name', lblNotBefore: 'Valido dal', lblNotAfter: 'Valido fino al', lblRiskScore: 'Punteggio rischio',
    lblMalicious: 'Malevolo', lblCategory: 'Categoria', lblReports: 'Segnalazioni', lblLastSeen: 'Ultima rilevazione',
    lblProtocol: 'Protocollo', lblCipher: 'Cifrario', lblSubject: 'Soggetto', lblSans: 'SAN',
    // values
    yes: 'SÌ', no: 'NO', unknown: 'Sconosciuto', unknownLower: 'sconosciuto', unknownUpper: 'SCONOSCIUTO',
    // headings & misc
    sanctioned: 'SANZIONATO — {source}',
    hudsonCredit: 'Dati di Hudson Rock Cavalier · intelligence infostealer gratuita',
    hChainBrief: 'CHAIN INTEL — BRIEF GIORNALIERO',
    hHostInfo: 'INFO HOST',
    hOpenPorts: 'PORTE APERTE ({n})',
    hVulnAssessment: 'VALUTAZIONE VULNERABILITÀ',
    hPossibleExploits: 'POSSIBILI EXPLOIT ({n})',
    badgeExploit: 'EXPLOIT',
    sourceValue: 'Fonte: {src}',
    hDnsRecords: 'RECORD DNS',
    hWhois: 'INTELLIGENCE WHOIS',
    hShodan: 'INTELLIGENCE SHODAN IOT',
    hVulnerabilities: 'VULNERABILITÀ ({n})',
    moreCount: '+{n} altre',
    hBgp: 'INTELLIGENCE ROUTING BGP',
    hMac: 'RICERCA PRODUTTORE MAC',
    hPhone: 'INTELLIGENCE TELEFONICA',
    hGithub: 'GITHUB RECON',
    followers: '{n} follower',
    hRecentRepos: 'REPOSITORY RECENTI',
    hUsernameHunt: 'RICERCA USERNAME',
    statFound: 'TROVATI', statUnsure: 'INCERTI', statBlocked: 'BLOCCATI', statChecked: 'VERIFICATI',
    coverageValue: '{checked} di {total} siti · {ruled} esclusi',
    hConfirmed: 'ACCOUNT CONFERMATI ({n})',
    hUnverifiable: 'NON VERIFICABILI ({n})',
    unverifiableHelp: "Questi siti hanno risposto \"esiste\" anche per un handle di controllo casuale, quindi un riscontro qui non prova l'esistenza di un account.",
    hBlocked: 'BLOCCATI — NON VERIFICATI ({n})',
    blockedHelp: 'Questi siti hanno rifiutato la ricerca, quindi non è emerso nulla — un account qui non è né confermato né escluso.',
    checkManually: 'verifica manualmente',
    hUnreachable: 'NON RAGGIUNGIBILI ({n})',
    hNotApplicable: 'NON APPLICABILI ({n})',
    notApplicableHelp: "{sites} — l'handle non rispetta le regole sugli username di questi siti.",
    calibratedNote: 'Ogni positivo è stato ritestato con un handle di controllo casuale; i siti che lo hanno accettato sono elencati come non verificabili. La calibrazione intercetta la maggior parte dei soft 404 ma non è esaustiva — verifica prima di agire.',
    uncalibratedNote: 'Calibrazione disattivata — i positivi non sono filtrati e includono soft 404.',
    hChainIntel: 'CHAIN INTEL',
    ofacSanctionedWallet: 'WALLET SANZIONATO OFAC',
    riskBadge: 'RISCHIO {score} · {level}',
    priceUnavailable: 'prezzo non disponibile',
    lastActiveValue: '{date} ({n}g fa)',
    ageDays: '{n} giorni',
    ageUnknown: 'sconosciuta — lo storico supera il campione',
    ambiguousChain: 'Formato indirizzo valido sia su Bitcoin sia su Solana; assunto Bitcoin.',
    hFlow: 'FLUSSI',
    hRiskFactors: 'FATTORI DI RISCHIO',
    hTopCounterparties: 'PRINCIPALI CONTROPARTI ({n})',
    dirIn: 'ENTR', dirOut: 'USC', dirBoth: 'E/U',
    hTokens: 'TOKEN ({n})',
    hRecentTx: 'TRANSAZIONI RECENTI ({n})',
    pending: 'in attesa',
    fail: 'FALLITA',
    coverageLimits: 'LIMITI DI COPERTURA',
    sourcesValue: 'Fonti: {list}',
    sampledFull: ' · campione di {n} tx (storico completo)',
    sampledPartial: ' · campione di {n} tx su uno storico più lungo',
    hDataLeak: 'RICERCA DATA LEAK',
    compromised: 'COMPROMESSO',
    secure: 'SICURO',
    hExposedData: 'DATI ESPOSTI',
    hKnownBreaches: 'BREACH NOTI ({n})',
    typeEmail: 'INDIRIZZO EMAIL', typeDomain: 'DOMINIO', typeUsername: 'USERNAME', typePhone: 'NUMERO DI TELEFONO', typeTarget: 'OBIETTIVO',
    hInfostealer: 'ESPOSIZIONE INFOSTEALER',
    compromisedMachinesFound: 'MACCHINE COMPROMESSE TROVATE',
    noRecords: 'NESSUN RECORD',
    statEmployees: 'Dipendenti', statUsers: 'Utenti', statThirdParties: 'Terze parti', statTotalMachines: 'Macchine totali',
    hPasswordStrength: 'ROBUSTEZZA PASSWORD DIPENDENTI ({n})',
    passwordSummary: '{weak}% deboli o peggio · {strong}% robuste',
    hStealerFamilies: 'FAMIGLIE DI STEALER',
    hTopThirdParty: 'PRINCIPALI DOMINI DI TERZE PARTI ({n})',
    notFoundInCorpus: 'NON PRESENTE NEL CORPUS',
    unknownMachine: 'MACCHINA SCONOSCIUTA',
    credentialsRedacted: 'Credenziali (oscurate da Hudson Rock)',
    hCertTransparency: 'CERTIFICATE TRANSPARENCY',
    hThreatIntel: 'THREAT INTELLIGENCE',
    hSsl: 'ANALISI SSL/TLS',
    // toolkit chrome
    filterTools: 'Filtra strumenti…',
    noToolMatches: 'Nessuno strumento corrisponde a “{q}”.',
    tracking: 'LOCALIZZAZIONE…',
    selfTrack: 'LOCALIZZAMI',
    globalSweep: 'SWEEP GLOBALE',
    dailyBrief: 'BRIEF GIORNALIERO',
    walletForensics: 'ANALISI WALLET',
    scan: 'SCANSIONA',
    quickScan: 'SCAN RAPIDO', deepScan: 'SCAN APPROFONDITO', top1000: 'TOP 1000 PORTE',
    subnetMask: 'SUBNET MASK:',
    sweepingSubnet: 'SWEEP DELLA SUBNET IN CORSO...',
    hostsCount: '{n} host',
    devicesFound: 'DISPOSITIVI TROVATI',
    visualizeOnGlobe: 'VISUALIZZA SUL GLOBO',
    cvesCount: '{n} CVE',
    portsList: 'Porte: {list}',
    identifiedVulns: 'Vulnerabilità identificate',
    noReverseDns: 'Nessun reverse DNS',
    fetchingVulnIntel: 'Recupero intelligence sulla vulnerabilità...',
    weakness: 'Debolezza: {cwe}',
    sweptSummary: '{hosts} HOST ANALIZZATI IN {secs}s · ASN {asn}',
    resultsTitle: 'RISULTATI {tool}',
    recentScans: 'SCANSIONI RECENTI',
    modulesCount: '{n} MODULI',
    exitExpanded: 'Esci dalla vista estesa (Esc)',
    toolsCount: '{n} STRUMENTI',
    fullScreen: 'Schermo intero',
  },
});

type MsgKey = keyof typeof MESSAGES.en & string;

/**
 * Tool groups. At 19 modules a flat grid forces 8px truncated labels
 * ("SUBDOMA…", "PHONE I…"); grouping keeps every label readable and makes
 * the toolkit scannable by what you are investigating.
 */
const GROUPS = [
  { id: 'network', label: 'grpNetwork', hint: 'grpNetworkHint' },
  { id: 'domain', label: 'grpDomain', hint: 'grpDomainHint' },
  { id: 'identity', label: 'grpIdentity', hint: 'grpIdentityHint' },
  { id: 'threat', label: 'grpThreat', hint: 'grpThreatHint' },
  { id: 'chain', label: 'grpChain', hint: 'grpChainHint' },
] as const satisfies readonly { id: string; label: MsgKey; hint: MsgKey }[];

type GroupId = (typeof GROUPS)[number]['id'];

/** `label`, `placeholder` and `blurb` are MESSAGES keys, translated at render. */
interface ToolDef {
  id: string;
  label: MsgKey;
  icon: any;
  placeholder: MsgKey;
  color: string;
  group: GroupId;
  /** Shown under the label in the expanded view. */
  blurb: MsgKey;
}

const TABS: ToolDef[] = [
  { id: 'scanner', label: 'tabScanner', icon: Radar, placeholder: 'phIpOrHost', color: '#00E5FF', group: 'network', blurb: 'blurbScanner' },
  { id: 'vuln', label: 'tabVuln', icon: Bug, placeholder: 'phIpOrHost', color: '#FF3D3D', group: 'network', blurb: 'blurbVuln' },
  { id: 'shodan', label: 'tabShodan', icon: Network, placeholder: 'phIp', color: '#FF3D3D', group: 'network', blurb: 'blurbShodan' },
  { id: 'bgp', label: 'tabBgp', icon: Globe, placeholder: 'phIpOrAsn', color: '#00E5FF', group: 'network', blurb: 'blurbBgp' },
  { id: 'mac', label: 'tabMac', icon: Fingerprint, placeholder: 'phMac', color: '#FFD700', group: 'network', blurb: 'blurbMac' },
  { id: 'sweep', label: 'tabSweep', icon: Crosshair, placeholder: 'phSweep', color: '#FF3D3D', group: 'network', blurb: 'blurbSweep' },

  { id: 'dns', label: 'tabDns', icon: Server, placeholder: 'phDomain', color: '#448AFF', group: 'domain', blurb: 'blurbDns' },
  { id: 'whois', label: 'tabWhois', icon: FileText, placeholder: 'phDomain', color: '#FFD700', group: 'domain', blurb: 'blurbWhois' },
  { id: 'certs', label: 'tabCerts', icon: Lock, placeholder: 'phDomain', color: '#E040FB', group: 'domain', blurb: 'blurbCerts' },
  { id: 'ssl', label: 'tabSsl', icon: Shield, placeholder: 'phDomain', color: '#76FF03', group: 'domain', blurb: 'blurbSsl' },
  { id: 'subdomains', label: 'tabSubdomains', icon: Layers, placeholder: 'phDomainEnum', color: '#00BCD4', group: 'domain', blurb: 'blurbSubdomains' },
  { id: 'headers', label: 'tabHeaders', icon: Code, placeholder: 'phUrlInspect', color: '#87CEEB', group: 'domain', blurb: 'blurbHeaders' },
  { id: 'tech', label: 'tabTech', icon: Code, placeholder: 'phUrlFingerprint', color: '#9C27B0', group: 'domain', blurb: 'blurbTech' },

  { id: 'username', label: 'tabUsername', icon: User, placeholder: 'phUsername', color: '#00E676', group: 'identity', blurb: 'blurbUsername' },
  { id: 'github', label: 'tabGithub', icon: Terminal, placeholder: 'phGithub', color: '#87CEEB', group: 'identity', blurb: 'blurbGithub' },
  { id: 'phone', label: 'tabPhone', icon: Phone, placeholder: 'phPhone', color: '#FF9500', group: 'identity', blurb: 'blurbPhone' },

  { id: 'threats', label: 'tabThreats', icon: AlertTriangle, placeholder: 'phThreat', color: '#FF9500', group: 'threat', blurb: 'blurbThreats' },
  { id: 'leaks', label: 'tabLeaks', icon: ShieldAlert, placeholder: 'phEmail', color: '#E040FB', group: 'threat', blurb: 'blurbLeaks' },
  { id: 'infostealer', label: 'tabInfostealer', icon: Skull, placeholder: 'phInfostealer', color: '#FF1744', group: 'threat', blurb: 'blurbInfostealer' },

  { id: 'crypto', label: 'tabCrypto', icon: Bitcoin, placeholder: 'phWallet', color: '#F7931A', group: 'chain', blurb: 'blurbCrypto' },
];

interface OsintPanelProps { isOpen?: boolean; onClose?: () => void; isMobile?: boolean; onSweepVisualize?: (data: any) => void; onScanGeolocate?: (target: string, data: any) => void; }

function OsintPanelInner({ isMobile, onSweepVisualize, onScanGeolocate }: OsintPanelProps) {
  const [activeTab, setActiveTab] = useState('scanner');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanType, setScanType] = useState('quick');
  const [expanded, setExpanded] = useState(true);
  const [history, setHistory] = useState<{tab:string;query:string;time:string}[]>([]);
  const [sweepResult, setSweepResult] = useState<any>(null);
  const [sweepProgress, setSweepProgress] = useState<{ current: number; total: number } | null>(null);
  const [sweepCidr, setSweepCidr] = useState(24);
  const [cveCache, setCveCache] = useState<Record<string, any>>({});
  // CHAIN INTEL carries two views: the daily brief needs no target, the wallet
  // lookup uses the shared query bar.
  const [chainView, setChainView] = useState<'brief' | 'wallet'>('brief');
  /** Free-text filter over the toolkit — 19 modules is too many to scan. */
  const [toolFilter, setToolFilter] = useState('');
  const t = useT(MESSAGES);
  const { lang } = useLang();
  const locale = localeOf(lang);

  const selectTool = useCallback((id: string) => {
    setActiveTab(id);
    setQuery('');
    setResults(null);
    setError('');
    setSweepResult(null);
  }, []);

  // Escape leaves the expanded view — it covers the map, so there must be a
  // way out that isn't hunting for the button.
  useEffect(() => {
    if (!isFullScreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullScreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullScreen]);

  const matchesFilter = useCallback((tool: ToolDef) => {
    const q = toolFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      t(tool.label).toLowerCase().includes(q) ||
      t(tool.blurb).toLowerCase().includes(q) ||
      tool.id.toLowerCase().includes(q)
    );
  }, [toolFilter, t]);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);

  // Fetch CVE details when a device is expanded in full-screen mode
  const fetchCveDetails = useCallback(async (cveIds: string[]) => {
    const missing = cveIds.filter(id => !cveCache[id]);
    if (missing.length === 0) return;
    // Mark as loading
    setCveCache(prev => {
      const next = { ...prev };
      for (const id of missing) next[id] = { loading: true };
      return next;
    });
    // Fetch in parallel
    const results = await Promise.allSettled(
      missing.map(id => fetch(`/api/osint/cve?cve=${encodeURIComponent(id)}`).then(r => r.json()).then(data => ({ id, data })))
    );
    setCveCache(prev => {
      const next = { ...prev };
      for (const r of results) {
        if (r.status === 'fulfilled') {
          next[r.value.id] = r.value.data;
        }
      }
      return next;
    });
  }, [cveCache]);

    const handleSelfTrack = () => {
      setLoading(true);
      setError('');
      fetch('/api/geo')
        .then(r => {
          if (!r.ok) throw new Error(`Server returned ${r.status}`);
          return r.json();
        })
        .then(geo => {
          setLoading(false);
          if (geo.status === 'success' && geo.lat && geo.lon && onScanGeolocate) {
            onScanGeolocate(geo.query || 'local', {
              lat: geo.lat,
              lng: geo.lon,
              city: geo.city || 'Unknown',
              country: geo.country || 'Unknown',
              isp: geo.isp || 'Unknown',
              org: geo.org || 'Unknown',
              as: geo.as || 'Unknown',
              type: 'self_track'
            });
          } else {
            setError(t('errIpLocation'));
          }
        })
        .catch(err => {
          setLoading(false);
          setError(t('errNetworkDetail', { msg: err.message }));
        });
    };

  const runLookup = useCallback(async () => {
    if (!query.trim() || loading) return;
    setLoading(true); setError(''); setResults(null);

    // IP Sweep — separate flow (only for the sweep tab)
    if (activeTab === 'sweep') {
      setSweepResult(null);
      const cidr = sweepCidr;
      const totalHosts = Math.pow(2, 32 - cidr);
      setSweepProgress({ current: 0, total: totalHosts });
      try {
        const t0 = Date.now();
        const res = await fetch(`/api/osint/sweep?ip=${encodeURIComponent(query)}&cidr=${cidr}`);
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || t('errSweepFailed', { status: res.status })); }
        const initData = await res.json();

        const ipParts = initData.target_ip.split('.').map(Number) as [number, number, number, number];
        const ipNum = ipToNumber(ipParts);
        const subnetStart = calculateSubnetStart(ipNum, cidr);
        const subnet = numberToIp(subnetStart);

        const urls: string[] = [];
        for (let i = 0; i < totalHosts; i++) {
          urls.push(`https://internetdb.shodan.io/${numberToIp((subnetStart + i) >>> 0)}`);
        }

        const shodanResults = await batchFetch<ShodanInternetDBResponse>(urls, 15, async (u) => {
          try {
            const r = await fetch(u, { cache: 'no-store' });
            if (r.status === 404) return null;
            if (!r.ok) return null;
            return await r.json();
          } catch {
            return null;
          }
        }, (done) => setSweepProgress({ current: done, total: totalHosts }));

        const devices: SweepDevice[] = [];
        const deviceBreakdown: Record<string, number> = {};
        for (const sr of shodanResults) {
          if (!sr) continue;
          const classification = classifyDevice(sr.ports, sr.cpes, sr.tags);
          const risk = assessRisk({ ports: sr.ports, vulns: sr.vulns });
          devices.push({
            ip: sr.ip, ports: sr.ports, hostnames: sr.hostnames,
            cpes: sr.cpes, vulns: sr.vulns, tags: sr.tags,
            device_type: classification.device_type,
            device_icon: classification.device_icon,
            device_color: classification.device_color,
            risk_level: risk
          });
          deviceBreakdown[classification.device_type] = (deviceBreakdown[classification.device_type] || 0) + 1;
        }

        setSweepResult({
          center: initData.center,
          subnet: `${subnet}/${cidr}`,
          cidr,
          target_ip: initData.target_ip,
          devices,
          summary: { total_hosts: totalHosts, total_responsive: devices.length, device_breakdown: deviceBreakdown },
          sweep_time_ms: Date.now() - t0
        });
        setSweepProgress(null);
        setHistory(prev => [{ tab: activeTab, query, time: new Date().toLocaleTimeString(locale) }, ...prev.slice(0, 9)]);
      } catch (err: any) {
        setError(err.message);
        setSweepProgress(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      let url = '';
      switch (activeTab) {

        case 'dns': url = `/api/osint/dns?domain=${encodeURIComponent(query)}`; break;
        case 'certs': url = `/api/osint/certs?domain=${encodeURIComponent(query)}`; break;
        case 'whois': url = `/api/osint/whois?domain=${encodeURIComponent(query)}`; break;
        case 'threats': url = `/api/osint/threats?query=${encodeURIComponent(query)}`; break;
        case 'bgp': url = `/api/osint/bgp?query=${encodeURIComponent(query)}`; break;
        case 'mac': url = `/api/osint/mac?mac=${encodeURIComponent(query)}`; break;
        case 'phone': url = `/api/osint/phone?number=${encodeURIComponent(query)}`; break;
        case 'leaks': url = `https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(query)}`; break;
        case 'infostealer': url = `/api/osint/hudsonrock?query=${encodeURIComponent(query)}`; break;
        case 'crypto': url = `/api/osint/crypto?address=${encodeURIComponent(query)}`; break;
        case 'username': url = `/api/osint/username?username=${encodeURIComponent(query)}`; break;
        case 'github': url = `/api/osint/github?user=${encodeURIComponent(query)}`; break;
        case 'vuln': url = `/api/scanner?target=${encodeURIComponent(query)}&type=vuln`; break;
        case 'scanner': url = `/api/scanner?target=${encodeURIComponent(query)}&type=${scanType}`; break;
        case 'headers': url = `/api/scanner?target=${encodeURIComponent(query)}&type=headers`; break;
        case 'ssl': url = `/api/scanner?target=${encodeURIComponent(query)}&type=ssl`; break;
        case 'subdomains': url = `/api/scanner?target=${encodeURIComponent(query)}&type=subdomains`; break;
        case 'tech': url = `/api/scanner?target=${encodeURIComponent(query)}&type=tech`; break;
        case 'shodan': url = `https://internetdb.shodan.io/${encodeURIComponent(query)}`; break;
      }
      const res = await fetch(url, activeTab === 'shodan' ? { cache: 'no-store' } : undefined);
      if (activeTab === 'shodan' && res.status === 404) {
        setResults({ ip: query, status: t('shodanNoRecords'), ports: [], cpes: [], hostnames: [], tags: [], vulns: [] });
        setLoading(false);
        return;
      }
      if (activeTab === 'leaks' && res.status === 404) {
        setResults({ email: query, breached: false, breaches: [], data_exposed: [] });
        setHistory(prev => [{ tab: activeTab, query, time: new Date().toLocaleTimeString(locale) }, ...prev.slice(0, 9)]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        let parsedData = data;
        if (activeTab === 'leaks') {
           let breachList: string[] = [];
           const dataExposed = new Set<string>();
           if (data.BreachesSummary && data.BreachesSummary.site) {
              breachList = data.BreachesSummary.site.split(';').filter(Boolean);
           }
           if (data.ExposedData && Array.isArray(data.ExposedData)) {
              data.ExposedData.forEach((item: any) => {
                 if (item.data_classes && Array.isArray(item.data_classes)) {
                    item.data_classes.forEach((dc: string) => dataExposed.add(dc));
                 }
              });
           }
           parsedData = {
              email: query,
              breached: breachList.length > 0,
              breaches: breachList,
              data_exposed: Array.from(dataExposed).sort()
           };
        }

        setResults(parsedData);
        setHistory(prev => [{ tab: activeTab, query, time: new Date().toLocaleTimeString(locale) }, ...prev.slice(0, 9)]);
        
        // Geolocate the target in the background
        if (activeTab === 'phone') {
          if (data.lat && data.lng && onScanGeolocate) {
             onScanGeolocate(query, { lat: data.lat, lng: data.lng, type: 'phone', region: data.region });
          }
        } else if (activeTab !== 'sweep' && activeTab !== 'vuln' && activeTab !== 'crypto' && activeTab !== 'username' && activeTab !== 'mac' && activeTab !== 'bgp' && activeTab !== 'github' && activeTab !== 'leaks' && activeTab !== 'phone' && activeTab !== 'infostealer') {
          fetch(`/api/osint/ip?ip=${encodeURIComponent(query)}`)
            .then(r => r.json())
            .then(locData => {
              if (locData && locData.geo && locData.geo.lat && locData.geo.lon && onScanGeolocate) {
                // ip-api returns lat/lon, we pass it up
                onScanGeolocate(query, { lat: locData.geo.lat, lng: locData.geo.lon, ...locData, type: activeTab });
              }
            })
            .catch(() => {});
        }
      } else {
        setError(data.error || t('errLookupFailed'));
      }
    } catch { setError(t('errNetwork')); }
    finally { setLoading(false); }
  }, [query, activeTab, scanType, loading, sweepCidr, t, locale]);

  const currentTab = TABS.find(tool => tool.id === activeTab);
  const tabLabel = (id: string) => {
    const tool = TABS.find(x => x.id === id);
    return tool ? t(tool.label) : id;
  };

  // ── Shodan-style structured result renderers ──

  const ResultRow = ({ label, value, color, mono = true }: { label: string; value: any; color?: string; mono?: boolean }) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div className="flex items-start gap-3 py-1.5 border-b border-[var(--border-secondary)]/20 last:border-0">
        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider w-[90px] flex-shrink-0 pt-0.5">{label}</span>
        <span className={`text-[11px] ${mono ? 'font-mono' : ''} break-all flex-1`} style={{ color: color || 'var(--text-primary)' }}>
          {String(value)}
        </span>
      </div>
    );
  };

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${ok ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
      {ok ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
      {label}
    </span>
  );

  // Surfaces an inline OFAC-SDN hit (used by the WHOIS and IP-intel routes
  // when their cross-check finds a sanctioned registrant / ASN owner).
  const SanctionsBadge = ({ match }: { match: any }) => {
    if (!match || !Array.isArray(match.hits) || match.hits.length === 0) return null;
    return (
      <div className="mb-2 px-2 py-2 rounded border border-red-500/40 bg-red-500/15">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[11px] font-mono font-bold text-red-400 tracking-wider">
            {t('sanctioned', { source: match.source || 'OFAC SDN' })}
          </span>
        </div>
        {match.hits.slice(0, 5).map((h: any, i: number) => (
          <div key={i} className="text-[10px] font-mono text-red-200 break-all leading-tight">
            <span className="text-[var(--text-muted)]">↳ {h.matched_value}:</span>{' '}
            {(h.entries || []).slice(0, 2).map((e: any) => e.name).join('; ')}
          </div>
        ))}
      </div>
    );
  };

  // Cavalier's data is complimentary; the terms ask that it be credited.
  const HudsonRockCredit = () => (
    <a
      href="https://www.hudsonrock.com/free-tools"
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex items-center justify-between px-2 py-1.5 rounded bg-[#1A1A18] border border-[var(--border-secondary)]/30 hover:border-[#FF1744]/40 transition-colors"
    >
      <span className="text-[9px] font-mono text-[var(--text-muted)]">
        {t('hudsonCredit')}
      </span>
      <ExternalLink className="w-2.5 h-2.5 text-[var(--text-muted)]" />
    </a>
  );

  const SectionHeader = ({ title, icon: Icon, color }: { title: string; icon: any; color: string }) => (
    <div className="flex items-center gap-2 mt-3 mb-1.5 first:mt-0">
      <Icon className="w-3.5 h-3.5" style={{ color }} />
      <span className="text-[11px] font-mono font-bold tracking-widest" style={{ color }}>{title}</span>
      <div className="flex-1 h-px" style={{ background: `${color}30` }} />
    </div>
  );

  const PortRow = ({ port, state, service, version }: { port: number; state: string; service?: string; version?: string }) => (
    <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[var(--hover-accent)] transition-colors">
      <span className="text-[10px] font-mono font-bold text-[var(--cyan-primary)] w-[60px]">{port}</span>
      <StatusBadge ok={state === 'open'} label={state.toUpperCase()} />
      <span className="text-[11px] font-mono text-[var(--text-secondary)] flex-1">{service || t('unknownLower')}</span>
      {version && <span className="text-[10px] font-mono text-[var(--text-muted)]">{version}</span>}
    </div>
  );

  const renderStructuredResults = () => {
    // The daily brief is self-loading and needs no query, so it renders
    // regardless of whether a lookup has been run.
    if (activeTab === 'crypto' && chainView === 'brief') {
      return (
        <div>
          <SectionHeader title={t('hChainBrief')} icon={Bitcoin} color="#F7931A" />
          <ChainBrief />
        </div>
      );
    }
    if (!results) return null;
    const r = results;

    // ── PORT SCAN ──
    if (activeTab === 'scanner') {
      const ports = r.ports || r.open_ports || r.results || [];
      const host = r.host || r.target || query;
      return (
        <div>
          <SectionHeader title={t('hHostInfo')} icon={Server} color="#00E5FF" />
          <ResultRow label={t('lblTarget')} value={host} color="#00E5FF" />
          <ResultRow label={t('lblScanType')} value={r.scan_type || scanType} />
          <ResultRow label={t('lblDuration')} value={r.duration || r.scan_time} />
          {Array.isArray(ports) && ports.length > 0 && (
            <>
              <SectionHeader title={t('hOpenPorts', { n: ports.length })} icon={Wifi} color="#00E676" />
              <div className="space-y-0.5">
                {ports.map((p: any, i: number) => (
                  <PortRow key={i} port={p.port || p} state={p.state || 'open'} service={p.service || p.name} version={p.version} />
                ))}
              </div>
            </>
          )}
          {(!Array.isArray(ports) || ports.length === 0) && renderFallback()}
        </div>
      );
    }

    // ── VULN SCAN ──
    if (activeTab === 'vuln') {
      const vulns = r.vulnerabilities || r.vulns || r.cves || [];
      const exploits = vulns.filter((v: any) => v.is_exploit);
      const regularVulns = vulns.filter((v: any) => !v.is_exploit);
      
      return (
        <div>
          <SectionHeader title={t('hVulnAssessment')} icon={Bug} color="#FF3D3D" />
          <ResultRow label={t('lblTarget')} value={r.target || query} color="#FF3D3D" />
          <ResultRow label={t('lblTotalCves')} value={Array.isArray(vulns) ? vulns.length : 0} color={Array.isArray(vulns) && vulns.length > 0 ? '#FF3D3D' : '#00E676'} />
          <ResultRow label={t('lblRiskLevel')} value={r.risk_level || r.severity} />
          {Array.isArray(regularVulns) && regularVulns.length > 0 && (
            <div className="mt-2 space-y-1">
              {regularVulns.slice(0, 20).map((v: any, i: number) => (
                <div key={i} className="p-2 rounded-lg border border-red-500/20 bg-red-500/5 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-red-400">{v.id || v.cve || v.name}</span>
                    {v.severity && <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${v.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : v.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{v.severity}</span>}
                  </div>
                  {v.cvss && <div className="text-[10px] font-mono text-[var(--text-muted)] mt-1">CVSS: {v.cvss} ({v.type || 'cve'})</div>}
                  {v.description && <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1 line-clamp-2">{v.description}</p>}
                </div>
              ))}
            </div>
          )}
          
          {exploits.length > 0 && (
            <div className="mt-4">
              <SectionHeader title={t('hPossibleExploits', { n: exploits.length })} icon={AlertTriangle} color="#FF9500" />
              <div className="mt-2 space-y-1">
                {exploits.slice(0, 10).map((e: any, i: number) => (
                  <div key={i} className="p-2 rounded-lg border border-orange-500/30 bg-orange-500/10 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-orange-400">{e.id}</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">{t('badgeExploit')}</span>
                    </div>
                    <div className="text-[10px] font-mono text-[var(--text-muted)] mt-1 flex justify-between">
                      <span>{t('sourceValue', { src: e.type?.toUpperCase() || t('unknownUpper') })}</span>
                      {e.cvss && <span>CVSS: {e.cvss}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {(!Array.isArray(vulns) || vulns.length === 0) && renderFallback()}
        </div>
      );
    }



    // ── DNS ──
    if (activeTab === 'dns') {
      return (
        <div>
          <SectionHeader title={t('hDnsRecords')} icon={Server} color="#448AFF" />
          <ResultRow label={t('lblDomain')} value={r.domain || query} color="#448AFF" />
          {r.A && <ResultRow label={t('lblARecords')} value={Array.isArray(r.A) ? r.A.join(', ') : r.A} />}
          {r.AAAA && <ResultRow label="AAAA" value={Array.isArray(r.AAAA) ? r.AAAA.join(', ') : r.AAAA} />}
          {r.MX && <ResultRow label="MX" value={Array.isArray(r.MX) ? r.MX.map((m:any) => m.exchange || m).join(', ') : r.MX} />}
          {r.NS && <ResultRow label="NS" value={Array.isArray(r.NS) ? r.NS.join(', ') : r.NS} />}
          {r.TXT && <ResultRow label="TXT" value={Array.isArray(r.TXT) ? r.TXT.join(' | ') : r.TXT} />}
          {r.CNAME && <ResultRow label="CNAME" value={Array.isArray(r.CNAME) ? r.CNAME.join(', ') : r.CNAME} />}
          {r.SOA && <ResultRow label="SOA" value={typeof r.SOA === 'object' ? `${r.SOA.nsname} (${r.SOA.hostmaster})` : r.SOA} />}
          {renderFallbackExcluding(['domain','A','AAAA','MX','NS','TXT','CNAME','SOA','timestamp','cached'])}
        </div>
      );
    }

    // ── WHOIS ──
    if (activeTab === 'whois') {
      return (
        <div>
          <SectionHeader title={t('hWhois')} icon={FileText} color="#FFD700" />
          <SanctionsBadge match={r.sanctions_match} />
          <ResultRow label={t('lblDomain')} value={r.domain_name || r.domainName || query} color="#FFD700" />
          <ResultRow label={t('lblRegistrar')} value={r.registrar} />
          <ResultRow label={t('lblCreated')} value={r.creation_date || r.createdDate} />
          <ResultRow label={t('lblExpires')} value={r.expiration_date || r.expiresDate} />
          <ResultRow label={t('lblUpdated')} value={r.updated_date || r.updatedDate} />
          <ResultRow label={t('lblStatus')} value={Array.isArray(r.status) ? r.status.join(', ') : r.status} />
          <ResultRow label={t('lblNameservers')} value={Array.isArray(r.name_servers || r.nameServers) ? (r.name_servers || r.nameServers).join(', ') : r.name_servers} />
          {renderFallbackExcluding(['domain_name','domainName','registrar','creation_date','createdDate','expiration_date','expiresDate','updated_date','updatedDate','status','name_servers','nameServers','timestamp','cached','raw','sanctions_match'])}
        </div>
      );
    }

    // ── SHODAN ──
    if (activeTab === 'shodan') {
      return (
        <div>
          <SectionHeader title={t('hShodan')} icon={Network} color="#FF3D3D" />
          <ResultRow label={t('lblTargetIp')} value={r.ip || query} color="#FF3D3D" />
          {r.hostnames?.length > 0 && <ResultRow label={t('lblHostnames')} value={r.hostnames.join(', ')} />}
          {r.ports?.length > 0 && <ResultRow label={t('lblOpenPorts')} value={r.ports.join(', ')} color="#00E5FF" />}
          {r.tags?.length > 0 && <ResultRow label={t('lblTags')} value={r.tags.join(', ')} color="#FF9500" />}
          {r.vulns?.length > 0 && (
            <div className="mt-2 p-2 border border-red-500/30 bg-red-500/10 rounded">
              <span className="text-[11px] font-mono text-red-400 font-bold mb-1 block">{t('hVulnerabilities', { n: r.vulns.length })}</span>
              <div className="flex flex-wrap gap-1">
                {r.vulns.slice(0, 10).map((v: string) => (
                  <a key={v} href={`https://nvd.nist.gov/vuln/detail/${v}`} target="_blank" rel="noreferrer" className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1A1A18] text-[#8A8880] hover:text-[#FF3D3D]">{v}</a>
                ))}
                {r.vulns.length > 10 && <span className="text-[10px] font-mono text-[#8A8880]">{t('moreCount', { n: r.vulns.length - 10 })}</span>}
              </div>
            </div>
          )}
          {renderFallbackExcluding(['ip','hostnames','ports','tags','vulns','cpes'])}
        </div>
      );
    }

    // ── BGP ──
    if (activeTab === 'bgp') {
      return (
        <div>
          <SectionHeader title={t('hBgp')} icon={Globe} color="#00E5FF" />
          <ResultRow label={t('lblQuery')} value={r.query} color="#00E5FF" />
          {r.type === 'ip' && r.ip && (
            <>
              {r.ip.prefixes?.map((p: any, i: number) => (
                <div key={i} className="mt-2 p-2 border border-[#00E5FF]/20 bg-[#00E5FF]/5 rounded">
                  <ResultRow label="ASN" value={`AS${p.asn.asn} - ${p.asn.name}`} color="#00E5FF" />
                  <ResultRow label={t('lblPrefix')} value={p.prefix} />
                  <ResultRow label={t('lblCountry')} value={p.asn.country_code} />
                  <ResultRow label={t('lblDescription')} value={p.asn.description} />
                </div>
              ))}
            </>
          )}
          {r.type === 'asn' && r.asn && (
            <div className="mt-2 p-2 border border-[#00E5FF]/20 bg-[#00E5FF]/5 rounded">
              <ResultRow label="ASN" value={`AS${r.asn.asn}`} color="#00E5FF" />
              <ResultRow label={t('lblName')} value={r.asn.name} />
              <ResultRow label={t('lblDescription')} value={r.asn.description} />
              <ResultRow label={t('lblCountry')} value={r.asn.country_code} />
              {r.prefixes && <ResultRow label={t('lblPrefixes')} value={`IPv4: ${r.prefixes.total_v4} | IPv6: ${r.prefixes.total_v6}`} />}
              {r.peers && <ResultRow label={t('lblPeers')} value={r.peers.total} />}
            </div>
          )}
          {renderFallbackExcluding(['query', 'type', 'ip', 'asn', 'prefixes', 'peers', 'timestamp'])}
        </div>
      );
    }

    // ── MAC ──
    if (activeTab === 'mac') {
      return (
        <div>
          <SectionHeader title={t('hMac')} icon={Fingerprint} color="#FFD700" />
          <ResultRow label={t('lblMacAddress')} value={r.mac} color="#FFD700" />
          <ResultRow label={t('lblVendor')} value={r.vendor} color={r.vendor === 'Not Found' ? '#FF3D3D' : '#00E676'} />
        </div>
      );
    }

    // ── PHONE ──
    if (activeTab === 'phone') {
      return (
        <div>
          <SectionHeader title={t('hPhone')} icon={Phone} color="#FF9500" />
          <ResultRow label={t('lblQuery')} value={r.query} color="#FF9500" />
          <ResultRow label={t('lblValid')} value={r.valid ? t('yes') : t('no')} color={r.valid ? '#00E676' : '#FF3D3D'} />
          {r.valid && (
            <>
              <ResultRow label={t('lblE164')} value={r.number} />
              <ResultRow label={t('lblIntl')} value={r.international} />
              <ResultRow label={t('lblNat')} value={r.national} />
              <ResultRow label={t('lblCountry')} value={`${r.region} (${r.country_code})`} />
              <ResultRow label={t('lblLineType')} value={r.line_type} color={r.line_type === 'MOBILE' ? '#00E5FF' : r.line_type === 'VOIP' ? '#FF9500' : undefined} />
            </>
          )}
        </div>
      );
    }

    // ── GITHUB ──
    if (activeTab === 'github') {
      return (
        <div>
          <SectionHeader title={t('hGithub')} icon={Terminal} color="#87CEEB" />
          <div className="flex items-center gap-3 mb-2">
            {r.avatar_url && <img src={r.avatar_url} alt="avatar" className="w-10 h-10 rounded-full border border-[#87CEEB]/30" />}
            <div>
              <div className="text-[11px] font-mono font-bold text-[#87CEEB]">{r.name || r.username}</div>
              <div className="text-[10px] font-mono text-[var(--text-muted)]">@{r.username} • {t('followers', { n: r.followers })}</div>
            </div>
          </div>
          <ResultRow label={t('lblCompany')} value={r.company} />
          <ResultRow label={t('lblLocation')} value={r.location} />
          <ResultRow label={t('lblEmail')} value={r.email} color="#00E676" />
          <ResultRow label="Twitter" value={r.twitter} color="#448AFF" />
          <ResultRow label={t('lblWebsite')} value={r.blog} />
          <ResultRow label={t('lblBio')} value={r.bio} />
          {r.recent_repos?.length > 0 && (
            <div className="mt-2 p-2 border border-[#87CEEB]/20 bg-[#87CEEB]/5 rounded">
              <span className="text-[10px] font-mono text-[#87CEEB] block mb-1">{t('hRecentRepos')}</span>
              {r.recent_repos.map((repo: any, i: number) => (
                <div key={i} className="flex justify-between text-[10px] font-mono mb-0.5">
                  <span className="text-[#E8E6E0]">{repo.name}</span>
                  <span className="text-[var(--text-muted)]">{repo.language || t('unknown')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── USERNAME HUNT ──
    if (activeTab === 'username') {
      const ACCENT = '#00E676';


      return (
        <div>
          <SectionHeader title={t('hUsernameHunt')} icon={User} color={ACCENT} />

          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {[
              { label: t('statFound'), value: r.found?.length ?? 0, color: ACCENT },
              { label: t('statUnsure'), value: r.inconclusive?.length ?? 0, color: '#FF9500' },
              { label: t('statBlocked'), value: r.blocked?.length ?? 0, color: '#E040FB' },
              { label: t('statChecked'), value: r.checked ?? 0, color: '#87CEEB' },
            ].map((c: any) => (
              <div key={c.label} className="rounded border px-2 py-1.5" style={{ borderColor: `${c.color}33`, background: `${c.color}0d` }}>
                <div className="text-[9px] font-mono text-[var(--text-muted)]">{c.label}</div>
                <div className="text-[11px] font-mono font-bold" style={{ color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
          <ResultRow label={t('lblHandle')} value={r.username} color={ACCENT} />
          <ResultRow
            label={t('lblCoverage')}
            value={t('coverageValue', { checked: r.checked, total: r.total_available, ruled: r.not_found_count ?? 0 })}
          />
          <ResultRow label={t('lblElapsed')} value={r.elapsed_ms ? `${(r.elapsed_ms / 1000).toFixed(1)}s` : null} />

          {r.found?.length > 0 && (
            <>
              <SectionHeader title={t('hConfirmed', { n: r.found.length })} icon={CheckCircle} color={ACCENT} />
              {r.found.map((f: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1 text-[11px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ACCENT }} />
                  <span className="w-[110px] flex-shrink-0 font-bold" style={{ color: ACCENT }}>{f.site}</span>
                  <a href={f.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 break-all text-[var(--text-secondary)] hover:text-white hover:underline flex items-center gap-1">
                    {f.url.replace(/^https?:\/\//, '')}
                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                  </a>
                </div>
              ))}
            </>
          )}

          {/* Positives that a control username also triggered — shown apart so
              they are never mistaken for real accounts. */}
          {r.inconclusive?.length > 0 && (
            <>
              <SectionHeader title={t('hUnverifiable', { n: r.inconclusive.length })} icon={AlertTriangle} color="#FF9500" />
              <div className="text-[10px] font-mono text-[var(--text-secondary)] leading-snug mb-1">
                {t('unverifiableHelp')}
              </div>
              {r.inconclusive.map((f: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1 text-[11px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#FF9500]" />
                  <span className="w-[110px] flex-shrink-0 text-[#FF9500]">{f.site}</span>
                  <a href={f.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 break-all text-[var(--text-muted)] hover:text-white hover:underline">
                    {f.url.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              ))}
            </>
          )}

          {/* Refused the request — absence was never established here, so these
              must not be silently folded into "not found". */}
          {r.blocked?.length > 0 && (
            <>
              <SectionHeader title={t('hBlocked', { n: r.blocked.length })} icon={ShieldAlert} color="#E040FB" />
              <div className="text-[10px] font-mono text-[var(--text-secondary)] leading-snug mb-1">
                {t('blockedHelp')}
              </div>
              {r.blocked.map((f: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-0.5 text-[10px] font-mono">
                  <span className="w-[110px] flex-shrink-0 text-[#E040FB]">{f.site}</span>
                  <a href={f.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 break-all text-[var(--text-muted)] hover:text-white hover:underline">
                    {t('checkManually')}
                  </a>
                  <span className="text-[var(--text-muted)]">{f.reason}</span>
                </div>
              ))}
            </>
          )}

          {r.errors?.length > 0 && (
            <>
              <SectionHeader title={t('hUnreachable', { n: r.errors.length })} icon={XCircle} color="#FF3D3D" />
              {r.errors.slice(0, 10).map((f: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-0.5 text-[10px] font-mono">
                  <span className="w-[110px] flex-shrink-0 text-[#FF3D3D]">{f.site}</span>
                  <span className="flex-1 text-[var(--text-muted)]">{f.reason}</span>
                </div>
              ))}
            </>
          )}

          {r.skipped?.length > 0 && (
            <>
              <SectionHeader title={t('hNotApplicable', { n: r.skipped.length })} icon={XCircle} color="#5C5A54" />
              <div className="text-[10px] font-mono text-[var(--text-muted)] leading-snug">
                {t('notApplicableHelp', { sites: r.skipped.map((s: any) => s.site).join(', ') })}
              </div>
            </>
          )}

          <div className="mt-3 text-[9px] font-mono text-[var(--text-muted)] leading-relaxed">
            {r.verified ? t('calibratedNote') : t('uncalibratedNote')}
            <br />{t('sourceValue', { src: r.source })}
          </div>
        </div>
      );
    }

    // ── CHAIN INTEL ──
    // Shares /api/osint/crypto with the standalone CHAIN panel; this is the
    // in-toolkit view of the same wallet report.
    if (activeTab === 'crypto') {
      const ACCENT = '#F7931A';
      const RISK_COLOR: Record<string, string> = {
        critical: '#FF1744', high: '#FF3D3D', medium: '#FF9500', low: '#FFD700', info: '#00E676',
      };
      const riskColor = RISK_COLOR[r.risk?.level] || '#00E676';
      const fmt = (n: number, d = 4) =>
        typeof n === 'number' && Number.isFinite(n)
          ? n.toLocaleString(locale, { maximumFractionDigits: d })
          : '—';
      const short = (a: string) => (a && a.length > 20 ? `${a.slice(0, 10)}…${a.slice(-8)}` : a);

      return (
        <div>
          <SectionHeader title={t('hChainIntel')} icon={Bitcoin} color={ACCENT} />

          {/* A sanctions hit dominates the report — surface it before anything else. */}
          {r.sanctions?.hit && (
            <div className="mb-2 px-2 py-2 rounded border border-red-500/40 bg-red-500/15">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[11px] font-mono font-bold text-red-400 tracking-wider">
                  {t('ofacSanctionedWallet')}
                </span>
              </div>
              {(r.sanctions.entries || []).map((e: any, i: number) => (
                <div key={i} className="text-[10px] font-mono text-red-200 break-all leading-tight">
                  ↳ {e.name}{e.programs?.length ? ` — ${e.programs.join(', ')}` : ''}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
              style={{ color: ACCENT, borderColor: `${ACCENT}55`, background: `${ACCENT}18` }}>
              {r.chain_label?.toUpperCase()}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
              style={{ color: riskColor, borderColor: `${riskColor}55`, background: `${riskColor}18` }}>
              {t('riskBadge', { score: r.risk?.score ?? '', level: String(r.risk?.level || '').toUpperCase() })}
            </span>
          </div>

          <ResultRow label={t('lblAddress')} value={r.address} color={ACCENT} />
          <ResultRow label={t('lblBalance')} value={`${fmt(r.balance?.native, 8)} ${r.symbol}`} color="#00E676" />
          <ResultRow
            label={t('lblValueUsd')}
            value={r.balance?.usd != null ? `$${fmt(r.balance.usd, 2)}` : t('priceUnavailable')}
          />
          <ResultRow label={t('lblSpotPrice')} value={r.balance?.price_usd != null ? `$${fmt(r.balance.price_usd, 2)}` : null} />
          <ResultRow label={t('lblTransactions')} value={r.activity?.tx_count?.toLocaleString(locale)} />
          <ResultRow label={t('lblLastActive')} value={r.activity?.last_seen ? t('lastActiveValue', { date: String(r.activity.last_seen).slice(0, 10), n: r.activity.dormant_days }) : null} />
          {/* age_days is withheld by the API whenever the sample cannot prove it. */}
          <ResultRow
            label={t('lblAge')}
            value={r.activity?.age_days != null ? t('ageDays', { n: r.activity.age_days }) : t('ageUnknown')}
            color={r.activity?.age_days != null ? undefined : 'var(--text-muted)'}
          />
          {r.ambiguous_chain && (
            <ResultRow label={t('lblNote')} value={t('ambiguousChain')} color="#FFD700" />
          )}

          {r.labels?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {r.labels.map((l: string, i: number) => (
                <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/15 text-[var(--text-secondary)] bg-white/5">
                  {l}
                </span>
              ))}
            </div>
          )}

          {r.flow && (
            <>
              <SectionHeader title={t('hFlow')} icon={Layers} color={ACCENT} />
              <ResultRow label={t('lblTotalIn')} value={`${fmt(r.flow.total_in)} ${r.symbol}`} color="#00E676" />
              <ResultRow label={t('lblTotalOut')} value={`${fmt(r.flow.total_out)} ${r.symbol}`} color="#FF9500" />
              <ResultRow label={t('lblNet')} value={`${fmt(r.flow.net)} ${r.symbol}`} />
            </>
          )}

          {r.risk?.factors?.length > 0 && (
            <>
              <SectionHeader title={t('hRiskFactors')} icon={AlertTriangle} color={riskColor} />
              {r.risk.factors.map((f: any, i: number) => (
                <div key={i} className="py-1.5 border-b border-[var(--border-secondary)]/20 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold" style={{ color: RISK_COLOR[f.severity] || '#00E676' }}>
                      {f.label}
                    </span>
                    {f.weight > 0 && (
                      <span className="text-[9px] font-mono text-[var(--text-muted)]">+{f.weight}</span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-secondary)] leading-snug mt-0.5">{f.detail}</div>
                </div>
              ))}
            </>
          )}

          {r.counterparties?.length > 0 && (
            <>
              <SectionHeader title={t('hTopCounterparties', { n: r.counterparties.length })} icon={Network} color={ACCENT} />
              {r.counterparties.slice(0, 10).map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1 text-[10px] font-mono">
                  <span className={`w-[34px] flex-shrink-0 font-bold ${c.direction === 'out' ? 'text-[#FF9500]' : c.direction === 'in' ? 'text-[#00E676]' : 'text-[var(--text-muted)]'}`}>
                    {c.direction === 'out' ? t('dirOut') : c.direction === 'in' ? t('dirIn') : t('dirBoth')}
                  </span>
                  <span className="flex-1 break-all text-[var(--text-primary)]">{short(c.address)}</span>
                  <span className="text-[var(--text-muted)]">{c.txs}×</span>
                  <span className="text-[var(--text-secondary)] w-[70px] text-right">{fmt(c.value)}</span>
                </div>
              ))}
            </>
          )}

          {r.tokens?.length > 0 && (
            <>
              <SectionHeader title={t('hTokens', { n: r.tokens.length })} icon={Layers} color={ACCENT} />
              <div className="flex flex-wrap gap-1">
                {r.tokens.slice(0, 20).map((tk: any, i: number) => (
                  <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/15 bg-white/5 text-[var(--text-secondary)]">
                    {tk.symbol}{tk.amount != null ? ` ${fmt(tk.amount, 2)}` : ''}
                  </span>
                ))}
              </div>
            </>
          )}

          {r.transactions?.length > 0 && (
            <>
              <SectionHeader title={t('hRecentTx', { n: r.transactions.length })} icon={Clock} color={ACCENT} />
              {r.transactions.slice(0, 12).map((tx: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1 text-[10px] font-mono">
                  <span className={`w-[34px] flex-shrink-0 font-bold ${tx.direction === 'out' ? 'text-[#FF9500]' : tx.direction === 'in' ? 'text-[#00E676]' : 'text-[var(--text-muted)]'}`}>
                    {tx.direction === 'unknown' ? '—' : tx.direction === 'out' ? t('dirOut') : tx.direction === 'in' ? t('dirIn') : tx.direction.toUpperCase()}
                  </span>
                  <span className="text-[var(--text-muted)] w-[64px] flex-shrink-0">{tx.time ? String(tx.time).slice(0, 10) : t('pending')}</span>
                  <span className="flex-1 break-all text-[var(--text-primary)]">{short(tx.hash)}</span>
                  {tx.failed && <span className="text-[#FF3D3D]">{t('fail')}</span>}
                  {tx.value > 0 && <span className="text-[var(--text-secondary)]">{fmt(tx.value)}</span>}
                </div>
              ))}
            </>
          )}

          {/* Honesty rail: what this report could not establish. */}
          {r.partial?.length > 0 && (
            <div className="mt-3 px-2 py-1.5 rounded border border-white/10 bg-white/[0.03]">
              <span className="text-[10px] font-mono text-[var(--text-muted)] block mb-0.5">{t('coverageLimits')}</span>
              {r.partial.map((p: string, i: number) => (
                <div key={i} className="text-[10px] font-mono text-[var(--text-secondary)] leading-snug">↳ {p}</div>
              ))}
            </div>
          )}

          <div className="mt-2 text-[9px] font-mono text-[var(--text-muted)]">
            {t('sourcesValue', { list: (r.sources || []).join(' · ') })}
            {r.activity && t(r.activity.history_complete ? 'sampledFull' : 'sampledPartial', { n: r.activity.sample_size })}
          </div>
        </div>
      );
    }

    // ── LEAKS ──
    if (activeTab === 'leaks') {
      return (
        <div>
          <SectionHeader title={t('hDataLeak')} icon={ShieldAlert} color="#E040FB" />
          <ResultRow label={t('lblEmailTarget')} value={r.email} color="#E040FB" />
          <ResultRow label={t('lblStatus')} value={r.breached ? t('compromised') : t('secure')} color={r.breached ? '#FF1744' : '#00E676'} />

          {r.breached && r.data_exposed?.length > 0 && (
            <div className="mt-2 p-2 border border-[#E040FB]/30 bg-[#E040FB]/10 rounded">
              <span className="text-[11px] font-mono text-[#E040FB] font-bold mb-1 block">{t('hExposedData')}</span>
              <div className="flex flex-wrap gap-1">
                {r.data_exposed.map((dc: string) => (
                  <span key={dc} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1A1A18] text-[#E8E6E0] border border-[#E040FB]/20">{dc}</span>
                ))}
              </div>
            </div>
          )}

          {r.breached && r.breaches?.length > 0 && (
            <div className="mt-2 p-2 border border-red-500/30 bg-red-500/10 rounded">
              <span className="text-[11px] font-mono text-red-400 font-bold mb-1 block">{t('hKnownBreaches', { n: r.breaches.length })}</span>
              <div className="flex flex-col gap-1">
                {r.breaches.map((b: string) => (
                  <a key={b} href={`https://haveibeenpwned.com/PwnedWebsites#${b}`} target="_blank" rel="noreferrer" className="text-[10px] font-mono px-2 py-1 rounded bg-[#1A1A18] text-red-300 hover:text-white hover:bg-red-500/30 flex items-center justify-between transition-colors">
                    <span>{b}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── INFOSTEALER (Hudson Rock) ──
    if (activeTab === 'infostealer') {
      const hit = r.compromised;
      const accent = hit ? '#FF1744' : '#00E676';
      const TYPE_LABEL: Record<string, MsgKey> = {
        email: 'typeEmail', domain: 'typeDomain', username: 'typeUsername', phone: 'typePhone',
      };

      // Domain lookups answer a different question — how much of an
      // organisation is exposed — so they get their own view rather than an
      // empty version of the per-machine one.
      if (r.type === 'domain') {
        const families = Object.entries(r.stealerFamilies || {})
          .filter(([k, v]) => k !== 'total' && Number(v) > 0)
          .sort((a, b) => Number(b[1]) - Number(a[1]));
        const pw = r.employeePasswords || {};
        const weakPct = (Number(pw.too_weak?.perc) || 0) + (Number(pw.weak?.perc) || 0);

        return (
          <div>
            <SectionHeader title={t('hInfostealer')} icon={Skull} color={accent} />
            <ResultRow label={t('lblDomain')} value={r.query} color={accent} />
            <ResultRow label={t('lblStatus')} value={hit ? t('compromisedMachinesFound') : t('noRecords')} color={accent} />
            {hit && (
              <>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {[
                    [t('statEmployees'), r.employees, '#FF1744'],
                    [t('statUsers'), r.users, '#FF9500'],
                    [t('statThirdParties'), r.third_parties, '#FFD500'],
                    [t('statTotalMachines'), r.totalStealers, '#E040FB'],
                  ].map(([label, value, color]: any) => (
                    <div key={label} className="p-2 rounded border border-[var(--border-secondary)]/30 bg-[var(--bg-tertiary)]/30">
                      <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">{label}</div>
                      <div className="text-[15px] font-mono font-bold" style={{ color }}>{Number(value || 0).toLocaleString(locale)}</div>
                    </div>
                  ))}
                </div>

                <ResultRow label={t('lblLastEmployee')} value={r.last_employee_compromised?.slice(0, 10)} />
                <ResultRow label={t('lblLastUser')} value={r.last_user_compromised?.slice(0, 10)} />
                <ResultRow label={t('lblExposedUrls')} value={Number(r.totalUrls || 0).toLocaleString(locale)} />

                {pw.has_stats && (
                  <div className="mt-2 p-2 border border-[#FF9500]/30 bg-[#FF9500]/10 rounded">
                    <span className="text-[11px] font-mono text-[#FF9500] font-bold mb-1 block">
                      {t('hPasswordStrength', { n: Number(pw.totalPass || 0).toLocaleString(locale) })}
                    </span>
                    <div className="flex h-2 rounded overflow-hidden mb-1">
                      {[['too_weak', '#FF1744'], ['weak', '#FF9500'], ['medium', '#FFD500'], ['strong', '#00E676']].map(([k, c]) => (
                        <div key={k} style={{ width: `${Number(pw[k]?.perc) || 0}%`, background: c }} />
                      ))}
                    </div>
                    <div className="text-[10px] font-mono text-[var(--text-muted)]">
                      {t('passwordSummary', { weak: weakPct.toFixed(0), strong: (Number(pw.strong?.perc) || 0).toFixed(0) })}
                    </div>
                  </div>
                )}

                {families.length > 0 && (
                  <div className="mt-2 p-2 border border-[#FF1744]/30 bg-[#FF1744]/10 rounded">
                    <span className="text-[11px] font-mono text-[#FF1744] font-bold mb-1 block">{t('hStealerFamilies')}</span>
                    <div className="flex flex-wrap gap-1">
                      {families.slice(0, 14).map(([name, count]) => (
                        <span key={name} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1A1A18] text-[#E8E6E0] border border-[#FF1744]/20">
                          {name} <span className="text-[#FF1744]">{String(count)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(r.thirdPartyDomains) && r.thirdPartyDomains.length > 0 && (
                  <div className="mt-2 p-2 border border-[var(--border-secondary)]/30 rounded">
                    <span className="text-[11px] font-mono text-[var(--text-secondary)] font-bold mb-1 block">
                      {t('hTopThirdParty', { n: r.thirdPartyDomains.length })}
                    </span>
                    {r.thirdPartyDomains.slice(0, 8).map((d: any) => (
                      <div key={d.domain} className="flex items-center justify-between py-0.5">
                        <span className="text-[10px] font-mono text-[var(--text-primary)] break-all">{d.domain}</span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] flex-shrink-0 ml-2">{d.occurrence}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <HudsonRockCredit />
          </div>
        );
      }

      // email / username / phone — one card per compromised machine.
      const stealers: any[] = Array.isArray(r.stealers) ? r.stealers : [];
      return (
        <div>
          <SectionHeader title={t('hInfostealer')} icon={Skull} color={accent} />
          <ResultRow label={t(TYPE_LABEL[r.type] || 'typeTarget')} value={r.query} color={accent} />
          <ResultRow label={t('lblStatus')} value={hit ? t('compromised') : t('notFoundInCorpus')} color={accent} />
          {hit && (
            <>
              <ResultRow label={t('lblMachines')} value={stealers.length} color="#FF1744" />
              <ResultRow label={t('lblCorpSvcs')} value={r.total_corporate_services} />
              <ResultRow label={t('lblUserSvcs')} value={r.total_user_services} />

              {stealers.map((s: any, i: number) => (
                <div key={i} className="mt-2 p-2 rounded border border-[#FF1744]/30 bg-[#FF1744]/5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Monitor className="w-3 h-3 text-[#FF1744]" />
                    <span className="text-[11px] font-mono font-bold text-[#FF1744] break-all">
                      {s.computer_name || t('unknownMachine')}
                    </span>
                  </div>
                  <ResultRow label={t('lblCompromised')} value={s.date_compromised?.slice(0, 10)} color="#FF9500" />
                  <ResultRow label={t('lblStealer')} value={s.stealer_family} color="#FF9500" />
                  <ResultRow label="OS" value={s.operating_system} />
                  <ResultRow label="IP" value={s.ip} />
                  <ResultRow label="Antivirus" value={(s.antiviruses || []).join(', ')} />
                  <ResultRow label={t('lblMalwarePath')} value={s.malware_path} />

                  {(s.top_logins?.length > 0 || s.top_passwords?.length > 0) && (
                    <div className="mt-1.5 pt-1.5 border-t border-[#FF1744]/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <KeyRound className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                          {t('credentialsRedacted')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(s.top_logins || []).map((l: string, j: number) => (
                          <span key={`l${j}`} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1A1A18] text-[#87CEEB] border border-[#87CEEB]/20 break-all">{l}</span>
                        ))}
                        {(s.top_passwords || []).map((p: string, j: number) => (
                          <span key={`p${j}`} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1A1A18] text-[#E040FB] border border-[#E040FB]/20 break-all">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          {!hit && r.message && (
            <div className="mt-2 text-[10px] font-mono text-[var(--text-muted)] leading-relaxed">
              {String(r.message).split('Visit')[0].trim()}
            </div>
          )}
          <HudsonRockCredit />
        </div>
      );
    }

    // ── CERTS ──
    if (activeTab === 'certs') {
      const certs = r.certificates || r.certs || (Array.isArray(r) ? r : []);
      return (
        <div>
          <SectionHeader title={t('hCertTransparency')} icon={Lock} color="#E040FB" />
          <ResultRow label={t('lblDomain')} value={query} color="#E040FB" />
          <ResultRow label={t('lblCertificates')} value={Array.isArray(certs) ? certs.length : 0} />
          {Array.isArray(certs) && certs.slice(0, 15).map((c: any, i: number) => (
            <div key={i} className="mt-1.5 p-2 rounded border border-[var(--border-secondary)]/30 bg-[var(--bg-tertiary)]/30">
              <ResultRow label={t('lblIssuer')} value={c.issuer_name || c.issuer} />
              <ResultRow label={t('lblCommonName')} value={c.common_name || c.name_value} />
              <ResultRow label={t('lblNotBefore')} value={c.not_before} />
              <ResultRow label={t('lblNotAfter')} value={c.not_after} />
            </div>
          ))}
          {(!Array.isArray(certs) || certs.length === 0) && renderFallback()}
        </div>
      );
    }

    // ── THREATS ──
    if (activeTab === 'threats') {
      return (
        <div>
          <SectionHeader title={t('hThreatIntel')} icon={AlertTriangle} color="#FF9500" />
          <ResultRow label={t('lblQuery')} value={query} color="#FF9500" />
          <ResultRow label={t('lblRiskScore')} value={r.risk_score || r.score} color={
            (r.risk_score || r.score || 0) > 70 ? '#FF3D3D' : (r.risk_score || r.score || 0) > 40 ? '#FF9500' : '#00E676'
          } />
          <ResultRow label={t('lblMalicious')} value={r.malicious !== undefined ? (r.malicious ? t('yes') : t('no')) : undefined} color={r.malicious ? '#FF3D3D' : '#00E676'} />
          <ResultRow label={t('lblCategory')} value={r.category || r.type} />
          <ResultRow label={t('lblReports')} value={r.total_reports || r.reports} />
          <ResultRow label={t('lblLastSeen')} value={r.last_seen || r.last_analysis} />
          {r.tags && <ResultRow label={t('lblTags')} value={Array.isArray(r.tags) ? r.tags.join(', ') : r.tags} />}
          {renderFallbackExcluding(['risk_score','score','malicious','category','type','total_reports','reports','last_seen','last_analysis','tags','timestamp','cached','query'])}
        </div>
      );
    }

    // ── SSL ──
    if (activeTab === 'ssl') {
      return (
        <div>
          <SectionHeader title={t('hSsl')} icon={Shield} color="#76FF03" />
          <ResultRow label={t('lblTarget')} value={query} color="#76FF03" />
          <ResultRow label={t('lblProtocol')} value={r.protocol || r.tls_version} />
          <ResultRow label={t('lblCipher')} value={r.cipher || r.cipher_suite} />
          <ResultRow label={t('lblValid')} value={r.valid !== undefined ? (r.valid ? t('yes') : t('no')) : undefined} color={r.valid ? '#00E676' : '#FF3D3D'} />
          <ResultRow label={t('lblIssuer')} value={r.issuer} />
          <ResultRow label={t('lblSubject')} value={r.subject} />
          <ResultRow label={t('lblExpires')} value={r.expires || r.not_after} />
          <ResultRow label={t('lblSans')} value={Array.isArray(r.sans) ? r.sans.join(', ') : r.sans} />
          {renderFallback()}
        </div>
      );
    }



    // Fallback for other tools
    return renderFallback();
  };

  const renderFallback = () => {
    if (!results) return null;
    return (
      <div className="space-y-1">
        {Object.entries(results).filter(([k]) => !['timestamp','cached'].includes(k)).map(([key, value]) => (
          <ResultRow key={key} label={key.replace(/_/g, ' ')} value={typeof value === 'object' ? JSON.stringify(value, null, 1) : String(value)} />
        ))}
      </div>
    );
  };

  const renderFallbackExcluding = (exclude: string[]) => {
    if (!results) return null;
    const extra = Object.entries(results).filter(([k]) => !exclude.includes(k));
    if (extra.length === 0) return null;
    return (
      <div className="mt-2 space-y-1">
        {extra.map(([key, value]) => (
          <ResultRow key={key} label={key.replace(/_/g, ' ')} value={typeof value === 'object' ? JSON.stringify(value, null, 1) : String(value)} />
        ))}
      </div>
    );
  };

  /* ── Expanded-view tool rail ──────────────────────────────────
     Fullscreen has room for the full label plus a one-line description, so
     the toolkit becomes a readable list rather than a grid of abbreviations. */
  const renderToolRail = () => (
    <div className="flex flex-col h-full">
      <div className="relative p-3 pb-2 flex-shrink-0">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
        <input
          value={toolFilter}
          onChange={e => setToolFilter(e.target.value)}
          placeholder={t('filterTools')}
          className="w-full bg-[var(--bg-primary)]/60 border border-[var(--border-primary)] rounded-lg pl-8 pr-7 py-2 text-[10px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 focus:outline-none"
        />
        {toolFilter && (
          <button onClick={() => setToolFilter('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 styled-scrollbar">
        {GROUPS.map(group => {
          const tools = TABS.filter(tool => tool.group === group.id && matchesFilter(tool));
          if (!tools.length) return null;
          return (
            <div key={group.id} className="mb-3 last:mb-0">
              <div className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-muted)]/70 mb-1.5 pt-1">
                {t(group.label)}
              </div>
              <div className="flex flex-col gap-0.5">
                {tools.map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => selectTool(tab.id)}
                      className="group flex items-start gap-2.5 px-2 py-1.5 rounded-lg border text-left transition-all"
                      style={{
                        borderColor: active ? `${tab.color}55` : 'transparent',
                        background: active ? `${tab.color}14` : undefined,
                      }}
                    >
                      <tab.icon
                        className="w-4 h-4 mt-0.5 flex-shrink-0 transition-colors"
                        style={{ color: active ? tab.color : 'var(--text-muted)' }}
                      />
                      <span className="min-w-0">
                        <span
                          className="block text-[10px] font-mono font-bold tracking-wider leading-tight"
                          style={{ color: active ? tab.color : 'var(--text-secondary)' }}
                        >
                          {t(tab.label)}
                        </span>
                        <span className="block text-[10px] font-mono text-[var(--text-muted)] leading-snug">
                          {t(tab.blurb)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {toolFilter && !TABS.some(matchesFilter) && (
          <div className="text-[11px] font-mono text-[var(--text-muted)] py-3 text-center">
            {t('noToolMatches', { q: toolFilter })}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-[var(--border-secondary)] flex-shrink-0">
        <button
          onClick={handleSelfTrack}
          disabled={loading}
          className={`w-full py-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${loading ? 'opacity-60 cursor-wait' : 'hover:bg-[var(--hover-accent)]'}`}
          style={{ borderColor: 'rgba(0, 230, 118, 0.25)' }}
        >
          <LocateFixed className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: '#00E676' }} />
          <span className="font-mono font-bold tracking-[0.1em] text-[11px]" style={{ color: '#00E676' }}>
            {loading ? t('tracking') : t('selfTrack')}
          </span>
        </button>
      </div>
    </div>
  );

  const renderContent = () => (
    <div className="flex flex-col gap-2.5">
      {/* Tool grid — omitted entirely in the expanded view, which uses the
          rail instead. Hiding it with CSS would leave a second "Filter tools"
          input in the DOM competing with the rail's. */}
      {!isFullScreen && (
      <div className="flex flex-col gap-1">
        {/* Sweep & Self Track Actions */}
        <div className="grid grid-cols-2 gap-2">
          {TABS.filter(t => t.id === 'sweep').map(tab => (
            <button key={tab.id} onClick={() => { 
                  setActiveTab(tab.id); setQuery(''); setResults(null); setError(''); setSweepResult(null); 
                }}
                className={`w-full py-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
                  activeTab === tab.id ? 'bg-[var(--bg-tertiary)] border-opacity-50' : 'bg-[#0D0D0C] hover:bg-[var(--hover-accent)] border-transparent'
                }`}
                style={{ borderColor: activeTab === tab.id ? tab.color : 'rgba(255, 61, 61, 0.2)' }}
              >
                <div className="flex items-center gap-3">
                  <tab.icon className="w-5 h-5" style={{ color: tab.color }} />
                  <span className="font-mono font-bold tracking-[0.1em] text-[10px]" style={{ color: tab.color }}>{t('globalSweep')}</span>
                </div>
            </button>
          ))}
          <button onClick={handleSelfTrack}
            disabled={loading}
            className={`w-full py-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${loading ? 'opacity-60 cursor-wait' : 'hover:bg-[var(--hover-accent)] hover:shadow-[0_0_20px_rgba(0,230,118,0.15)]'} bg-[#0D0D0C]`}
            style={{ borderColor: 'rgba(0, 230, 118, 0.2)' }}
          >
            <div className="flex items-center gap-3">
              <LocateFixed className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} style={{ color: '#00E676' }} />
              <span className="font-mono font-bold tracking-[0.1em] text-[10px]" style={{ color: '#00E676' }}>{loading ? t('tracking') : t('selfTrack')}</span>
            </div>
          </button>
        </div>
        {/* Toolkit — grouped so 19 modules stay scannable, and at 4 columns
            every label fits without truncation. */}
        <div className="mt-2">
          <div className="relative mb-1.5">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
            <input
              value={toolFilter}
              onChange={e => setToolFilter(e.target.value)}
              placeholder={t('filterTools')}
              className="w-full bg-[var(--bg-primary)]/60 border border-[var(--border-primary)] rounded-lg pl-7 pr-6 py-1.5 text-[10px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 focus:outline-none"
            />
            {toolFilter && (
              <button onClick={() => setToolFilter('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white">
                <XCircle className="w-3 h-3" />
              </button>
            )}
          </div>

          {GROUPS.map(group => {
            const tools = TABS.filter(tool => tool.group === group.id && tool.id !== 'sweep' && matchesFilter(tool));
            if (!tools.length) return null;
            return (
              <div key={group.id} className="mb-2 last:mb-0">
                <div className="text-[9px] font-mono tracking-[0.18em] text-[var(--text-muted)]/60 mb-1">{t(group.label)}</div>
                <div className="grid grid-cols-4 gap-1">
                  {tools.map(tab => (
                    <button key={tab.id} onClick={() => selectTool(tab.id)}
                      title={t(tab.blurb)}
                      className={`flex flex-col items-center gap-1 px-1 py-2 rounded-lg text-[9px] font-mono tracking-wider transition-all border ${activeTab === tab.id ? 'border-opacity-40 bg-opacity-15' : 'border-transparent hover:bg-[var(--hover-accent)]'}`}
                      style={{ borderColor: activeTab === tab.id ? tab.color : 'transparent', backgroundColor: activeTab === tab.id ? `${tab.color}15` : undefined, color: activeTab === tab.id ? tab.color : 'var(--text-muted)' }}>
                      <tab.icon className="w-3.5 h-3.5" />
                      <span className="leading-tight text-center w-full">{t(tab.label)}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {toolFilter && !TABS.some(tool => tool.id !== 'sweep' && matchesFilter(tool)) && (
            <div className="text-[10px] font-mono text-[var(--text-muted)] py-2 text-center">
              {t('noToolMatches', { q: toolFilter })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Input Area */}
      <div className="flex flex-col gap-1.5">
        {/* CHAIN INTEL view switch — the brief takes no target. */}
        {activeTab === 'crypto' && (
          <div className="flex gap-1">
            {([['brief', t('dailyBrief')], ['wallet', t('walletForensics')]] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setChainView(id)}
                className="px-2 py-1 rounded text-[10px] font-mono font-bold tracking-wider transition-colors"
                style={{
                  color: chainView === id ? currentTab?.color : 'var(--text-muted)',
                  background: chainView === id ? `${currentTab?.color}1a` : 'transparent',
                  border: `1px solid ${chainView === id ? `${currentTab?.color}55` : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {!(activeTab === 'crypto' && chainView === 'brief') && (
        <div className="flex gap-1.5">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runLookup()}
              placeholder={currentTab ? t(currentTab.placeholder) : undefined}
              className="w-full bg-[var(--bg-primary)]/60 border border-[var(--border-primary)] rounded-lg pl-8 pr-3 py-2.5 text-[10px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 focus:outline-none transition-colors"
              style={{ borderColor: query ? `${currentTab?.color}40` : undefined }} />
          </div>
          <button onClick={runLookup} disabled={loading || !query.trim()}
            className="px-4 py-2 rounded-lg text-[11px] font-mono font-bold tracking-wider disabled:opacity-30 transition-all flex items-center justify-center min-w-[70px]"
            style={{ backgroundColor: `${currentTab?.color}20`, border: `1px solid ${currentTab?.color}40`, color: currentTab?.color }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('scan')}
          </button>
        </div>
        )}

        {/* Secondary Controls */}
        {activeTab === 'scanner' && (
          <select value={scanType} onChange={e => setScanType(e.target.value)}
            className="bg-[var(--bg-primary)]/60 border border-[var(--border-primary)] rounded-lg px-2 py-1.5 text-[11px] font-mono text-[var(--text-muted)] outline-none w-full">
            <option value="quick">{t('quickScan')}</option><option value="deep">{t('deepScan')}</option><option value="ports">{t('top1000')}</option>
          </select>
        )}
        {activeTab === 'sweep' && (
          <div className="flex items-center justify-between bg-[var(--bg-primary)]/60 border border-[var(--border-primary)] rounded-lg p-1">
            <span className="text-[10px] font-mono text-[var(--text-muted)] pl-2">{t('subnetMask')}</span>
            <div className="flex items-center gap-0.5">
              {[24, 25, 26, 27, 28].map(c => (
                <button key={c} onClick={() => setSweepCidr(c)}
                  className={`px-2 py-1 text-[11px] font-mono rounded transition-all ${
                    sweepCidr === c ? 'bg-[#FF3D3D]/20 text-[#FF3D3D]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >/{c}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-[10px] font-mono text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </div>
      )}

      {/* Sweep Progress */}
      {sweepProgress && loading && (
        <div className="p-3 rounded-lg border border-[#FF3D3D]/30 bg-[#FF3D3D]/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono tracking-wider text-[#FF3D3D]">{t('sweepingSubnet')}</span>
            <span className="text-[11px] font-mono text-[#E8E6E0]">{t('hostsCount', { n: sweepProgress.total })}</span>
          </div>
          <div className="w-full h-1.5 bg-[#1A1A18] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg, #FF3D3D, #FF6B00, #FFD700)', animation: 'sweep-pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      )}

      {/* Sweep Results */}
      {sweepResult && !loading && activeTab === 'sweep' && (
        <div className="bg-[var(--bg-primary)]/40 border border-[var(--border-primary)] rounded-lg overflow-hidden max-h-[55vh] overflow-y-auto styled-scrollbar">
          {/* Summary */}
          <div className="p-3 border-b border-[#2A2A28]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-mono tracking-wider text-[#E8E6E0]">{sweepResult.subnet}</div>
                <div className="text-[10px] font-mono text-[#5C5A54]">{sweepResult.center.city}, {sweepResult.center.country} · {sweepResult.center.isp}</div>
              </div>
              <div className="text-right">
                <div className="text-[18px] font-mono font-bold text-[#FF3D3D]">{sweepResult.summary.total_responsive}</div>
                <div className="text-[9px] font-mono text-[#5C5A54] tracking-wider">{t('devicesFound')}</div>
              </div>
            </div>
            {/* Breakdown Bar */}
            <div className="flex h-2 rounded-full overflow-hidden bg-[#1A1A18] mb-2">
              {Object.entries(sweepResult.summary.device_breakdown).map(([type, count]: [string, any]) => {
                const device = sweepResult.devices.find((d: any) => d.device_type === type);
                return <div key={type} style={{ width: `${(count / sweepResult.summary.total_responsive) * 100}%`, backgroundColor: device?.device_color || '#666' }} title={`${type}: ${count}`} />;
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(sweepResult.summary.device_breakdown).map(([type, count]: [string, any]) => {
                const device = sweepResult.devices.find((d: any) => d.device_type === type);
                return (
                  <div key={type} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: device?.device_color || '#666' }} />
                    <span className="text-[10px] font-mono text-[#8A8880]">{type}</span>
                    <span className="text-[10px] font-mono text-[#E8E6E0] font-bold">{String(count)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Visualize Button */}
          <div className="p-3 border-b border-[#2A2A28]">
            <button onClick={() => onSweepVisualize?.(sweepResult)}
              className="w-full py-2.5 rounded-lg font-mono text-[10px] tracking-wider font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, rgba(255,61,61,0.2), rgba(255,107,0,0.2))', border: '1px solid rgba(255,61,61,0.5)', color: '#FF3D3D', textShadow: '0 0 10px rgba(255,61,61,0.5)' }}
            >
              <Globe className="w-4 h-4" /> {t('visualizeOnGlobe')}
            </button>
          </div>
          {/* Device List */}
          <div className={isFullScreen ? "flex flex-col gap-3 p-4" : "divide-y divide-[#2A2A28]"}>
            {sweepResult.devices.map((device: any) => {
              const isExpanded = expandedDevice === device.ip;
              return (
              <div key={device.ip} className={isFullScreen
                ? "bg-[#0D0D0C] border border-[#2A2A28] rounded-lg overflow-hidden hover:border-[#3A3A38] transition-colors"
                : "px-3 py-2.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              }>
                {/* Device Header */}
                <div
                  className={isFullScreen
                    ? "flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#151514] transition-colors"
                    : "flex items-center justify-between mb-1"
                  }
                  onClick={() => {
                    if (!isFullScreen) return;
                    const next = isExpanded ? null : device.ip;
                    setExpandedDevice(next);
                    if (next && device.vulns.length > 0) fetchCveDetails(device.vulns);
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: device.device_color }} />
                    <span className={`flex-shrink-0 ${isFullScreen ? "text-[14px]" : "text-[10px]"} font-mono font-bold text-[#E8E6E0]`}>{device.ip}</span>
                    {device.hostnames.length > 0 && (
                      <span className={`${isFullScreen ? "text-[10px]" : "text-[10px]"} font-mono text-[#5C5A54] truncate min-w-0`}>{device.hostnames[0]}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {device.vulns.length > 0 && (
                      <span className={`${isFullScreen ? "text-[11px]" : "text-[9px]"} font-mono px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap`}>
                        {t('cvesCount', { n: device.vulns.length })}
                      </span>
                    )}
                    <span className={`${isFullScreen ? "text-[11px]" : "text-[9px]"} font-mono px-1.5 py-0.5 rounded whitespace-nowrap`} style={{ backgroundColor: device.device_color + '20', color: device.device_color, border: `1px solid ${device.device_color}40` }}>{device.device_type}</span>
                    {isFullScreen && (
                      <ChevronDown className={`w-4 h-4 text-[#5C5A54] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </div>

                {/* Compact info (sidebar mode) */}
                {!isFullScreen && (
                  <>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#5C5A54]">
                      <span>{t('portsList', { list: device.ports.slice(0, 8).join(', ') })}{device.ports.length > 8 ? ` +${device.ports.length - 8}` : ''}</span>
                      {device.vulns.length > 0 && (
                        <div className="group relative flex items-center gap-1 cursor-help">
                          <span className="text-[#FF3D3D] flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> {t('cvesCount', { n: device.vulns.length })}
                          </span>
                          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 p-2 bg-[#1A1A18] border border-[#FF3D3D50] rounded-md shadow-xl min-w-[140px] max-w-[220px] max-h-[150px] overflow-y-auto styled-scrollbar">
                            <div className="text-[9px] font-mono text-[#FF3D3D] mb-1 tracking-wider uppercase border-b border-[#FF3D3D30] pb-1">{t('identifiedVulns')}</div>
                            <div className="flex flex-col gap-0.5">
                              {device.vulns.map((cve: string) => (
                                <a key={cve} href={`https://nvd.nist.gov/vuln/detail/${cve}`} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-[#E8E6E0] hover:text-[#FF3D3D] transition-colors truncate">
                                  {cve}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {device.hostnames.length > 0 && <div className="text-[10px] font-mono text-[#8A8880] mt-0.5 truncate">{device.hostnames[0]}</div>}
                  </>
                )}

                {/* Full-Screen Expanded Detail */}
                {isFullScreen && isExpanded && (
                  <div className="border-t border-[#2A2A28]">
                    {/* Ports + Hostnames Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#2A2A28]">
                      <div className="bg-[#0D0D0C] p-4">
                        <div className="text-[11px] font-mono text-[#5C5A54] tracking-widest uppercase mb-2">{t('lblOpenPorts')}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {device.ports.map((port: number) => (
                            <span key={port} className="px-2 py-1 bg-[#1A1A18] border border-[#2A2A28] rounded text-[10px] font-mono text-[var(--cyan-primary)]">{port}</span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-[#0D0D0C] p-4">
                        <div className="text-[11px] font-mono text-[#5C5A54] tracking-widest uppercase mb-2">{t('lblHostnames')}</div>
                        {device.hostnames.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {device.hostnames.map((h: string) => (
                              <span key={h} className="text-[10px] font-mono text-[#E8E6E0]">{h}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-[#3A3A38]">{t('noReverseDns')}</span>
                        )}
                      </div>
                    </div>

                    {/* CVE Intelligence */}
                    {device.vulns.length > 0 && (
                      <div className="p-4 border-t border-[#2A2A28]">
                        <div className="text-[11px] font-mono text-[#5C5A54] tracking-widest uppercase mb-3">{t('hVulnerabilities', { n: device.vulns.length })}</div>
                        <div className="flex flex-col gap-2">
                          {device.vulns.map((cveId: string) => {
                            const info = cveCache[cveId];
                            const isLoading = !info || info.loading;
                            const severityColor = !info?.severity ? '#5C5A54'
                              : info.severity === 'CRITICAL' ? '#FF3D3D'
                              : info.severity === 'HIGH' ? '#FF6B00'
                              : info.severity === 'MEDIUM' ? '#FFD700'
                              : '#76FF03';
                            return (
                              <div key={cveId} className="bg-[#111] border border-[#2A2A28] rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono font-bold text-[#E8E6E0]">{cveId}</span>
                                    {info?.cvss != null && (
                                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: severityColor + '15', color: severityColor, border: `1px solid ${severityColor}40` }}>CVSS {info.cvss}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {info?.severity && (
                                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ backgroundColor: severityColor + '15', color: severityColor, border: `1px solid ${severityColor}40` }}>{info.severity}</span>
                                    )}
                                    <a href={`https://nvd.nist.gov/vuln/detail/${cveId}`} target="_blank" rel="noreferrer" className="text-[#5C5A54] hover:text-[#E8E6E0] transition-colors">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                                {isLoading ? (
                                  <div className="flex items-center gap-2 py-1">
                                    <Loader2 className="w-3 h-3 animate-spin text-[#5C5A54]" />
                                    <span className="text-[11px] font-mono text-[#5C5A54]">{t('fetchingVulnIntel')}</span>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-[10px] font-mono text-[#8A8880] leading-relaxed">{info.description}</p>
                                    {info.cwe && <div className="text-[11px] font-mono text-[#5C5A54] mt-2">{t('weakness', { cwe: info.cwe })}</div>}
                                    {info.affected && info.affected.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {info.affected.map((a: any, i: number) => (
                                          <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 bg-[#1A1A18] border border-[#2A2A28] rounded text-[#8A8880]">
                                            {a.vendor}/{a.product}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
          <div className="px-3 py-2 border-t border-[#2A2A28]">
            <div className="text-[9px] font-mono text-[#5C5A54] tracking-wider">{t('sweptSummary', { hosts: sweepResult.summary.total_hosts, secs: (sweepResult.sweep_time_ms / 1000).toFixed(1), asn: sweepResult.center.asn })}</div>
          </div>
        </div>
      )}

      {(results || (activeTab === 'crypto' && chainView === 'brief')) && !(sweepResult && !loading) && (
        <div className="bg-[var(--bg-primary)]/40 border border-[var(--border-primary)] rounded-lg p-3 max-h-[50vh] overflow-y-auto styled-scrollbar">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono tracking-widest" style={{ color: currentTab?.color }}>{t('resultsTitle', { tool: currentTab ? t(currentTab.label) : '' })}</span>
            <span className="text-[9px] font-mono text-[var(--text-muted)] flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{new Date().toLocaleTimeString(locale)}</span>
          </div>
          {renderStructuredResults()}
        </div>
      )}

      {history.length > 0 && !results && (
        <div className="space-y-1">
          <span className="text-[10px] font-mono tracking-widest text-[var(--text-muted)]">{t('recentScans')}</span>
          {history.slice(0, 5).map((h, i) => (
            <button key={i} onClick={() => { setActiveTab(h.tab); setQuery(h.query); }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--hover-accent)] transition-colors text-left">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono" style={{ color: TABS.find(tool => tool.id === h.tab)?.color }}>{tabLabel(h.tab)}</span>
                <span className="text-[11px] font-mono text-[var(--text-secondary)]">{h.query}</span>
              </div>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">{h.time}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (isMobile) return renderContent();

  if (isFullScreen) {
    const fullScreenNode = (
      <div className="fixed inset-4 z-[999] flex items-center justify-center">
        {/* Click-away backdrop; Escape also exits. */}
        <div className="absolute inset-[-1rem] bg-black/60 backdrop-blur-sm" onClick={() => setIsFullScreen(false)} />

        <div className="relative w-full h-full max-w-[1500px] glass-panel bg-[#0a0a09]/97 backdrop-blur-2xl border border-[var(--cyan-primary)]/40 rounded-xl flex flex-col overflow-hidden shadow-2xl shadow-[var(--cyan-primary)]/20">
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--border-secondary)] bg-[#111] flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Radar className="w-5 h-5 text-[var(--cyan-primary)] flex-shrink-0" />
              <span className="hud-text text-[16px] text-[var(--text-primary)]">MinervaAI RECON TOOLKIT</span>
              <span className="gotham-tag gotham-tag--classified" style={{ fontSize: '9px' }}>{t('modulesCount', { n: TABS.length })}</span>
              {currentTab && (
                <>
                  <span className="text-[var(--text-muted)]/40">/</span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <currentTab.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: currentTab.color }} />
                    <span className="text-[11px] font-mono font-bold tracking-wider truncate" style={{ color: currentTab.color }}>
                      {t(currentTab.label)}
                    </span>
                  </span>
                </>
              )}
            </div>
            <button onClick={() => setIsFullScreen(false)} className="p-2 hover:bg-white/5 rounded transition-colors text-[var(--text-muted)] hover:text-white flex-shrink-0" title={t('exitExpanded')}>
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>

          {/* Two panes: the toolkit stays visible while results use the width. */}
          <div className="flex-1 flex min-h-0">
            <aside className="w-[260px] flex-shrink-0 border-r border-[var(--border-secondary)] bg-[#0d0d0c]/60">
              {renderToolRail()}
            </aside>
            <main className="flex-1 min-w-0 overflow-y-auto p-6 styled-scrollbar">
              <div className="w-full full-screen-mode-content max-w-[1000px]">
                {currentTab && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2.5 mb-1">
                      <currentTab.icon className="w-5 h-5" style={{ color: currentTab.color }} />
                      <h2 className="text-[15px] font-mono font-bold tracking-widest" style={{ color: currentTab.color }}>
                        {t(currentTab.label)}
                      </h2>
                    </div>
                    <p className="text-[11px] font-mono text-[var(--text-muted)]">{t(currentTab.blurb)}</p>
                  </div>
                )}
                {renderContent()}
              </div>
            </main>
          </div>
        </div>
      </div>
    );
    return typeof document !== 'undefined' ? createPortal(fullScreenNode, document.body) : fullScreenNode;
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="glass-panel flex flex-col overflow-hidden pointer-events-auto shrink-0 h-[500px] max-h-[80vh] resize-y">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.3)] hover:bg-[var(--hover-accent)] transition-colors">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1">
          <Radar className="w-3.5 h-3.5 text-[var(--cyan-primary)]" />
          <span className="hud-text text-[11px] text-[var(--text-primary)]">RECON TOOLKIT</span>
          <span className="gotham-tag gotham-tag--info" style={{ fontSize: '9px', padding: '1px 5px' }}>{t('toolsCount', { n: TABS.length })}</span>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsFullScreen(true)} className="p-1.5 -m-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors" title={t('fullScreen')}>
             <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan-primary)] animate-osiris-pulse" />
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-y-auto px-3 py-3 flex-1 min-h-0 styled-scrollbar">
            {renderContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const OsintPanel = memo(OsintPanelInner);
export default OsintPanel;
