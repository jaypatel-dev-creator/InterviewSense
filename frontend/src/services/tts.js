const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY
const VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'

let currentAudio = null

export async function speakText(text) {
  if (!text || !ELEVENLABS_API_KEY) return

  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    )

    if (!response.ok) {
      console.error('ElevenLabs TTS failed:', response.status)
      return
    }

    const blob = await response.blob()
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