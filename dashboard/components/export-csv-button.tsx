'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportCsvButtonProps {
  filename: string
  headers: string[]
  rows: (string | number)[][]
  label?: string
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (value: string | number): string => {
    const s = String(value)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers, ...rows].map((row) => row.map(escape).join(','))
  return lines.join('\n')
}

/**
 * Client-side CSV export. Builds the file in the browser from data already on
 * the page (Excel opens CSV natively), so no extra backend round-trip is needed.
 */
export function ExportCsvButton({
  filename,
  headers,
  rows,
  label = 'Export CSV'
}: ExportCsvButtonProps): JSX.Element {
  function download(): void {
    const csv = toCsv(headers, rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={download}
      disabled={rows.length === 0}
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  )
}
