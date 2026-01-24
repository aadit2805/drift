import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'FutureCast - Monte Carlo Financial Simulation',
  description: 'See 10,000 versions of your financial future. HPC-powered personal finance simulation.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen texture-overlay">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
