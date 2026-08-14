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
      className="rounded-xl px-4 py-4 space-y-2"
      style={{ backgroundColor: '#111118', border: '1px solid #1e1e2e' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: '#3b82f6' }}
        />
        <span className="text-xs font-medium" style={{ color: '#64748b' }}>
          Live transcript
        </span>
      </div>
      <div
        ref={ref}
        className="text-sm leading-relaxed max-h-24 overflow-y-auto"
        style={{ color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}
      >
        {transcript}
        <span
          className="inline-block w-0.5 h-4 ml-0.5 align-middle"
          style={{
            backgroundColor: '#3b82f6',
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
