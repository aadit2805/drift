import { ElevenLabsClient } from 'elevenlabs'
import { Readable } from 'stream'

// Default voice options - calm, trustworthy voices good for financial content
const VOICE_OPTIONS = {
  rachel: '21m00Tcm4TlvDq8ikWAM', // Rachel - warm, professional
  adam: 'pNInz6obpgDQGcFmaJgB', // Adam - deep, authoritative
  josh: 'TxGEqnHWrfWFTfGW9XjX', // Josh - friendly, approachable
  bella: 'EXAVITQu4vr4xnSDxMaL', // Bella - soft, reassuring
} as const

type VoiceName = keyof typeof VOICE_OPTIONS

// Initialize ElevenLabs client only if API key is present
const client = process.env.ELEVENLABS_API_KEY
  ? new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  : null

export class ElevenLabsService {
  private defaultVoice: string

  constructor() {
    // Use configured voice or default to Rachel
    const configuredVoice = process.env.ELEVENLABS_VOICE_ID || 'rachel'
    this.defaultVoice = VOICE_OPTIONS[configuredVoice as VoiceName] || VOICE_OPTIONS.rachel
  }

  async generateAudio(
    text: string,
    options?: {
      voice?: VoiceName
      modelId?: string
    }
  ): Promise<Buffer> {
    if (!client) {
      throw new Error('ElevenLabs API key not configured')
    }

    const voiceId = options?.voice
      ? VOICE_OPTIONS[options.voice]
      : this.defaultVoice

    try {
      // Use the textToSpeech.convert method
      const audioStream = await client.textToSpeech.convert(voiceId, {
        text,
        model_id: options?.modelId || 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      })

      // Convert the stream to a buffer
      const chunks: Buffer[] = []
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk))
      }

      return Buffer.concat(chunks)
    } catch (error) {
      console.error('ElevenLabs audio generation error:', error)
      throw error
    }
  }

  async generateAudioStream(
    text: string,
    options?: {
      voice?: VoiceName
      modelId?: string
    }
  ): Promise<Readable> {
    if (!client) {
      throw new Error('ElevenLabs API key not configured')
    }

    const voiceId = options?.voice
      ? VOICE_OPTIONS[options.voice]
      : this.defaultVoice

    try {
      // Use the textToSpeech.convertAsStream method
      const audioStream = await client.textToSpeech.convertAsStream(voiceId, {
        text,
        model_id: options?.modelId || 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      })

      // Convert AsyncIterable to Node.js Readable stream
      const readable = new Readable({
        read() {},
      })

      // Process the async iterable and push to readable stream
      ;(async () => {
        try {
          for await (const chunk of audioStream) {
            readable.push(Buffer.from(chunk))
          }
          readable.push(null) // Signal end of stream
        } catch (error) {
          readable.destroy(error as Error)
        }
      })()

      return readable
    } catch (error) {
      console.error('ElevenLabs stream generation error:', error)
      throw error
    }
  }

  isConfigured(): boolean {
    return client !== null
  }

  getAvailableVoices(): { id: string; name: string }[] {
    return Object.entries(VOICE_OPTIONS).map(([name, id]) => ({
      id,
      name: name.charAt(0).toUpperCase() + name.slice(1),
    }))
  }
}

export const elevenLabsService = new ElevenLabsService()
