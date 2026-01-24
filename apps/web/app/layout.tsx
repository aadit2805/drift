import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen gradient-bg grid-pattern">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
