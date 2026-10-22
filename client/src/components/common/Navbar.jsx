/**
 * Navbar.jsx
 * ──────────
 * Top navigation bar with:
 *  - Mobile sidebar toggle
 *  - "System Live" badge
 *  - Live alert bell with unread count badge (fetched every 60s)
 *  - User avatar + name + role
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, Bell } from 'lucide-react';
import { getAlertSummary } from '../../services/alertService';

const Navbar = ({ setIsOpen }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll for unread alert count every 60 seconds
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await getAlertSummary();
        setUnreadCount(res.data?.totalUnread || 0);
      } catch {
        // silently fail — user may not be logged in yet
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200">
      <div className="flex items-center gap-3">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="p-2 text-slate-600 rounded-lg hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* System live badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Live
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Alert Bell with live unread count */}
        <Link
          to="/alerts"
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          title="Alert Center"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User avatar + name */}
        <Link
          to="/profile"
          className="flex items-center gap-2.5 pl-3 border-l border-slate-200 hover:opacity-85 transition"
        >
          <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
            {user?.name ? user.name.slice(0, 2) : 'US'}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-xs font-semibold text-slate-800">{user?.name || 'User'}</p>
            <p className="text-[10px] text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
