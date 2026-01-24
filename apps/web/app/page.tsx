'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[var(--text-primary)] rounded" />
          <span className="font-medium">FutureCast</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="#features" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Features
          </Link>
          <Link href="#how" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            How it works
          </Link>
          <Link href="/login" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Sign in
          </Link>
          <Link href="/login" className="btn btn-primary text-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <p className="text-sm text-[var(--text-tertiary)] mb-4">Monte Carlo Simulation</p>
        <h1 className="text-4xl font-medium tracking-tight mb-6">
          See 10,000 versions of your financial future
        </h1>
        <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-xl">
          Stop planning with single numbers. Run probability simulations on your real financial data to know your actual odds of reaching any goal.
        </p>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn btn-primary">
            Start simulation
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="#how" className="btn btn-secondary">
            Learn more
          </Link>
        </div>
      </section>

      {/* Preview */}
      <section className="px-6 pb-24 max-w-4xl mx-auto">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
            <span className="text-sm text-[var(--text-tertiary)]">Simulation complete</span>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm text-[var(--text-tertiary)] mb-1">Success probability</p>
              <p className="text-3xl font-medium tabular-nums">73%</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-tertiary)] mb-1">Expected outcome</p>
              <p className="text-3xl font-medium tabular-nums">$48,200</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-tertiary)] mb-1">Best case (90th)</p>
              <p className="text-3xl font-medium tabular-nums">$68,500</p>
            </div>
          </div>

          <div className="h-px bg-[var(--border-primary)] mb-6" />

          <table className="table">
            <thead>
              <tr>
                <th>Percentile</th>
                <th>Outcome</th>
                <th>vs Goal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-[var(--text-secondary)]">10th (pessimistic)</td>
                <td className="tabular-nums font-medium">$31,000</td>
                <td><span className="badge badge-error">-$19,000</span></td>
              </tr>
              <tr>
                <td className="text-[var(--text-secondary)]">50th (expected)</td>
                <td className="tabular-nums font-medium">$48,200</td>
                <td><span className="badge badge-warning">-$1,800</span></td>
              </tr>
              <tr>
                <td className="text-[var(--text-secondary)]">90th (optimistic)</td>
                <td className="tabular-nums font-medium">$68,500</td>
                <td><span className="badge badge-success">+$18,500</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 py-24 border-t border-[var(--border-primary)]">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-[var(--text-tertiary)] mb-4">How it works</p>
          <h2 className="text-2xl font-medium mb-12">Four steps to probability</h2>

          <div className="space-y-8">
            {[
              { n: '01', title: 'Connect your bank', desc: 'We pull 6 months of transactions from Capital One to understand your real spending.' },
              { n: '02', title: 'Set your goal', desc: 'Type it naturally: "Save $50k for a house in 3 years". Our parser handles the rest.' },
              { n: '03', title: 'Run simulations', desc: '10,000 Monte Carlo scenarios in ~500ms. We model income variance, expense shocks, and market returns.' },
              { n: '04', title: 'Get probabilities', desc: 'See your success rate, percentile outcomes, and what changes would improve your odds.' },
            ].map((step) => (
              <div key={step.n} className="flex gap-6">
                <span className="text-sm font-mono text-[var(--text-tertiary)]">{step.n}</span>
                <div>
                  <h3 className="font-medium mb-1">{step.title}</h3>
                  <p className="text-[var(--text-secondary)]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-[var(--text-tertiary)] mb-4">Features</p>
          <h2 className="text-2xl font-medium mb-12">Built for accuracy</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Real data', desc: 'Uses your actual transaction history, not estimates. Categories are auto-detected.' },
              { title: 'HPC engine', desc: 'NumPy vectorization + multiprocessing. 10,000 simulations in under 500ms.' },
              { title: 'Sensitivity analysis', desc: 'See exactly how much reducing spending or increasing income affects your odds.' },
              { title: 'Variance modeling', desc: 'Income shocks, expense variance, market returns — all modeled realistically.' },
            ].map((f) => (
              <div key={f.title} className="card p-5">
                <h3 className="font-medium mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 border-t border-[var(--border-primary)]">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-medium mb-4">Ready to see your odds?</h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Connect your bank, set a goal, get probabilities.
          </p>
          <Link href="/login" className="btn btn-primary">
            Start simulation
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-[var(--border-primary)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[var(--text-tertiary)] rounded" />
            <span className="text-sm text-[var(--text-tertiary)]">FutureCast</span>
          </div>
          <p className="text-sm text-[var(--text-tertiary)]">
            
          </p>
        </div>
      </footer>
    </div>
  )
}
