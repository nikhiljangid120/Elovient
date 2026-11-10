import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { uploadImageToS3, validateImageFile } from '../services/s3Service';
import { X, UploadCloud, AlertCircle, RefreshCw } from 'lucide-react';

export const EditBugModal = ({ isOpen, onClose, bug, onBugUpdated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('med');
  const [status, setStatus] = useState('open');
  const [newImageFile, setNewImageFile] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (bug) {
      setTitle(bug.title || '');
      setDescription(bug.description || '');
      setSeverity(bug.severity || 'med');
      setStatus(bug.status || 'open');
      setNewImageFile(null);
      setNewImagePreview(null);
      setError(null);
    }
  }, [bug]);

  if (!isOpen || !bug) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;

    const validationErr = validateImageFile(file);
    if (validationErr) {
      setError(validationErr);
      setNewImageFile(null);
      setNewImagePreview(null);
      return;
    }

    setNewImageFile(file);
    setNewImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Title and description cannot be empty.');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageKey = bug.imageKey;

      // If user provided a new screenshot, upload it directly to S3
      if (newImageFile) {
        const uploadResult = await uploadImageToS3(newImageFile, (progress) => {
          setUploadProgress(progress);
        });
        imageKey = uploadResult.imageKey;
      }

      const { data } = await api.put(`/bugs/${bug.id || bug._id}`, {
        title,
        description,
        severity,
        status,
        imageKey,
      });

      onBugUpdated(data.bug);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update bug.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Bug Report</h2>
            <p className="text-xs text-slate-500">Update issue details or replace S3 attachment</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Bug Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              >
                <option value="low">Low</option>
                <option value="med">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Screenshot Replacement */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Screenshot Attachment
            </label>
            
            {bug.imageUrl && !newImagePreview && (
              <div className="mb-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <img
                  src={bug.imageUrl}
                  alt="Current"
                  className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                />
                <div className="text-xs">
                  <p className="font-semibold text-slate-700">Current attached screenshot</p>
                  <p className="text-[11px] text-slate-400 truncate max-w-xs">{bug.imageKey}</p>
                </div>
              </div>
            )}

            {!newImagePreview ? (
              <label className="border border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition text-xs font-semibold text-slate-700">
                <RefreshCw className="w-4 h-4 text-slate-400" />
                <span>Upload replacement screenshot</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="border border-slate-200 rounded-xl p-3 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <img
                    src={newImagePreview}
                    alt="Replacement Preview"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800">New Image Selected</span>
                    <p className="text-[11px] text-slate-500">{newImageFile?.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setNewImageFile(null); setNewImagePreview(null); }}
                  className="p-1 rounded text-slate-400 hover:text-rose-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {isSubmitting && newImageFile && (
              <div className="mt-2">
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Uploading replacement to S3...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
