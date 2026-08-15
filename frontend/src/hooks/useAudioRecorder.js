import { useRef, useCallback, useEffect } from 'react'
import { useUIStore } from '../store/uiStore'

const SAMPLE_RATE = 16000
const SILENCE_THRESHOLD = 0.01
const SILENCE_DURATION_MS = 1500

export function useAudioRecorder(onAudioChunk, onVolumeChange) {
  const audioContextRef = useRef(null)
  const streamRef = useRef(null)
  const processorRef = useRef(null)
  const analyserRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const audioBufferRef = useRef([])
  const animFrameRef = useRef(null)
  const stopRef = useRef(null)

  const { setRecording, setError, isAISpeaking } = useUIStore()

  // Keep a ref to isAISpeaking so onaudioprocess closure always sees current value
  const isAISpeakingRef = useRef(isAISpeaking)
  useEffect(() => {
    isAISpeakingRef.current = isAISpeaking
  }, [isAISpeaking])

  const getVolume = useCallback(() => {
    if (!analyserRef.current) return 0
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const val = (data[i] - 128) / 128
      sum += val * val
    }
    return Math.sqrt(sum / data.length)
  }, [])

  const startVolumeMonitor = useCallback(() => {
    const tick = () => {
      const vol = getVolume()
      onVolumeChange?.(vol)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [getVolume, onVolumeChange])

  const flushBuffer = useCallback(() => {
    if (audioBufferRef.current.length === 0) return

    const merged = new Float32Array(
      audioBufferRef.current.reduce((acc, chunk) => acc + chunk.length, 0)
    )
    let offset = 0
    for (const chunk of audioBufferRef.current) {
      merged.set(chunk, offset)
      offset += chunk.length
    }
    audioBufferRef.current = []

    // Browsers ignore the sampleRate hint on AudioContext and run at hardware
    // rate (typically 44100 or 48000Hz). Resample down to 16000Hz before
    // sending — Groq Whisper expects 16kHz audio. Wrong rate = pitch-shifted
    // garbage in, empty transcript out.
    const actualRate = audioContextRef.current?.sampleRate || 44100
    if (actualRate !== SAMPLE_RATE) {
      const ratio = SAMPLE_RATE / actualRate
      const resampled = new Float32Array(Math.round(merged.length * ratio))
      for (let i = 0; i < resampled.length; i++) {
        resampled[i] = merged[Math.round(i / ratio)] ?? 0
      }
      onAudioChunk?.(resampled.buffer)
    } else {
      onAudioChunk?.(merged.buffer)
    }
  }, [onAudioChunk])

  const stop = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    flushBuffer()

    processorRef.current?.disconnect()
    analyserRef.current?.disconnect()
    audioContextRef.current?.close()
    streamRef.current?.getTracks().forEach((t) => t.stop())

    processorRef.current = null
    analyserRef.current = null
    audioContextRef.current = null
    streamRef.current = null
    audioBufferRef.current = []

    cancelAnimationFrame(animFrameRef.current)
    setRecording(false)
  }, [flushBuffer, setRecording])

  // Keep stopRef current without adding stop to cleanup deps
  useEffect(() => {
    stopRef.current = stop
  }, [stop])

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: SAMPLE_RATE, channelCount: 1, echoCancellation: true },
      })
      streamRef.current = stream

      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
      audioContextRef.current = ctx

      const source = ctx.createMediaStreamSource(stream)

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      source.connect(analyser)

      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor
      source.connect(processor)
      processor.connect(ctx.destination)

      processor.onaudioprocess = (e) => {
        // AI is speaking — drop all incoming audio and clear any pending
        // silence timer. Prevents TTS speaker bleed from being sent as
        // the candidate's answer and auto-advancing through all questions.
        if (isAISpeakingRef.current) {
          audioBufferRef.current = []
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }
          return
        }

        const input = e.inputBuffer.getChannelData(0)
        const chunk = new Float32Array(input)
        audioBufferRef.current.push(chunk)

        const vol = Math.max(...chunk.map(Math.abs))
        if (vol < SILENCE_THRESHOLD) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              flushBuffer()
              silenceTimerRef.current = null
            }, SILENCE_DURATION_MS)
          }
        } else {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }
        }
      }

      setRecording(true)
      startVolumeMonitor()
    } catch (err) {
      setError('Microphone access denied. Please allow mic access and try again.')
      console.error('Mic error:', err)
    }
  }, [flushBuffer, setRecording, setError, startVolumeMonitor])

  // Cleanup on unmount — uses ref to avoid infinite loop
  useEffect(() => {
    return () => stopRef.current?.()
  }, [])

  return { start, stop }
}