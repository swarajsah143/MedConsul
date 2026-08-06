import { CollectionSchema, Field } from './types';

/**
 * All admin-managed collections.
 *
 * The single most important change from the old static files: `colleges` is now
 * the canonical hub, and closingRanks / fees / allotments reference it by a real
 * foreign key (`collegeId`). Previously colleges appeared in five files under five
 * unrelated id schemes (college-1, col-aiims, fee-1, u1, and a bare int), joined
 * only by fuzzy display names that did not even match each other. That is why
 * renaming a college used to silently orphan its fee rows.
 *
 * `universities` (explore) and `abroadUniversities` are deliberately NOT merged
 * into `colleges` — they are a different concept (institutions to browse, not
 * NEET seats to compete for) with disjoint fields.
 */

const COURSES = ['MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS', 'BVSc'];
const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'PwD'];
// Quota is open-ended: 'All India Quota (AIQ)', 'Management Quota', and one per state
// ('Delhi State Quota', 'Gujarat State Quota', ...). A closed enum would reject every
// new state an admin adds, so quota is a filterable free string, not an enum.
const QUOTA_EXAMPLES = 'e.g. "All India Quota (AIQ)", "Management Quota", "Delhi State Quota"';
const COLLEGE_TYPES = ['Government', 'Private', 'Deemed'];

export const colleges: CollectionSchema = {
  name: 'colleges',
  naturalKey: ['name'],
  label: 'College',
  labelPlural: 'Colleges',
  publicRead: true,
  defaultSort: 'name',
  description: 'Canonical college record. Closing ranks, fees and allotments all reference this by id.',
  fields: [
    { name: 'name', type: 'string', label: 'Name', required: true, inList: true, searchable: true },
    {
      name: 'aliases', type: 'string[]', label: 'Alternate names', searchable: true,
      help: 'Other names this college is known by (e.g. "AIIMS, New Delhi"). Used to match imported CSV rows to this record.',
    },
    { name: 'state', type: 'string', label: 'State', required: true, inList: true, filterable: true, searchable: true },
    {
      name: 'city', type: 'string', label: 'City', inList: true, searchable: true,
      help: 'A bulk-imported college may not carry one. Leaving it blank is honest; a guessed city silently corrupts the importer, which uses the city to tell apart the dozen different "Government Medical College"s.',
    },
    { name: 'type', type: 'enum', label: 'Type', required: true, options: COLLEGE_TYPES, inList: true, filterable: true },
    { name: 'established', type: 'number', label: 'Established', plain: true },
    { name: 'totalSeats', type: 'number', label: 'Total seats', inList: true },
    { name: 'affiliation', type: 'string', label: 'Affiliation' },
    { name: 'website', type: 'url', label: 'Website' },
    { name: 'isActive', type: 'boolean', label: 'Active', default: true, filterable: true },
    {
      name: 'source', type: 'string', label: 'Source', filterable: true,
      help: 'Where this record came from. Blank means hand-curated (the original 29, with review prose). Bulk imports stamp themselves here, so the importer can tell a reviewed record from one of its own.',
    },

    {
      name: 'coursesOffered', type: 'string[]', label: 'Courses offered',
      help: 'Free text, not the NEET-UG enum — a college also offers MD/MS/DM/MCh, B.Sc Nursing, MPH etc. The COURSES enum applies to rank/fee/allotment rows, which are NEET-UG seats.',
    },
    { name: 'description', type: 'text', label: 'Short description' },
    { name: 'thumbnail', type: 'url', label: 'Thumbnail image' },
    { name: 'neetCutoffRange', type: 'string', label: 'NEET cutoff range (display)' },
    { name: 'annualFees', type: 'string', label: 'Annual fees (display)' },

    { name: 'about', type: 'text', label: 'About' },
    { name: 'facultyQuality', type: 'text', label: 'Faculty quality' },
    { name: 'campusInfrastructure', type: 'text', label: 'Campus infrastructure' },
    { name: 'hospitalFacilities', type: 'text', label: 'Hospital facilities' },
    { name: 'clinicalExposure', type: 'text', label: 'Clinical exposure' },
    { name: 'patientLoad', type: 'text', label: 'Patient load' },
    { name: 'hostelFacilities', type: 'text', label: 'Hostel facilities' },
    { name: 'studentLife', type: 'text', label: 'Student life' },
    { name: 'pros', type: 'string[]', label: 'Pros' },
    { name: 'cons', type: 'string[]', label: 'Cons' },
    {
      name: 'gallery', type: 'object[]', label: 'Gallery',
      of: [
        { name: 'url', type: 'url', label: 'Image URL', required: true },
        { name: 'caption', type: 'string', label: 'Caption' },
      ],
    },
    {
      name: 'reviewVideos', type: 'object[]', label: 'Review videos',
      of: [
        { name: 'title', type: 'string', label: 'Title', required: true },
        { name: 'embedUrl', type: 'url', label: 'Embed URL', required: true },
      ],
    },
  ],
};

export const closingRanks: CollectionSchema = {
  name: 'closingRanks',
  naturalKey: ['collegeId', 'year', 'round', 'course', 'category', 'quota'],
  label: 'Closing rank',
  labelPlural: 'Closing Ranks',
  publicRead: true,
  defaultSort: '-year',
  description: 'One row per college × year × round × course × category × quota.',
  fields: [
    { name: 'collegeId', type: 'ref', ref: 'colleges', label: 'College', required: true, inList: true, filterable: true },
    { name: 'year', type: 'number', label: 'Year', required: true, inList: true, filterable: true, plain: true },
    { name: 'round', type: 'number', label: 'Round', required: true, inList: true, filterable: true },
    { name: 'course', type: 'enum', label: 'Course', required: true, options: COURSES, inList: true, filterable: true },
    { name: 'category', type: 'enum', label: 'Category', required: true, options: CATEGORIES, inList: true, filterable: true },
    { name: 'quota', type: 'string', label: 'Quota', required: true, filterable: true, help: QUOTA_EXAMPLES },
    { name: 'closingRank', type: 'number', label: 'Closing rank', required: true, inList: true },
    { name: 'closingScore', type: 'number', label: 'Closing score' },
    {
      name: 'source', type: 'string', label: 'Source', filterable: true,
      // Load-bearing: a PUBLISHED cutoff and one DERIVED from allotment data are not the same
      // claim. Derivation takes max(allIndiaRank) over the candidates we hold for a group, so it
      // is only as complete as our allotment set — where it disagrees with a published cutoff it
      // reads OPTIMISTIC (median 1.46x, p90 3.38x better than truth, measured over the 2,317
      // overlapping groups). Students plan around these numbers, so a derived row must be
      // labelled and must never silently overwrite a published one.
      help: 'Where this cutoff came from. Blank = published/imported cutoff. "derived: MCC allotments" = computed as the last allotted rank in our allotment data, which is a lower bound, not an official cutoff.',
    },
  ],
};

export const fees: CollectionSchema = {
  name: 'fees',
  // NB: totalFirstYear is intentionally NOT derived. Official fee notifications (Maharashtra
  // FRA, KEA) quote a "total first year" figure that bundles charges the row does not itemise
  // — KJ Somaiya's tuition is ₹10.9L but its notified first-year total is ₹12.0L. A derive that
  // recomputed it as tuition+hostel+misc+deposit silently discarded that authoritative total on
  // every save/import (it flattened 58 of 182 sourced rows onto their component sum). The field
  // help says "enter this yourself"; honour that and keep the sourced value.
  naturalKey: ['collegeId', 'course', 'category', 'quota'],
  label: 'Fee entry',
  labelPlural: 'Fee & Seat Matrix',
  publicRead: true,
  defaultSort: 'collegeId',
  fields: [
    { name: 'collegeId', type: 'ref', ref: 'colleges', label: 'College', required: true, inList: true, filterable: true },
    { name: 'course', type: 'enum', label: 'Course', required: true, options: COURSES, inList: true, filterable: true },
    { name: 'category', type: 'enum', label: 'Category', required: true, options: CATEGORIES, filterable: true },
    { name: 'quota', type: 'string', label: 'Quota', required: true, filterable: true, help: QUOTA_EXAMPLES },

    { name: 'tuitionFee', type: 'number', label: 'Tuition fee', required: true, inList: true },
    { name: 'hostelFee', type: 'number', label: 'Hostel fee' },
    { name: 'miscCharges', type: 'number', label: 'Misc charges' },
    { name: 'securityDeposit', type: 'number', label: 'Security deposit' },
    {
      name: 'totalFirstYear', type: 'number', label: 'Total first year', inList: true,
      // This is an entered value, not a derived one. Nothing on the server recomputes
      // it, so the help must not claim it does — the old copy ("Recomputed on save")
      // let it drift silently out of sync with the components above.
      help: 'Enter this yourself — it is NOT auto-calculated. It should equal tuition + hostel + misc + deposit.',
    },
    {
      name: 'totalCourseFee', type: 'number', label: 'Total course fee', inList: true,
      // A DIFFERENT QUANTITY from totalFirstYear — the whole 4.5-year MBBS cost, which is what a
      // family actually budgets against. Kept as its own field precisely so the two can never be
      // confused: aggregator sheets quote course totals ("42.5 Lakhs") that are ~4.5x the annual
      // figure, and loading one into a per-year column overstates the first year enormously.
      help: 'Whole-course cost (all years), NOT the first year. Leave blank if you only know the annual fee.',
    },

    { name: 'govtSeats', type: 'number', label: 'Govt seats' },
    { name: 'mgmtSeats', type: 'number', label: 'Management seats' },
    { name: 'nriSeats', type: 'number', label: 'NRI seats' },

    {
      name: 'yearWiseFees', type: 'object[]', label: 'Year-wise fees',
      of: [
        { name: 'year', type: 'string', label: 'Year', required: true },
        { name: 'tuition', type: 'number', label: 'Tuition' },
        { name: 'hostel', type: 'number', label: 'Hostel' },
        { name: 'misc', type: 'number', label: 'Misc' },
        { name: 'deposit', type: 'number', label: 'Deposit' },
        { name: 'total', type: 'number', label: 'Total' },
      ],
    },
    {
      name: 'feeBreakdown', type: 'object[]', label: 'Fee breakdown',
      of: [
        { name: 'label', type: 'string', label: 'Label', required: true },
        { name: 'amount', type: 'number', label: 'Amount', required: true },
      ],
    },
    { name: 'scholarships', type: 'string[]', label: 'Scholarships' },
    { name: 'paymentSchedule', type: 'text', label: 'Payment schedule' },
    { name: 'refundPolicy', type: 'text', label: 'Refund policy' },
    { name: 'bondDetails', type: 'text', label: 'Bond details' },
  ],
};

export const allotments: CollectionSchema = {
  name: 'allotments',
  naturalKey: ['counselling', 'round', 'category', 'course', 'allIndiaRank', 'instituteName'],
  // allIndiaRank is a range/sort column, not an equality filter, so it gets no automatic index.
  // The rank search (`allIndiaRank` between X and Y, sorted) and the per-counselling table
  // (filter counselling, sort by rank) are the two hot paths — index both to turn a 222k-row
  // COLLSCAN + in-memory sort into an index seek.
  // {counselling, instituteName} also covers the per-counselling `distinct(instituteName)` the
  // detail page's facets run for its "Institutes" count (100ms unindexed → covered index scan).
  indexes: [{ allIndiaRank: 1 }, { counselling: 1, allIndiaRank: 1 }, { counselling: 1, instituteName: 1 }],
  label: 'Allotment',
  labelPlural: 'Seat Allotments',
  publicRead: true,
  defaultSort: 'allIndiaRank',
  description:
    'Real allotment rows. Replaces the old seeded-PRNG generator, which fabricated these at runtime.',
  fields: [
    { name: 'counselling', type: 'string', label: 'Counselling', required: true, inList: true, filterable: true, searchable: true },
    { name: 'round', type: 'number', label: 'Round', required: true, inList: true, filterable: true },
    { name: 'collegeId', type: 'ref', ref: 'colleges', label: 'College', filterable: true, help: 'Optional — leave blank if the institute is not in the colleges table.' },
    { name: 'instituteName', type: 'string', label: 'Institute name', required: true, inList: true, searchable: true, help: 'Free text, kept even when collegeId is set, because allotment lists name institutes inconsistently.' },
    { name: 'state', type: 'string', label: 'State', required: true, filterable: true, searchable: true },
    { name: 'allIndiaRank', type: 'number', label: 'All India rank', required: true, inList: true },
    { name: 'stateRank', type: 'number', label: 'State rank' },
    { name: 'neetScore', type: 'number', label: 'NEET score' },
    { name: 'category', type: 'enum', label: 'Category', required: true, options: CATEGORIES, filterable: true },
    { name: 'subcategory', type: 'string', label: 'Subcategory' },
    { name: 'seatType', type: 'enum', label: 'Seat type', required: true, options: COLLEGE_TYPES, filterable: true },
    { name: 'course', type: 'enum', label: 'Course', required: true, options: COURSES, filterable: true },
  ],
};

export const announcements: CollectionSchema = {
  name: 'announcements',
  naturalKey: ['date', 'title'],
  label: 'Announcement',
  labelPlural: 'Announcements',
  publicRead: true,
  defaultSort: '-date',
  fields: [
    {
      name: 'date', type: 'string', label: 'Date (YYYY-MM-DD)', required: true, inList: true, filterable: true,
      // defaultSort '-date' sorts this string LEXICOGRAPHICALLY. That is only correct
      // for zero-padded ISO dates, so the format is enforced rather than suggested.
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      patternMessage: 'Date must be in YYYY-MM-DD format (e.g. 2026-03-12) — announcements are sorted by this string.',
      help: 'The old data had only a month/day string with no year, so ordering was guesswork. This is a real date. Must be YYYY-MM-DD.',
    },
    { name: 'title', type: 'string', label: 'Title', required: true, inList: true, searchable: true },
    { name: 'announcementType', type: 'string', label: 'Type', required: true, inList: true, filterable: true },
    { name: 'state', type: 'string', label: 'State', inList: true, filterable: true, help: 'Blank = All India / MCC.' },
    { name: 'shortDescription', type: 'text', label: 'Short description', searchable: true },
    { name: 'documentLabel', type: 'string', label: 'Document label' },
    { name: 'documentUrl', type: 'url', label: 'Document URL' },

    // Optional scheduled reminder. If reminderDate is set, the daily reminders job emails the
    // chosen audience on that date (once) and flips reminderSent. Blank reminderDate = no reminder.
    {
      name: 'reminderDate', type: 'string', label: 'Reminder date (YYYY-MM-DD)',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      patternMessage: 'Reminder date must be YYYY-MM-DD (e.g. 2026-09-15), or left blank.',
      help: 'Optional. Set a future date to email students a reminder about this announcement on that day.',
    },
    {
      name: 'reminderAudience', type: 'enum', label: 'Reminder audience', options: ['all', 'free', 'pro', 'premium'],
      help: 'Who the reminder goes to. Blank/all = every student; or narrow to one plan.',
    },
    { name: 'reminderBody', type: 'text', label: 'Reminder message', help: 'Optional email body for the reminder. Falls back to the short description.' },
    { name: 'reminderSent', type: 'boolean', label: 'Reminder sent', help: 'Set automatically once the reminder email has gone out.' },
  ],
};

export const checklistDocs: CollectionSchema = {
  name: 'checklistDocs',
  naturalKey: ['section', 'name'],
  label: 'Checklist document',
  labelPlural: 'Document Checklist',
  publicRead: true,
  defaultSort: 'section',
  fields: [
    { name: 'name', type: 'string', label: 'Document name', required: true, inList: true, searchable: true },
    { name: 'section', type: 'enum', label: 'Section', required: true, options: ['online', 'physical'], inList: true, filterable: true },
    { name: 'mandatory', type: 'boolean', label: 'Mandatory', default: true, inList: true, filterable: true },
    { name: 'format', type: 'string', label: 'Format', inList: true },
    { name: 'fileSize', type: 'string', label: 'File size' },
    { name: 'notes', type: 'text', label: 'Notes' },
    { name: 'states', type: 'string[]', label: 'Applies to states', help: 'Empty = applies to all states.' },
    { name: 'categories', type: 'enum[]', label: 'Applies to categories', options: CATEGORIES, help: 'Empty = all categories.' },
    { name: 'counsellingTypes', type: 'string[]', label: 'Applies to counselling types', help: 'Empty = all counselling types.' },
  ],
};

export const stateDocs: CollectionSchema = {
  name: 'stateDocs',
  naturalKey: ['state', 'checklistType'],
  label: 'State document requirement',
  labelPlural: 'State Document Requirements',
  publicRead: true,
  defaultSort: 'state',
  fields: [
    { name: 'state', type: 'string', label: 'State', required: true, inList: true, filterable: true, searchable: true },
    {
      name: 'checklistType', type: 'enum', label: 'Checklist type', required: true, inList: true, filterable: true,
      options: ['Form Filling', 'Counselling', 'College Report', 'NRI Assistance'],
    },
    { name: 'documents', type: 'string[]', label: 'Documents', required: true },
  ],
};

export const universities: CollectionSchema = {
  name: 'universities',
  naturalKey: ['name', 'state'],
  label: 'University',
  labelPlural: 'Explore — Universities',
  publicRead: true,
  defaultSort: 'name',
  fields: [
    { name: 'name', type: 'string', label: 'Name', required: true, inList: true, searchable: true },
    { name: 'state', type: 'string', label: 'State', required: true, inList: true, filterable: true, searchable: true },
    { name: 'city', type: 'string', label: 'City', inList: true },
    {
      name: 'type', type: 'enum', label: 'Type', required: true, inList: true, filterable: true,
      options: ['Government', 'Private', 'Deemed', 'AIIMS', 'Central'],
    },
    { name: 'established', type: 'number', label: 'Established', plain: true },
    { name: 'courses', type: 'string[]', label: 'Courses' },
    { name: 'branches', type: 'string[]', label: 'Branches' },
    { name: 'website', type: 'url', label: 'Website' },
    { name: 'image', type: 'url', label: 'Image' },
  ],
};

export const blogs: CollectionSchema = {
  name: 'blogs',
  naturalKey: ['title'],
  label: 'Blog post',
  labelPlural: 'Explore — Blogs',
  publicRead: true,
  defaultSort: '-date',
  fields: [
    { name: 'title', type: 'string', label: 'Title', required: true, inList: true, searchable: true },
    {
      name: 'category', type: 'enum', label: 'Category', required: true, inList: true, filterable: true,
      options: ['University', 'Research', 'Discovery', 'Admissions', 'Career'],
    },
    { name: 'excerpt', type: 'text', label: 'Excerpt', searchable: true },
    { name: 'author', type: 'string', label: 'Author', inList: true },
    { name: 'date', type: 'string', label: 'Date', inList: true },
    { name: 'readTime', type: 'string', label: 'Read time' },
    { name: 'tags', type: 'string[]', label: 'Tags' },
    { name: 'url', type: 'url', label: 'URL' },
  ],
};

export const abroadUniversities: CollectionSchema = {
  name: 'abroadUniversities',
  naturalKey: ['name', 'country'],
  label: 'Abroad university',
  labelPlural: 'Abroad — Universities',
  publicRead: true,
  defaultSort: 'name',
  fields: [
    { name: 'name', type: 'string', label: 'Name', required: true, inList: true, searchable: true },
    { name: 'country', type: 'string', label: 'Country', required: true, inList: true, filterable: true, searchable: true },
    { name: 'flag', type: 'string', label: 'Flag emoji' },
    { name: 'city', type: 'string', label: 'City', inList: true },
    { name: 'degree', type: 'string', label: 'Degree', inList: true },
    { name: 'durationYears', type: 'number', label: 'Duration (years)' },
    { name: 'medium', type: 'string', label: 'Medium of instruction' },
    { name: 'tuitionPerYearUSD', type: 'number', label: 'Tuition / year (USD)', inList: true },
    { name: 'livingCostPerYearUSD', type: 'number', label: 'Living cost / year (USD)' },
    { name: 'rating', type: 'number', label: 'Rating' },
    { name: 'recognitions', type: 'string[]', label: 'Recognitions' },
    { name: 'highlight', type: 'text', label: 'Highlight' },
    { name: 'image', type: 'url', label: 'Image' },

    // ── Richer detail (shown in the "View details" panel) ──
    { name: 'about', type: 'text', label: 'About' },
    { name: 'website', type: 'url', label: 'Official website' },
    { name: 'established', type: 'number', label: 'Established (year)' },
    { name: 'intake', type: 'string', label: 'Intake' },
    { name: 'eligibility', type: 'text', label: 'Eligibility' },
    { name: 'licensingExams', type: 'string[]', label: 'Licensing exams' },
    { name: 'advantages', type: 'string[]', label: 'Key advantages' },
    { name: 'hostelInfo', type: 'text', label: 'Hostel & mess' },
  ],
};

/**
 * Third-party MBBS-college rankings, scraped from Collegedunia (the "Fees 2026 /
 * Rankings" listing). Deliberately a SEPARATE collection, not new `colleges` rows:
 * the source names are truncated with an ellipsis (and a few are missing), it carries
 * no Government/Private/Deemed type, and ~80% of its rows already exist in canonical
 * `colleges` under fuller names — so merging it in would duplicate and corrupt the FK
 * hub. Kept as its own browse/compare dataset instead, keyed on (source, cdRank) so
 * re-importing the same scrape is idempotent and future scrapes live side by side.
 */
export const collegeRankings: CollectionSchema = {
  name: 'collegeRankings',
  naturalKey: ['source', 'cdRank'],
  label: 'College ranking',
  labelPlural: 'College Rankings',
  publicRead: true,
  defaultSort: 'cdRank',
  description:
    'Third-party MBBS college rankings (Collegedunia): CD rank, CD score, user rating and indicative total fees. A browse/compare dataset, not canonical seat data.',
  fields: [
    { name: 'source', type: 'string', label: 'Source', required: true, filterable: true, help: 'Provenance tag, e.g. "collegedunia-2026". Part of the natural key, so one row per source × CD rank.' },
    { name: 'cdRank', type: 'number', label: 'CD rank', required: true, inList: true, filterable: true, plain: true, help: 'Collegedunia list rank (1 = top). Part of the natural key.' },
    {
      name: 'name', type: 'string', label: 'College name', inList: true, searchable: true,
      help: 'As scraped — usually truncated with an ellipsis (…), and a few rows have no recoverable name. Not the natural key, so this is fine; do not treat it as canonical.',
    },
    { name: 'city', type: 'string', label: 'City', inList: true, filterable: true, searchable: true },
    { name: 'state', type: 'string', label: 'State', inList: true, filterable: true, searchable: true },
    { name: 'approvals', type: 'string', label: 'Approvals', help: 'Regulatory approvals as listed, e.g. "MCI Approved" or "DCI, PCI, INC, MCI Approved".' },
    { name: 'feeDisplay', type: 'string', label: 'Total fees (display)', inList: true, help: 'Indicative total course fee exactly as shown on the source, e.g. "₹ 5,356". This is the authoritative fee field.' },
    { name: 'feeNumeric', type: 'number', label: 'Total fees (₹, approx)', help: 'Best-effort numeric parse of feeDisplay; may be missing or approximate. Display the string, sort/range on this.' },
    { name: 'rating', type: 'number', label: 'User rating (/5)', inList: true, help: 'Collegedunia user rating out of 5.' },
    { name: 'reviewCount', type: 'number', label: 'Review count', plain: true },
    { name: 'cdScore', type: 'number', label: 'CD score (/1000)', inList: true, plain: true, help: 'Collegedunia overall score out of 1000.' },
    { name: 'nationalRank', type: 'number', label: 'National medical rank', plain: true, help: 'Rank within India for Medical on the source (e.g. #12 of 517).' },
  ],
};

export const knowledgeBase: CollectionSchema = {
  name: 'knowledgeBase',
  naturalKey: ['title'],
  label: 'Knowledge base entry',
  labelPlural: 'Chatbot Knowledge Base',
  publicRead: false,
  defaultSort: 'title',
  description:
    'Prose the chatbot retrieves from. Previously hardcoded inside the RAG retriever with no admin surface at all.',
  fields: [
    { name: 'title', type: 'string', label: 'Title', required: true, inList: true, searchable: true },
    { name: 'content', type: 'text', label: 'Content', required: true, searchable: true },
    { name: 'tags', type: 'string[]', label: 'Tags', searchable: true, help: 'Keywords the retriever matches against.' },
  ],
};


/**
 * The Counselling Conditions page used to be 600 lines of hardcoded content in the
 * client — 13 quota rules and 4 sections of eligibility/application/domicile copy that
 * no admin could touch. NEET rules change every year; that page would have been stale
 * the day the first circular landed, with no way to fix it short of a redeploy.
 */

/** One heading + prose + bullet list. Shared by both collections below. */
const CONTENT_BLOCK: Field[] = [
  { name: 'heading', type: 'string', label: 'Heading', required: true },
  { name: 'intro', type: 'text', label: 'Intro paragraph' },
  { name: 'items', type: 'string[]', label: 'Bullet points' },
  { name: 'note', type: 'text', label: 'Callout note' },
  { name: 'ordered', type: 'boolean', label: 'Numbered list', default: false },
];

export const counsellingQuotas: CollectionSchema = {
  name: 'counsellingQuotas',
  naturalKey: ['label'],
  label: 'Quota',
  labelPlural: 'Counselling — Quotas',
  publicRead: true,
  defaultSort: 'group',
  description: 'Quota types and their rules, shown on the Counselling Conditions page.',
  fields: [
    { name: 'label', type: 'string', label: 'Quota name', required: true, inList: true, searchable: true },
    { name: 'group', type: 'string', label: 'Group', required: true, inList: true, filterable: true, help: 'e.g. "Central Quotas", "State Quotas" — used to group the dropdown.' },
    { name: 'authority', type: 'text', label: 'Governing authority', required: true, searchable: true },
    { name: 'order', type: 'number', label: 'Sort order', plain: true, default: 0 },
    { name: 'blocks', type: 'object[]', label: 'Content blocks', of: CONTENT_BLOCK },
  ],
};

export const counsellingSections: CollectionSchema = {
  name: 'counsellingSections',
  naturalKey: ['key'],
  label: 'Counselling section',
  labelPlural: 'Counselling — Sections',
  publicRead: true,
  defaultSort: 'order',
  description: 'Eligibility / Application / Domicile / Counselling copy on the Counselling Conditions page.',
  fields: [
    { name: 'key', type: 'string', label: 'Key', required: true, inList: true, help: 'URL slug: eligibility, application, domicile, counselling. Changing this changes the page URL.' },
    { name: 'label', type: 'string', label: 'Tab label', required: true, inList: true },
    { name: 'blurb', type: 'string', label: 'Tab subtitle', inList: true },
    { name: 'authority', type: 'text', label: 'Governing authority', searchable: true },
    { name: 'order', type: 'number', label: 'Sort order', plain: true, default: 0, inList: true },
    { name: 'blocks', type: 'object[]', label: 'Content blocks', of: CONTENT_BLOCK },
  ],
};

/**
 * The two tables behind the Rank Predictor.
 *
 * These are the curves, not the code. NEET difficulty swings hard year to year — 2025's
 * topper scored 686 where 2024's scored 720 — so the same score maps to a very different
 * rank depending on the year, and a band table is the only honest way to express that.
 * Putting them in Mongo rather than in a constant means a counsellor can correct the
 * curve the week NTA publishes new data, without a deploy.
 *
 * Never blend years. Estimate against ONE year's curve; see estimateAIR().
 */
export const rankBands: CollectionSchema = {
  name: 'rankBands',
  naturalKey: ['year', 'marksMin'],
  label: 'Rank band',
  labelPlural: 'Predictor — Marks to Rank',
  publicRead: false,
  defaultSort: '-year',
  description:
    'Score → All India Rank bands, one row per year × score band. The predictor interpolates within the band a score falls into.',
  fields: [
    { name: 'year', type: 'number', label: 'Year', required: true, inList: true, filterable: true, plain: true },
    { name: 'marksMin', type: 'number', label: 'Marks from', required: true, inList: true, plain: true },
    { name: 'marksMax', type: 'number', label: 'Marks to', required: true, inList: true, plain: true },
    { name: 'rankMin', type: 'number', label: 'Best rank', required: true, inList: true, help: 'The rank at the TOP of this score band (i.e. at "Marks to").' },
    { name: 'rankMax', type: 'number', label: 'Worst rank', required: true, inList: true, help: 'The rank at the BOTTOM of this score band (i.e. at "Marks from").' },
  ],
};

export const categoryFactors: CollectionSchema = {
  name: 'categoryFactors',
  naturalKey: ['category'],
  label: 'Category factor',
  labelPlural: 'Predictor — Category Factors',
  publicRead: false,
  defaultSort: 'category',
  description:
    'Category rank ≈ All India Rank × factor. Roughly the share of candidates above you who belong to your category.',
  fields: [
    { name: 'category', type: 'enum', label: 'Category', required: true, options: CATEGORIES, inList: true },
    {
      name: 'factor', type: 'number', label: 'Factor', required: true, inList: true, plain: true,
      help: 'Between 0 and 1. e.g. 0.55 for OBC means an AIR of 10,000 is roughly an OBC rank of 5,500.',
    },
  ],
};

export const COLLECTIONS: CollectionSchema[] = [
  colleges,
  closingRanks,
  rankBands,
  categoryFactors,
  fees,
  allotments,
  announcements,
  checklistDocs,
  stateDocs,
  universities,
  blogs,
  abroadUniversities,
  collegeRankings,
  knowledgeBase,
  counsellingSections,
  counsellingQuotas,
];

export function getSchema(name: string): CollectionSchema | undefined {
  return COLLECTIONS.find((c) => c.name === name);
}
