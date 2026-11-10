import React, { useState } from 'react';
import api from '../services/api';
import { uploadImageToS3, validateImageFile } from '../services/s3Service';
import { X, UploadCloud, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

export const CreateBugModal = ({ isOpen, onClose, onBugCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('med');
  const [status, setStatus] = useState('open');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;

    const validationErr = validateImageFile(file);
    if (validationErr) {
      setError(validationErr);
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeFile = () => {
    setImageFile(null);
    setImagePreview(null);
    setUploadProgress(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Please provide both title and description.');
      return;
    }

    setIsSubmitting(true);
    let uploadedImageKey = null;

    try {
      // 1. Upload to S3 if an image was selected
      if (imageFile) {
        const uploadResult = await uploadImageToS3(imageFile, (progress) => {
          setUploadProgress(progress);
        });
        uploadedImageKey = uploadResult.imageKey;
      }

      // 2. Create Bug record in Backend
      const { data } = await api.post('/bugs', {
        title,
        description,
        severity,
        status,
        imageKey: uploadedImageKey,
      });

      // 3. Reset and notify parent
      setTitle('');
      setDescription('');
      setSeverity('med');
      setStatus('open');
      setImageFile(null);
      setImagePreview(null);
      setUploadProgress(0);

      onBugCreated(data.bug);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create bug report.';
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
            <h2 className="text-xl font-bold text-slate-900">Create New Bug Report</h2>
            <p className="text-xs text-slate-500">Add an issue and attach screenshots directly to AWS S3</p>
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
              Bug Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Broken CSS on Mobile Navigation"
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
                Initial Status
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
              Description & Steps to Reproduce *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe what occurred, steps to trigger the bug, and expected vs actual behavior..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* S3 Image Upload Section */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Attach Screenshot (AWS S3 Direct Pre-Signed Upload)
            </label>

            {!imagePreview ? (
              <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition">
                <UploadCloud className="w-8 h-8 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-700">Click to browse or drag and drop</span>
                <span className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, or WebP (Max 5MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative border border-slate-200 rounded-xl p-3 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-xs"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 truncate max-w-xs">{imageFile?.name}</p>
                    <p className="text-[11px] text-slate-500">{(imageFile?.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  disabled={isSubmitting}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* S3 Upload Progress Bar */}
            {isSubmitting && imageFile && (
              <div className="mt-2">
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Uploading directly to S3...</span>
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
              className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Bug...</span>
                </>
              ) : (
                <span>Submit Bug</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
