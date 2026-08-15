let currentAudio = null

export async function speakText(text) {
  if (!text) return

  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      console.error('TTS failed:', response.status)
      return
    }

    const arrayBuffer = await response.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    currentAudio = new Audio(url)
    currentAudio.play()
    currentAudio.onended = () => {
      URL.revokeObjectURL(url)
      currentAudio = null
    }
  } catch (err) {
    console.error('TTS error:', err)
  }
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
}