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

    return new Promise((resolve) => {
      currentAudio.onended = () => {
        URL.revokeObjectURL(url)
        currentAudio = null
        // 600ms cooldown after TTS ends before mic is re-enabled.
        // Prevents speaker bleed — the gap between audio.onended and
        // isAISpeakingRef updating in useAudioRecorder causes a window
        // where mic captures TTS tail audio and sends it as the answer.
        setTimeout(resolve, 600)
      }
      currentAudio.onerror = () => {
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