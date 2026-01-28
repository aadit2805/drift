'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VoiceInput } from '@/components/VoiceInput'

interface UserInputs {
  age: string
  riskTolerance: 'low' | 'medium' | 'high'
  goal: string
  parsedGoal?: {
    targetAmount: number
    timelineMonths: number
    goalType: string
  }
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
    } else if (inputs.parsedGoal) {
      // Save both the raw goal text and parsed goal
      localStorage.setItem('userInputs', JSON.stringify(inputs))
      router.push('/simulation')
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleGoalComplete = (parsedGoal: { targetAmount: number; timelineMonths: number; goalType: string }) => {
    // Create a human-readable goal string
    const timelineText = parsedGoal.timelineMonths >= 12
      ? `${Math.round(parsedGoal.timelineMonths / 12)} years`
      : `${parsedGoal.timelineMonths} months`
    const goalText = `Save $${parsedGoal.targetAmount.toLocaleString()} for ${parsedGoal.goalType.replace('_', ' ')} in ${timelineText}`

    // Save and navigate immediately - VoiceInput already handled the pause
    localStorage.setItem('userInputs', JSON.stringify({
      ...inputs,
      goal: goalText,
      parsedGoal,
    }))
    router.push('/simulation')
  }

  const canProceed = () => {
    if (step === 1) return inputs.age !== ''
    if (step === 2) return !!inputs.parsedGoal
    return false
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

              {/* Navigation for step 1 */}
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
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Voice Goal Input */}
          {step === 2 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Step 2 of 2</p>
              <h1 className="text-2xl font-medium mb-2">Your goal</h1>
              <p className="text-muted-foreground mb-6">Tell me what you're saving for.</p>

              <VoiceInput onGoalComplete={handleGoalComplete} />

              {/* Back button only - forward is handled by voice completion */}
              <div className="flex justify-start mt-6">
                <Button
                  variant="outline"
                  onClick={handleBack}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
