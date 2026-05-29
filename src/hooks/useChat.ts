/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef } from 'react'
import { getSavedStatements } from '@/lib/storage'
import { getVaultDataSync } from '@/lib/storage/secureStorage'

const CHAT_HISTORY_KEY = 'fintrackr_chat_history'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

function loadHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(CHAT_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages))
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contextRef = useRef<any[] | null>(null)

  const persist = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs)
    saveHistory(msgs)
  }, [])

  const getTransactionContext = useCallback(() => {
    if (contextRef.current) return contextRef.current

    const statements = getSavedStatements()
    const txs = statements.flatMap((s: any) =>
      (s.transactions || []).map((tx: any) => ({
        detail: tx.detail,
        amount: tx.amount,
        type: tx.type,
        category: tx.category || 'Uncategorized',
        date: tx.transactionDate,
      }))
    )
    contextRef.current = txs
    return txs
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      const apiKey = getVaultDataSync().settings?.chatApiKey
      if (!apiKey) {
        setError(
          'Set your DeepSeek API key in Settings to use the chat.'
        )
        return
      }

      setError(null)

      const userMessage: ChatMessage = { role: 'user', content }
      const updated = [...messages, userMessage]
      persist(updated)
      setIsLoading(true)

      try {
        const transactionContext = getTransactionContext()

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updated,
            apiKey,
            transactionContext,
          }),
        })

        const data = await res.json()

        if (!data.success) {
          throw new Error(data.error || 'Chat failed')
        }

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.message,
        }

        persist([...updated, assistantMessage])
      } catch (err: any) {
        setError(err.message)
        setMessages((prev) => prev.slice(0, -1))
      } finally {
        setIsLoading(false)
      }
    },
    [messages, getTransactionContext, persist]
  )

  const clearMessages = useCallback(() => {
    persist([])
    setError(null)
  }, [persist])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    hasApiKey: typeof window !== 'undefined' && !!getVaultDataSync().settings?.chatApiKey,
  }
}
