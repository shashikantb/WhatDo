import type { AIProvider } from "./types";
import { MockAIProvider } from "./provider.mock";
import { OpenAIProvider } from "./provider.openai";

export * from "./types";
export { MockAIProvider } from "./provider.mock";
export { OpenAIProvider } from "./provider.openai";

let cachedProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    cachedProvider = new OpenAIProvider();
  } else {
    cachedProvider = new MockAIProvider();
  }
  return cachedProvider;
}
