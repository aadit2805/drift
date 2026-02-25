'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Send, Loader2, Volume2, MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendVoiceResults, type ConversationMessage, type VoiceResultsContext } from '@/lib/api'
import type { DisplayMessage } from '@/types'

interface VoiceChatProps {
  context: VoiceResultsContext
}

export function VoiceChat({ context }: VoiceChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'initial',
      role: 'assistant',
      content: "I've analyzed your simulation results. What would you like to know about your financial outlook?",
    },
  ])
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.src = ''
      }
    }
  }, [currentAudio])

  const playAudio = (base64Audio: string, messageId: string) => {
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

  const processResponse = async (input: { audio?: Blob; text?: string }) => {
    setIsProcessing(true)

    // Track if this was a voice input - only play audio responses for voice inputs
    const wasVoiceInput = !!input.audio

    const history: ConversationMessage[] = messages.map(({ role, content }) => ({
      role,
      content,
    }))

    try {
      const response = await sendVoiceResults(input, history, context)

      const userMessageId = `user-${Date.now()}`
      const userMessage: DisplayMessage = {
        id: userMessageId,
        role: 'user',
        content: response.userTranscript,
      }

      const assistantMessageId = `assistant-${Date.now()}`
      const assistantMessage: DisplayMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: response.assistantResponse,
      }

      setMessages(prev => [...prev, userMessage, assistantMessage])

      // Only play audio if user used voice input
      if (wasVoiceInput && response.audioAvailable && response.audio) {
        playAudio(response.audio, assistantMessageId)
      }
    } catch (error) {
      console.error('Voice results error:', error)
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "Sorry, I had trouble with that. Could you try again?",
        },
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream

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
          streamRef.current?.getTracks().forEach(track => track.stop())
          streamRef.current = null

          if (audioBlob.size > 1000) {
            await processResponse({ audio: audioBlob })
          } else {
            console.warn('Recording too short, ignoring')
          }
        }

        mediaRecorder.start(100)
        setIsRecording(true)
      } catch (err) {
        console.error('Failed to start recording:', err)
      }
    }
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim() || isProcessing) return

    const text = textInput.trim()
    setTextInput('')
    await processResponse({ text })
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-full bg-[hsl(var(--accent))] text-white shadow-lg hover:scale-105 transition-transform"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="font-medium text-sm">Chat with Advisor</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-h-[32rem] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          <span className="text-sm font-medium">Financial Advisor</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-muted rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 ${
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
            <div className="bg-muted rounded-2xl px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={isProcessing}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
              isRecording
                ? 'bg-[var(--error)] scale-110'
                : isProcessing
                ? 'bg-muted cursor-not-allowed'
                : 'bg-foreground hover:scale-105'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : (
              <Mic className={`w-4 h-4 ${isRecording ? 'text-white animate-pulse' : 'text-background'}`} />
            )}
          </button>

          <form onSubmit={handleTextSubmit} className="flex gap-2 flex-1">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={isRecording ? 'Listening...' : 'Ask about your results...'}
              disabled={isProcessing || isRecording}
              className="flex-1 h-10"
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={!textInput.trim() || isProcessing || isRecording}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
        {isRecording && (
          <p className="text-xs text-center text-muted-foreground mt-2">Click mic to stop recording</p>
        )}
      </div>
    </div>
  )
}
