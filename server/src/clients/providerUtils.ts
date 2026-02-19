import { LlmProvider } from './llmProvider.js'
import { ClientProvider } from './providers.js'
import { groqClient } from './groqClient.js'
import { cerebrasClient } from './cerebrasClient.js'
import { geminiClient } from './geminiClient.js'
import { ClientUnavailableError } from './errors.js'

export function getAsrProvider(providerName: string): LlmProvider {
  switch (providerName) {
    case ClientProvider.GROQ:
      if (!groqClient || !groqClient.isAvailable) {
        throw new ClientUnavailableError(ClientProvider.GROQ)
      }
      return groqClient
    case ClientProvider.GEMINI:
      if (!geminiClient || !geminiClient.isAvailable) {
        throw new ClientUnavailableError(ClientProvider.GEMINI)
      }
      return geminiClient
    default:
      throw new ClientUnavailableError(providerName as ClientProvider)
  }
}

export function getLlmProvider(providerName: string): LlmProvider {
  switch (providerName) {
    case ClientProvider.GROQ:
      if (!groqClient || !groqClient.isAvailable) {
        throw new ClientUnavailableError(ClientProvider.GROQ)
      }
      return groqClient
    case ClientProvider.CEREBRAS:
      if (!cerebrasClient || !cerebrasClient.isAvailable) {
        throw new ClientUnavailableError(ClientProvider.CEREBRAS)
      }
      return cerebrasClient
    case ClientProvider.GEMINI:
      if (!geminiClient || !geminiClient.isAvailable) {
        throw new ClientUnavailableError(ClientProvider.GEMINI)
      }
      return geminiClient
    default:
      throw new ClientUnavailableError(providerName as ClientProvider)
  }
}

export function getAvailableAsrProviders(): ClientProvider[] {
  const providers: ClientProvider[] = []
  if (groqClient && groqClient.isAvailable) {
    providers.push(ClientProvider.GROQ)
  }
  if (geminiClient && geminiClient.isAvailable) {
    providers.push(ClientProvider.GEMINI)
  }
  return providers
}

export function getAvailableLlmProviders(): ClientProvider[] {
  const providers: ClientProvider[] = []
  if (groqClient && groqClient.isAvailable) {
    providers.push(ClientProvider.GROQ)
  }
  if (cerebrasClient && cerebrasClient.isAvailable) {
    providers.push(ClientProvider.CEREBRAS)
  }
  if (geminiClient && geminiClient.isAvailable) {
    providers.push(ClientProvider.GEMINI)
  }
  return providers
}
