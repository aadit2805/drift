import { Router, Request, Response } from 'express'
import { geminiService } from '../services/geminiService.js'
import { elevenLabsService } from '../services/elevenLabsService.js'
import type { SimulationResults, FinancialProfile } from '../types/index.js'

const router = Router()

interface NarrativeRequestBody {
  simulationResults: SimulationResults
  financialProfile: FinancialProfile
  goal: {
    targetAmount: number
    timelineMonths: number
    goalType: string
  }
}

interface AudioRequestBody {
  text: string
  voice?: 'rachel' | 'adam' | 'josh' | 'bella'
}

interface TranscribeRequestBody {
  audio: string // base64-encoded audio
}

// Generate narrative from simulation results using Gemini
router.post('/generate-narrative', async (req: Request, res: Response) => {
  try {
    const { simulationResults, financialProfile, goal } = req.body as NarrativeRequestBody

    if (!simulationResults || !financialProfile || !goal) {
      return res.status(400).json({
        error: 'Missing required fields: simulationResults, financialProfile, goal',
      })
    }

    const narrative = await geminiService.generateNarrative(
      simulationResults,
      financialProfile,
      goal
    )

    res.json({ narrative })
  } catch (error) {
    console.error('Narrative generation error:', error)
    res.status(500).json({
      error: 'Failed to generate narrative',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Generate audio from text using ElevenLabs
router.post('/generate-audio', async (req: Request, res: Response) => {
  try {
    const { text, voice } = req.body as AudioRequestBody

    if (!text) {
      return res.status(400).json({
        error: 'Missing required field: text',
      })
    }

    if (!elevenLabsService.isConfigured()) {
      return res.status(503).json({
        error: 'ElevenLabs API not configured',
        message: 'Please set ELEVENLABS_API_KEY in environment variables',
      })
    }

    const audio = await elevenLabsService.generateAudio(text, { voice })

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', audio.length)
    res.send(audio)
  } catch (error) {
    console.error('Audio generation error:', error)
    res.status(500).json({
      error: 'Failed to generate audio',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Stream audio from text using ElevenLabs
router.post('/stream-audio', async (req: Request, res: Response) => {
  try {
    const { text, voice } = req.body as AudioRequestBody

    if (!text) {
      return res.status(400).json({
        error: 'Missing required field: text',
      })
    }

    if (!elevenLabsService.isConfigured()) {
      return res.status(503).json({
        error: 'ElevenLabs API not configured',
        message: 'Please set ELEVENLABS_API_KEY in environment variables',
      })
    }

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Transfer-Encoding', 'chunked')

    const audioStream = await elevenLabsService.generateAudioStream(text, { voice })
    audioStream.pipe(res)
  } catch (error) {
    console.error('Audio streaming error:', error)
    res.status(500).json({
      error: 'Failed to stream audio',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Transcribe audio using ElevenLabs Speech-to-Text
router.post('/transcribe', async (req: Request, res: Response) => {
  try {
    const { audio } = req.body as TranscribeRequestBody

    if (!audio) {
      return res.status(400).json({
        error: 'Missing required field: audio (base64-encoded)',
      })
    }

    if (!elevenLabsService.isConfigured()) {
      return res.status(503).json({
        error: 'ElevenLabs API not configured',
        message: 'Please set ELEVENLABS_API_KEY in environment variables',
      })
    }

    // Decode base64 audio to buffer
    const audioBuffer = Buffer.from(audio, 'base64')

    const transcript = await elevenLabsService.transcribeAudio(audioBuffer)

    res.json({ transcript })
  } catch (error) {
    console.error('Transcription error:', error)
    res.status(500).json({
      error: 'Failed to transcribe audio',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Get available voices
router.get('/voices', (req: Request, res: Response) => {
  const voices = elevenLabsService.getAvailableVoices()
  const configured = elevenLabsService.isConfigured()

  res.json({
    configured,
    voices,
  })
})

// Generate recommendations using Gemini
router.post('/recommendations', async (req: Request, res: Response) => {
  try {
    const { simulationResults, financialProfile, goal } = req.body as NarrativeRequestBody

    if (!simulationResults || !financialProfile || !goal) {
      return res.status(400).json({
        error: 'Missing required fields: simulationResults, financialProfile, goal',
      })
    }

    const recommendations = await geminiService.generateRecommendations(
      simulationResults,
      financialProfile,
      goal
    )

    res.json({ recommendations })
  } catch (error) {
    console.error('Recommendations generation error:', error)
    res.status(500).json({
      error: 'Failed to generate recommendations',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Combined endpoint: generate narrative and audio in one call
router.post('/generate-briefing', async (req: Request, res: Response) => {
  try {
    const { simulationResults, financialProfile, goal, voice } = req.body as NarrativeRequestBody & { voice?: 'rachel' | 'adam' | 'josh' | 'bella' }

    if (!simulationResults || !financialProfile || !goal) {
      return res.status(400).json({
        error: 'Missing required fields: simulationResults, financialProfile, goal',
      })
    }

    // Generate narrative first
    const narrative = await geminiService.generateNarrative(
      simulationResults,
      financialProfile,
      goal
    )

    // Check if ElevenLabs is configured
    if (!elevenLabsService.isConfigured()) {
      return res.json({
        narrative,
        audioAvailable: false,
        message: 'Audio not available - ElevenLabs API key not configured',
      })
    }

    // Select voice based on outcome (or use override if provided)
    const selectedVoice = voice || elevenLabsService.selectVoiceByOutcome(simulationResults.successProbability)

    // Generate audio from the narrative
    const audio = await elevenLabsService.generateAudio(narrative, { voice: selectedVoice })

    // Return narrative and base64-encoded audio
    res.json({
      narrative,
      audioAvailable: true,
      audio: audio.toString('base64'),
      contentType: 'audio/mpeg',
      voice: selectedVoice, // Tell frontend which voice was used
    })
  } catch (error) {
    console.error('Briefing generation error:', error)
    res.status(500).json({
      error: 'Failed to generate briefing',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
