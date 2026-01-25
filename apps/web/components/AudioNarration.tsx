'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Loader2, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { generateBriefing, type NarrativeRequest, type BriefingResponse } from '@/lib/api'

interface AudioNarrationProps {
  simulationResults: {
    successProbability: number
    medianOutcome: number
    percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number }
    mean?: number
    std?: number
    worstCase?: number
    bestCase?: number
  }
  financialProfile: {
    liquidAssets: number
    creditDebt: number
    loanDebt: number
    monthlyLoanPayments: number
    monthlyIncome: number
    monthlyBills: number
    monthlySpending: number
    spendingByCategory: Record<string, number>
    spendingVolatility: number
  }
  goal: {
    targetAmount: number
    timelineMonths: number
    goalType: string
  }
}

export function AudioNarration({ simulationResults, financialProfile, goal }: AudioNarrationProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [audioData, setAudioData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [audioAvailable, setAudioAvailable] = useState(true)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  const fetchBriefing = async (autoPlay: boolean = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const request: NarrativeRequest = {
        simulationResults: {
          successProbability: simulationResults.successProbability,
          medianOutcome: simulationResults.medianOutcome,
          percentiles: simulationResults.percentiles,
          mean: simulationResults.mean || simulationResults.medianOutcome,
          std: simulationResults.std || 0,
          worstCase: simulationResults.worstCase || simulationResults.percentiles.p10,
          bestCase: simulationResults.bestCase || simulationResults.percentiles.p90,
        },
        financialProfile,
        goal,
      }

      const response: BriefingResponse = await generateBriefing(request)

      setNarrative(response.narrative)
      setAudioAvailable(response.audioAvailable)

      if (response.audioAvailable && response.audio) {
        setAudioData(response.audio)

        // Create audio element
        const audio = new Audio(`data:audio/mpeg;base64,${response.audio}`)
        audioRef.current = audio

        audio.onloadedmetadata = () => {
          setDuration(audio.duration)
        }

        audio.onended = () => {
          setIsPlaying(false)
          setProgress(0)
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
          }
        }

        audio.onerror = () => {
          setError('Failed to load audio')
          setAudioAvailable(false)
        }

        // Auto-play if requested
        if (autoPlay) {
          audio.oncanplaythrough = async () => {
            try {
              await audio.play()
              setIsPlaying(true)
              progressIntervalRef.current = setInterval(() => {
                if (audioRef.current) {
                  setProgress(audioRef.current.currentTime)
                }
              }, 100)
            } catch (playError) {
              console.error('Auto-play failed:', playError)
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch briefing:', err)
      setError('Failed to generate your financial briefing. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePlay = async () => {
    if (!narrative) {
      // First click - fetch and auto-play
      await fetchBriefing(true)
      return
    }

    if (!audioRef.current || !audioAvailable) {
      return
    }

    if (isPlaying) {
      audioRef.current.pause()
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    } else {
      await audioRef.current.play()
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setProgress(audioRef.current.currentTime)
        }
      }, 100)
    }

    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration

    audioRef.current.currentTime = newTime
    setProgress(newTime)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const regenerate = async () => {
    setNarrative(null)
    setAudioData(null)
    setProgress(0)
    setDuration(0)
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    await fetchBriefing(true)
  }

  return (
    <Card className="p-6 border-[var(--accent)]/40 bg-gradient-to-br from-background to-muted/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-[var(--accent)]/10">
          <Headphones className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h3 className="font-medium">Listen to Your Financial Future</h3>
        </div>
      </div>

      {/* Audio Player */}
      <div className="bg-muted/30 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-4">
          {/* Play/Pause Button */}
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-2 hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]"
            onClick={togglePlay}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          {/* Progress Bar */}
          <div className="flex-1">
            <div
              className="h-2 bg-muted rounded-full cursor-pointer overflow-hidden"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-100"
                style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatTime(progress)}</span>
              <span>{duration ? formatTime(duration) : '--:--'}</span>
            </div>
          </div>

          {/* Volume Button */}
          {audioAvailable && narrative && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          )}

        </div>
      </div>

      {/* Transcript */}
      {narrative && (
        <div className="p-4 bg-background rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wide">
            Transcript
          </p>
          <p className="text-sm leading-relaxed">{narrative}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-[var(--error)]/10 rounded-lg border border-[var(--error)]/20">
          <p className="text-sm text-[var(--error)]">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={regenerate}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* No Audio Available */}
      {narrative && !audioAvailable && !error && (
        <div className="p-3 bg-muted/50 rounded-lg mt-2">
          <p className="text-xs text-muted-foreground">
            Audio playback is not available. Reading the transcript above.
          </p>
        </div>
      )}

      {/* Initial State - Prompt to play */}
      {!narrative && !isLoading && !error && (
        <p className="text-sm text-muted-foreground text-center">
          Click play to generate your personalized audio briefing
        </p>
      )}
    </Card>
  )
}
