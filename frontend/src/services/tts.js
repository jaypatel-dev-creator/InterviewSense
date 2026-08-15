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

    // Return a Promise that resolves only when audio finishes playing.
    // Without this, speakText().then(() => setAISpeaking(false)) fires
    // immediately after play() — indicator disappears mid-sentence.
    return new Promise((resolve) => {
      currentAudio.onended = () => {
        URL.revokeObjectURL(url)
        currentAudio = null
        resolve()
      }
      currentAudio.onerror = () => {
        // Don't hang forever if audio fails to load
        URL.revokeObjectURL(url)
        currentAudio = null
        resolve()
      }
      currentAudio.play()
    })
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