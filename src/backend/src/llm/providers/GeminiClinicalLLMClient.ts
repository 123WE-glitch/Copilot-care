import { postJson } from '../http';
import { parseLLMJsonText } from '../normalize';
import {
  ClinicalLLMClient,
  ClinicalLLMProviderConfig,
  ClinicalLLMRequest,
  ClinicalLLMResponse,
} from '../types';
import {
  buildClinicalSystemPrompt,
  buildClinicalUserPrompt,
} from '../prompts';

interface GeminiConfig extends ClinicalLLMProviderConfig {
  apiKey: string;
  baseUrl: string;
}

function extractGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const candidates = (payload as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return '';
  }

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }
    const content = (candidate as Record<string, unknown>).content;
    if (!content || typeof content !== 'object') {
      continue;
    }
    const parts = (content as Record<string, unknown>).parts;
    if (!Array.isArray(parts)) {
      continue;
    }

    for (const part of parts) {
      if (!part || typeof part !== 'object') {
        continue;
      }
      const text = (part as Record<string, unknown>).text;
      if (typeof text === 'string' && text.trim()) {
        return text;
      }
    }
  }

  return '';
}

export class GeminiClinicalLLMClient implements ClinicalLLMClient {
  private readonly config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
  }

  public async generateOpinion(
    input: ClinicalLLMRequest,
  ): Promise<ClinicalLLMResponse | null> {
    const base = this.config.baseUrl.replace(/\/+$/, '');
    const model = encodeURIComponent(this.config.model);
    const endpoint = `${base}/models/${model}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`;
    const payload = await postJson({
      url: endpoint,
      timeoutMs: this.config.timeoutMs,
      maxRetries: this.config.maxRetries,
      retryDelayMs: this.config.retryDelayMs,
      headers: {},
      body: {
        systemInstruction: {
          parts: [{ text: buildClinicalSystemPrompt() }],
        },
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 600,
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: buildClinicalUserPrompt(input) }],
          },
        ],
      },
    });

    return parseLLMJsonText(extractGeminiText(payload));
  }
}
