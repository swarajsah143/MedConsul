import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'

/**
 * Smoke-renders every page that was rewired from static imports to the API.
 *
 * The point is not assertions about content — it is EXECUTION. These pages
 * compile, but compiling proves nothing about a page that calls
 * `entry.yearWiseFees.map()` on a record an admin created without year-wise fees.
 *
 * Each page is rendered under three worlds:
 *
 *   real   — the data as it exists today (full records)
 *   sparse — every record has ONLY its required fields. This is exactly what the
 *            admin form produces when someone fills in the minimum, and it is the
 *            single most likely way these pages break.
 *   empty  — every collection returns []. `allotments` is ALREADY empty in prod,
 *            and Math.max(...[]) / reduce-with-no-initial are classic crashes here.
 *
 * A page "passes" only if it renders without throwing and without React logging an
 * error. Any throw is a real bug a user would hit.
 */

import CollegesPage from '@/pages/colleges'
import CollegeDetailPage from '@/pages/college-detail'
import RankInsightsPage from '@/pages/rank-insights'
import RankInsightDetailPage from '@/pages/rank-insight-detail'
import FeeMatrixPage from '@/pages/fee-matrix'
import FeeDetailPage from '@/pages/fee-detail'
import AnnouncementsPage from '@/pages/announcements'
import DocChecklistPage from '@/pages/doc-checklist'
import ExplorePage from '@/pages/explore'
import AbroadUniversitiesPage from '@/pages/abroad-universities'
import AllotmentStatesPage from '@/pages/allotment-states'
import AllotmentDetailPage from '@/pages/allotment-detail'
import AdminDataPage from '@/pages/admin-data'

// ── fixtures ───────────────────────────────────────────────────────────

const COLLEGE_ID = '507f1f77bcf86cd799439011'
const FEE_ID = '507f1f77bcf86cd799439012'

const REAL: Record<string, any[]> = {
  colleges: [
    {
      id: COLLEGE_ID, name: 'AIIMS New Delhi', aliases: ['AIIMS'], state: 'Delhi', city: 'New Delhi',
      type: 'Government', established: 1956, totalSeats: 125, affiliation: 'Autonomous',
      website: 'https://aiims.edu', isActive: true, coursesOffered: ['MBBS', 'MD'],
      description: 'Top college', thumbnail: 'https://x/img.jpg',
      neetCutoffRange: 'AIR 1-57', annualFees: '~1,628/yr',
      about: 'About text', facultyQuality: 'Excellent', campusInfrastructure: 'Great',
      hospitalFacilities: 'Huge', clinicalExposure: 'High', patientLoad: 'OPD: 10000',
      hostelFacilities: 'Good', studentLife: 'Vibrant',
      pros: ['Cheap'], cons: ['Competitive'],
      gallery: [{ url: 'https://x/1.jpg', caption: 'Campus' }],
      reviewVideos: [{ title: 'Tour', embedUrl: 'https://youtube.com/embed/x' }],
    },
  ],
  closingRanks: [
    { id: 'r1', collegeId: COLLEGE_ID, year: 2025, round: 1, course: 'MBBS', category: 'General', quota: 'All India Quota (AIQ)', closingRank: 57, closingScore: 705 },
    { id: 'r2', collegeId: COLLEGE_ID, year: 2024, round: 1, course: 'MBBS', category: 'General', quota: 'All India Quota (AIQ)', closingRank: 62, closingScore: 700 },
  ],
  fees: [
    {
      id: FEE_ID, collegeId: COLLEGE_ID, course: 'MBBS', category: 'General', quota: 'All India Quota (AIQ)',
      tuitionFee: 1628, hostelFee: 2000, miscCharges: 500, securityDeposit: 1000, totalFirstYear: 5128,
      govtSeats: 100, mgmtSeats: 0, nriSeats: 25,
      yearWiseFees: [{ year: '2024', tuition: 1628, hostel: 2000, misc: 500, deposit: 1000, total: 5128 }],
      feeBreakdown: [{ label: 'Tuition', amount: 1628 }],
      scholarships: ['Merit'], paymentSchedule: 'Annual', refundPolicy: 'As per MCC', bondDetails: '',
    },
  ],
  announcements: [
    { id: 'a1', date: '2026-06-25', title: 'Round 1 result', announcementType: 'Result', state: '', shortDescription: 'Out now', documentLabel: 'PDF', documentUrl: 'https://x/a.pdf' },
  ],
  checklistDocs: [
    { id: 'd1', name: 'Class 10 Marksheet', section: 'online', mandatory: true, format: 'PDF', fileSize: '200KB', notes: 'Scan', states: [], categories: [], counsellingTypes: [] },
  ],
  stateDocs: [{ id: 's1', state: 'Delhi', checklistType: 'Counselling', documents: ['Domicile'] }],
  universities: [{ id: 'u1', name: 'BHU', state: 'Uttar Pradesh', city: 'Varanasi', type: 'Central', established: 1916, courses: ['MBBS'], branches: ['Medicine'], website: 'https://bhu.ac.in', image: 'https://x/b.jpg' }],
  blogs: [{ id: 'b1', title: 'How to prep', category: 'Admissions', excerpt: 'Tips', author: 'A', date: '2026-01-01', readTime: '5 min', tags: ['neet'], url: '' }],
  abroadUniversities: [{ id: 'ab1', name: 'Tbilisi State', country: 'Georgia', flag: '🇬🇪', city: 'Tbilisi', degree: 'MD', durationYears: 6, medium: 'English', tuitionPerYearUSD: 5000, livingCostPerYearUSD: 3000, rating: 4.2, recognitions: ['WHO'], highlight: 'Affordable', image: 'https://x/t.jpg' }],
  allotments: [
    { id: 'al1', counselling: 'MCC', round: 1, collegeId: COLLEGE_ID, instituteName: 'AIIMS New Delhi', state: 'Delhi', allIndiaRank: 57, stateRank: null, neetScore: 705, category: 'General', subcategory: '', seatType: 'Government', course: 'MBBS' },
  ],
}

/** Only the schema-required fields. Exactly what the admin form emits at minimum. */
const SPARSE: Record<string, any[]> = {
  colleges: [{ id: COLLEGE_ID, name: 'Sparse College', state: 'Bihar', city: 'Patna', type: 'Private' }],
  closingRanks: [{ id: 'r1', collegeId: COLLEGE_ID, year: 2025, round: 1, course: 'MBBS', category: 'General', quota: 'State Quota', closingRank: 15000 }],
  fees: [{ id: FEE_ID, collegeId: COLLEGE_ID, course: 'MBBS', category: 'General', quota: 'State Quota', tuitionFee: 100000 }],
  announcements: [{ id: 'a1', date: '2026-06-25', title: 'Bare announcement', announcementType: 'Notice' }],
  checklistDocs: [{ id: 'd1', name: 'Bare doc', section: 'physical', mandatory: false }],
  stateDocs: [{ id: 's1', state: 'Bihar', checklistType: 'Counselling', documents: [] }],
  universities: [{ id: 'u1', name: 'Bare Uni', state: 'Bihar', type: 'Private' }],
  blogs: [{ id: 'b1', title: 'Bare blog', category: 'Career' }],
  abroadUniversities: [{ id: 'ab1', name: 'Bare Abroad', country: 'Nepal' }],
  // A rank/fee row pointing at a college that no longer exists — an admin CAN delete a college.
  allotments: [{ id: 'al1', counselling: 'MCC', round: 1, instituteName: 'Ghost Institute', state: 'Bihar', allIndiaRank: 20000, category: 'OBC', seatType: 'Private', course: 'MBBS' }],
}

const EMPTY: Record<string, any[]> = Object.fromEntries(Object.keys(REAL).map((k) => [k, []]))

const ADMIN_SCHEMA = {
  success: true,
  data: {
    collections: [
      {
        name: 'colleges', label: 'College', labelPlural: 'Colleges', publicRead: true, defaultSort: 'name',
        fields: [
          { name: 'name', type: 'string', label: 'Name', required: true, inList: true, searchable: true },
          { name: 'state', type: 'string', label: 'State', required: true, inList: true, filterable: true },
          { name: 'type', type: 'enum', label: 'Type', required: true, options: ['Government', 'Private', 'Deemed'], inList: true, filterable: true },
          { name: 'totalSeats', type: 'number', label: 'Total seats', inList: true },
          { name: 'pros', type: 'string[]', label: 'Pros' },
          { name: 'coursesOffered', type: 'enum[]', label: 'Courses', options: ['MBBS', 'BDS'] },
          { name: 'gallery', type: 'object[]', label: 'Gallery', of: [{ name: 'url', type: 'url', label: 'URL', required: true }, { name: 'caption', type: 'string', label: 'Caption' }] },
        ],
      },
      {
        name: 'closingRanks', label: 'Closing rank', labelPlural: 'Closing Ranks', publicRead: true,
        fields: [
          { name: 'collegeId', type: 'ref', ref: 'colleges', label: 'College', required: true, inList: true, filterable: true },
          { name: 'year', type: 'number', label: 'Year', required: true, inList: true, filterable: true },
          { name: 'closingRank', type: 'number', label: 'Closing rank', required: true, inList: true },
        ],
      },
    ],
  },
}

// ── fetch stub ─────────────────────────────────────────────────────────

let world: Record<string, any[]> = REAL

function installFetch() {
  vi.stubGlobal('fetch', vi.fn(async (input: any) => {
    const url = String(typeof input === 'string' ? input : input?.url ?? '')
    const json = (body: any) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })

    if (url.includes('/api/admin/schema')) return json(ADMIN_SCHEMA)

    const admin = url.match(/\/api\/admin\/resources\/([A-Za-z]+)/)
    if (admin) {
      const items = world[admin[1]] ?? []
      return json({ success: true, data: { items, total: items.length, page: 1, limit: 50, pages: 1 } })
    }

    const pub = url.match(/\/api\/data\/([A-Za-z]+)/)
    if (pub) {
      const items = world[pub[1]] ?? []
      return json({ success: true, data: { items, total: items.length } })
    }

    return json({ success: true, data: {} })
  }))
}

// ── harness ────────────────────────────────────────────────────────────

let consoleErrors: string[] = []
let origError: typeof console.error

beforeEach(() => {
  installFetch()
  consoleErrors = []
  origError = console.error
  console.error = (...args: any[]) => {
    const msg = args.map(String).join(' ')
    // React logs "The above error occurred in..." for render throws; capture real errors only.
    if (!/not wrapped in act|validateDOMNesting|React Router Future Flag/i.test(msg)) consoleErrors.push(msg)
  }
})

afterEach(() => {
  console.error = origError
  cleanup()
  vi.unstubAllGlobals()
})

async function mount(path: string, routePath: string, element: ReactElement) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={element} />
      </Routes>
    </MemoryRouter>
  )
  // Let the fetch resolve and the page settle out of its loading state.
  await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(), { timeout: 8000 }).catch(() => {})
  await new Promise((r) => setTimeout(r, 80))
}

const PAGES: { name: string; path: string; route: string; el: ReactElement }[] = [
  { name: 'colleges', path: '/colleges', route: '/colleges', el: <CollegesPage /> },
  { name: 'college-detail', path: `/colleges/${COLLEGE_ID}`, route: '/colleges/:id', el: <CollegeDetailPage /> },
  { name: 'rank-insights', path: '/rank-insights', route: '/rank-insights', el: <RankInsightsPage /> },
  {
    name: 'rank-insight-detail',
    path: `/rank-insights/detail?collegeId=${COLLEGE_ID}&college=AIIMS&course=MBBS&category=General&quota=${encodeURIComponent('All India Quota (AIQ)')}`,
    route: '/rank-insights/detail',
    el: <RankInsightDetailPage />,
  },
  { name: 'fee-matrix', path: '/fee-matrix', route: '/fee-matrix', el: <FeeMatrixPage /> },
  { name: 'fee-detail', path: `/fee-matrix/${FEE_ID}`, route: '/fee-matrix/:id', el: <FeeDetailPage /> },
  { name: 'announcements', path: '/announcements', route: '/announcements', el: <AnnouncementsPage /> },
  { name: 'doc-checklist', path: '/doc-checklist', route: '/doc-checklist', el: <DocChecklistPage /> },
  { name: 'explore', path: '/explore/universities', route: '/explore/:section', el: <ExplorePage /> },
  { name: 'abroad-universities', path: '/abroad-universities', route: '/abroad-universities', el: <AbroadUniversitiesPage /> },
  { name: 'allotment-states', path: '/allotment', route: '/allotment', el: <AllotmentStatesPage /> },
  { name: 'allotment-detail', path: '/allotment/MCC', route: '/allotment/:counselling', el: <AllotmentDetailPage /> },
  { name: 'admin-data (index)', path: '/admin/data', route: '/admin/data', el: <AdminDataPage /> },
  { name: 'admin-data (colleges)', path: '/admin/data/colleges', route: '/admin/data/:collection', el: <AdminDataPage /> },
  { name: 'admin-data (closingRanks)', path: '/admin/data/closingRanks', route: '/admin/data/:collection', el: <AdminDataPage /> },
]

const WORLDS: [string, Record<string, any[]>][] = [
  ['real', REAL],
  ['sparse (only required fields — what the admin form emits)', SPARSE],
  ['empty (every collection returns [])', EMPTY],
]

for (const [worldName, data] of WORLDS) {
  describe(`world: ${worldName}`, () => {
    for (const p of PAGES) {
      it(`renders ${p.name}`, async () => {
        world = data
        await mount(p.path, p.route, p.el)
        expect(consoleErrors, `console errors while rendering ${p.name}:\n${consoleErrors.join('\n---\n')}`).toEqual([])
        expect(document.body.textContent?.length ?? 0, 'page rendered nothing at all').toBeGreaterThan(0)
      })
    }
  })
}

/**
 * The suite above is only meaningful if (a) the pages really consumed the stubbed
 * data rather than sitting in a loading state, and (b) the harness can actually
 * fail. Both are asserted here — a green suite that cannot go red proves nothing.
 */
describe('harness integrity', () => {
  it('pages actually render fetched data (not stuck on a spinner)', async () => {
    world = REAL
    await mount('/colleges', '/colleges', <CollegesPage />)
    // If the fetch stub were not wired, this text could never appear.
    expect(screen.getByText(/AIIMS New Delhi/i)).toBeInTheDocument()
  })

  it('the join is exercised: a rank row renders its college NAME, not its ObjectId', async () => {
    world = REAL
    await mount('/rank-insights', '/rank-insights', <RankInsightsPage />)
    expect(document.body.textContent).toContain('AIIMS New Delhi')
    expect(document.body.textContent).not.toContain(COLLEGE_ID)
  })

  it('canary: the harness DOES fail when a component throws', async () => {
    const Boom = () => {
      throw new Error('canary')
    }
    expect(() =>
      render(
        <MemoryRouter>
          <Boom />
        </MemoryRouter>
      )
    ).toThrow('canary')
  })
})
