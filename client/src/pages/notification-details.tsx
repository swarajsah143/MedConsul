import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { notificationService, type CounselingNotification } from '@/services/notification.service';
import { MOCK_NOTIFICATIONS } from '@/lib/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ArrowLeft,
  MapPin,
  Download,
  Bookmark,
  BookmarkCheck,
  Globe,
  FileText,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

export default function NotificationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [notification, setNotification] = useState<CounselingNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await notificationService.getById(id);
      if (res.success && res.data?.notification) {
        setNotification(res.data.notification);
      } else {
        loadMockDetail();
      }
    } catch {
      loadMockDetail();
    } finally {
      setLoading(false);
    }
  };

  const loadMockDetail = () => {
    const found = MOCK_NOTIFICATIONS.find((n) => n.id === id);
    setNotification(found || null);
  };

  const handleBookmarkToggle = async () => {
    if (!notification) return;
    try {
      setNotification((prev) =>
        prev
          ? {
              ...prev,
              isBookmarked: !prev.isBookmarked,
            }
          : null
      );
      await notificationService.toggleBookmark(notification.id);
    } catch {
      // Revert if error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner label="Loading notification details..." />
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <EmptyState
          icon={AlertTriangle}
          title="Notification not found"
          description="The notification you are looking for does not exist or has been deleted."
          action={{ label: 'Back to Feed', onClick: () => navigate('/notifications') }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="flex items-center gap-1.5 self-start">
        <ArrowLeft className="w-4 h-4" /> Back to Feed
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Summary, Content, Translation & Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header detail */}
          <Card className="glass">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-teal-950/30 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30">
                  {notification.category}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(notification.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <CardTitle className="text-lg md:text-xl font-bold mt-3 leading-snug">
                {notification.title}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 pt-2">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {notification.state}</span>
                <span>•</span>
                <span className="font-semibold text-slate-500">{notification.counselingBody}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Translation Summary Box */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Summary Translation
                  </span>
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-0.5 flex gap-1 border border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => setLang('en')}
                      className={`text-[10px] px-2 py-1 rounded font-bold transition-all ${
                        lang === 'en' ? 'bg-teal-600 text-white' : 'text-slate-500'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLang('hi')}
                      className={`text-[10px] px-2 py-1 rounded font-bold transition-all ${
                        lang === 'hi' ? 'bg-teal-600 text-white' : 'text-slate-500'
                      }`}
                    >
                      हिन्दी (Hindi)
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {lang === 'en' ? notification.summary : notification.translationHi || 'हिंदी सारांश उपलब्ध नहीं है।'}
                </p>
              </div>

              {/* Full Content Body */}
              {notification.content && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Official Update Body</h4>
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {notification.content}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PDF Preview panel */}
          {notification.pdfUrl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  PDF Attachment Preview
                </CardTitle>
                <CardDescription className="text-xs truncate">
                  File: {notification.pdfOriginalName || 'attachment.pdf'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Embed PDF frame. Fallback to notice if not loadable */}
                <div className="aspect-[4/5] sm:aspect-[4/3] w-full border-t border-slate-100 dark:border-slate-800 bg-slate-900 rounded-b-xl overflow-hidden relative">
                  <iframe
                    src={notification.pdfUrl}
                    title="PDF Document Preview"
                    className="w-full h-full border-none"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right 1 Column: Metadata box and Action links */}
        <div className="space-y-6">
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Document Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Counseling Body:</span>
                  <span className="font-semibold">{notification.counselingBody}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">State / Region:</span>
                  <span className="font-semibold">{notification.state}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Update Category:</span>
                  <span className="font-semibold">{notification.category}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Notification Priority:</span>
                  <span className="font-semibold capitalize text-teal-600">{notification.priority}</span>
                </div>
                {notification.sourceUrl && (
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">External URL:</span>
                    <a
                      href={notification.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:underline flex items-center gap-0.5"
                    >
                      Official Link <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Bookmark and PDF downloads */}
              <div className="space-y-3 pt-3">
                <Button
                  onClick={handleBookmarkToggle}
                  variant={notification.isBookmarked ? 'secondary' : 'outline'}
                  className="w-full justify-center gap-2"
                >
                  {notification.isBookmarked ? (
                    <>
                      <BookmarkCheck className="w-4.5 h-4.5 text-teal-600" />
                      Bookmarked
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4.5 h-4.5 text-slate-400" />
                      Bookmark Notification
                    </>
                  )}
                </Button>

                {notification.pdfUrl && (
                  <Button asChild className="w-full gradient-primary text-white gap-2">
                    <a href={notification.pdfUrl} download>
                      <Download className="w-4 h-4" /> Download PDF Document
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
