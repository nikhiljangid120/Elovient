import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { CreateBugModal } from '../components/CreateBugModal';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  CircleDot,
  AlertOctagon,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState(null);

  const fetchBugs = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = statusFilter === 'all' ? '/bugs' : `/bugs?status=${statusFilter}`;
      const { data } = await api.get(url);
      setBugs(data.bugs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load issues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBugs();
  }, [statusFilter]);

  const handleBugCreated = (newBug) => {
    setBugs((prev) => [newBug, ...prev]);
  };

  // Filter client-side by search query
  const filteredBugs = bugs.filter((bug) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return bug.title.toLowerCase().includes(q) || bug.description.toLowerCase().includes(q);
  });

  // Calculate metrics
  const totalCount = bugs.length;
  const openCount = bugs.filter((b) => b.status === 'open').length;
  const inProgressCount = bugs.filter((b) => b.status === 'in-progress').length;
  const closedCount = bugs.filter((b) => b.status === 'closed').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Welcome & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Bug Tracker Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your issues, track resolution lifecycle, and inspect AWS S3 attachments
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition self-start md:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Report New Bug</span>
        </button>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Tracked</span>
            <AlertOctagon className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalCount}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Open</span>
            <CircleDot className="w-4 h-4" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-blue-600">{openCount}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">In Progress</span>
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">{inProgressCount}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Resolved</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{closedCount}</span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Issues' },
            { id: 'open', label: 'Open' },
            { id: 'in-progress', label: 'In Progress' },
            { id: 'closed', label: 'Closed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by title or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Bug List Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse flex items-center justify-between">
              <div className="space-y-2.5 w-2/3">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-5 bg-slate-200 rounded w-3/4"></div>
              </div>
              <div className="h-8 bg-slate-200 rounded-lg w-20"></div>
            </div>
          ))}
        </div>
      ) : filteredBugs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Bugs Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
            {searchQuery
              ? 'No issues matched your search query. Try searching for something else.'
              : 'You have not reported any bugs under this filter yet.'}
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Report New Bug
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBugs.map((bug) => (
            <div
              key={bug._id || bug.id}
              onClick={() => navigate(`/bugs/${bug._id || bug.id}`)}
              className="group bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={bug.status} />
                  <SeverityBadge severity={bug.severity} />
                  {bug.imageKey && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      <ImageIcon className="w-3 h-3 text-slate-400" />
                      S3 Image Attached
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                  {bug.title}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-1">
                  {bug.description}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(bug.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 flex items-center justify-center transition">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Bug Modal */}
      <CreateBugModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onBugCreated={handleBugCreated}
      />
    </div>
  );
};
