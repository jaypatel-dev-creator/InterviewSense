import {
  RadarChart as RechartsRadar,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts'

export default function RadarChart({ turns }) {
  if (!turns || turns.length === 0) return null

  // Group scores by question topic (use first 3 words of question as label)
  const data = turns.map((turn, i) => ({
    topic: turn.question_text?.split(' ').slice(0, 3).join(' ') + '...' || `Q${i + 1}`,
    score: turn.correctness_score ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RechartsRadar data={data}>
        <PolarGrid stroke="#1e1e2e" />
        <PolarAngleAxis
          dataKey="topic"
          tick={{ fill: '#64748b', fontSize: 10 }}
        />
        <Radar
          dataKey="score"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  )
}