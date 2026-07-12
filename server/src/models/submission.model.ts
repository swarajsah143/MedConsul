import mongoose, { Schema } from 'mongoose';

/**
 * A document a student has uploaded for admin verification.
 *
 * One row per (user, checklist document). Re-uploading replaces the file and sends
 * the row back to `pending` — a student who fixes a rejected scan should not have to
 * wait behind a stale rejection.
 */

export type SubmissionStatus = 'pending' | 'verified' | 'rejected';

export interface ISubmission {
  id: string;
  userId: string;
  docId: string;            // -> checklistDocs._id
  originalName: string;     // what the student called it (display only, never a path)
  storedName: string;       // random name on disk
  mimeType: string;
  size: number;
  status: SubmissionStatus;
  remarks: string;          // why it was rejected — the student needs to know
  reviewedBy: string;       // admin userId
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const submissionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    docId: { type: String, required: true, index: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending', index: true },
    remarks: { type: String, default: '' },
    reviewedBy: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One live submission per document per student.
submissionSchema.index({ userId: 1, docId: 1 }, { unique: true });

const SubmissionDoc = mongoose.model('submissions', submissionSchema, 'submissions');

function toPlain(doc: any): ISubmission | null {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o._id.toString(),
    userId: o.userId,
    docId: o.docId,
    originalName: o.originalName,
    storedName: o.storedName,
    mimeType: o.mimeType,
    size: o.size,
    status: o.status,
    remarks: o.remarks ?? '',
    reviewedBy: o.reviewedBy ?? '',
    reviewedAt: o.reviewedAt ? new Date(o.reviewedAt).toISOString() : null,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt,
  };
}

export const SubmissionModel = {
  async forUser(userId: string): Promise<ISubmission[]> {
    const docs = await SubmissionDoc.find({ userId }).sort({ updatedAt: -1 });
    return docs.map(toPlain).filter(Boolean) as ISubmission[];
  },

  async get(id: string): Promise<ISubmission | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return toPlain(await SubmissionDoc.findById(id));
  },

  async findByUserAndDoc(userId: string, docId: string): Promise<ISubmission | null> {
    return toPlain(await SubmissionDoc.findOne({ userId, docId }));
  },

  /** Upload or replace. A replacement always returns to `pending` and clears the old review. */
  async upsert(data: {
    userId: string;
    docId: string;
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
  }): Promise<ISubmission> {
    const doc = await SubmissionDoc.findOneAndUpdate(
      { userId: data.userId, docId: data.docId },
      {
        $set: {
          ...data,
          status: 'pending',
          remarks: '',
          reviewedBy: '',
          reviewedAt: null,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return toPlain(doc)!;
  },

  async setStatus(
    id: string,
    status: SubmissionStatus,
    reviewedBy: string,
    remarks = ''
  ): Promise<ISubmission | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return toPlain(
      await SubmissionDoc.findByIdAndUpdate(
        id,
        { $set: { status, remarks, reviewedBy, reviewedAt: new Date() } },
        { new: true }
      )
    );
  },

  async remove(id: string): Promise<ISubmission | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return toPlain(await SubmissionDoc.findByIdAndDelete(id));
  },

  /** Admin review queue. */
  async list(filter: { status?: SubmissionStatus; userId?: string } = {}, page = 1, limit = 50) {
    const where: Record<string, any> = {};
    if (filter.status) where.status = filter.status;
    if (filter.userId) where.userId = filter.userId;

    const [docs, total] = await Promise.all([
      SubmissionDoc.find(where)
        // Pending first — that's the work queue; then oldest-waiting first.
        .sort({ status: 1, createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      SubmissionDoc.countDocuments(where),
    ]);

    return {
      items: docs.map(toPlain).filter(Boolean) as ISubmission[],
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  async bytesUsedBy(userId: string): Promise<number> {
    const r = await SubmissionDoc.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$size' } } },
    ]);
    return r[0]?.total ?? 0;
  },

  async counts(): Promise<Record<SubmissionStatus, number>> {
    const r = await SubmissionDoc.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
    const out: Record<SubmissionStatus, number> = { pending: 0, verified: 0, rejected: 0 };
    for (const row of r) out[row._id as SubmissionStatus] = row.n;
    return out;
  },
};
