import { describe, it, expect } from 'vitest'
import { csvCell, toCsv } from '@/lib/csv'

/**
 * The student CSV exports used to wrap every field in quotes and never escape a
 * quote inside the value, silently shifting every column after it.
 */
describe('csv export', () => {
  it('escapes a quote inside a value (the bug that corrupted the file)', () => {
    expect(csvCell('St. John\'s "Deemed" Campus')).toBe('"St. John\'s ""Deemed"" Campus"')
  })

  it('quotes a value containing a comma', () => {
    expect(csvCell('AIIMS, New Delhi')).toBe('"AIIMS, New Delhi"')
  })

  it('quotes a value containing a newline', () => {
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"')
  })

  it('does NOT quote a value that needs no quoting', () => {
    expect(csvCell('MBBS')).toBe('MBBS')
    expect(csvCell(2025)).toBe('2025')
  })

  it('renders null/undefined as empty, not the string "null"', () => {
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
  })

  it('a row with a quoted comma keeps its column count', () => {
    const csv = toCsv(['College', 'Rank'], [['AIIMS, New Delhi', 57]])
    const dataLine = csv.split('\r\n')[1]
    // Naive split on comma would give 3 fields; a correct parser sees 2.
    expect(dataLine).toBe('"AIIMS, New Delhi",57')
  })
})
