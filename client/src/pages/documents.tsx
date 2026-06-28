import React, { useState, useEffect } from 'react';
import { documentService, type DocumentEntry, type DocumentFilterOptions } from '@/services/document.service';
import { MOCK_DOCUMENTS } from '@/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/ui/page-header';
import {
  Search,
  Filter,
  FileText,
  CheckCircle2,
  Download,
  Info,
  Check,
} from 'lucide-react';

export default function DocumentsPage() {
  const [items, setItems] = useState<DocumentEntry[]>(MOCK_DOCUMENTS);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(MOCK_DOCUMENTS.length);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRequired, setSelectedRequired] = useState('All');

  const [filterOptions, setFilterOptions] = useState<DocumentFilterOptions>({
    states: ['All States', 'Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu'],
    categories: ['Category', 'State Quota', 'NRI Quota', 'PwD', 'General'],
  });

  const [showFilters, setShowFilters] = useState(true);
  
  // Local state for user checklist (just UI for now)
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, selectedState, selectedCategory, selectedRequired]);

  const fetchOptions = async () => {
    try {
      const res = await documentService.getFilterOptions();
      if (res.success && res.data) {
        setFilterOptions(res.data);
      }
    } catch {
      // Offline fallback
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
        search: search || undefined,
        state: selectedState !== 'All' ? selectedState : undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        isRequired: selectedRequired !== 'All' ? (selectedRequired === 'Required' ? 'true' : 'false') : undefined,
      };

      const res = await documentService.list(params);
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

  const filterMockDataLocally = () => {
    let data = [...MOCK_DOCUMENTS];

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (n) => n.name.toLowerCase().includes(q) || (n.description && n.description.toLowerCase().includes(q))
      );
    }

    if (selectedState !== 'All') {
      data = data.filter((n) => !n.state || n.state === selectedState);
    }

    if (selectedCategory !== 'All') {
      data = data.filter((n) => !n.category || n.category === selectedCategory);
    }

    if (selectedRequired !== 'All') {
      const req = selectedRequired === 'Required';
      data = data.filter((n) => n.isRequired === req);
    }

    setItems(data);
    setTotal(data.length);
    setTotalPages(Math.ceil(data.length / limit));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedState('All');
    setSelectedCategory('All');
    setSelectedRequired('All');
    setPage(1);
  };

  const toggleDocCheck = (id: string) => {
    const next = new Set(checkedDocs);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCheckedDocs(next);
  };

  const progress = total > 0 ? Math.round((checkedDocs.size / items.length) * 100) : 0;
  // Make sure progress is not > 100 or NaN
  const displayProgress = Math.min(100, Math.max(0, progress || 0));

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        icon={FileText}
        iconClassName="text-indigo-600"
        title="Required Documents"
        description="Comprehensive checklist of documents and certificates needed for NEET counseling and admission."
      >
        <Button
          variant="outline"
          className={`flex items-center gap-2 ${showFilters ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>

        <Button
          className="gradient-primary text-white flex items-center gap-2 shadow-sm"
          onClick={() => window.print()}
        >
          <Download className="w-4 h-4" /> Export Checklist
        </Button>
      </PageHeader>

      {/* Progress Bar */}
      <Card className="border-indigo-100 dark:border-indigo-900/30 overflow-hidden">
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
            <CheckCircle2 className={`w-6 h-6 ${displayProgress === 100 ? 'text-emerald-500' : 'text-indigo-400'}`} />
          </div>
          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-1.5">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Checklist Progress</h3>
                <p className="text-xs text-slate-500">Track your document collection status</p>
              </div>
              <span className="font-bold text-indigo-700 dark:text-indigo-400 text-lg">{displayProgress}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ease-out ${displayProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Filter panel card */}
      {showFilters && (
        <Card className="shadow-sm glass animate-fade-in border-slate-100 dark:border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative md:col-span-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                  Search
                </Button>
                <Button type="button" variant="outline" onClick={handleResetFilters}>
                  Clear
                </Button>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">State Applicability</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                <label className="text-xs font-bold text-slate-500 uppercase">Category Applicability</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                <label className="text-xs font-bold text-slate-500 uppercase">Requirement</label>
                <select
                  value={selectedRequired}
                  onChange={(e) => setSelectedRequired(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="All">All Documents</option>
                  <option value="Required">Mandatory</option>
                  <option value="Optional">Conditional/Optional</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Checklist View */}
      <div className="grid gap-3">
        {loading ? (
          <Card className="py-24 text-center border-slate-100 dark:border-slate-800 shadow-sm">
            <Spinner label="Loading documents checklist..." />
          </Card>
        ) : items.length === 0 ? (
          <Card className="py-16 text-center border-slate-100 dark:border-slate-800 shadow-sm">
            <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-500">No documents found matching filters.</p>
          </Card>
        ) : (
          items.map((doc) => {
            const isChecked = checkedDocs.has(doc.id);
            return (
              <Card 
                key={doc.id} 
                className={`transition-all duration-200 border overflow-hidden ${
                  isChecked 
                    ? 'bg-emerald-50/30 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/30 shadow-sm' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-200 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row p-4 gap-4 items-start sm:items-center">
                  
                  {/* Checkbox Trigger */}
                  <div 
                    onClick={() => toggleDocCheck(doc.id)}
                    className={`w-6 h-6 shrink-0 rounded-md border flex items-center justify-center cursor-pointer transition-colors mt-0.5 ${
                      isChecked 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {isChecked && <Check className="w-4 h-4" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`text-base font-bold truncate ${isChecked ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                        {doc.name}
                      </h3>
                      {doc.isRequired ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[10px] font-bold uppercase tracking-wider dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400">
                          Mandatory
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px] font-bold uppercase tracking-wider dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400">
                          Conditional
                        </span>
                      )}
                      
                      {doc.category && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold dark:bg-slate-800 dark:text-slate-400">
                          {doc.category}
                        </span>
                      )}
                      {doc.state && (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-semibold dark:bg-indigo-950/30 dark:text-indigo-400">
                          {doc.state}
                        </span>
                      )}
                    </div>
                    
                    {doc.description && (
                      <p className={`text-sm ${isChecked ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'} mb-2`}>
                        {doc.description}
                      </p>
                    )}

                    {doc.notes && (
                      <div className={`flex gap-2 items-start text-xs p-2.5 rounded-lg ${
                        isChecked 
                          ? 'bg-emerald-50/50 text-emerald-700/70 dark:bg-emerald-900/20 dark:text-emerald-400/50' 
                          : 'bg-blue-50/50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300'
                      }`}>
                        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="leading-relaxed font-medium">{doc.notes}</span>
                      </div>
                    )}
                  </div>

                </div>
              </Card>
            );
          })
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        itemCount={items.length}
        totalItems={total}
      />

    </div>
  );
}
