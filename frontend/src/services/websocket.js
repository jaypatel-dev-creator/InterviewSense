const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export function buildInterviewWSUrl(sessionId, params) {
  const query = new URLSearchParams({
    domain: params.domain,
    difficulty: params.difficulty,
    question_count: params.questionCount,
    ...(params.jdText && { jd_text: params.jdText }),
    ...(params.candidateName && { candidate_name: params.candidateName }),
  }).toString()

  return `${WS_URL}/ws/interview/${sessionId}?${query}`
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
