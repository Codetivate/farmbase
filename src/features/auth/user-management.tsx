'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Shield,
  Pencil as Edit3,
  Trash2,
  Plus,
  RefreshCw,
  Loader as Loader2,
  CircleCheck as CheckCircle,
  TriangleAlert as AlertTriangle,
  Crown,
  Eye,
  UserCog,
  Search,
  X,
} from 'lucide-react';
import { supabase } from '@/core/database/client';
import { useAuth, type UserProfile } from '@/lib/auth-context';

const roleConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Shield }> = {
  admin: { label: 'Admin', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', icon: Crown },
  editor: { label: 'Editor', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Edit3 },
  viewer: { label: 'Viewer', color: 'text-muted-foreground', bg: 'bg-secondary border-border', icon: Eye },
};

function UserRow({
  user,
  currentUserId,
  onEdit,
  onDelete,
}: {
  user: UserProfile;
  currentUserId: string;
  onEdit: (user: UserProfile) => void;
  onDelete: (user: UserProfile) => void;
}) {
  const role = roleConfig[user.role] || roleConfig.viewer;
  const RoleIcon = role.icon;
  const isSelf = user.id === currentUserId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors"
    >
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
        {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {user.full_name || 'No name set'}
          </p>
          {isSelf && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-medium">
              You
            </span>
          )}
          {!user.is_active && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
              Disabled
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>

      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium shrink-0 ${role.bg} ${role.color}`}>
        <RoleIcon size={10} />
        <span>{role.label}</span>
      </div>

      <div className="text-[9px] text-muted-foreground/50 shrink-0 w-20 text-right">
        {user.last_login_at
          ? new Date(user.last_login_at).toLocaleDateString()
          : 'Never'}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(user)}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <Edit3 size={12} />
        </button>
        {!isSelf && (
          <button
            onClick={() => onDelete(user)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSave,
}: {
  user: UserProfile;
  onClose: () => void;
  onSave: () => void;
}) {
  const [fullName, setFullName] = useState(user.full_name);
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.is_active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');

    const { error: err } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName,
        role,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-x-4 top-[15%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-50 rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCog size={16} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-foreground">Edit User</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
            <p className="text-sm text-foreground/80 font-mono">{user.email}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm text-foreground focus:outline-none focus:border-cyan-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
            <div className="flex gap-2">
              {(['admin', 'editor', 'viewer'] as const).map((r) => {
                const cfg = roleConfig[r];
                const Icon = cfg.icon;
                return (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all border ${
                      role === r ? cfg.bg + ' ' + cfg.color : 'bg-secondary/40 border-border text-muted-foreground'
                    }`}
                  >
                    <Icon size={12} />
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border">
            <div>
              <p className="text-xs font-medium text-foreground/80">Account Active</p>
              <p className="text-[10px] text-muted-foreground">Disabled users cannot access the platform</p>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                isActive ? 'bg-emerald-500' : 'bg-border'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  isActive ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              <AlertTriangle size={12} />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-500/15"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </>
  );
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleCreate = async () => {
    if (!email || !password) return;
    setCreating(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in.');
        setCreating(false);
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-users`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create',
            email,
            password,
            full_name: fullName,
            role,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok || result.error) {
        setError(result.error || 'Failed to create user');
        setCreating(false);
        return;
      }

      setCreating(false);
      setSuccess(true);
      setTimeout(() => {
        onCreated();
        onClose();
      }, 1200);
    } catch (err) {
      setError((err as Error).message || 'Failed to create user');
      setCreating(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-x-4 top-[12%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-50 rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">Create User</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full px-3 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              className="w-full px-3 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Password</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full px-3 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500/40 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
            <div className="flex gap-2">
              {(['admin', 'editor', 'viewer'] as const).map((r) => {
                const cfg = roleConfig[r];
                const Icon = cfg.icon;
                return (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all border ${
                      role === r ? cfg.bg + ' ' + cfg.color : 'bg-secondary/40 border-border text-muted-foreground'
                    }`}
                  >
                    <Icon size={12} />
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              <AlertTriangle size={12} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
              <CheckCircle size={12} />
              <span>User created successfully.</span>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={creating || !email || !password || success}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-500/15"
          >
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </motion.div>
    </>
  );
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setUsers(data as UserProfile[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = search
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.full_name.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    editors: users.filter((u) => u.role === 'editor').length,
    viewers: users.filter((u) => u.role === 'viewer').length,
    disabled: users.filter((u) => !u.is_active).length,
  };

  const handleDelete = async (u: UserProfile) => {
    setDeleting(true);
    await supabase
      .from('user_profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', u.id);
    await fetchUsers();
    setDeleting(false);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        <div className="p-2.5 rounded-xl bg-card/50 border border-border text-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-lg font-bold font-mono text-foreground">{stats.total}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-card/50 border border-border text-center">
          <p className="text-[9px] text-cyan-500 uppercase tracking-wider">Admins</p>
          <p className="text-lg font-bold font-mono text-cyan-400">{stats.admins}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-card/50 border border-border text-center">
          <p className="text-[9px] text-amber-500 uppercase tracking-wider">Editors</p>
          <p className="text-lg font-bold font-mono text-amber-400">{stats.editors}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-card/50 border border-border text-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Viewers</p>
          <p className="text-lg font-bold font-mono text-foreground/80">{stats.viewers}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-card/50 border border-border text-center">
          <p className="text-[9px] text-red-500 uppercase tracking-wider">Disabled</p>
          <p className="text-lg font-bold font-mono text-red-400">{stats.disabled}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-card/40 border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500/40"
          />
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="p-2 rounded-lg bg-secondary/60 border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/15 transition-all active:scale-[0.98]"
        >
          <Plus size={14} />
          <span>Add User</span>
        </button>
      </div>

      <div className="space-y-2 max-h-[calc(100vh-420px)] overflow-y-auto pr-0.5">
        {filtered.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            currentUserId={currentUser?.id || ''}
            onEdit={setEditUser}
            onDelete={setDeleteConfirm}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Users size={28} className="text-border mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No users found</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editUser && (
          <EditUserModal
            user={editUser}
            onClose={() => setEditUser(null)}
            onSave={fetchUsers}
          />
        )}
        {createOpen && (
          <CreateUserModal
            onClose={() => setCreateOpen(false)}
            onCreated={fetchUsers}
          />
        )}
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-[25%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-sm z-50 rounded-2xl border border-border bg-card shadow-2xl p-6"
            >
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                  <Trash2 size={20} className="text-red-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Disable User</h3>
                <p className="text-xs text-muted-foreground">
                  This will disable <span className="text-foreground font-medium">{deleteConfirm.email}</span>.
                  They will no longer be able to access the platform.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium bg-secondary border border-border text-foreground/80 hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    disabled={deleting}
                    className="flex-1 py-2 rounded-xl text-xs font-medium bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-40"
                  >
                    {deleting ? 'Disabling...' : 'Disable User'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
