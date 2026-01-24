'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, Shield, Zap, TrendingUp, BarChart3, Target } from 'lucide-react'

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">FutureCast</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#features" className="text-sm text-white/60 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-white/60 hover:text-white transition-colors">
              How it works
            </Link>
            <Link href="/onboarding" className="btn-primary text-sm text-white">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-white/70">Powered by Monte Carlo Simulation</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-white">See 10,000 versions of</span>
            <br />
            <span className="gradient-text">your financial future</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop guessing. Run Monte Carlo simulations on your finances to see probability
            distributions, not false certainty. Know your real odds of reaching any goal.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 mb-16">
            <Link href="/onboarding" className="btn-primary inline-flex items-center gap-2 text-white">
              Start Free Simulation
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#how-it-works" className="btn-secondary text-white/80">
              See how it works
            </Link>
          </div>

          {/* Hero Visual */}
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent z-10" />
            <div className="glass-card rounded-2xl p-8 glow">
              {/* Mock Dashboard Preview */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="text-white/30 text-sm ml-4">FutureCast Dashboard</span>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Success Rate Card */}
                <div className="glass-card rounded-xl p-6 text-center">
                  <p className="text-white/50 text-sm mb-2">Success Probability</p>
                  <p className="text-5xl font-bold gradient-text-success">73%</p>
                  <p className="text-white/40 text-xs mt-2">Based on 10,000 simulations</p>
                </div>

                {/* Median Outcome */}
                <div className="glass-card rounded-xl p-6 text-center">
                  <p className="text-white/50 text-sm mb-2">Median Outcome</p>
                  <p className="text-5xl font-bold text-white">$48.2K</p>
                  <p className="text-white/40 text-xs mt-2">50th percentile</p>
                </div>

                {/* Best Case */}
                <div className="glass-card rounded-xl p-6 text-center">
                  <p className="text-white/50 text-sm mb-2">Best Case</p>
                  <p className="text-5xl font-bold gradient-text-blue">$68.5K</p>
                  <p className="text-white/40 text-xs mt-2">90th percentile</p>
                </div>
              </div>

              {/* Mock Chart Area */}
              <div className="mt-6 h-48 glass-card rounded-xl flex items-center justify-center">
                <div className="flex items-end gap-1 h-32">
                  {[40, 55, 70, 85, 95, 100, 95, 85, 70, 55, 40, 30, 20, 15, 10].map((h, i) => (
                    <div
                      key={i}
                      className="w-6 rounded-t bg-gradient-to-t from-indigo-600 to-purple-500 opacity-80"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Financial planning that accounts for <span className="gradient-text">uncertainty</span>
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Traditional tools give you one number. We give you probability distributions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: '10,000 Simulations',
                description: 'Monte Carlo methods model uncertainty in income, expenses, and market returns to give you the full picture.',
                gradient: 'from-blue-500 to-cyan-500',
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: 'Real Banking Data',
                description: 'Connect via Capital One API to analyze your actual spending patterns, income, and debt obligations.',
                gradient: 'from-green-500 to-emerald-500',
              },
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: 'Natural Language Goals',
                description: 'Just type "Save $50k for a house in 3 years" and our AI translates it into simulation parameters.',
                gradient: 'from-purple-500 to-pink-500',
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                title: 'Sensitivity Analysis',
                description: '"Reducing dining by 20% improves your odds by 8%" — see exactly what changes matter most.',
                gradient: 'from-orange-500 to-red-500',
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: 'HPC Performance',
                description: 'Parallel processing runs thousands of scenarios in under 500ms. Complex math, instant results.',
                gradient: 'from-yellow-500 to-orange-500',
              },
              {
                icon: <Target className="w-6 h-6" />,
                title: 'Multiple Goals',
                description: 'Track retirement, emergency fund, and vacation savings simultaneously with combined probabilities.',
                gradient: 'from-indigo-500 to-purple-500',
              },
            ].map((feature, i) => (
              <div key={i} className="glass-card-hover rounded-2xl p-8">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 text-white`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-white/50 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              How it <span className="gradient-text">works</span>
            </h2>
          </div>

          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'Connect your accounts',
                description: 'We pull your transaction history from Capital One to understand your real spending patterns and income.',
              },
              {
                step: '02',
                title: 'Describe your goal',
                description: 'Type your financial goal in plain English. Our AI extracts the target amount, timeline, and constraints.',
              },
              {
                step: '03',
                title: 'Run 10,000 simulations',
                description: 'Our HPC engine runs Monte Carlo simulations with realistic variance models for income, expenses, and investments.',
              },
              {
                step: '04',
                title: 'See your probability',
                description: 'Get probability distributions, percentile outcomes, and sensitivity analysis—not just a single misleading number.',
              },
            ].map((item, i) => (
              <div key={i} className="glass-card rounded-2xl p-8 flex items-start gap-8">
                <span className="text-5xl font-bold gradient-text">{item.step}</span>
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-white/50 text-lg">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card rounded-3xl p-12 glow">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to see your financial futures?
            </h2>
            <p className="text-white/50 mb-8 max-w-xl mx-auto">
              Join thousands of users who stopped guessing and started knowing their real odds.
            </p>
            <Link href="/onboarding" className="btn-primary inline-flex items-center gap-2 text-white text-lg px-8 py-4">
              Start Your Free Simulation
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-white/50">FutureCast</span>
          </div>
          <p className="text-sm text-white/30">
            Built for Capital One + NorthMark HPC Hackathon
          </p>
        </div>
      </footer>
    </div>
  )
}
