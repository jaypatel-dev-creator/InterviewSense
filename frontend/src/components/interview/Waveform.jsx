import { useRef, useEffect } from 'react'

export default function Waveform({ volume, isRecording }) {
  const canvasRef = useRef(null)
  const barsRef = useRef(new Array(40).fill(0))
  const animRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      // Shift bars left, add new bar from volume
      barsRef.current = [...barsRef.current.slice(1), isRecording ? volume : 0]

      const barWidth = width / barsRef.current.length
      const centerY = height / 2

      barsRef.current.forEach((v, i) => {
        const barHeight = Math.max(2, v * height * 3)
        const alpha = isRecording ? 0.4 + (i / barsRef.current.length) * 0.6 : 0.15
        const x = i * barWidth

        ctx.fillStyle = isRecording
          ? `rgba(59, 130, 246, ${alpha})`
          : `rgba(30, 30, 46, 0.8)`

        ctx.beginPath()
        ctx.roundRect(
          x + 1,
          centerY - barHeight / 2,
          barWidth - 2,
          barHeight,
          2
        )
        ctx.fill()
      })

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [volume, isRecording])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        height: '80px',
        backgroundColor: '#111118',
        border: '1px solid #1e1e2e',
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
