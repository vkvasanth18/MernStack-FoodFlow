import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, UserX, Loader, AlertCircle, ArrowRightLeft, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getUsers, updateUserStatus, updateUserRole, transferAdminRole } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';

export default function UserManagement() {
  const { user: currentUser, updateUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // Transfer Admin Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetEmail, setTransferTargetEmail] = useState('');
  const [demotionRole, setDemotionRole] = useState('production_manager');
  const [transferring, setTransferring] = useState(false);

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
    if (userId === currentUser?._id) {
      return toast.error("You cannot change your own role. Use 'Transfer Ownership' instead.");
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
    if (userId === currentUser?._id) {
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

  const handleTransferAdmin = async (e) => {
    e.preventDefault();
    if (!transferTargetEmail) {
      return toast.error('Please select the target user to receive Administrator rights.');
    }

    setTransferring(true);
    try {
      const { data } = await transferAdminRole(transferTargetEmail, demotionRole);
      toast.success(data.message || 'Administrator role transferred successfully!');
      
      // Update local context user role
      if (data.previousAdmin && currentUser?._id === data.previousAdmin.id) {
        updateUser({ ...currentUser, role: data.previousAdmin.role });
      }

      setIsTransferModalOpen(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Admin transfer failed.');
    } finally {
      setTransferring(false);
    }
  };

  const roleLabels = {
    admin: 'System Administrator',
    production_manager: 'Production Manager',
    inventory_manager: 'Inventory Manager',
  };

  const eligibleTransferCandidates = users.filter(
    (u) => u._id !== currentUser?._id && u.isActive && u.role !== 'admin'
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-brand-400" size={26} />
            User Management & Access Control
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage staff credentials, assigned roles, and administrator ownership ({users.length} accounts).
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => {
              if (eligibleTransferCandidates.length > 0) {
                setTransferTargetEmail(eligibleTransferCandidates[0].email);
              }
              setIsTransferModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold shadow-sm transition self-start sm:self-auto cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
            <span>Transfer Admin Ownership</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader size={24} className="animate-spin text-brand-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center p-12 text-slate-500">
            No users found in database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Joined</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u._id === currentUser?._id;
                  const isProcessing = processingId === u._id;

                  return (
                    <tr key={u._id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 flex items-center gap-2">
                          {u.name}
                          {isSelf && (
                            <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-brand-200">
                              YOU
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      
                      <td className="px-6 py-4">
                        {isSelf ? (
                          <span className={`inline-block px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                            u.role === 'admin'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {roleLabels[u.role] || u.role}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={isProcessing || currentUser?.role !== 'admin'}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition disabled:opacity-50"
                          >
                            <option value="production_manager">Production Manager</option>
                            <option value="inventory_manager">Inventory Manager</option>
                            <option value="admin">System Administrator</option>
                          </select>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                        {u.department || 'Operations'}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {u.isActive ? <UserCheck size={14} /> : <UserX size={14} />}
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleStatusToggle(u._id, u.isActive)}
                          disabled={isSelf || isProcessing || currentUser?.role !== 'admin'}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border cursor-pointer ${
                            isSelf
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : u.isActive
                              ? 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50'
                              : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          } disabled:opacity-50`}
                        >
                          {isProcessing ? 'Updating...' : u.isActive ? 'Deactivate' : 'Activate'}
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

      {/* Admin Transfer Confirmation Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Transfer Administrator Role</h3>
                  <p className="text-xs text-slate-500">Atomic ownership handover</p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferAdmin} className="space-y-4 pt-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <strong className="block font-semibold mb-1">Important Safeguard:</strong>
                Transferring ownership promotes the selected candidate to <strong>System Administrator</strong> and immediately demotes your current account. You will relinquish admin privileges upon confirmation.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select New Administrator
                </label>
                {eligibleTransferCandidates.length === 0 ? (
                  <p className="text-xs text-rose-600 italic">
                    No eligible active staff members available for promotion.
                  </p>
                ) : (
                  <select
                    value={transferTargetEmail}
                    onChange={(e) => setTransferTargetEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    {eligibleTransferCandidates.map((c) => (
                      <option key={c._id} value={c.email}>
                        {c.name} ({c.email}) — Current Role: {roleLabels[c.role] || c.role}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Your New Role After Handover
                </label>
                <select
                  value={demotionRole}
                  onChange={(e) => setDemotionRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="production_manager">Production Manager</option>
                  <option value="inventory_manager">Inventory Manager</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring || eligibleTransferCandidates.length === 0}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {transferring ? 'Executing Transfer...' : 'Confirm & Transfer Ownership'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Note */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-3 text-slate-300 text-sm">
        <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
        <div>
          <strong className="text-slate-100 block mb-1">Role-Based Access Governance</strong>
          <p className="text-xs text-slate-300 leading-relaxed">
            Roles strictly dictate authorization across all endpoints: System Administrators hold full administrative and user controls, Production Managers supervise recipes, batch schedules, and yield logs, and Inventory Managers control materials, ledger movements, and suppliers.
          </p>
        </div>
      </div>
    </div>
  );
}
