'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

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

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="hidden lg:block w-64 border-r border-[var(--border-primary)] p-6">
        <Link href="/" className="flex items-center gap-2 mb-12">
          <div className="w-6 h-6 bg-[var(--text-primary)] rounded" />
          <span className="font-medium">FutureCast</span>
        </Link>

        <div className="space-y-4">
          {[
            { n: 1, label: 'Profile' },
            { n: 2, label: 'Goal' },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step > s.n
                  ? 'bg-[var(--success)] text-[var(--bg-primary)]'
                  : step === s.n
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
              }`}>
                {step > s.n ? <Check className="w-3 h-3" /> : s.n}
              </div>
              <span className={step >= s.n ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade">
          {/* Mobile progress */}
          <div className="lg:hidden flex gap-2 mb-8">
            {[1, 2].map((n) => (
              <div key={n} className={`h-1 flex-1 rounded ${step >= n ? 'bg-[var(--text-primary)]' : 'bg-[var(--bg-tertiary)]'}`} />
            ))}
          </div>

          {/* Step 1: Profile */}
          {step === 1 && (
            <div>
              <p className="text-sm text-[var(--text-tertiary)] mb-2">Step 1 of 2</p>
              <h1 className="text-2xl font-medium mb-2">About you</h1>
              <p className="text-[var(--text-secondary)] mb-8">Basic info to personalize simulations.</p>

              <div className="space-y-6">
                <div>
                  <label htmlFor="age" className="block text-sm font-medium mb-2">Age</label>
                  <input
                    id="age"
                    type="number"
                    value={inputs.age}
                    onChange={(e) => setInputs({ ...inputs, age: e.target.value })}
                    placeholder="30"
                    className="input"
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
                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-md border capitalize transition-colors ${
                          inputs.riskTolerance === level
                            ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-transparent'
                            : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-primary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-2">Affects investment return modeling</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Goal */}
          {step === 2 && (
            <div>
              <p className="text-sm text-[var(--text-tertiary)] mb-2">Step 2 of 2</p>
              <h1 className="text-2xl font-medium mb-2">Your goal</h1>
              <p className="text-[var(--text-secondary)] mb-8">Describe what you want to achieve.</p>

              <div>
                <label htmlFor="goal" className="block text-sm font-medium mb-2">Goal</label>
                <textarea
                  id="goal"
                  value={inputs.goal}
                  onChange={(e) => setInputs({ ...inputs, goal: e.target.value })}
                  placeholder="Save $50,000 for a house down payment in 3 years"
                  rows={3}
                  className="input resize-none"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-2">Our AI extracts amount, timeline, and type</p>
              </div>

              <div className="mt-6">
                <p className="text-xs text-[var(--text-tertiary)] mb-2">Examples</p>
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
                      className="text-xs px-2 py-1 rounded border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors"
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
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1}
              className={`btn btn-secondary ${step === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className={`btn btn-primary ${!canProceed() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {step === 2 ? 'Run simulation' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
