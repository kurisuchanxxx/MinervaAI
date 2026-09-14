import { NextResponse } from 'next/server';
import { buildSitrep, type SitrepInput } from '@/lib/sitrep';
import { createGeminiClient, rotateApiKey } from '@/lib/ai-engine';

/**
 * MinervaAI — SITREP.
 * POST { lang, area, counts, notable } → a situational report.
 * Works with no API key (deterministic generator). When GEMINI_API_KEY_* is
 * set, an analyst narrative is added on top; the structured report is always
 * returned so the client never depends on the model.
 */

export const dynamic = 'force-dynamic';

function getEnvApiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 0) keys.push(key.trim());
  }
  return keys;
}

async function narrative(input: SitrepInput, reportText: string, keys: string[]): Promise<string | null> {
  try {
    const client = createGeminiClient(rotateApiKey(keys));
    const system =
      input.lang === 'it'
        ? 'Sei un analista di intelligence. Dai i fatti strutturati, scrivi un SITREP conciso in italiano (4-6 frasi), tono professionale militare, nessuna intestazione markdown, nessuna speculazione oltre i dati.'
        : 'You are an intelligence analyst. Given the structured facts, write a concise SITREP in English (4-6 sentences), professional military tone, no markdown headers, no speculation beyond the data.';
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: system });
    const result = await model.generateContent(reportText);
    const text = result.response.text().trim();
    return text || null;
  } catch (e) {
    console.warn('[MinervaAI] SITREP narrative failed, using structured report:', e);
    return null;
  }
}

export async function POST(request: Request) {
  let body: Partial<SitrepInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input: SitrepInput = {
    lang: body.lang === 'en' ? 'en' : 'it',
    area: body.area ?? { kind: 'viewport' },
    counts: body.counts ?? {},
    notable: body.notable,
  };

  const report = buildSitrep(input);
  const keys = getEnvApiKeys();
  const ai = keys.length ? await narrative(input, report.text, keys) : null;

  return NextResponse.json({
    ...report,
    narrative: ai,
    source: ai ? 'gemini' : 'heuristic',
  });
}
