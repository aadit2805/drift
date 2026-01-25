'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Mic, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { transcribeAudio } from '@/lib/api'

interface UserInputs {
  age: string
  riskTolerance: 'low' | 'medium' | 'high'
  goal: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [inputs, setInputs] = useState<UserInputs>({
    age: '',
    riskTolerance: 'medium',
    goal: '',
  })
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    const customerId = localStorage.getItem('customerId')
    if (!customerId) {
      router.push('/login')
    } else {
      setIsAuthenticated(true)
    }
  }, [router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1)
    } else {
      localStorage.setItem('userInputs', JSON.stringify(inputs))
      router.push('/simulation')
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const canProceed = () => {
    if (step === 1) return inputs.age !== ''
    if (step === 2) return inputs.goal.trim() !== ''
    return false
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())

        // Send to ElevenLabs for transcription
        setIsTranscribing(true)
        try {
          const transcript = await transcribeAudio(audioBlob)
          if (transcript) {
            setInputs(prev => ({ ...prev, goal: transcript }))
          }
        } catch (err) {
          console.error('Transcription failed:', err)
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Subtle depth */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_70%)] opacity-40" />
      {/* Header - frosted glass */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-6 py-3 max-w-3xl w-[calc(100%-2rem)] rounded-full bg-background/60 backdrop-blur-xl border border-border/50">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Drift
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-sm text-muted-foreground">Simulation</span>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Exit
        </Link>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8 pt-24">
        <div className="w-full max-w-md animate-fade">
          {/* Progress indicator */}
          <div className="flex gap-2 mb-8">
            {[1, 2].map((n) => (
              <div key={n} className={`h-1 flex-1 rounded transition-colors ${step >= n ? 'bg-foreground' : 'bg-muted'}`} />
            ))}
          </div>

          {/* Step 1: Profile */}
          {step === 1 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Step 1 of 2</p>
              <h1 className="text-2xl font-medium mb-2">About you</h1>
              <p className="text-muted-foreground mb-8">Basic info to personalize simulations.</p>

              <div className="space-y-6">
                <div>
                  <label htmlFor="age" className="block text-sm font-medium mb-2">Age</label>
                  <Input
                    id="age"
                    type="number"
                    value={inputs.age}
                    onChange={(e) => setInputs({ ...inputs, age: e.target.value })}
                    placeholder="30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Risk tolerance</label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setInputs({ ...inputs, riskTolerance: level })}
                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-md border capitalize transition-colors duration-150 ${
                          inputs.riskTolerance === level
                            ? 'bg-foreground text-background border-transparent'
                            : 'bg-transparent text-muted-foreground border-border hover:text-foreground'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Affects investment return modeling</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Goal */}
          {step === 2 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Step 2 of 2</p>
              <h1 className="text-2xl font-medium mb-2">Your goal</h1>
              <p className="text-muted-foreground mb-8">Describe what you want to achieve.</p>

              <div>
                <label htmlFor="goal" className="block text-sm font-medium mb-2">Goal</label>
                <div className="relative">
                  <Textarea
                    id="goal"
                    value={inputs.goal}
                    onChange={(e) => setInputs({ ...inputs, goal: e.target.value })}
                    placeholder="Save $50,000 for a house down payment in 3 years"
                    rows={3}
                    className="resize-none pr-12"
                    disabled={isRecording || isTranscribing}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleRecording}
                    disabled={isTranscribing}
                    className={`absolute right-2 top-2 h-8 w-8 ${
                      isRecording
                        ? 'text-[var(--error)] bg-[var(--error)]/10 animate-pulse'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isTranscribing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {isRecording
                    ? 'Listening... click mic to stop'
                    : isTranscribing
                    ? 'Transcribing your voice...'
                    : 'Type or click the mic to speak your goal'}
                </p>
              </div>

              <div className="mt-6">
                <p className="text-xs text-muted-foreground mb-2">Examples</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Save $10K emergency fund in 1 year',
                    'Pay off $25K debt in 5 years',
                    'Save $50K for a house in 3 years',
                  ].map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setInputs({ ...inputs, goal: ex })}
                      className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors duration-150"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-10">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {step === 2 ? 'Run simulation' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
