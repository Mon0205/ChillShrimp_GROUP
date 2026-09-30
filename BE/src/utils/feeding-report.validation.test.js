import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFeedingReportFilters } from './feeding-report.validation.js'

const now = new Date('2026-10-01T12:00:00.000Z')

test('defaults report range to the most recent 30 days', () => {
  const result = parseFeedingReportFilters({}, now)
  assert.equal(result.from.toISOString(), '2026-09-02T12:00:00.000Z')
  assert.equal(result.to.toISOString(), now.toISOString())
  assert.equal(result.tankId, null)
})

test('rejects reversed, overlong, and invalid filtered ranges', () => {
  assert.throws(() => parseFeedingReportFilters({ from: '2026-10-02', to: '2026-10-01' }, now), /Ngày bắt đầu/)
  assert.throws(() => parseFeedingReportFilters({ from: '2025-01-01', to: '2026-10-01' }, now), /366 ngày/)
  assert.throws(() => parseFeedingReportFilters({ tankId: 'not-a-uuid' }, now), /Mã ao\/bể/)
})
