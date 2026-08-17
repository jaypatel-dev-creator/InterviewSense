import { useRef, useCallback, useEffect } from 'react'
import { useUIStore } from '../store/uiStore'

const SAMPLE_RATE = 16000
const SILENCE_THRESHOLD = 0.02
const SILENCE_DURATION_MS = 3000
const MIN_AUDIO_SECONDS = 2.0
const MIN_ENERGY = 0.005  // ambient noise is ~0.001-0.003, real speech is ~0.01+

export function useAudioRecorder(onAudioChunk, onVolumeChange) {
  const audioContextRef = useRef(null)
  const streamRef = useRef(null)
  const processorRef = useRef(null)
  const analyserRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const audioBufferRef = useRef([])
  const animFrameRef = useRef(null)
  const stopRef = useRef(null)
  const peakEnergyRef = useRef(0)

  // Ref so flushBuffer can call _teardown without a stale closure.
  // flushBuffer's useCallback dep array only includes onAudioChunk — adding
  // _teardown would create a circular dep chain. The ref breaks the cycle.
  const teardownRef = useRef(null)

  const { setRecording, setError, isAISpeaking } = useUIStore()

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

  // flushBuffer: send accumulated audio then IMMEDIATELY tear down the mic.
  // Core fix — after each answer send, recording stops. User must click again
  // for the next question. No continuous recording = no VAD on inter-question
  // silence = no auto-advance.
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

    const actualRate = audioContextRef.current?.sampleRate || 44100

    // Duration guard — reject clips under 2 seconds, still tear down
    const durationSeconds = merged.length / actualRate
    if (durationSeconds < MIN_AUDIO_SECONDS) {
      peakEnergyRef.current = 0
      teardownRef.current?.()
      return
    }

    // Energy guard — ambient noise ~0.001-0.003, real speech ~0.01+, still tear down
    if (peakEnergyRef.current < MIN_ENERGY) {
      peakEnergyRef.current = 0
      teardownRef.current?.()
      return
    }
    peakEnergyRef.current = 0

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

    // Tear down mic after send — prevents VAD firing on inter-question silence
    teardownRef.current?.()
  }, [onAudioChunk])

  const _teardown = useCallback(() => {
    // Idempotency guard — stop() calls flushBuffer() then _teardown().
    // flushBuffer() now also calls _teardown() after sending.
    // Without this guard, AudioContext closes twice → InvalidStateError.
    if (
      !processorRef.current &&
      !analyserRef.current &&
      !audioContextRef.current &&
      !streamRef.current
    ) {
      return
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    processorRef.current?.disconnect()
    analyserRef.current?.disconnect()
    audioContextRef.current?.close()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    processorRef.current = null
    analyserRef.current = null
    audioContextRef.current = null
    streamRef.current = null
    audioBufferRef.current = []
    peakEnergyRef.current = 0
    cancelAnimationFrame(animFrameRef.current)
    setRecording(false)
  }, [setRecording])

  // Keep teardownRef current so flushBuffer always calls the live version
  useEffect(() => {
    teardownRef.current = _teardown
  }, [_teardown])

  const stop = useCallback(() => {
    flushBuffer()
    _teardown()  // idempotent — safe if flushBuffer already ran it
  }, [flushBuffer, _teardown])

  const stopSilently = useCallback(() => {
    audioBufferRef.current = []
    peakEnergyRef.current = 0
    _teardown()
  }, [_teardown])

  useEffect(() => {
    stopRef.current = stop
  }, [stop])

  const start = useCallback(async () => {
    // Guard against double-clicks — don't open a second AudioContext
    if (audioContextRef.current) return

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
        if (isAISpeakingRef.current) {
          audioBufferRef.current = []
          peakEnergyRef.current = 0
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

        if (vol > peakEnergyRef.current) {
          peakEnergyRef.current = vol
        }

        if (vol < SILENCE_THRESHOLD) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null
              flushBuffer()
              // flushBuffer handles teardown internally after send
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

  useEffect(() => {
    return () => stopRef.current?.()
  }, [])

  return { start, stop, stopSilently }
}