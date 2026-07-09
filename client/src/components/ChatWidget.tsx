import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Bot, Loader2, MessageSquareText, Send, Sparkles, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { generateTeamSummary, sendChatMessage } from '@/api/chat'
import { getApiErrorMessage } from '@/api/http'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
}

function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: globalThis.crypto.randomUUID(),
    role,
    content,
  }
}

export function ChatWidget() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      'assistant',
      'I can summarize dashboards, explain manager reports, and pull together this week\'s team summary.',
    ),
  ])
  const endRef = useRef<HTMLDivElement | null>(null)

  const isManager = user?.role === 'Manager'

  const sendMutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (result) => {
      if (result.conversationId) {
        setConversationId(result.conversationId)
      }

      setMessages((current) => [...current, createMessage('assistant', result.reply)])
    },
    onError: (error) => {
      setMessages((current) => [
        ...current,
        createMessage('assistant', `I could not complete that request. ${getApiErrorMessage(error)}`),
      ])
    },
  })

  const summaryMutation = useMutation({
    mutationFn: generateTeamSummary,
    onSuccess: (result) => {
      setMessages((current) => [...current, createMessage('assistant', result.reply)])
    },
    onError: (error) => {
      setMessages((current) => [
        ...current,
        createMessage('assistant', `I could not generate the summary. ${getApiErrorMessage(error)}`),
      ])
    },
  })

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  const isBusy = sendMutation.isPending || summaryMutation.isPending

  const helperText = useMemo(() => {
    if (sendMutation.isPending) {
      return 'Thinking through the current conversation...'
    }

    if (summaryMutation.isPending) {
      return 'Generating a weekly summary...'
    }

    return 'Ask about dashboards, blockers, workload, or submissions.'
  }, [sendMutation.isPending, summaryMutation.isPending])

  if (!isManager) {
    return null
  }

  function submitSummary() {
    if (isBusy) {
      return
    }

    setMessages((current) => [
      ...current,
      createMessage('user', "Generate this week's team summary"),
    ])
    summaryMutation.mutate()
  }

  function submitMessage() {
    const message = draft.trim()

    if (!message || isBusy) {
      return
    }

    setMessages((current) => [...current, createMessage('user', message)])
    setDraft('')

    sendMutation.mutate({
      message,
      conversationId,
    })
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {isOpen ? (
        <Card className="w-[min(92vw,26rem)] overflow-hidden border border-border/80 shadow-2xl shadow-black/10">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b bg-background/80 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-primary" />
              Manager AI
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <Button variant="secondary" className="gap-2" onClick={submitSummary} disabled={isBusy}>
                <Sparkles className="h-4 w-4" />
                Generate this week's team summary
              </Button>
            </div>

            <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm',
                    message.role === 'user'
                      ? 'ml-auto bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground',
                  )}
                >
                  {message.content}
                </div>
              ))}

              {isBusy ? (
                <div className="max-w-[88%] rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {helperText}
                  </span>
                </div>
              ) : null}

              <div ref={endRef} />
            </div>

            <div className="space-y-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask about this week's reports or blockers..."
                rows={3}
                className="resize-none"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    submitMessage()
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{helperText}</p>
                <Button onClick={submitMessage} disabled={!draft.trim() || isBusy} className="gap-2">
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Button
        onClick={() => setIsOpen((open) => !open)}
        className="h-14 rounded-full px-5 shadow-2xl shadow-black/20"
      >
        <MessageSquareText className="mr-2 h-4 w-4" />
        {isOpen ? 'Close AI chat' : 'Open AI chat'}
      </Button>
    </div>
  )
}