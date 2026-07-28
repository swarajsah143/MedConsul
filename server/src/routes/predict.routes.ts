import { Router, Request, Response } from 'express';
import { predict, predictorMeta, TOTAL_MARKS, PredictInput } from '../services/predictor';
import { optionalAuth, AuthRequest } from '../middlewares/auth.middleware';
import { hasFullData, isStaff, FREE_PREDICT_MATCHES } from '../utils/plan';

/**
 * The Rank Predictor's public API.
 *
 *   GET  /api/predict/meta   the dropdown values (years, categories, courses, quotas, states)
 *   POST /api/predict        score-or-rank in, estimated AIR + matched colleges out
 *
 * Public and unauthenticated on purpose: "what can I get with 610?" is the question that
 * brings a student to the site in the first place, and putting it behind a signup wall
 * would mean they never see what the site is for.
 */

const router = Router();

const bad = (res: Response, message: string) => {
  res.status(400).json({ success: false, message });
};

router.get('/meta', async (_req: Request, res: Response) => {
  res.json({ success: true, data: await predictorMeta() });
});

router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const b = req.body || {};

  const num = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));
  const marks = num(b.marks);
  const rank = num(b.rank);

  if (marks === undefined && rank === undefined) {
    return bad(res, 'Give either a NEET score (marks) or an All India Rank (rank).');
  }
  if (marks !== undefined && rank !== undefined) {
    return bad(res, 'Give a score or a rank, not both.');
  }
  if (marks !== undefined && (!Number.isFinite(marks) || marks < 0 || marks > TOTAL_MARKS)) {
    return bad(res, `A NEET score must be between 0 and ${TOTAL_MARKS}.`);
  }
  // Negative marks are possible in NEET (-1 per wrong answer), but a negative RANK is not.
  if (rank !== undefined && (!Number.isFinite(rank) || rank < 1 || rank > 5_000_000)) {
    return bad(res, 'An All India Rank must be a positive number.');
  }
  if (!b.category || typeof b.category !== 'string') {
    return bad(res, 'Category is required (General, OBC, SC, ST or EWS).');
  }

  const input: PredictInput = {
    marks,
    rank,
    category: b.category,
    year: num(b.year),
    course: b.course || undefined,
    quota: b.quota || undefined,
    round: num(b.round),
    state: b.state || undefined,
    limit: num(b.limit),
  };

  const result = await predict(input);

  if (!result.categoryRank && result.category !== 'General') {
    // The category exists in the enum but has no factor row, so we could not compute a
    // category rank. Say so rather than silently omitting it from the response.
    result.note = [result.note, `No category factor is configured for ${result.category}.`]
      .filter(Boolean)
      .join(' ');
  }

  // Subscription gate: the full shortlist + export is a Pro (₹3,999+) feature. Free users see the
  // top matches only; `estimatedRank`/percentile/counts stay intact so the core estimate is free.
  // Admins bypass by role (hasFullData); counsellors bypass specifically for predictions (isStaff)
  // — they were never granted the broader hasFullData set (allotments, unlimited AI).
  const gated = !hasFullData(req.user) && !isStaff(req.user?.role);
  if (gated && Array.isArray(result.matches) && result.matches.length > FREE_PREDICT_MATCHES) {
    result.matches = result.matches.slice(0, FREE_PREDICT_MATCHES);
  }

  res.json({ success: true, data: { ...result, gated } });
});

export default router;
