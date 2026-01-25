'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

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
        <Textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Describe your financial goal in plain English..."
          rows={3}
          disabled={isLoading}
          className="pr-12 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!goal.trim() || isLoading}
          className="absolute right-3 bottom-3"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </form>

      {/* Quick suggestions */}
      <div className="mt-4">
        <p className="text-sm text-muted-foreground mb-2">Quick suggestions:</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setGoal(suggestion)}
              disabled={isLoading}
              className="text-sm px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground transition-colors duration-150 disabled:opacity-50"
            >
              {suggestion.length > 40 ? `${suggestion.slice(0, 40)}...` : suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
