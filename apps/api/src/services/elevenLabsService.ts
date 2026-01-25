import { ElevenLabsClient } from 'elevenlabs'
import { Readable } from 'stream'

// Voice options for financial narration
const VOICE_OPTIONS = {
  josh: 'TxGEqnHWrfWFTfGW9XjX',   // Josh - friendly, energetic (DEFAULT)
  adam: 'pNInz6obpgDQGcFmaJgB',   // Adam - deep, authoritative
  rachel: '21m00Tcm4TlvDq8ikWAM', // Rachel - warm, professional
  bella: 'EXAVITQu4vr4xnSDxMaL',  // Bella - soft, reassuring
  antoni: 'ErXwobaYiN019PkySvjV', // Antoni - confident, punchy
  domi: 'AZnzlk1XvdvUeBnXmlld',   // Domi - strong, bold
} as const

type VoiceName = keyof typeof VOICE_OPTIONS

export class ElevenLabsService {
  private _client: ElevenLabsClient | null = null

  // Lazy initialization - only create client when first needed
  private get client(): ElevenLabsClient | null {
    if (this._client === null && process.env.ELEVENLABS_API_KEY) {
      this._client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
    }
    return this._client
  }

  private get defaultVoice(): string {
    const configuredVoice = process.env.ELEVENLABS_VOICE_ID || 'josh'
    return VOICE_OPTIONS[configuredVoice as VoiceName] || VOICE_OPTIONS.josh
  }

  async generateAudio(
    text: string,
    options?: {
      voice?: VoiceName
      modelId?: string
    }
  ): Promise<Buffer> {
    if (!this.client) {
      throw new Error('ElevenLabs API key not configured')
    }

    const voiceId = options?.voice
      ? VOICE_OPTIONS[options.voice]
      : this.defaultVoice

    try {
      // Use the textToSpeech.convert method
      // Convert numbers to spoken words before sending to TTS
      const spokenText = this.numbersToWords(text)

      const audioStream = await this.client!.textToSpeech.convert(voiceId, {
        text: spokenText,
        model_id: options?.modelId || 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.25,       // Lower = more expressive/dynamic
          similarity_boost: 0.85,
          style: 0.8,            // Higher = more stylized/exciting
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
    if (!this.client) {
      throw new Error('ElevenLabs API key not configured')
    }

    const voiceId = options?.voice
      ? VOICE_OPTIONS[options.voice]
      : this.defaultVoice

    try {
      // Convert numbers to spoken words before sending to TTS
      const spokenText = this.numbersToWords(text)

      // Use the textToSpeech.convertAsStream method
      const audioStream = await this.client!.textToSpeech.convertAsStream(voiceId, {
        text: spokenText,
        model_id: options?.modelId || 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.25,
          similarity_boost: 0.85,
          style: 0.8,
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
    return !!process.env.ELEVENLABS_API_KEY
  }

  getAvailableVoices(): { id: string; name: string }[] {
    return Object.entries(VOICE_OPTIONS).map(([name, id]) => ({
      id,
      name: name.charAt(0).toUpperCase() + name.slice(1),
    }))
  }

  // Select voice based on how good the news is
  selectVoiceByOutcome(successProbability: number): VoiceName {
    if (successProbability >= 0.75) {
      // Great news! Excited, celebratory
      return 'josh'
    } else if (successProbability >= 0.50) {
      // Decent odds, encouraging and confident
      return 'adam'
    } else {
      // Tough situation, empathetic and supportive
      return 'bella'
    }
  }

  // Convert formatted numbers to spoken words for natural TTS
  private numbersToWords(text: string): string {
    let result = text

    // Handle full words first: "$30 million", "$30 billion", "$30 thousand"
    result = result.replace(/\$(\d+(?:\.\d+)?)\s*billion/gi, (_, num) => {
      return this.numberToSpoken(parseFloat(num), 'billion')
    })
    result = result.replace(/\$(\d+(?:\.\d+)?)\s*million/gi, (_, num) => {
      return this.numberToSpoken(parseFloat(num), 'million')
    })
    result = result.replace(/\$(\d+(?:\.\d+)?)\s*thousand/gi, (_, num) => {
      return this.numberToSpoken(parseFloat(num), 'thousand')
    })

    // Handle abbreviations: $1.5M, $25K, $100B (only if not followed by more letters)
    result = result.replace(/\$(\d+(?:\.\d+)?)\s*B(?![a-z])/gi, (_, num) => {
      return this.numberToSpoken(parseFloat(num), 'billion')
    })
    result = result.replace(/\$(\d+(?:\.\d+)?)\s*M(?![a-z])/gi, (_, num) => {
      return this.numberToSpoken(parseFloat(num), 'million')
    })
    result = result.replace(/\$(\d+(?:\.\d+)?)\s*K(?![a-z])/gi, (_, num) => {
      return this.numberToSpoken(parseFloat(num), 'thousand')
    })

    // Plain $XX,XXX patterns (with commas)
    result = result.replace(/\$(\d{1,3}(?:,\d{3})+)/g, (_, num) => {
      const value = parseInt(num.replace(/,/g, ''))
      return this.dollarAmountToSpoken(value)
    })

    // Plain $XXXXX patterns (no commas, 4+ digits)
    result = result.replace(/\$(\d{4,})/g, (_, num) => {
      return this.dollarAmountToSpoken(parseInt(num))
    })

    // Percentages: 73% -> "seventy-three percent"
    result = result.replace(/(\d+(?:\.\d+)?)\s*%/g, (_, num) => {
      const value = parseFloat(num)
      if (Number.isInteger(value)) {
        return `${this.intToWords(value)} percent`
      }
      return `${value} percent`
    })

    return result
  }

  private numberToSpoken(num: number, scale: string): string {
    if (Number.isInteger(num)) {
      return `${this.intToWords(num)} ${scale} dollars`
    }
    // Handle decimals like 1.5 -> "one point five"
    const [whole, decimal] = num.toString().split('.')
    const wholeWords = this.intToWords(parseInt(whole))
    const decimalWords = decimal.split('').map(d => this.digitToWord(d)).join(' ')
    return `${wholeWords} point ${decimalWords} ${scale} dollars`
  }

  private dollarAmountToSpoken(value: number): string {
    if (value >= 1000000000) {
      const billions = value / 1000000000
      return this.numberToSpoken(Math.round(billions * 10) / 10, 'billion')
    }
    if (value >= 1000000) {
      const millions = value / 1000000
      return this.numberToSpoken(Math.round(millions * 10) / 10, 'million')
    }
    if (value >= 1000) {
      const thousands = value / 1000
      return this.numberToSpoken(Math.round(thousands * 10) / 10, 'thousand')
    }
    return `${this.intToWords(value)} dollars`
  }

  private digitToWord(digit: string): string {
    const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
    return words[parseInt(digit)] || digit
  }

  private intToWords(num: number): string {
    if (num === 0) return 'zero'

    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
      'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

    if (num < 20) return ones[num]
    if (num < 100) {
      return tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '')
    }
    if (num < 1000) {
      return ones[Math.floor(num / 100)] + ' hundred' + (num % 100 ? ' ' + this.intToWords(num % 100) : '')
    }
    // For larger numbers, just return the number (TTS handles it okay)
    return num.toString()
  }
}

export const elevenLabsService = new ElevenLabsService()
