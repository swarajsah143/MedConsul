import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminDataPage from '@/pages/admin-data'

/**
 * Drives the REAL admin UI with REAL user interactions against the REAL API and
 * a REAL MongoDB. Nothing is stubbed — every fetch below actually hits
 * http://localhost:5050 and every assertion is checked against what Mongo stored.
 *
 * This is what a person clicking through /admin/data does: open a collection, hit
 * "Add new", fill the form (including the repeating gallery sub-form), submit,
 * fix a validation error, import a CSV, and try to delete something.
 *
 * Requires: `npm run dev` running, Mongo up, and the data migrated.
 */

const API = 'http://localhost:5050'
let token = ''

async function login() {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@medcounsel.ai', password: '***REDACTED***' }),
  })
  if (!r.ok) throw new Error('admin login failed — is `npm run dev` running?')
  return (await r.json()).data.accessToken
}

const api = (path: string, init: RequestInit = {}) =>
  fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }))

/** The app's api client reads the token from localStorage and calls relative /api/*. */
function installRealFetch() {
  localStorage.setItem('accessToken', token)
  const real = globalThis.fetch.bind(globalThis)
  vi.stubGlobal('fetch', (input: any, init?: any) => {
    const url = String(typeof input === 'string' ? input : input?.url ?? '')
    return real(url.startsWith('/') ? `${API}${url}` : url, init)
  })
}

function mount(collection: string) {
  return render(
    <MemoryRouter initialEntries={[`/admin/data/${collection}`]}>
      <Routes>
        <Route path="/admin/data/:collection" element={<AdminDataPage />} />
      </Routes>
    </MemoryRouter>
  )
}

/**
 * These tests need a live server + Mongo. Skip (don't fail) when it isn't running,
 * so `npm test` still works on a fresh checkout — but say so loudly rather than
 * passing silently, which would be worse than failing.
 */
const live = await fetch(`${API}/api/health`).then((r) => r.ok).catch(() => false)
if (!live) {
  console.warn(`\n  ! admin-ui tests SKIPPED — no server at ${API}. Run \`npm run dev\` to exercise them.\n`)
}
const suite = live ? describe : describe.skip

const STAMP = Date.now()
const UNIQUE = `ZZ Test College ${STAMP}`
const CSV_A = `ZZ Csv Alpha ${STAMP}`
const CSV_B = `ZZ Csv Beta ${STAMP}`

beforeAll(async () => {
  token = await login()
  installRealFetch()
})

afterEach(() => cleanup())

suite('admin UI — driven as a user, against the real API + Mongo', () => {
  it('loads the Colleges table with real rows and real column values', async () => {
    mount('colleges')
    // Wait for the schema fetch AND the list fetch to land, then assert on real rows.
    await waitFor(
      () => expect(screen.getAllByText(/Maulana Azad/i).length).toBeGreaterThan(0),
      { timeout: 20000 }
    )
    // The table renders real column values, not placeholders.
    expect(document.body.textContent).toMatch(/Government|Private|Deemed/)
  })

  it('a ref column shows the COLLEGE NAME, not a Mongo ObjectId', async () => {
    mount('closingRanks')
    await waitFor(
      () => {
        const body = document.body.textContent ?? ''
        expect(body).toMatch(/AIIMS|Maulana Azad|Grant/i)
        // 24-hex ObjectIds must never be user-visible in the table.
        expect(body).not.toMatch(/\b[a-f0-9]{24}\b/)
      },
      { timeout: 15000 }
    )
  })

  it('CREATE: fills the form (incl. the repeating gallery sub-form) and saves to Mongo', async () => {
    const user = userEvent.setup()
    mount('colleges')
    await screen.findByRole('button', { name: /add|new/i }, { timeout: 15000 })

    await user.click(screen.getByRole('button', { name: /add|new/i }))

    // The form is schema-driven: these inputs only exist if it rendered correctly.
    const name = await screen.findByLabelText(/^Name/i, {}, { timeout: 10000 })
    await user.type(name, UNIQUE)
    await user.type(screen.getByLabelText(/^State/i), 'Kerala')
    await user.type(screen.getByLabelText(/^City/i), 'Kochi')
    await user.selectOptions(screen.getByLabelText(/^Type/i), 'Private')

    // The repeating object[] sub-form — the hardest part of the whole admin UI.
    const addGallery = screen.getByRole('button', { name: /add gallery/i })
    await user.click(addGallery)
    const urlInput = await screen.findByLabelText(/image url/i)
    await user.type(urlInput, 'https://example.com/a.jpg')
    await user.type(screen.getByLabelText(/caption/i), 'Main block')

    await user.click(screen.getByRole('button', { name: /save|create/i }))

    // Assert against MONGO, not the DOM — the UI could lie; the database can't.
    await waitFor(async () => {
      const r = await api(`/api/admin/resources/colleges?q=${encodeURIComponent(UNIQUE)}`)
      expect(r.body.data.items.length).toBe(1)
      const c = r.body.data.items[0]
      expect(c.city).toBe('Kochi')
      expect(c.type).toBe('Private')
      expect(c.gallery?.[0]?.url).toBe('https://example.com/a.jpg')
      expect(c.gallery?.[0]?.caption).toBe('Main block')
    }, { timeout: 15000 })
  })

  it('VALIDATION: a bad value is rejected and the field error is shown to the user', async () => {
    const user = userEvent.setup()
    mount('closingRanks')
    await screen.findByRole('button', { name: /add|new/i }, { timeout: 15000 })
    await user.click(screen.getByRole('button', { name: /add|new/i }))

    // Year expects a number; give it text and submit.
    const year = await screen.findByLabelText(/^Year/i, {}, { timeout: 10000 })
    await user.type(year, 'not-a-year')
    await user.click(screen.getByRole('button', { name: /save|create/i }))

    // Either the client blocks it or the server 400s — either way the USER must see why.
    await waitFor(
      () => expect(document.body.textContent).toMatch(/required|must be|invalid|number/i),
      { timeout: 15000 }
    )
  })

  it('DELETE GUARD: removing a referenced college is blocked and the reason is surfaced', async () => {
    // Find a college that rank rows actually point at.
    const ranks = await api('/api/admin/resources/closingRanks?limit=1')
    const referenced = ranks.body.data.items[0].collegeId

    const del = await api(`/api/admin/resources/colleges/${referenced}`, { method: 'DELETE' })
    expect(del.status).toBe(409)
    expect(del.body.message).toMatch(/cannot delete/i)
    expect(del.body.references?.length).toBeGreaterThan(0)
  })

  it('CSV IMPORT: pastes a CSV, previews it, imports it, and the rows land in Mongo', async () => {
    const user = userEvent.setup()
    mount('colleges')
    await screen.findByRole('button', { name: /import/i }, { timeout: 15000 })
    await user.click(screen.getByRole('button', { name: /import/i }))

    const box = await screen.findByRole('textbox', {}, { timeout: 10000 })

    // Deliberately nasty: a comma inside a quoted field, and an escaped "" quote.
    const csv = [
      'Name,State,City,Type',
      `"${CSV_A}, Kochi",Kerala,Kochi,Private`,
      `"${CSV_B} ""Deemed"" Campus",Kerala,Kollam,Deemed`,
    ].join('\n')

    await user.click(box)
    await user.paste(csv)

    // The preview must appear and report 2 rows before anything is written.
    await waitFor(() => expect(document.body.textContent).toMatch(/2\s*row/i), { timeout: 10000 })

    await user.click(screen.getByRole('button', { name: /^import/i }))

    // Verify against Mongo — including that the quoted comma survived the parse.
    await waitFor(async () => {
      const r = await api(`/api/admin/resources/colleges?q=${encodeURIComponent(CSV_A)}`)
      expect(r.body.data.items.length).toBe(1)
      expect(r.body.data.items[0].name).toBe(`${CSV_A}, Kochi`)
    }, { timeout: 20000 })

    const b = await api(`/api/admin/resources/colleges?q=${encodeURIComponent(CSV_B)}`)
    expect(b.body.data.items[0].name).toBe(`${CSV_B} "Deemed" Campus`)
    expect(b.body.data.items[0].type).toBe('Deemed')
  })

  it('CSV IMPORT is idempotent: re-importing the same file adds nothing', async () => {
    const before = await api('/api/admin/resources/colleges?limit=1')
    const totalBefore = before.body.data.total

    const rows = [
      { name: `${CSV_A}, Kochi`, state: 'Kerala', city: 'Kochi', type: 'Private' },
      { name: `${CSV_B} "Deemed" Campus`, state: 'Kerala', city: 'Kollam', type: 'Deemed' },
    ]
    const res = await api('/api/admin/resources/colleges/bulk', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    expect(res.body.data.inserted).toBe(0)      // nothing new
    expect(res.body.data.updated).toBe(2)       // upserted in place

    const after = await api('/api/admin/resources/colleges?limit=1')
    expect(after.body.data.total).toBe(totalBefore)
  })

  it('CLEANUP: rows created through the form and the importer are removed', async () => {
    for (const q of [UNIQUE, CSV_A, CSV_B]) {
      const found = await api(`/api/admin/resources/colleges?q=${encodeURIComponent(q)}`)
      for (const item of found.body.data.items) {
        const del = await api(`/api/admin/resources/colleges/${item.id}`, { method: 'DELETE' })
        expect([200, 404]).toContain(del.status)
      }
    }
    // The test data must not leak into the app.
    for (const q of [UNIQUE, CSV_A, CSV_B]) {
      const left = await api(`/api/admin/resources/colleges?q=${encodeURIComponent(q)}`)
      expect(left.body.data.items.length, `${q} was left behind`).toBe(0)
    }
  })
})
