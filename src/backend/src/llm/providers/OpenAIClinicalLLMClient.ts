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

interface OpenAIConfig extends ClinicalLLMProviderConfig {
  apiKey: string;
  baseUrl: string;
}

function extractOpenAIText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const root = payload as Record<string, unknown>;
  if (typeof root.output_text === 'string') {
    return root.output_text;
  }

  const output = root.output;
  if (!Array.isArray(output)) {
    return '';
  }

  for (const item of output) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) {
      continue;
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
  }

  return '';
}

export class OpenAIClinicalLLMClient implements ClinicalLLMClient {
  private readonly config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
  }

  public async generateOpinion(
    input: ClinicalLLMRequest,
  ): Promise<ClinicalLLMResponse | null> {
    const endpoint = `${this.config.baseUrl.replace(/\/+$/, '')}/responses`;
    const payload = await postJson({
      url: endpoint,
      timeoutMs: this.config.timeoutMs,
      maxRetries: this.config.maxRetries,
      retryDelayMs: this.config.retryDelayMs,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: {
        model: this.config.model,
        temperature: 0.1,
        max_output_tokens: 600,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'text',
                text: buildClinicalSystemPrompt(),
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: buildClinicalUserPrompt(input),
              },
            ],
          },
        ],
      },
    });

    return parseLLMJsonText(extractOpenAIText(payload));
  }
}
