import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'

interface WsEvent {
  type: 'delta' | 'done' | 'error' | 'interrupted'
  text?: string
}

export function useChat() {
  const ws = useRef<WebSocket | null>(null)
  const currentMsgId = useRef<string | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const destroyed = useRef(false)

  const { addUserMessage, startAssistantMessage, appendToMessage, finalizeMessage, addErrorMessage } = useStore()

  const connect = useCallback(() => {
    if (destroyed.current) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/chat`)
    ws.current = socket

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as WsEvent

      if (data.type === 'delta' && data.text) {
        if (!currentMsgId.current) {
          currentMsgId.current = startAssistantMessage()
        }
        appendToMessage(currentMsgId.current, data.text)
      } else if (data.type === 'done') {
        if (currentMsgId.current) {
          finalizeMessage(currentMsgId.current)
          currentMsgId.current = null
        }
      } else if (data.type === 'interrupted') {
        if (currentMsgId.current) {
          finalizeMessage(currentMsgId.current)
          currentMsgId.current = null
        }
      } else if (data.type === 'error') {
        if (currentMsgId.current) {
          finalizeMessage(currentMsgId.current)
          currentMsgId.current = null
        }
        addErrorMessage(data.text ?? 'Unknown error')
      }
    }

    socket.onclose = () => {
      ws.current = null
      if (!destroyed.current) {
        reconnectTimer.current = setTimeout(connect, 2000)
      }
    }

    socket.onerror = () => {
      socket.close()
    }
  }, [startAssistantMessage, appendToMessage, finalizeMessage, addErrorMessage])

  useEffect(() => {
    destroyed.current = false
    connect()

    return () => {
      destroyed.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect])

  const sendMessage = useCallback((text: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      addErrorMessage('⚠️ Not connected. Retrying in a moment...')
      return
    }
    addUserMessage(text)
    currentMsgId.current = startAssistantMessage() // show frog immediately
    ws.current.send(JSON.stringify({ message: text }))
  }, [addUserMessage, startAssistantMessage, addErrorMessage])

  const interrupt = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'interrupt' }))
    }
  }, [])

  // Close the socket — onclose auto-reconnects with a fresh session ID
  const resetSession = useCallback(() => {
    ws.current?.close()
  }, [])

  return { sendMessage, interrupt, resetSession }
}
