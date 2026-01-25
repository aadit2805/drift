'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface GoalInputProps {
  onSubmit: (goal: string) => void
  isLoading?: boolean
}

export function GoalInput({ onSubmit, isLoading = false }: GoalInputProps) {
  const [goal, setGoal] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (goal.trim() && !isLoading) {
      onSubmit(goal.trim())
    }
  }

  const suggestions = [
    'Save $50,000 for a house down payment in 3 years',
    'Build a 6-month emergency fund',
    'Pay off $25,000 in student loans in 5 years',
    'Save $1 million for retirement by age 60',
  ]

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Describe your financial goal in plain English..."
          rows={3}
          disabled={isLoading}
          className="w-full px-4 py-3 pr-12 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-lg focus:outline-none focus:border-[var(--accent)] resize-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[var(--text-tertiary)] transition-colors duration-150"
        />
        <button
          type="submit"
          disabled={!goal.trim() || isLoading}
          className="absolute right-3 bottom-3 p-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-150"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>

      {/* Quick suggestions */}
      <div className="mt-4">
        <p className="text-sm text-[var(--text-secondary)] mb-2">Quick suggestions:</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setGoal(suggestion)}
              disabled={isLoading}
              className="text-sm px-3 py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-full text-[var(--text-secondary)] transition-colors duration-150 disabled:opacity-50"
            >
              {suggestion.length > 40 ? `${suggestion.slice(0, 40)}...` : suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
