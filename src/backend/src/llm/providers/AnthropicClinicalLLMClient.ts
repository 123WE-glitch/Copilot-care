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

interface AnthropicConfig extends ClinicalLLMProviderConfig {
  apiKey: string;
  baseUrl: string;
}

function extractAnthropicText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const content = (payload as Record<string, unknown>).content;
  if (!Array.isArray(content)) {
    return '';
  }

  for (const block of content) {
    if (!block || typeof block !== 'object') {
      continue;
    }
    const text = (block as Record<string, unknown>).text;
    if (typeof text === 'string' && text.trim()) {
      return text;
    }
  }

  return '';
}

export class AnthropicClinicalLLMClient implements ClinicalLLMClient {
  private readonly config: AnthropicConfig;

  constructor(config: AnthropicConfig) {
    this.config = config;
  }

  public async generateOpinion(
    input: ClinicalLLMRequest,
  ): Promise<ClinicalLLMResponse | null> {
    const endpoint = `${this.config.baseUrl.replace(/\/+$/, '')}/messages`;
    const payload = await postJson({
      url: endpoint,
      timeoutMs: this.config.timeoutMs,
      maxRetries: this.config.maxRetries,
      retryDelayMs: this.config.retryDelayMs,
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model: this.config.model,
        max_tokens: 600,
        temperature: 0.1,
        system: buildClinicalSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: buildClinicalUserPrompt(input),
          },
        ],
      },
    });

    return parseLLMJsonText(extractAnthropicText(payload));
  }
}
