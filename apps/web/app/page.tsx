'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// Dynamic import to avoid SSR issues with Three.js
const ParticleField = dynamic(
  () => import('@/components/ParticleField').then((mod) => mod.ParticleField),
  { ssr: false }
)

// Accent line divider component
function AccentLine() {
  return (
    <div className="relative z-10 max-w-6xl mx-auto px-6">
      <div className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent))/30] to-transparent" />
    </div>
  )
}

export default function Home() {
  const [particleReady, setParticleReady] = useState(false)

  useEffect(() => {
    // Trigger animations after ParticleField is ready
    if (particleReady) {
      // Force a reflow to ensure animations trigger
      void document.body.offsetHeight
    }
  }, [particleReady])

  useEffect(() => {
    // Intersection Observer for scroll fade-in effects
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
          }
        })
      },
      { threshold: 0.1 }
    )

    document.querySelectorAll('.scroll-fade-section').forEach((section) => {
      observer.observe(section)
    })

    return () => observer.disconnect()
  }, [particleReady])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 3D Particle Background - covers entire page */}
      <ParticleField 
        className="z-0 pointer-events-none" 
        particleCount={400}
        onReady={() => setParticleReady(true)}
      />

      {/* Content */}
      <div className={`relative z-20 ${!particleReady ? 'invisible' : 'visible'}`}>

      {/* Nav - frosted glass */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-4 sm:px-6 py-3 max-w-7xl w-[calc(100%-2rem)] rounded-full bg-background/60 backdrop-blur-xl border border-border/50">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/drift-logo.jpg"
            alt="Drift logo"
            width={30}
            height={30}
            className="h-7 w-7 rounded-sm object-cover"
            priority
          />
          <span className="text-xl font-semibold tracking-[0.02em]">Drift</span>
        </Link>
        <Button asChild size="sm">
          <Link href="/login">
            Log in
          </Link>
        </Button>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-32 pb-48 min-h-[calc(100vh-100px)] flex items-center max-w-7xl mx-auto">
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] xl:gap-12 w-full">
          <div>
            <p className="text-muted-foreground text-sm mb-5 tracking-wide uppercase">
              Financial foresight
            </p>
            <h1 className={`text-[clamp(2.5rem,6vw,5rem)] font-medium leading-[1.05] tracking-[-0.03em] mb-6 max-w-3xl ${particleReady ? 'animate-slide-in-fade-1' : ''}`}>
              Stop guessing.<br />
              Start knowing.
            </h1>
            <p className={`text-muted-foreground text-lg sm:text-xl max-w-xl mb-10 leading-relaxed ${particleReady ? 'animate-slide-in-fade-2' : ''}`}>
              Tell us your goal. We'll tell you the odds — and what moves the needle.
            </p>
            <Button asChild className={particleReady ? 'animate-fade-slide-up' : ''}>
              <Link href="/login">
                Get started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div>
            <Card className="overflow-hidden hover:translate-y-0 bg-card border border-white/10 shadow-inner">
          {/* Window chrome */}
              <div className="hidden sm:flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <div className="w-3 h-3 rounded-full bg-muted" />
                <div className="w-3 h-3 rounded-full bg-muted" />
              </div>

          {/* Content */}
              <div className="p-6 sm:p-8 lg:p-10">
            {/* Goal */}
                <div className="mb-10">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-3">Goal</p>
                  <p className="text-lg">Save $50,000 for a house down payment in 3 years</p>
                </div>

            {/* The number */}
                <div className="mb-10">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-3">Probability of success</p>
                  <p className="text-[clamp(4.25rem,16vw,8.5rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums">
                    73<span className="text-[clamp(2.2rem,8vw,4rem)]">%</span>
                  </p>
                </div>

            {/* Divider */}
                <div className="h-px bg-border/50 mb-9" />

            {/* Outcomes */}
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-5">Projected outcomes</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
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
                    <div className="sm:col-span-2 lg:col-span-1">
                      <p className="text-muted-foreground text-sm mb-2">Best case</p>
                      <p className="text-2xl font-medium tabular-nums text-[hsl(var(--accent))]">$68,900</p>
                      <p className="text-muted-foreground/60 text-xs mt-1">90th percentile</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <p className="text-muted-foreground/70 text-xs mt-4 text-center lg:text-left">
              Based on 100,000 simulations using your actual financial data
            </p>
          </div>
        </div>
      </section>

      <AccentLine />

      {/* How it works */}
      <section className="relative z-10 px-6 py-24 scroll-fade-section">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-medium tracking-tight mb-16">How it works</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-colors">
              <h3 className="font-medium mb-3">Connect your bank</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We analyze your transactions to understand your actual spending patterns and income variability.
              </p>
            </Card>
            <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-colors">
              <h3 className="font-medium mb-3">Set your goal</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Describe what you want in plain language. Our system extracts the target amount and timeline.
              </p>
            </Card>
            <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-colors">
              <h3 className="font-medium mb-3">See your odds</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We run 100,000 simulations of your future, modeling real-world uncertainty. You get probabilities, not promises.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <AccentLine />

      {/* The pitch */}
      <section className="relative z-10 px-6 py-24 scroll-fade-section">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 bg-card/60 backdrop-blur-sm border-border/50">
            <p className="text-muted-foreground leading-relaxed mb-6">
              Traditional budgeting apps give you a single number: "Save $500/month and you'll have $18,000 in 3 years."
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              That number is a lie. It assumes your income stays constant, no emergencies happen, and you never overspend. Reality doesn't work that way.
            </p>
            <p className="text-foreground leading-relaxed mb-6 border-l-2 border-l-[hsl(var(--accent))] pl-6">
              The right question isn't "how much will I have?" It's "what are my odds of getting there?"
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Drift runs simulations that account for uncertainty. Some months you'll save more, some less. We model that variance to give you an honest probability.
            </p>
          </Card>
        </div>
      </section>

      <AccentLine />

      {/* CTA */}
      <section className="relative z-10 px-6 py-24 scroll-fade-section">
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
      <footer className="relative z-10 px-6 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Drift</span>
          <span className="text-xs text-muted-foreground">Built with uncertainty in mind</span>
        </div>
      </footer>
      </div>
    </div>
  )
}
