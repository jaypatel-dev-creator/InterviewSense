import { useRef, useCallback, useEffect } from 'react'
import { useUIStore } from '../store/uiStore'

const SAMPLE_RATE = 16000
const SILENCE_THRESHOLD = 0.02
const SILENCE_DURATION_MS = 3000
const MIN_AUDIO_SECONDS = 2.0
const MIN_ENERGY = 0.005  // ambient noise is ~0.001, real speech is ~0.02+

export function useAudioRecorder(onAudioChunk, onVolumeChange) {
  const audioContextRef = useRef(null)
  const streamRef = useRef(null)
  const processorRef = useRef(null)
  const analyserRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const audioBufferRef = useRef([])
  const animFrameRef = useRef(null)
  const stopRef = useRef(null)
  const peakEnergyRef = useRef(0)  // track peak energy seen in current recording

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

    // Duration guard — don't send clips under 2 seconds
    const durationSeconds = merged.length / actualRate
    if (durationSeconds < MIN_AUDIO_SECONDS) {
      peakEnergyRef.current = 0
      return
    }

    // Energy guard — don't send if peak energy never exceeded speech threshold.
    // Ambient noise peaks at ~0.001-0.003. Real speech peaks at 0.01+.
    // This kills the "3 seconds of room noise" false trigger entirely.
    if (peakEnergyRef.current < MIN_ENERGY) {
      peakEnergyRef.current = 0
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
  }, [onAudioChunk])

  const _teardown = useCallback(() => {
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

  const stop = useCallback(() => {
    flushBuffer()
    _teardown()
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

        // Track peak energy seen in this recording session
        if (vol > peakEnergyRef.current) {
          peakEnergyRef.current = vol
        }

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

  useEffect(() => {
    return () => stopRef.current?.()
  }, [])

  return { start, stop, stopSilently }
}