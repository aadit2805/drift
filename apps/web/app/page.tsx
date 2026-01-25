'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[hsl(var(--accent))] rounded" />
          <span className="font-medium">Drift</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">
            Features
          </Link>
          <Link href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">
            How it works
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 max-w-3xl mx-auto relative">
        <div className="hero-glow" />
        <p className="text-sm text-muted-foreground mb-4">Monte Carlo Simulation</p>
        <h1 className="text-4xl font-medium tracking-tight mb-6">
          See 100,000 versions of your financial future
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl">
          Stop planning with single numbers. Run probability simulations on your real financial data to know your actual odds of reaching any goal.
        </p>
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link href="/login">
              Start simulation
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="#how">Learn more</Link>
          </Button>
        </div>
      </section>

      {/* Preview */}
      <section className="px-6 pb-24 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
              <span className="text-sm text-muted-foreground">Simulation complete</span>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Success probability</p>
                <p className="text-3xl font-medium tabular-nums">73%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Expected outcome</p>
                <p className="text-3xl font-medium tabular-nums">$48,200</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Best case (90th)</p>
                <p className="text-3xl font-medium tabular-nums">$68,500</p>
              </div>
            </div>

            <div className="h-px bg-border mb-6" />

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
                  <td className="text-muted-foreground">10th (pessimistic)</td>
                  <td className="tabular-nums font-medium">$31,000</td>
                  <td><Badge variant="error">-$19,000</Badge></td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">50th (expected)</td>
                  <td className="tabular-nums font-medium">$48,200</td>
                  <td><Badge variant="warning">-$1,800</Badge></td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">90th (optimistic)</td>
                  <td className="tabular-nums font-medium">$68,500</td>
                  <td><Badge variant="success">+$18,500</Badge></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 py-24 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-muted-foreground mb-4">How it works</p>
          <h2 className="text-2xl font-medium mb-12">Four steps to probability</h2>

          <div className="space-y-8">
            {[
              { n: '01', title: 'Connect your bank', desc: 'We pull 6 months of transactions from Capital One to understand your real spending.' },
              { n: '02', title: 'Set your goal', desc: 'Type it naturally: "Save $50k for a house in 3 years". Our parser handles the rest.' },
              { n: '03', title: 'Run simulations', desc: '100,000 Monte Carlo scenarios in ~1-2s. We model income variance, expense shocks, and market returns.' },
              { n: '04', title: 'Get probabilities', desc: 'See your success rate, percentile outcomes, and what changes would improve your odds.' },
            ].map((step) => (
              <div key={step.n} className="flex gap-6">
                <span className="text-sm font-mono text-muted-foreground">{step.n}</span>
                <div>
                  <h3 className="font-medium mb-1">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24 border-t border-border bg-card">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-muted-foreground mb-4">Features</p>
          <h2 className="text-2xl font-medium mb-12">Built for accuracy</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Real data', desc: 'Uses your actual transaction history, not estimates. Categories are auto-detected.' },
              { title: 'HPC engine', desc: 'NumPy vectorization + multiprocessing. 100,000 simulations in 1-2 seconds.' },
              { title: 'Sensitivity analysis', desc: 'See exactly how much reducing spending or increasing income affects your odds.' },
              { title: 'Variance modeling', desc: 'Income shocks, expense variance, market returns — all modeled realistically.' },
            ].map((f) => (
              <Card key={f.title} className="p-5">
                <h3 className="font-medium mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 border-t border-border">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-medium mb-4">Ready to see your odds?</h2>
          <p className="text-muted-foreground mb-8">
            Connect your bank, set a goal, get probabilities.
          </p>
          <Button asChild>
            <Link href="/login">
              Start simulation
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[hsl(var(--accent))] rounded opacity-60" />
            <span className="text-sm text-muted-foreground">Drift</span>
          </div>
          <p className="text-sm text-muted-foreground">

          </p>
        </div>
      </footer>
    </div>
  )
}
