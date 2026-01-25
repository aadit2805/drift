'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav - frosted glass */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-6 py-3 max-w-3xl w-[calc(100%-2rem)] rounded-full bg-background/60 backdrop-blur-xl border border-border/50">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Drift
        </Link>
        <Button asChild size="sm">
          <Link href="/login">
            Log in
          </Link>
        </Button>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-32 pb-20 max-w-6xl mx-auto">
        <p className="text-muted-foreground text-sm mb-6 tracking-wide uppercase">
          Financial foresight
        </p>
        <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-medium leading-[1.05] tracking-[-0.03em] mb-8 max-w-4xl">
          Stop guessing.<br />
          Start knowing.
        </h1>
        <p className="text-muted-foreground text-xl max-w-xl mb-12 leading-relaxed">
        Other apps tell you what will happen. We show you what could happen and the odds of each outcome.
        </p>
        <Button asChild>
          <Link href="/login">
            Get started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </section>

      {/* Product Preview */}
      <section className="px-6 pb-32 max-w-4xl mx-auto">
        <Card className="overflow-hidden hover:translate-y-0 bg-card/80 backdrop-blur-sm">
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <div className="w-3 h-3 rounded-full bg-muted" />
            <div className="w-3 h-3 rounded-full bg-muted" />
            <div className="w-3 h-3 rounded-full bg-muted" />
          </div>

          {/* Content */}
          <div className="p-8 md:p-12">
            {/* Goal */}
            <div className="mb-12">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-3">Goal</p>
              <p className="text-lg">Save $50,000 for a house down payment in 3 years</p>
            </div>

            {/* The number */}
            <div className="mb-12">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-3">Probability of success</p>
              <p className="text-[8rem] md:text-[10rem] font-semibold leading-none tracking-[-0.04em] tabular-nums">
                73<span className="text-[4rem] md:text-[5rem]">%</span>
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-border mb-12" />

            {/* Outcomes */}
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-6">Projected outcomes</p>
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Worst case</p>
                  <p className="text-2xl font-medium tabular-nums text-[var(--error)]">$31,200</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">10th percentile</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Expected</p>
                  <p className="text-2xl font-medium tabular-nums">$48,400</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">50th percentile</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Best case</p>
                  <p className="text-2xl font-medium tabular-nums text-[hsl(var(--accent))]">$68,900</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">90th percentile</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <p className="text-muted-foreground/60 text-xs mt-4 text-center">
          Based on 100,000 simulations using your actual financial data
        </p>
      </section>

      {/* How it works */}
      <section className="px-6 py-24 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-medium tracking-tight mb-16">How it works</h2>

          <div className="grid md:grid-cols-3 gap-12 md:gap-16">
            <div>
              <p className="text-muted-foreground text-sm mb-3">01</p>
              <h3 className="font-medium mb-3">Connect your bank</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We analyze 6 months of transactions to understand your actual spending patterns and income variability.
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm mb-3">02</p>
              <h3 className="font-medium mb-3">Set your goal</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Describe what you want in plain language. Our system extracts the target amount and timeline.
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm mb-3">03</p>
              <h3 className="font-medium mb-3">See your odds</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We run 100,000 simulations of your future, modeling real-world uncertainty. You get probabilities, not promises.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The pitch */}
      <section className="px-6 py-24 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <p className="text-muted-foreground leading-relaxed mb-6">
            Traditional budgeting apps give you a single number: "Save $500/month and you'll have $18,000 in 3 years."
          </p>
          <p className="text-muted-foreground leading-relaxed mb-6">
            That number is a lie. It assumes your income stays constant, no emergencies happen, and you never overspend. Reality doesn't work that way.
          </p>
          <p className="text-foreground leading-relaxed mb-6 border-l-2 border-border pl-6">
            The right question isn't "how much will I have?" It's "what are my odds of getting there?"
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Drift runs simulations that account for uncertainty. Some months you'll save more, some less. We model that variance to give you an honest probability.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 border-t border-border">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-medium tracking-tight mb-4">See your odds</h2>
          <p className="text-muted-foreground mb-8">
            Connect your bank. Set a goal. Get an honest answer.
          </p>
          <Button asChild size="lg">
            <Link href="/login">
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Drift</span>
          <span className="text-xs text-muted-foreground">Built with uncertainty in mind</span>
        </div>
      </footer>
    </div>
  )
}
