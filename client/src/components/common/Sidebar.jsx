import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Layers,
  Truck,
  ClipboardList,
  Factory,
  Trash2,
  TrendingUp,
  BrainCircuit,
  Bell,
  FileBarChart2,
  Users,
  LogOut,
  Sparkles,
} from 'lucide-react';

/**
 * Role-based navigation map.
 * Each entry defines which roles can see it.
 *   - undefined / empty means "all authenticated users"
 */
const ALL_NAV = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'production_manager', 'inventory_manager'],
  },
  {
    name: 'Products',
    href: '/products',
    icon: Package,
    roles: ['admin', 'production_manager'],
  },
  {
    name: 'Raw Materials',
    href: '/raw-materials',
    icon: Layers,
    roles: ['admin', 'inventory_manager'],
  },
  {
    name: 'Inventory & FIFO',
    href: '/inventory',
    icon: ClipboardList,
    roles: ['admin', 'inventory_manager'],
  },
  {
    name: 'Suppliers',
    href: '/suppliers',
    icon: Truck,
    roles: ['admin', 'inventory_manager'],
  },
  {
    name: 'Production',
    href: '/production',
    icon: Factory,
    roles: ['admin', 'production_manager'],
  },
  {
    name: 'Waste Tracking',
    href: '/waste',
    icon: Trash2,
    roles: ['admin', 'production_manager'],
  },
  {
    name: 'Demand Forecast',
    href: '/forecast',
    icon: TrendingUp,
    roles: ['admin', 'production_manager'],
  },
  {
    name: 'AI Insights',
    href: '/ai-insights',
    icon: BrainCircuit,
    badge: 'AI',
    roles: ['admin', 'production_manager'],
  },
  {
    name: 'Alerts',
    href: '/alerts',
    icon: Bell,
    roles: ['admin', 'production_manager', 'inventory_manager'],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileBarChart2,
    roles: ['admin', 'production_manager', 'inventory_manager'],
  },
  {
    name: 'User Management',
    href: '/users',
    icon: Users,
    roles: ['admin'],
  },
];

/** Role display labels */
const ROLE_LABELS = {
  admin: 'System Admin',
  production_manager: 'Production Manager',
  inventory_manager: 'Inventory Manager',
};

/** Role accent colours (Tailwind classes used inside the sidebar) */
const ROLE_COLORS = {
  admin: 'text-brand-400',
  production_manager: 'text-emerald-400',
  inventory_manager: 'text-sky-400',
};

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const role = user?.role;

  // Filter nav items relevant to this user's role
  const navigation = ALL_NAV.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  const roleLabel = ROLE_LABELS[role] || role;
  const roleColor = ROLE_COLORS[role] || 'text-brand-400';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-slate-900 text-slate-200 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 text-white shadow-lg shadow-brand-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight leading-none">
              FoodFlow <span className="text-brand-400">AI</span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Production & Waste</p>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 mx-3 my-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
          <p className={`text-[11px] font-medium truncate ${roleColor}`}>{roleLabel}</p>
          <p className="text-[10px] text-slate-400 truncate">{user?.department || 'Operations'}</p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
