import { RiskLevel } from '@copilot-care/shared/types';
import { ClinicalLLMResponse } from './types';

const VALID_RISK_LEVELS: RiskLevel[] = ['L0', 'L1', 'L2', 'L3'];

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toConfidence(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export function parseLLMJsonText(text: string): ClinicalLLMResponse | null {
  const candidates: string[] = [];
  const stripped = stripCodeFences(text);
  const extractedFromStripped = extractJsonObject(stripped);
  if (extractedFromStripped) {
    candidates.push(extractedFromStripped);
  }
  const extractedFromRaw = extractJsonObject(text);
  if (extractedFromRaw && extractedFromRaw !== extractedFromStripped) {
    candidates.push(extractedFromRaw);
  }
  if (candidates.length === 0) {
    candidates.push(stripped);
  }

  let candidate: unknown = null;
  for (const candidateText of candidates) {
    try {
      candidate = JSON.parse(candidateText);
      break;
    } catch {
      continue;
    }
  }

  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const source = candidate as Record<string, unknown>;
  const rawRiskLevel = source.riskLevel;
  const confidence = toConfidence(source.confidence);
  const reasoning = source.reasoning;

  if (typeof rawRiskLevel !== 'string') {
    return null;
  }
  const riskLevel = rawRiskLevel.toUpperCase();

  if (
    !VALID_RISK_LEVELS.includes(riskLevel as RiskLevel)
  ) {
    return null;
  }

  if (confidence === null || Number.isNaN(confidence)) {
    return null;
  }

  if (typeof reasoning !== 'string' || !reasoning.trim()) {
    return null;
  }

  return {
    riskLevel: riskLevel as RiskLevel,
    confidence: Math.min(1, Math.max(0, confidence)),
    reasoning: reasoning.trim(),
    citations: toStringArray(source.citations),
    actions: toStringArray(source.actions),
  };
}
