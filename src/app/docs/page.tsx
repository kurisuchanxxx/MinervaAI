import type { Metadata } from 'next';
import DocsClient from './DocsClient';
import { ENDPOINT_COUNT } from './apiCatalog';

export const metadata: Metadata = {
  title: 'Documentazione e riferimento API',
  description: `Documentazione ufficiale di MinervaAI: guida al self-hosting, guida all’interfaccia e riferimento API completo per tutti i ${ENDPOINT_COUNT} endpoint, con feed di aviazione, traffico marittimo, sismologia, conflitti, cyber e OSINT. Nessuna API key richiesta.`,
  alternates: { canonical: '/docs' },
  openGraph: {
    title: 'MinervaAI — Documentazione e riferimento API',
    description: `Guida al self-hosting, guida all’interfaccia e riferimento API completo per tutti i ${ENDPOINT_COUNT} endpoint di MinervaAI.`,
    url: '/docs',
    type: 'article',
  },
};

export default function DocsPage() {
  return <DocsClient />;
}
