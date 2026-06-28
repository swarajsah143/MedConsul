import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';
import { notificationService, type CounselingNotification } from '@/services/notification.service';
import { MOCK_NOTIFICATIONS } from '@/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/ui/page-header';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Search,
  Filter,
  Grid,
  List as ListIcon,
  Bookmark,
  BookmarkCheck,
  Calendar,
  MapPin,
  Download,
  Eye,
  PlusCircle,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<CounselingNotification[]>(MOCK_NOTIFICATIONS);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBody, setSelectedBody] = useState('All');

  const [statesList] = useState<string[]>(['All India', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi']);
  const [categoriesList] = useState<string[]>(['Schedule', 'Seat Matrix', 'Fee', 'Document', 'Result', 'General']);
  const [bodiesList] = useState<string[]>(['MCC', 'KEA', 'CET Cell', 'DME']);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchNotifications();
  }, [page, selectedState, selectedCategory, selectedBody]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        limit: 10,
        search: search || undefined,
        state: selectedState !== 'All' ? selectedState : undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        counselingBody: selectedBody !== 'All' ? selectedBody : undefined,
      };

      const res = await notificationService.list(params as any);
      if (res.success && res.data && res.data.items.length > 0) {
        setNotifications(res.data.items);
        setTotalPages(res.data.totalPages);
      } else {
        filterMockData();
      }
    } catch {
      filterMockData();
    } finally {
      setLoading(false);
    }
  };

  const filterMockData = () => {
    let data = [...MOCK_NOTIFICATIONS];
    if (search) {
      data = data.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.summary.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (selectedState !== 'All') {
      data = data.filter((n) => n.state === selectedState);
    }
    if (selectedCategory !== 'All') {
      data = data.filter((n) => n.category === selectedCategory);
    }
    if (selectedBody !== 'All') {
      data = data.filter((n) => n.counselingBody === selectedBody);
    }
    setNotifications(data);
    setTotalPages(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotifications();
  };

  const handleBookmarkToggle = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, isBookmarked: !n.isBookmarked, bookmarkCount: (n.bookmarkCount || 0) + (n.isBookmarked ? -1 : 1) }
            : n
        )
      );
      await notificationService.toggleBookmark(id);
    } catch {
      // Revert if API fails
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    try {
      await notificationService.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200';
      case 'high':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200';
      case 'low':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400';
      default:
        return 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 border border-teal-100';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Counseling Notifications Feed"
        description="Stay updated with real-time official bulletins, brochures, seat matrices and result notifications."
      >
        {user?.role === 'ADMIN' && (
          <Button asChild className="gradient-primary text-white" size="sm">
            <Link to="/notifications/new" className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Add Notification
            </Link>
          </Button>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-1 flex gap-1 shadow-sm">
          <Button
            variant={viewMode === 'card' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('card')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('table')}
          >
            <ListIcon className="w-4 h-4" />
          </Button>
        </div>
      </PageHeader>

      {/* Search and Filters Toolbar */}
      <div className="glass border-slate-100 p-4 rounded-xl shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by keywords, title, content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" variant="secondary">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" /> Filters
            </Button>
          </div>
        </form>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">State</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="All">All States</option>
                {statesList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="All">All Categories</option>
                {categoriesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Counseling Body</label>
              <select
                value={selectedBody}
                onChange={(e) => setSelectedBody(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="All">All Bodies</option>
                {bodiesList.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No notifications found"
          description="We couldn't find any updates matching your search filters. Try resetting the filters."
        />
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notifications.map((notif) => (
            <Card key={notif.id} className="hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getPriorityColor(notif.priority)}`}>
                      {notif.priority}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleBookmarkToggle(notif.id)}
                        className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 p-1"
                      >
                        {notif.isBookmarked ? (
                          <BookmarkCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                      {user?.role === 'ADMIN' && (
                        <>
                          <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-teal-600">
                            <Link to={`/notifications/edit/${notif.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(notif.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-base font-bold mt-3 leading-snug line-clamp-2 hover:text-teal-600 transition-colors">
                    <Link to={`/notifications/${notif.id}`}>{notif.title}</Link>
                  </CardTitle>
                  <CardDescription className="flex flex-wrap gap-x-3 gap-y-1 text-xs pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {notif.state}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-slate-500">{notif.counselingBody}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">{notif.summary}</p>
                </CardContent>
              </div>

              <div className="px-4 sm:px-6 py-4 bg-slate-50/50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs rounded-b-lg">
                <span className="flex items-center gap-1 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(notif.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <div className="flex items-center gap-2">
                  {notif.pdfUrl && (
                    <Button variant="outline" size="sm" className="h-8 text-[11px] px-2" asChild>
                      <a href={notif.pdfUrl} download className="flex items-center gap-1">
                        <Download className="w-3 h-3" /> PDF
                      </a>
                    </Button>
                  )}
                  <Button size="sm" className="h-8 text-[11px] px-3 bg-teal-600 text-white hover:bg-teal-700" asChild>
                    <Link to={`/notifications/${notif.id}`}>View Details</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Source / State</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                      {new Date(notif.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{notif.counselingBody}</div>
                      <div className="text-[10px] text-slate-400">{notif.state}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200 max-w-sm truncate">
                      <Link to={`/notifications/${notif.id}`} className="hover:underline">
                        {notif.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                        {notif.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleBookmarkToggle(notif.id)}>
                        {notif.isBookmarked ? (
                          <BookmarkCheck className="w-4 h-4 text-teal-600" />
                        ) : (
                          <Bookmark className="w-4 h-4 text-slate-400" />
                        )}
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[10px]" asChild>
                        <Link to={`/notifications/${notif.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
