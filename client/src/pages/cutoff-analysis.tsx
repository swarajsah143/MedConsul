import React, { useState, useEffect } from 'react';
import { cutoffService, type CutoffEntry, type SavedFilter, type FilterOptionsResponse } from '@/services/cutoff.service';
import { useAuth } from '@/providers/auth-provider';
import { MOCK_CUTOFFS } from '@/lib/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/ui/page-header';
import {
  Search,
  Bookmark,
  Download,
  Trash2,
  ArrowUpDown,
  TrendingDown,
  BookmarkIcon,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';

// Initial column customization state
const DEFAULT_COLUMNS = [
  { key: 'college', label: 'Institute', visible: true },
  { key: 'type', label: 'College Type', visible: true },
  { key: 'course', label: 'Course', visible: true },
  { key: 'state', label: 'State', visible: true },
  { key: 'quota', label: 'Quota', visible: true },
  { key: 'category', label: 'Category', visible: true },
  { key: 'subcategory', label: 'Subcategory', visible: false },
  { key: 'seatType', label: 'Seat Type', visible: true },
  { key: 'round', label: 'Round', visible: true },
  { key: 'air', label: 'AIR', visible: true },
  { key: 'score', label: 'Score', visible: true },
  { key: 'fees', label: 'Fees', visible: true },
];

export default function CutoffAnalysisPage() {
  const { user } = useAuth();

  // Core Data States
  const [items, setItems] = useState<CutoffEntry[]>(MOCK_CUTOFFS);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(MOCK_CUTOFFS.length);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedQuota, setSelectedQuota] = useState('All');
  const [selectedSeatType, setSelectedSeatType] = useState('All');
  const [selectedRound, setSelectedRound] = useState('All');

  // Sliders range bounds (from backend, or default)
  const [bounds, setBounds] = useState({ minAir: 1, maxAir: 200000, minScore: 100, maxScore: 720 });
  const [airMinInput, setAirMinInput] = useState('');
  const [airMaxInput, setAirMaxInput] = useState('');
  const [scoreMinInput, setScoreMinInput] = useState('');
  const [scoreMaxInput, setScoreMaxInput] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState<'air' | 'score' | 'college' | 'fees'>('air');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Dynamic filter options lists
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse>({
    states: ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Uttar Pradesh'],
    courses: ['MBBS', 'BDS', 'BAMS'],
    categories: ['General', 'OBC', 'SC', 'ST', 'EWS'],
    quotas: ['All India Quota (AIQ)', 'Delhi State Quota', 'Maharashtra State Quota', 'Karnataka State Quota', 'Management Quota'],
    seatTypes: ['Government Seat', 'Private Seat', 'Management Seat'],
    rounds: [1, 2, 3, 4],
    bounds: { minAir: 1, maxAir: 200000, minScore: 100, maxScore: 720 },
  });

  // UI Panels toggling
  const [showFiltersPanel, setShowFiltersPanel] = useState(true);
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');

  // Saved Filters
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  // Column visibility state
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);

  // Initialize: Fetch options and data
  useEffect(() => {
    fetchOptions();
    fetchSavedFilters();
  }, []);

  useEffect(() => {
    fetchData();
  }, [
    page,
    selectedState,
    selectedCourse,
    selectedCategory,
    selectedQuota,
    selectedSeatType,
    selectedRound,
    sortBy,
    sortOrder,
  ]);

  // Fetch filter options list from API
  const fetchOptions = async () => {
    try {
      const res = await cutoffService.getFilterOptions();
      if (res.success && res.data) {
        setFilterOptions(res.data);
        setBounds(res.data.bounds);
      }
    } catch (err) {
      console.warn('API error listing filter dropdowns. Using fallback constants.');
    }
  };

  // Fetch saved filters
  const fetchSavedFilters = async () => {
    if (!user) return;
    try {
      const res = await cutoffService.listSavedFilters();
      if (res.success && res.data) {
        setSavedFilters(res.data);
      }
    } catch {
      // Offline fallback
    }
  };

  // Main search query trigger
  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
        sortBy,
        sortOrder,
        search: search || undefined,
        state: selectedState !== 'All' ? selectedState : undefined,
        college: selectedCollege || undefined,
        course: selectedCourse !== 'All' ? selectedCourse : undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        quota: selectedQuota !== 'All' ? selectedQuota : undefined,
        seatType: selectedSeatType !== 'All' ? selectedSeatType : undefined,
        round: selectedRound !== 'All' ? parseInt(selectedRound) : undefined,
        airMin: airMinInput ? parseInt(airMinInput) : undefined,
        airMax: airMaxInput ? parseInt(airMaxInput) : undefined,
        scoreMin: scoreMinInput ? parseInt(scoreMinInput) : undefined,
        scoreMax: scoreMaxInput ? parseInt(scoreMaxInput) : undefined,
      };

      const res = await cutoffService.list(params);
      if (res.success && res.data && res.data.items.length > 0) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } else {
        filterMockDataLocally();
      }
    } catch {
      filterMockDataLocally();
    } finally {
      setLoading(false);
    }
  };

  // Local filtering when DB is unseeded/offline
  const filterMockDataLocally = () => {
    let data = [...MOCK_CUTOFFS];

    // Text search
    if (search) {
      data = data.filter(
        (n) =>
          n.college.name.toLowerCase().includes(search.toLowerCase()) ||
          n.course.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (selectedCollege) {
      data = data.filter((n) => n.college.name.toLowerCase().includes(selectedCollege.toLowerCase()));
    }

    // Direct filters
    if (selectedState !== 'All') {
      data = data.filter((n) => n.college.state === selectedState);
    }
    if (selectedCourse !== 'All') {
      data = data.filter((n) => n.course === selectedCourse);
    }
    if (selectedCategory !== 'All') {
      data = data.filter((n) => n.category === selectedCategory);
    }
    if (selectedQuota !== 'All') {
      data = data.filter((n) => n.quota === selectedQuota);
    }
    if (selectedSeatType !== 'All') {
      data = data.filter((n) => n.seatType === selectedSeatType);
    }
    if (selectedRound !== 'All') {
      data = data.filter((n) => n.round === parseInt(selectedRound));
    }

    // Ranges
    if (airMinInput) {
      data = data.filter((n) => n.air >= parseInt(airMinInput));
    }
    if (airMaxInput) {
      data = data.filter((n) => n.air <= parseInt(airMaxInput));
    }
    if (scoreMinInput) {
      data = data.filter((n) => (n.score || 0) >= parseInt(scoreMinInput));
    }
    if (scoreMaxInput) {
      data = data.filter((n) => (n.score || 0) <= parseInt(scoreMaxInput));
    }

    // Sort
    data.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'air') comparison = a.air - b.air;
      else if (sortBy === 'score') comparison = (a.score || 0) - (b.score || 0);
      else if (sortBy === 'fees') comparison = (a.fees || 0) - (b.fees || 0);
      else if (sortBy === 'college') comparison = a.college.name.localeCompare(b.college.name);

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setItems(data);
    setTotal(data.length);
    setTotalPages(Math.ceil(data.length / limit));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedState('All');
    setSelectedCollege('');
    setSelectedCourse('All');
    setSelectedCategory('All');
    setSelectedQuota('All');
    setSelectedSeatType('All');
    setSelectedRound('All');
    setAirMinInput('');
    setAirMaxInput('');
    setScoreMinInput('');
    setScoreMaxInput('');
    setActiveFilterId(null);
    setPage(1);
  };

  // Toggle sorting column
  const handleSort = (field: 'air' | 'score' | 'college' | 'fees') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // CSV Export Trigger
  const handleExportCsv = () => {
    const params = {
      search: search || undefined,
      state: selectedState !== 'All' ? selectedState : undefined,
      college: selectedCollege || undefined,
      course: selectedCourse !== 'All' ? selectedCourse : undefined,
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
      quota: selectedQuota !== 'All' ? selectedQuota : undefined,
      seatType: selectedSeatType !== 'All' ? selectedSeatType : undefined,
      round: selectedRound !== 'All' ? parseInt(selectedRound) : undefined,
      airMin: airMinInput ? parseInt(airMinInput) : undefined,
      airMax: airMaxInput ? parseInt(airMaxInput) : undefined,
      scoreMin: scoreMinInput ? parseInt(scoreMinInput) : undefined,
      scoreMax: scoreMaxInput ? parseInt(scoreMaxInput) : undefined,
      sortBy,
      sortOrder,
    };

    window.open(cutoffService.getExportUrl(params), '_blank');
  };

  // Bookmark / Save current filter
  const handleSaveFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilterName.trim()) return;

    const currentFilters = {
      search,
      state: selectedState,
      college: selectedCollege,
      course: selectedCourse,
      category: selectedCategory,
      quota: selectedQuota,
      seatType: selectedSeatType,
      round: selectedRound,
      airMin: airMinInput,
      airMax: airMaxInput,
      scoreMin: scoreMinInput,
      scoreMax: scoreMaxInput,
    };

    try {
      const res = await cutoffService.saveFilter(newFilterName, currentFilters);
      if (res.success) {
        setShowSaveFilterModal(false);
        setNewFilterName('');
        fetchSavedFilters();
      }
    } catch {
      // Mock save locally for offline test resilience
      const mockSaved: SavedFilter = {
        id: `mock-sf-${Date.now()}`,
        name: newFilterName,
        filters: currentFilters,
        createdAt: new Date().toISOString(),
      };
      setSavedFilters([mockSaved, ...savedFilters]);
      setShowSaveFilterModal(false);
      setNewFilterName('');
    }
  };

  // Restore filter bookmark
  const handleApplySavedFilter = (saved: SavedFilter) => {
    const f = saved.filters;
    setSearch(f.search || '');
    setSelectedState(f.state || 'All');
    setSelectedCollege(f.college || '');
    setSelectedCourse(f.course || 'All');
    setSelectedCategory(f.category || 'All');
    setSelectedQuota(f.quota || 'All');
    setSelectedSeatType(f.seatType || 'All');
    setSelectedRound(f.round || 'All');
    setAirMinInput(f.airMin || '');
    setAirMaxInput(f.airMax || '');
    setScoreMinInput(f.scoreMin || '');
    setScoreMaxInput(f.scoreMax || '');
    setActiveFilterId(saved.id);
    setPage(1);
  };

  // Delete saved filter bookmark
  const handleDeleteSavedFilter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent applying
    try {
      await cutoffService.deleteSavedFilter(id);
      setSavedFilters(prev => prev.filter(f => f.id !== id));
      if (activeFilterId === id) setActiveFilterId(null);
    } catch {
      // Local delete
      setSavedFilters(prev => prev.filter(f => f.id !== id));
      if (activeFilterId === id) setActiveFilterId(null);
    }
  };

  // Column Visibility Handlers
  const toggleColumnVisibility = (key: string) => {
    setColumns(
      columns.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  };

  const isColumnVisible = (key: string) => {
    return columns.find((c) => c.key === key)?.visible ?? true;
  };

  // Format currency/fees helper
  const formatFees = (val: number | null) => {
    if (val === null || val === undefined) return 'N/A';
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} Lakh/Yr`;
    }
    return `₹${val.toLocaleString()}/Yr`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title Header */}
      <PageHeader
        icon={TrendingDown}
        title="Cutoff Analysis System"
        description="Compare closing ranks (AIR), scores, and seat quotas across government and private medical institutes."
      >
        <Button
          variant="outline"
          className={`flex items-center gap-2 ${showFiltersPanel ? 'bg-teal-50/50 border-teal-200 text-teal-700' : ''}`}
          onClick={() => setShowFiltersPanel(!showFiltersPanel)}
        >
          <Settings className="w-4 h-4" /> <span className="hidden sm:inline">{showFiltersPanel ? 'Hide Filters' : 'Show Filters'}</span>
        </Button>

        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => setShowColumnCustomizer(!showColumnCustomizer)}
        >
          <Eye className="w-4 h-4" /> <span className="hidden sm:inline">Columns</span>
        </Button>

        <Button
          variant="outline"
          className="flex items-center gap-2 border-teal-200 text-teal-700 hover:bg-teal-50/50"
          onClick={() => setShowSaveFilterModal(true)}
        >
          <BookmarkIcon className="w-4 h-4" /> <span className="hidden sm:inline">Bookmark Filter</span>
        </Button>

        <Button onClick={handleExportCsv} className="gradient-primary text-white flex items-center gap-2 shadow-sm">
          <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export CSV</span>
        </Button>
      </PageHeader>

      {/* Bookmarked Filters Bar */}
      {savedFilters.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 p-3 rounded-xl flex items-center gap-3 overflow-x-auto shadow-inner">
          <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1 shrink-0">
            <Bookmark className="w-3.5 h-3.5 text-teal-600" /> Bookmarks:
          </span>
          <div className="flex items-center gap-2">
            {savedFilters.map((sf) => (
              <div
                key={sf.id}
                onClick={() => handleApplySavedFilter(sf)}
                className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-2 cursor-pointer transition-all duration-150 select-none ${
                  activeFilterId === sf.id
                    ? 'bg-teal-600 text-white font-medium shadow-sm'
                    : 'bg-white hover:bg-slate-100 dark:bg-slate-800 border border-slate-200 text-slate-700 dark:text-slate-200'
                }`}
              >
                <span>{sf.name}</span>
                <button
                  onClick={(e) => handleDeleteSavedFilter(sf.id, e)}
                  className="hover:text-rose-600 dark:hover:text-rose-400 p-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Column Customizer Panel */}
      {showColumnCustomizer && (
        <Card className="glass shadow-sm animate-fade-in border-teal-100 dark:border-teal-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Customize Table Columns</CardTitle>
            <CardDescription className="text-xs">Toggle the visibility of specific fields in the cutoff data view</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {columns.map((col) => (
              <button
                key={col.key}
                onClick={() => toggleColumnVisibility(col.key)}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs font-semibold transition-all duration-150 ${
                  col.visible
                    ? 'bg-teal-50/50 border-teal-200 text-teal-800 dark:bg-teal-950/20 dark:border-teal-900/30 dark:text-teal-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 text-slate-400'
                }`}
              >
                {col.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {col.label}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filter panel card */}
      {showFiltersPanel && (
        <Card className="shadow-sm glass">
          <CardContent className="pt-6 space-y-6">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative md:col-span-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by keywords, institute, courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 gradient-primary text-white">
                  Apply Filters
                </Button>
                <Button type="button" variant="outline" onClick={handleResetFilters}>
                  Clear
                </Button>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">State</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="All">All States</option>
                  {filterOptions.states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="All">All Courses</option>
                  {filterOptions.courses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="All">All Categories</option>
                  {filterOptions.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Seat Quota</label>
                <select
                  value={selectedQuota}
                  onChange={(e) => setSelectedQuota(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="All">All Quotas</option>
                  {filterOptions.quotas.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Seat Type</label>
                <select
                  value={selectedSeatType}
                  onChange={(e) => setSelectedSeatType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="All">All Seat Types</option>
                  {filterOptions.seatTypes.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Round</label>
                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="All">All Rounds</option>
                  {filterOptions.rounds.map((r) => (
                    <option key={r} value={String(r)}>
                      Round {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* AIR Rank range */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">All India Rank (AIR) Range</label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Min AIR (e.g. 1)"
                    value={airMinInput}
                    onChange={(e) => setAirMinInput(e.target.value)}
                    className="text-xs"
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <Input
                    type="number"
                    placeholder={`Max AIR (e.g. ${bounds.maxAir})`}
                    value={airMaxInput}
                    onChange={(e) => setAirMaxInput(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Score range */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">NEET Score Range</label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Min Score (e.g. 300)"
                    value={scoreMinInput}
                    onChange={(e) => setScoreMinInput(e.target.value)}
                    className="text-xs"
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <Input
                    type="number"
                    placeholder="Max Score (e.g. 720)"
                    value={scoreMaxInput}
                    onChange={(e) => setScoreMaxInput(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Search Specific College</label>
                <Input
                  placeholder="Enter college name keyword..."
                  value={selectedCollege}
                  onChange={(e) => setSelectedCollege(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main responsive table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider select-none">
              <tr>
                {isColumnVisible('college') && (
                  <th onClick={() => handleSort('college')} className="px-5 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <span className="flex items-center gap-1.5">
                      Institute <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  </th>
                )}
                {isColumnVisible('type') && <th className="px-4 py-4">Type</th>}
                {isColumnVisible('course') && <th className="px-4 py-4">Course</th>}
                {isColumnVisible('state') && <th className="px-4 py-4">State</th>}
                {isColumnVisible('quota') && <th className="px-4 py-4">Quota</th>}
                {isColumnVisible('category') && <th className="px-4 py-4">Category</th>}
                {isColumnVisible('subcategory') && <th className="px-4 py-4">Subcategory</th>}
                {isColumnVisible('seatType') && <th className="px-4 py-4">Seat Type</th>}
                {isColumnVisible('round') && <th className="px-4 py-4 text-center">Round</th>}
                {isColumnVisible('air') && (
                  <th onClick={() => handleSort('air')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-right">
                    <span className="flex items-center gap-1.5 justify-end">
                      AIR <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  </th>
                )}
                {isColumnVisible('score') && (
                  <th onClick={() => handleSort('score')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-right">
                    <span className="flex items-center gap-1.5 justify-end">
                      Score <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  </th>
                )}
                {isColumnVisible('fees') && (
                  <th onClick={() => handleSort('fees')} className="px-4 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-right">
                    <span className="flex items-center gap-1.5 justify-end">
                      Tuition Fees <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-24 text-center text-slate-400">
                    <Spinner label="Fetching cutoff data records..." />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-400">
                    No cutoff entries found matching your query filters. Try adjusting your rank/score bounds.
                  </td>
                </tr>
              ) : (
                items.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    {isColumnVisible('college') && (
                      <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-100 max-w-sm">
                        <div>{entry.college.name}</div>
                        <div className="text-[10px] text-muted-foreground font-normal mt-0.5">{entry.college.city}</div>
                      </td>
                    )}
                    {isColumnVisible('type') && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            entry.college.type === 'Government'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : entry.college.type === 'Deemed'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-455'
                          }`}
                        >
                          {entry.college.type}
                        </span>
                      </td>
                    )}
                    {isColumnVisible('course') && <td className="px-4 py-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">{entry.course}</td>}
                    {isColumnVisible('state') && <td className="px-4 py-4 whitespace-nowrap text-slate-500">{entry.college.state}</td>}
                    {isColumnVisible('quota') && (
                      <td className="px-4 py-4 whitespace-nowrap text-slate-600 font-medium">{entry.quota}</td>
                    )}
                    {isColumnVisible('category') && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="bg-slate-100 px-2.5 py-0.5 rounded font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {entry.category}
                        </span>
                      </td>
                    )}
                    {isColumnVisible('subcategory') && (
                      <td className="px-4 py-4 whitespace-nowrap text-slate-400">{entry.subcategory || 'N/A'}</td>
                    )}
                    {isColumnVisible('seatType') && (
                      <td className="px-4 py-4 whitespace-nowrap text-slate-500 font-medium">{entry.seatType || 'General Seat'}</td>
                    )}
                    {isColumnVisible('round') && (
                      <td className="px-4 py-4 whitespace-nowrap text-center font-extrabold text-teal-600 dark:text-teal-400">
                        R{entry.round}
                      </td>
                    )}
                    {isColumnVisible('air') && (
                      <td className="px-4 py-4 whitespace-nowrap text-right font-extrabold text-slate-900 dark:text-slate-50">
                        #{entry.air.toLocaleString()}
                      </td>
                    )}
                    {isColumnVisible('score') && (
                      <td className="px-4 py-4 whitespace-nowrap text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {entry.score || 'N/A'}
                      </td>
                    )}
                    {isColumnVisible('fees') && (
                      <td className="px-4 py-4 whitespace-nowrap text-right font-semibold text-slate-700 dark:text-slate-300">
                        {formatFees(entry.fees)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        itemCount={items.length}
        totalItems={total}
      />

      {/* Bookmark Filter Name Prompt Modal */}
      {showSaveFilterModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-xl bg-white dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <CardHeader>
              <CardTitle className="text-base font-bold">Bookmark current filters</CardTitle>
              <CardDescription className="text-xs">Save this search configuration so you can recall it with a single click.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveFilter} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="filterName">Bookmark Name</Label>
                  <Input
                    id="filterName"
                    placeholder="e.g. My General State Quota"
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowSaveFilterModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="gradient-primary text-white">
                    Save Bookmark
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
