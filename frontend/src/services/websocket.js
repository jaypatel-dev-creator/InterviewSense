const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export function buildInterviewWSUrl(sessionId) {
  return `${WS_URL}/ws/interview/${sessionId}`
}

export class InterviewWebSocket {
  constructor(url, handlers) {
    this.url = url
    this.handlers = handlers
    this.ws = null
  }

  connect() {
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.handlers.onOpen?.()
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handlers.onMessage?.(data)
      } catch (e) {
        console.error('WS parse error:', e)
      }
    }

    this.ws.onerror = (error) => {
      this.handlers.onError?.(error)
    }

    this.ws.onclose = (event) => {
      this.handlers.onClose?.(event)
    }
  }

  sendText(text) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'text_answer', text }))
    }
  }

  sendAudio(audioBuffer) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(audioBuffer)
    }
  }

  sendControl(type) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type }))
    }
  }

  disconnect() {
    this.ws?.close()
  }
}