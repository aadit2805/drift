import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Drift',
  description: 'Monte Carlo simulation for personal finance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ colorScheme: 'dark' }}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
