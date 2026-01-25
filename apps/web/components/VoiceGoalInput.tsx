'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Send, Loader2, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendVoiceGoal, type ConversationMessage, type VoiceGoalResponse } from '@/lib/api'

interface VoiceGoalInputProps {
  onGoalComplete: (goal: { targetAmount: number; timelineMonths: number; goalType: string }) => void
}

interface DisplayMessage extends ConversationMessage {
  id: string
  isPlaying?: boolean
}

export function VoiceGoalInput({ onGoalComplete }: VoiceGoalInputProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'initial',
      role: 'assistant',
      content: "Hey! What financial goal are you working towards?",
    },
  ])
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.src = ''
      }
    }
  }, [currentAudio])

  const playAudio = (base64Audio: string, messageId: string) => {
    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.src = ''
    }

    const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`)
    setCurrentAudio(audio)
    setPlayingMessageId(messageId)

    audio.onended = () => {
      setPlayingMessageId(null)
    }

    audio.onerror = () => {
      setPlayingMessageId(null)
    }

    audio.play().catch(console.error)
  }

  const playAudioAndWait = (base64Audio: string, messageId: string, onComplete: () => void) => {
    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.src = ''
    }

    const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`)
    setCurrentAudio(audio)
    setPlayingMessageId(messageId)

    audio.onended = () => {
      setPlayingMessageId(null)
      onComplete()
    }

    audio.onerror = () => {
      setPlayingMessageId(null)
      onComplete() // Still transition even if audio fails
    }

    audio.play().catch(() => {
      onComplete() // Still transition even if play fails
    })
  }

  const processResponse = async (input: { audio?: Blob; text?: string }) => {
    setIsProcessing(true)

    // Build conversation history (exclude display-only fields)
    const history: ConversationMessage[] = messages.map(({ role, content }) => ({
      role,
      content,
    }))

    try {
      const response = await sendVoiceGoal(input, history)

      // Add user message
      const userMessageId = `user-${Date.now()}`
      const userMessage: DisplayMessage = {
        id: userMessageId,
        role: 'user',
        content: response.userTranscript,
      }

      // Add assistant message
      const assistantMessageId = `assistant-${Date.now()}`
      const assistantMessage: DisplayMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: response.assistantResponse,
      }

      setMessages(prev => [...prev, userMessage, assistantMessage])

      // Check if goal is complete
      if (response.isComplete && response.parsedGoal) {
        // Play audio and wait for it to finish before transitioning
        if (response.audioAvailable && response.audio) {
          playAudioAndWait(response.audio, assistantMessageId, () => {
            // Pause like a newscaster before transitioning
            setTimeout(() => {
              onGoalComplete(response.parsedGoal!)
            }, 1200)
          })
        } else {
          // No audio - just pause then transition
          setTimeout(() => {
            onGoalComplete(response.parsedGoal!)
          }, 2000)
        }
      } else {
        // Not complete yet - just play the audio response
        if (response.audioAvailable && response.audio) {
          playAudio(response.audio, assistantMessageId)
        }
      }
    } catch (error) {
      console.error('Voice goal error:', error)
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "Sorry, I had trouble understanding that. Could you try again?",
        },
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        await processResponse({ audio: audioBlob })
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim() || isProcessing) return

    const text = textInput.trim()
    setTextInput('')
    await processResponse({ text })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-6 max-h-64">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-foreground'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              {message.role === 'assistant' && playingMessageId === message.id && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Volume2 className="w-3 h-3 animate-pulse" />
                  <span>Speaking...</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Input */}
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isProcessing}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-[var(--error)] scale-110 shadow-lg shadow-[var(--error)]/30'
              : isProcessing
              ? 'bg-muted cursor-not-allowed'
              : 'bg-foreground hover:scale-105 active:scale-95'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          ) : (
            <Mic className={`w-8 h-8 ${isRecording ? 'text-white animate-pulse' : 'text-background'}`} />
          )}
        </button>
        <p className="text-sm text-muted-foreground">
          {isRecording ? 'Listening... release to send' : isProcessing ? 'Processing...' : 'Hold to speak'}
        </p>
      </div>

      {/* Text Input Fallback */}
      <div className="mt-6 pt-4 border-t border-border">
        <form onSubmit={handleTextSubmit} className="flex gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Or type your goal..."
            disabled={isProcessing || isRecording}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!textInput.trim() || isProcessing || isRecording}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
