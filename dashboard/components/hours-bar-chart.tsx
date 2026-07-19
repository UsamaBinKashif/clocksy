'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

interface HoursBarChartProps {
  data: { label: string; hours: number }[]
}

/** Simple hours-by-category bar chart used on the reports page. */
export function HoursBarChart({ data }: HoursBarChartProps): JSX.Element {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        No data for this range.
      </p>
    )
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value) => [`${Number(value)}h`, 'Hours']}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 12
            }}
          />
          <Bar dataKey="hours" fill="var(--accent-orange)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
