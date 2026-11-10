import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bug, LogOut, FileCode2, User, ShieldCheck } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                Bug Tracker <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">Lite</span>
              </span>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Secure AWS S3 Presigned Issue Platform
              </p>
            </div>
          </div>

          {/* User actions */}
          <div className="flex items-center gap-4">
            <a
              href="http://localhost:5000/api-docs"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              title="View Swagger API Documentation"
            >
              <FileCode2 className="w-4 h-4" />
              API Docs
            </a>

            {user && (
              <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-slate-800 leading-tight">{user.name}</p>
                    <p className="text-[11px] text-slate-500 leading-tight">{user.email}</p>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
