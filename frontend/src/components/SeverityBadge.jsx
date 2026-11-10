import React from 'react';
import { AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

export const SeverityBadge = ({ severity }) => {
  switch (severity) {
    case 'high':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          High Severity
        </span>
      );
    case 'med':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
          Medium
        </span>
      );
    case 'low':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
          Low
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
          {severity}
        </span>
      );
  }
};
