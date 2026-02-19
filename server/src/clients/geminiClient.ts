import { GoogleGenAI } from '@google/genai'
import * as dotenv from 'dotenv'
import {
  ClientApiKeyError,
  ClientUnavailableError,
  ClientApiError,
} from './errors.js'
import { ClientProvider } from './providers.js'
import { LlmProvider } from './llmProvider.js'
import { TranscriptionOptions } from './asrConfig.js'
import { IntentTranscriptionOptions } from './intentTranscriptionConfig.js'

dotenv.config()

class GeminiClient implements LlmProvider {
  private readonly _client: GoogleGenAI
  private readonly _defaultModel: string
  private readonly _isValid: boolean

  constructor(apiKey: string, defaultModel: string) {
    if (!apiKey) {
      throw new ClientApiKeyError(ClientProvider.GEMINI)
    }
    this._client = new GoogleGenAI({ apiKey })
    this._defaultModel = defaultModel
    this._isValid = true
  }

  public get isAvailable(): boolean {
    return this._isValid
  }

  public async transcribeAudio(
    audioBuffer: Buffer,
    options?: TranscriptionOptions,
  ): Promise<string> {
    if (!this.isAvailable) {
      throw new ClientUnavailableError(ClientProvider.GEMINI)
    }

    try {
      let promptText =
        'Transcris ce fichier audio en français, mot à mot, fidèlement. Retourne UNIQUEMENT le texte transcrit, sans formatage, sans commentaire, sans explication. Conserve les noms propres (Ito, Arka) tels quels. Si tu ne détectes pas de parole, retourne une chaîne vide.'

      const vocabulary = options?.vocabulary
      if (vocabulary && vocabulary.length > 0) {
        promptText += `\nMots importants à reconnaître dans l'audio: ${vocabulary.join(', ')}`
      }

      const response = await this._client.models.generateContent({
        model: options?.asrModel || this._defaultModel,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/wav',
                  data: audioBuffer.toString('base64'),
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
      })

      return response.text?.trim() || ''
    } catch (error: any) {
      console.error('An error occurred during Gemini transcription:', error)

      const errorMessage = error.message || 'An unknown error occurred'

      throw new ClientApiError(
        errorMessage,
        ClientProvider.GEMINI,
        error,
        error.status || error.statusCode,
      )
    }
  }

  public async adjustTranscript(
    userPrompt: string,
    options?: IntentTranscriptionOptions,
  ): Promise<string> {
    if (!this.isAvailable) {
      throw new ClientUnavailableError(ClientProvider.GEMINI)
    }

    try {
      const response = await this._client.models.generateContent({
        model: options?.model || this._defaultModel,
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        config: {
          systemInstruction:
            options?.prompt ||
            'Adjust and improve this transcript for clarity and accuracy.',
          temperature: options?.temperature ?? 0.1,
        },
      })

      return response.text?.trim() || ' '
    } catch (error: any) {
      console.error('An error occurred during transcript adjustment:', error)
      return userPrompt
    }
  }
}

// --- Singleton Instance ---
const apiKey = process.env.GEMINI_API_KEY

let geminiClient: GeminiClient | null = null

if (apiKey) {
  try {
    geminiClient = new GeminiClient(apiKey, 'gemini-2.5-flash-lite')
    console.log('Gemini client initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Gemini client:', error)
    geminiClient = null
  }
} else {
  console.log('GEMINI_API_KEY not set - Gemini client will not be available')
}

export { geminiClient }
