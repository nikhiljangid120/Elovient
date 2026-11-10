import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { EditBugModal } from '../components/EditBugModal';
import { DeleteModal } from '../components/DeleteModal';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit3,
  Trash2,
  ExternalLink,
  AlertCircle,
  FileImage,
  ShieldCheck,
  ZoomIn
} from 'lucide-react';

export const BugDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [bug, setBug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const fetchBugDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/bugs/${id}`);
      setBug(data.bug);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load bug details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBugDetails();
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/bugs/${id}`);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete bug.');
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const handleBugUpdated = (updatedBug) => {
    setBug(updatedBug);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 bg-slate-200 rounded-lg"></div>
          <div className="h-10 w-3/4 bg-slate-200 rounded-lg"></div>
          <div className="h-40 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !bug) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Bug</h2>
        <p className="text-slate-600 mb-6">{error || 'Bug not found or you lack permission to view it.'}</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top back bar & Action buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Issues
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition"
          >
            <Edit3 className="w-4 h-4 text-slate-500" />
            Edit Bug
          </button>
          <button
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition"
          >
            <Trash2 className="w-4 h-4" />
            Delete Bug
          </button>
        </div>
      </div>

      {/* Main Bug Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header bar */}
        <div className="p-6 sm:p-8 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <StatusBadge status={bug.status} />
            <SeverityBadge severity={bug.severity} />
            <span className="text-xs text-slate-400 font-mono">ID: {bug._id || bug.id}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {bug.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              Created {new Date(bug.createdAt).toLocaleDateString()} at{' '}
              {new Date(bug.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {bug.updatedAt && bug.updatedAt !== bug.createdAt && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                Updated {new Date(bug.updatedAt).toLocaleDateString()}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Ownership Verified (Protected by Server-Side JWT Check)
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Description & Reproduction
            </h3>
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed font-normal">
              {bug.description}
            </div>
          </div>

          {/* Screenshot / S3 Pre-signed Image Display */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileImage className="w-4 h-4" />
                AWS S3 Image Attachment (Short-Lived Pre-Signed GET URL)
              </h3>
              {bug.imageUrl && (
                <a
                  href={bug.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  Open Original <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {bug.imageUrl ? (
              <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 max-w-2xl">
                <img
                  src={bug.imageUrl}
                  alt="Bug attachment"
                  className="w-full max-h-[450px] object-contain rounded-2xl cursor-pointer hover:opacity-95 transition"
                  onClick={() => setIsImageZoomed(true)}
                />
                <button
                  onClick={() => setIsImageZoomed(true)}
                  className="absolute bottom-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white p-2.5 rounded-xl shadow-lg backdrop-blur-xs transition flex items-center gap-1.5 text-xs font-semibold"
                >
                  <ZoomIn className="w-4 h-4" />
                  Click to Zoom
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center bg-slate-50">
                <p className="text-sm text-slate-400">No screenshot was attached to this bug report.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Image Zoom Modal */}
      {isImageZoomed && bug.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsImageZoomed(false)}
        >
          <img
            src={bug.imageUrl}
            alt="Zoomed"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

      {/* Edit Modal */}
      <EditBugModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        bug={bug}
        onBugUpdated={handleBugUpdated}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        title={bug.title}
      />
    </div>
  );
};
