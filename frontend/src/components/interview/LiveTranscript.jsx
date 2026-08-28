import { useRef, useEffect } from 'react'

export default function LiveTranscript({ transcript }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [transcript])

  if (!transcript) return null

  return (
    <div
      className="px-4 py-4 space-y-2"
      style={{ backgroundColor: '#ffffff', border: '1px solid #e2e0db' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5"
          style={{ backgroundColor: '#c84b1a' }}
        />
        <span className="text-xs font-medium" style={{ color: '#a8a49e' }}>
          Live transcript
        </span>
      </div>
      <div
        ref={ref}
        className="text-sm leading-relaxed max-h-24 overflow-y-auto"
        style={{ color: '#6b6860', fontFamily: "'JetBrains Mono', monospace" }}
      >
        {transcript}
        <span
          className="inline-block w-0.5 h-4 ml-0.5 align-middle"
          style={{
            backgroundColor: '#c84b1a',
            animation: 'blink 1s step-end infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}