import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FEE_MATRIX_DATA,
  FEE_FILTER_OPTIONS,
  formatINR,
  type CollegeFeeEntry,
} from '@/lib/fee-matrix-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Search,
  ArrowUpDown,
  Download,
  Filter,
  X,
  IndianRupee,
  ChevronRight,
  Building2,
  Users,
} from 'lucide-react';

type SortField =
  | 'college'
  | 'tuitionFee'
  | 'hostelFee'
  | 'miscCharges'
  | 'securityDeposit'
  | 'totalFirstYear'
  | 'govtSeats'
  | 'mgmtSeats'
  | 'nriSeats';

const PAGE_SIZE = 10;

function SelectFilter({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="All">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function FeeMatrixPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [state, setState] = useState('All');
  const [college, setCollege] = useState('All');
  const [course, setCourse] = useState('All');
  const [category, setCategory] = useState('All');
  const [quota, setQuota] = useState('All');
  const [showFilters, setShowFilters] = useState(true);

  const [sortBy, setSortBy] = useState<SortField>('totalFirstYear');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const activeFilterCount = [
    state !== 'All',
    college !== 'All',
    course !== 'All',
    category !== 'All',
    quota !== 'All',
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    let data = FEE_MATRIX_DATA;

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.course.toLowerCase().includes(q)
      );
    }
    if (state !== 'All') data = data.filter((e) => e.state === state);
    if (college !== 'All') data = data.filter((e) => e.name === college);
    if (course !== 'All') data = data.filter((e) => e.course === course);
    if (category !== 'All') data = data.filter((e) => e.category === category);
    if (quota !== 'All') data = data.filter((e) => e.quota === quota);

    data = [...data].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'college':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'tuitionFee':
          cmp = a.tuitionFee - b.tuitionFee;
          break;
        case 'hostelFee':
          cmp = a.hostelFee - b.hostelFee;
          break;
        case 'miscCharges':
          cmp = a.miscCharges - b.miscCharges;
          break;
        case 'securityDeposit':
          cmp = a.securityDeposit - b.securityDeposit;
          break;
        case 'totalFirstYear':
          cmp = a.totalFirstYear - b.totalFirstYear;
          break;
        case 'govtSeats':
          cmp = a.govtSeats - b.govtSeats;
          break;
        case 'mgmtSeats':
          cmp = a.mgmtSeats - b.mgmtSeats;
          break;
        case 'nriSeats':
          cmp = a.nriSeats - b.nriSeats;
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return data;
  }, [search, state, college, course, category, quota, sortBy, sortOrder]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortBy === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('asc');
      }
      setPage(1);
    },
    [sortBy]
  );

  const handleReset = () => {
    setSearch('');
    setState('All');
    setCollege('All');
    setCourse('All');
    setCategory('All');
    setQuota('All');
    setPage(1);
  };

  const handleExportCsv = () => {
    const header =
      'College,State,City,Type,Course,Category,Quota,Tuition Fee,Hostel Fee,Misc Charges,Security Deposit,Total First Year,Govt Seats,Mgmt Seats,NRI Seats\n';
    const rows = filtered
      .map(
        (e) =>
          `"${e.name}","${e.state}","${e.city}","${e.type}","${e.course}","${e.category}","${e.quota}",${e.tuitionFee},${e.hostelFee},${e.miscCharges},${e.securityDeposit},${e.totalFirstYear},${e.govtSeats},${e.mgmtSeats},${e.nriSeats}`
      )
      .join('\n');
    const blob = new Blob([header + rows], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fee-seat-matrix.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Summary stats
  const avgTotal =
    filtered.length > 0
      ? Math.round(
          filtered.reduce((sum, e) => sum + e.totalFirstYear, 0) / filtered.length
        )
      : 0;
  const totalGovtSeats = filtered.reduce((s, e) => s + e.govtSeats, 0);
  const totalMgmtSeats = filtered.reduce((s, e) => s + e.mgmtSeats, 0);

  function SortHeader({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) {
    const active = sortBy === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`px-3 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none whitespace-nowrap ${className || ''}`}
      >
        <span className="flex items-center gap-1">
          {children}
          <ArrowUpDown
            className={`w-3 h-3 shrink-0 ${active ? 'text-red-600' : 'text-slate-400'}`}
          />
        </span>
      </th>
    );
  }

  const typeColor = (t: string) =>
    t === 'Government'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
      : t === 'Deemed'
      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400';

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        icon={IndianRupee}
        title="Fee & Seat Matrix"
        description="Compare tuition fees, hostel charges, and seat distribution across medical colleges. Click any row for detailed breakdowns."
      >
        <Button
          variant="outline"
          className={`flex items-center gap-2 ${showFilters ? 'bg-red-50/50 border-red-200 text-red-700' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <Button
          onClick={handleExportCsv}
          className="gradient-primary text-white flex items-center gap-2 shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Entries
          </p>
          <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">
            {filtered.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">matching filters</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Avg. 1st Year
          </p>
          <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">
            {formatINR(avgTotal)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">across results</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Govt Seats
          </p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">
            {totalGovtSeats.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">government quota</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Mgmt Seats
          </p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">
            {totalMgmtSeats.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">management quota</p>
        </Card>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="shadow-sm glass animate-fade-in">
          <CardContent className="pt-6 space-y-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search college, city, course..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage(1)}
                  className="gradient-primary text-white"
                >
                  Apply
                </Button>
                {activeFilterCount > 0 && (
                  <Button variant="outline" onClick={handleReset}>
                    <X className="w-3.5 h-3.5 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <SelectFilter
                label="State"
                value={state}
                onChange={(v) => {
                  setState(v);
                  setPage(1);
                }}
                options={FEE_FILTER_OPTIONS.states}
                allLabel="All States"
              />
              <SelectFilter
                label="College"
                value={college}
                onChange={(v) => {
                  setCollege(v);
                  setPage(1);
                }}
                options={FEE_FILTER_OPTIONS.colleges}
                allLabel="All Colleges"
              />
              <SelectFilter
                label="Course"
                value={course}
                onChange={(v) => {
                  setCourse(v);
                  setPage(1);
                }}
                options={FEE_FILTER_OPTIONS.courses}
                allLabel="All Courses"
              />
              <SelectFilter
                label="Category"
                value={category}
                onChange={(v) => {
                  setCategory(v);
                  setPage(1);
                }}
                options={FEE_FILTER_OPTIONS.categories}
                allLabel="All Categories"
              />
              <SelectFilter
                label="Quota"
                value={quota}
                onChange={(v) => {
                  setQuota(v);
                  setPage(1);
                }}
                options={FEE_FILTER_OPTIONS.quotas}
                allLabel="All Quotas"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No results found"
          description="Adjust your filters or search query to find fee data."
          action={{ label: 'Clear Filters', onClick: handleReset }}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                <tr>
                  <SortHeader field="college">College</SortHeader>
                  <SortHeader field="tuitionFee" className="text-right">
                    Tuition
                  </SortHeader>
                  <SortHeader field="hostelFee" className="text-right">
                    Hostel
                  </SortHeader>
                  <SortHeader field="miscCharges" className="text-right">
                    Misc
                  </SortHeader>
                  <SortHeader field="securityDeposit" className="text-right">
                    Deposit
                  </SortHeader>
                  <SortHeader field="totalFirstYear" className="text-right">
                    Total 1st Yr
                  </SortHeader>
                  <SortHeader field="govtSeats" className="text-center">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Govt
                    </span>
                  </SortHeader>
                  <SortHeader field="mgmtSeats" className="text-center">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> Mgmt
                    </span>
                  </SortHeader>
                  <SortHeader field="nriSeats" className="text-center">
                    NRI
                  </SortHeader>
                  <th className="px-3 py-3.5 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginated.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => navigate(`/fee-matrix/${entry.id}`)}
                    className="hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors cursor-pointer group"
                  >
                    <td className="px-3 py-3.5 font-bold text-slate-800 dark:text-slate-100 min-w-[200px]">
                      <div className="truncate max-w-[220px]">{entry.name}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-normal">
                        <span>
                          {entry.city}, {entry.state}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${typeColor(entry.type)}`}
                        >
                          {entry.type}
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold text-slate-500">
                          {entry.course}
                        </span>
                        <span className="text-slate-400">
                          {entry.category} · {entry.quota}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatINR(entry.tuitionFee)}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatINR(entry.hostelFee)}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-slate-500 whitespace-nowrap">
                      {formatINR(entry.miscCharges)}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-slate-500 whitespace-nowrap">
                      {formatINR(entry.securityDeposit)}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums font-extrabold text-slate-900 dark:text-slate-50 whitespace-nowrap">
                      {formatINR(entry.totalFirstYear)}
                    </td>
                    <td className="px-3 py-3.5 text-center tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      {entry.govtSeats || '-'}
                    </td>
                    <td className="px-3 py-3.5 text-center tabular-nums font-bold text-amber-600 dark:text-amber-400">
                      {entry.mgmtSeats || '-'}
                    </td>
                    <td className="px-3 py-3.5 text-center tabular-nums font-bold text-blue-600 dark:text-blue-400">
                      {entry.nriSeats || '-'}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-600 transition-colors inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        itemCount={paginated.length}
        totalItems={filtered.length}
      />
    </div>
  );
}
