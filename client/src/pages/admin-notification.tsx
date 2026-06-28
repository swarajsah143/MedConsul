import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { notificationService } from '@/services/notification.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Upload, Check } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { ErrorAlert } from '@/components/ui/error-alert';
import { z } from 'zod';

const clientNotificationSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  summary: z.string().min(10, 'Summary must be at least 10 characters'),
  content: z.string().optional(),
  translationHi: z.string().optional(),
  state: z.string().min(2, 'State is required'),
  category: z.enum(['Schedule', 'Seat Matrix', 'Fee', 'Document', 'Result', 'General']),
  counselingBody: z.string().min(2, 'Counseling body is required'),
  sourceUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  isPublished: z.boolean().default(true),
});

export default function AdminNotificationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingPdf, setExistingPdf] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(clientNotificationSchema),
    defaultValues: {
      title: '',
      summary: '',
      content: '',
      translationHi: '',
      state: 'All India',
      category: 'General' as const,
      counselingBody: 'MCC',
      sourceUrl: '',
      priority: 'normal' as const,
      isPublished: true,
    },
  });

  useEffect(() => {
    if (isEditMode && id) {
      loadNotification();
    }
  }, [id]);

  const loadNotification = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getById(id!);
      if (res.success && res.data?.notification) {
        const n = res.data.notification;
        reset({
          title: n.title,
          summary: n.summary,
          content: n.content || '',
          translationHi: n.translationHi || '',
          state: n.state,
          category: n.category,
          counselingBody: n.counselingBody,
          sourceUrl: n.sourceUrl || '',
          priority: n.priority,
          isPublished: n.isPublished,
        });
        if (n.pdfOriginalName) {
          setExistingPdf(n.pdfOriginalName);
        }
      }
    } catch (err: any) {
      setError('Failed to load notification details for editing.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed');
        return;
      }
      setPdfFile(file);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setError('');
      const formData = new FormData();
      
      // Append fields
      Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          formData.append(key, typeof val === 'boolean' ? String(val) : (val as any));
        }
      });

      // Append file
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      }

      if (isEditMode && id) {
        await notificationService.update(id, formData);
      } else {
        await notificationService.create(formData);
      }

      navigate('/notifications');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Operation failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header and Back Link */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/notifications"><ArrowLeft className="w-4 h-4" /> Back to Feed</Link>
        </Button>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit Notification' : 'Create Counseling Notification'}</CardTitle>
          <CardDescription>
            Publish NEET UG counseling updates, allotment lists, state rules, or document criteria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <ErrorAlert message={error} />

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" required>Notification Title</Label>
              <Input
                id="title"
                placeholder="e.g. Maharashtra State Merit List Released"
                {...register('title')}
              />
              {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
            </div>

            {/* Short Summary (English) */}
            <div className="space-y-2">
              <Label htmlFor="summary" required>Short Summary (English)</Label>
              <textarea
                id="summary"
                rows={3}
                placeholder="Briefly summarize the update for student notifications card feeds..."
                className="w-full min-h-[80px] p-3 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('summary')}
              />
              {errors.summary && <p className="text-destructive text-xs">{errors.summary.message}</p>}
            </div>

            {/* Hindi translation */}
            <div className="space-y-2">
              <Label htmlFor="translationHi">Short Summary Translation (Hindi)</Label>
              <textarea
                id="translationHi"
                rows={3}
                placeholder="पंजीकरण कार्यक्रम और सीट आवंटन विवरण की संक्षिप्त जानकारी..."
                className="w-full min-h-[80px] p-3 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('translationHi')}
              />
            </div>

            {/* Dynamic Content Details */}
            <div className="space-y-2">
              <Label htmlFor="content">Full Content/Official Notice Text</Label>
              <textarea
                id="content"
                rows={6}
                placeholder="Provide detailed instructions, rules, round criteria or description if applicable..."
                className="w-full min-h-[140px] p-3 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('content')}
              />
            </div>

            {/* Row structure */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* State */}
              <div className="space-y-2">
                <Label htmlFor="state" required>State Quota / Category State</Label>
                <Input id="state" placeholder="e.g. All India, Maharashtra, Karnataka" {...register('state')} />
                {errors.state && <p className="text-destructive text-xs">{errors.state.message}</p>}
              </div>

              {/* Counseling Body */}
              <div className="space-y-2">
                <Label htmlFor="counselingBody" required>Counseling Body Name</Label>
                <Input id="counselingBody" placeholder="e.g. MCC, KEA, CET Cell" {...register('counselingBody')} />
                {errors.counselingBody && <p className="text-destructive text-xs">{errors.counselingBody.message}</p>}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" required>Update Category Type</Label>
                <select
                  id="category"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register('category')}
                >
                  <option value="Schedule">Schedule</option>
                  <option value="Seat Matrix">Seat Matrix</option>
                  <option value="Fee">Fee</option>
                  <option value="Document">Document</option>
                  <option value="Result">Result</option>
                  <option value="General">General</option>
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Urgency Priority Level</Label>
                <select
                  id="priority"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register('priority')}
                >
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent / Alert</option>
                </select>
              </div>
            </div>

            {/* External source URL */}
            <div className="space-y-2">
              <Label htmlFor="sourceUrl">Official Website External URL Link</Label>
              <Input
                id="sourceUrl"
                type="text"
                placeholder="https://mcc.nic.in/bulletin"
                {...register('sourceUrl')}
              />
              {errors.sourceUrl && <p className="text-destructive text-xs">{errors.sourceUrl.message}</p>}
            </div>

            {/* PDF Upload */}
            <div className="space-y-2">
              <Label htmlFor="pdf">Upload Official PDF Circular / Prospectus</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors relative cursor-pointer">
                <input
                  id="pdf"
                  type="file"
                  accept="application/pdf"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-600">
                  {pdfFile ? pdfFile.name : 'Click to select or drag PDF file'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  PDF format only. Maximum size 20MB.
                </span>
              </div>
              {existingPdf && !pdfFile && (
                <p className="text-[10px] text-teal-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Existing PDF attached: {existingPdf}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" asChild>
                <Link to="/notifications">Cancel</Link>
              </Button>
              <Button type="submit" className="gradient-primary text-white" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  'Publish Update'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
