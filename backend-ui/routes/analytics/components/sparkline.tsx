"use client"

import { LineChart, Line, YAxis, ResponsiveContainer } from "recharts"

interface SparklineProps {
  /** Data points for the sparkline. Uses .value for the line. */
  data: { value: number }[]
  /** Height in pixels */
  height?: number
  className?: string
}

export function Sparkline({ data, height = 32, className = "" }: SparklineProps) {
  const points = data.length > 0 ? data : [{ value: 0 }]
  const values = points.map((d) => d.value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 1)
  const domain = min === max ? [min, min + 1] : [min, max]

  return (
    <div className={className} style={{ height, width: "100%" }} aria-hidden>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={points}
          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
        >
          <YAxis domain={domain} hide width={0} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-ui-fg-interactive)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
