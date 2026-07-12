import { CollectionSchema } from './types';

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
    { name: 'city', type: 'string', label: 'City', required: true, inList: true, searchable: true },
    { name: 'type', type: 'enum', label: 'Type', required: true, options: COLLEGE_TYPES, inList: true, filterable: true },
    { name: 'established', type: 'number', label: 'Established' },
    { name: 'totalSeats', type: 'number', label: 'Total seats', inList: true },
    { name: 'affiliation', type: 'string', label: 'Affiliation' },
    { name: 'website', type: 'url', label: 'Website' },
    { name: 'isActive', type: 'boolean', label: 'Active', default: true, filterable: true },

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
    { name: 'year', type: 'number', label: 'Year', required: true, inList: true, filterable: true },
    { name: 'round', type: 'number', label: 'Round', required: true, inList: true, filterable: true },
    { name: 'course', type: 'enum', label: 'Course', required: true, options: COURSES, inList: true, filterable: true },
    { name: 'category', type: 'enum', label: 'Category', required: true, options: CATEGORIES, inList: true, filterable: true },
    { name: 'quota', type: 'string', label: 'Quota', required: true, filterable: true, help: QUOTA_EXAMPLES },
    { name: 'closingRank', type: 'number', label: 'Closing rank', required: true, inList: true },
    { name: 'closingScore', type: 'number', label: 'Closing score' },
  ],
};

export const fees: CollectionSchema = {
  name: 'fees',
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
    { name: 'totalFirstYear', type: 'number', label: 'Total first year', inList: true, help: 'Recomputed on save from the components above.' },

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
      help: 'The old data had only a month/day string with no year, so ordering was guesswork. This is a real date.',
    },
    { name: 'title', type: 'string', label: 'Title', required: true, inList: true, searchable: true },
    { name: 'announcementType', type: 'string', label: 'Type', required: true, inList: true, filterable: true },
    { name: 'state', type: 'string', label: 'State', inList: true, filterable: true, help: 'Blank = All India / MCC.' },
    { name: 'shortDescription', type: 'text', label: 'Short description', searchable: true },
    { name: 'documentLabel', type: 'string', label: 'Document label' },
    { name: 'documentUrl', type: 'url', label: 'Document URL' },
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
    { name: 'established', type: 'number', label: 'Established' },
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

export const COLLECTIONS: CollectionSchema[] = [
  colleges,
  closingRanks,
  fees,
  allotments,
  announcements,
  checklistDocs,
  stateDocs,
  universities,
  blogs,
  abroadUniversities,
  knowledgeBase,
];

export function getSchema(name: string): CollectionSchema | undefined {
  return COLLECTIONS.find((c) => c.name === name);
}
