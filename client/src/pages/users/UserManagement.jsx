/**
 * UserManagement.jsx
 * ──────────────────
 * Admin-only page to view and manage users.
 * Allows changing user roles and activating/deactivating accounts.
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, UserX, Loader, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getUsers, updateUserStatus, updateUserRole } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await getUsers();
      setUsers(data.users || []);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    if (userId === currentUser._id) {
      return toast.error("You cannot change your own role.");
    }
    
    setProcessingId(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
      toast.success('Role updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update role');
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    if (userId === currentUser._id) {
      return toast.error("You cannot deactivate your own account.");
    }

    setProcessingId(userId);
    try {
      await updateUserStatus(userId, !currentStatus);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isActive: !currentStatus } : u))
      );
      toast.success(currentStatus ? 'User deactivated' : 'User activated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="text-brand-400" size={26} />
          User Management
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage system access, roles, and account statuses.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader size={24} className="animate-spin text-brand-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center p-12 text-slate-500">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Joined Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isSelf = user._id === currentUser?._id;
                  const isProcessing = processingId === user._id;

                  return (
                    <tr key={user._id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800 flex items-center gap-2">
                          {user.name}
                          {isSelf && (
                            <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-bold">
                              YOU
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </td>
                      
                      <td className="px-6 py-4">
                        {isSelf ? (
                          <span className="inline-block px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 text-xs font-medium cursor-not-allowed">
                            {user.role}
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            disabled={isProcessing}
                            onChange={(e) => handleRoleChange(user._id, e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition disabled:opacity-50"
                          >
                            <option value="staff">Staff</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {user.isActive ? <UserCheck size={14} /> : <UserX size={14} />}
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleStatusToggle(user._id, user.isActive)}
                          disabled={isSelf || isProcessing}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition border ${
                            isSelf
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : user.isActive
                              ? 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                              : 'bg-white border-green-200 text-green-600 hover:bg-green-50'
                          } disabled:opacity-50`}
                        >
                          {isProcessing ? 'Updating...' : user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security Note */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-3 text-slate-300 text-sm">
        <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
        <div>
          <strong className="text-slate-100 block mb-1">Access Control Security</strong>
          <p>
            You cannot change your own role or deactivate your own account to prevent accidental lockouts.
            Inactive users will immediately lose the ability to log in. Role changes take effect immediately on their next API request.
          </p>
        </div>
      </div>
    </div>
  );
}
