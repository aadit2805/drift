'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, DollarSign, Target, User, Sparkles, Check } from 'lucide-react'

interface UserInputs {
  monthlyIncome: string
  age: string
  riskTolerance: 'low' | 'medium' | 'high'
  goal: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [inputs, setInputs] = useState<UserInputs>({
    monthlyIncome: '',
    age: '',
    riskTolerance: 'medium',
    goal: '',
  })

  const handleNext = () => {
    if (step < 3) {
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
    if (step === 2) return inputs.monthlyIncome !== ''
    if (step === 3) return inputs.goal.trim() !== ''
    return false
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Progress */}
      <div className="hidden lg:flex w-80 flex-col justify-between p-8 border-r border-white/5">
        <div>
          <Link href="/" className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">FutureCast</span>
          </Link>

          <div className="space-y-6">
            {[
              { num: 1, title: 'About you', desc: 'Age and risk tolerance' },
              { num: 2, title: 'Your income', desc: 'Monthly take-home pay' },
              { num: 3, title: 'Your goal', desc: 'What you want to achieve' },
            ].map((item) => (
              <div key={item.num} className="flex items-start gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    step > item.num
                      ? 'bg-green-500/20 text-green-400'
                      : step === item.num
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                      : 'bg-white/5 text-white/30'
                  }`}
                >
                  {step > item.num ? <Check className="w-4 h-4" /> : item.num}
                </div>
                <div>
                  <p className={`font-medium ${step >= item.num ? 'text-white' : 'text-white/30'}`}>
                    {item.title}
                  </p>
                  <p className="text-sm text-white/40">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-white/30">
          Your data is encrypted and never shared.
        </p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-lg">
          {/* Mobile Progress */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1 w-16 rounded-full transition-colors ${
                  i <= step ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-8">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6">
                  <User className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Let's get started</h1>
                <p className="text-white/50">Tell us a bit about yourself to personalize your simulation.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-3">
                    Your Age
                  </label>
                  <input
                    type="number"
                    value={inputs.age}
                    onChange={(e) => setInputs({ ...inputs, age: e.target.value })}
                    placeholder="30"
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-3">
                    Risk Tolerance
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setInputs({ ...inputs, riskTolerance: level })}
                        className={`py-4 px-4 rounded-xl border transition-all capitalize ${
                          inputs.riskTolerance === level
                            ? 'border-indigo-500 bg-indigo-500/10 text-white'
                            : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-white/30 mt-3">
                    This affects how we model investment returns in your simulation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Income */}
          {step === 2 && (
            <div className="space-y-8">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-6">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Your Income</h1>
                <p className="text-white/50">How much do you take home each month after taxes?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  Monthly Take-Home Pay
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-lg">$</span>
                  <input
                    type="number"
                    value={inputs.monthlyIncome}
                    onChange={(e) => setInputs({ ...inputs, monthlyIncome: e.target.value })}
                    placeholder="5,000"
                    className="w-full pl-10 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder-white/30 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <p className="text-sm text-white/30 mt-3">
                  This is your net income after taxes and deductions.
                </p>
              </div>

              <div className="glass-card rounded-xl p-4">
                <p className="text-sm text-white/50">
                  <span className="text-indigo-400">Tip:</span> Include regular bonuses or side income as part of your monthly average.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Goal */}
          {step === 3 && (
            <div className="space-y-8">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Your Financial Goal</h1>
                <p className="text-white/50">Describe what you want to achieve in plain English.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  What's your goal?
                </label>
                <textarea
                  value={inputs.goal}
                  onChange={(e) => setInputs({ ...inputs, goal: e.target.value })}
                  placeholder="I want to save $50,000 for a house down payment in 3 years"
                  rows={4}
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                />
                <p className="text-sm text-white/30 mt-3">
                  Our AI will parse this into simulation parameters.
                </p>
              </div>

              <div className="glass-card rounded-xl p-5">
                <p className="text-sm font-medium text-white/70 mb-3">Try these examples:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Save $10K emergency fund in 1 year',
                    'Pay off $25K debt in 5 years',
                    'Retire by age 55',
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setInputs({ ...inputs, goal: example })}
                      className="text-sm px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white transition-all"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-10">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                step === 1
                  ? 'text-white/20 cursor-not-allowed'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                canProceed()
                  ? 'btn-primary text-white'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
            >
              {step === 3 ? 'Run Simulation' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
