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
        const alpha = isRecording ? 0.3 + (i / barsRef.current.length) * 0.7 : 1
        const x = i * barWidth

        ctx.fillStyle = isRecording
          ? `rgba(200, 75, 26, ${alpha})`
          : `rgba(226, 224, 219, 1)`

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
      className="w-full overflow-hidden"
      style={{
        height: '80px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e0db',
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}