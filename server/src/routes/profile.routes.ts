import { Router, Response } from 'express';
import { UserModel, toStudentSafe, PROFILE_FIELDS } from '../models/user.model';
import { profileProblem } from '../controllers/admin.controller';
import { requireAuth, AuthRequest } from '../middlewares/auth.middleware';

/**
 * A student's own counselling profile.
 *
 *   GET /api/profile   read my own details
 *   PUT /api/profile   update my own details
 *
 * Two things a student must NOT be able to do here, both enforced below:
 *
 *   - See `adminNotes`. That is where a counsellor writes candid things
 *     ("family cannot afford management quota"). It is stripped by toStudentSafe.
 *   - Change their own `role` or `plan`. Those are admin decisions; accepting them from
 *     this endpoint would let any student make themselves an admin on a Premium plan by
 *     adding two keys to a JSON body. Only PROFILE_FIELDS are copied — the rest of the
 *     request body is ignored, not merged.
 */

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  const user = await UserModel.findById(req.user!.userId);
  if (!user) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  res.json({ success: true, data: { profile: toStudentSafe(user) } });
});

router.put('/', async (req: AuthRequest, res: Response) => {
  const body = req.body || {};

  // Allow-list, not deny-list. A deny-list forgets a field the day someone adds one.
  const patch: Record<string, any> = {};
  for (const f of PROFILE_FIELDS) {
    if (body[f] !== undefined) patch[f] = body[f];
  }
  if (body.name !== undefined) patch.name = String(body.name).trim().slice(0, 120);

  if (!Object.keys(patch).length) {
    res.status(400).json({ success: false, message: 'Nothing to update' });
    return;
  }

  const problem = profileProblem(patch);
  if (problem) { res.status(400).json({ success: false, message: problem }); return; }

  const updated = await UserModel.update(req.user!.userId, patch);
  if (!updated) { res.status(404).json({ success: false, message: 'Not found' }); return; }

  res.json({ success: true, data: { profile: toStudentSafe(updated as any) } });
});

export default router;
