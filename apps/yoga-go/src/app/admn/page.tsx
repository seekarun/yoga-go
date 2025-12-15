'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminStatsCard from '@/components/AdminStatsCard';
import AdminTabs from '@/components/AdminTabs';
import UserTable from '@/components/UserTable';
import ExpertTable from '@/components/ExpertTable';
import NotificationOverlay from '@/components/NotificationOverlay';
import type { AdminStats, UserListItem, ExpertListItem } from '@/types';

type AdminAction =
  | { type: 'deleteUser'; userId: string }
  | { type: 'suspendUser'; userId: string; suspend: boolean }
  | { type: 'deleteExpert'; expertId: string }
  | { type: 'suspendExpert'; expertId: string; suspend: boolean }
  | null;

export default function AdminDashboard() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('learners');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [experts, setExperts] = useState<ExpertListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersPage, setUsersPage] = useState(1);
  const [expertsPage, setExpertsPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalExperts, setTotalExperts] = useState(0);

  // Confirmation and notification state
  const [pendingAction, setPendingAction] = useState<AdminAction>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && user && !isAdmin) {
      console.log('[DBG][admn] User is not admin, redirecting');
      router.push('/app');
    }
  }, [user, authLoading, isAdmin, router]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/data/admn/stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('[DBG][admn] Error fetching stats:', error);
      }
    };

    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/data/admn/users?page=${usersPage}&limit=20`);
        const data = await response.json();
        if (data.success) {
          setUsers(data.data);
          setTotalUsers(data.pagination.total);
        }
      } catch (error) {
        console.error('[DBG][admn] Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin && activeTab === 'learners') {
      fetchUsers();
    }
  }, [isAdmin, activeTab, usersPage]);

  // Fetch experts
  useEffect(() => {
    const fetchExperts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/data/admn/experts?page=${expertsPage}&limit=20`);
        const data = await response.json();
        if (data.success) {
          setExperts(data.data);
          setTotalExperts(data.pagination.total);
        }
      } catch (error) {
        console.error('[DBG][admn] Error fetching experts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin && activeTab === 'experts') {
      fetchExperts();
    }
  }, [isAdmin, activeTab, expertsPage]);

  const handleEditUser = (userId: string) => {
    router.push(`/admn/users/${userId}`);
  };

  const handleDeleteUser = (userId: string) => {
    setPendingAction({ type: 'deleteUser', userId });
  };

  const handleDeleteUserConfirm = async () => {
    if (!pendingAction || pendingAction.type !== 'deleteUser') return;
    const { userId } = pendingAction;

    try {
      const response = await fetch(`/data/admn/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setNotification({ message: 'User deleted successfully', type: 'success' });
        setUsersPage(1);
      } else {
        setNotification({ message: `Error: ${data.error}`, type: 'error' });
      }
    } catch (error) {
      console.error('[DBG][admn] Error deleting user:', error);
      setNotification({ message: 'Error deleting user', type: 'error' });
    }
  };

  const handleSuspendUser = (userId: string, suspend: boolean) => {
    setPendingAction({ type: 'suspendUser', userId, suspend });
  };

  const handleSuspendUserConfirm = async () => {
    if (!pendingAction || pendingAction.type !== 'suspendUser') return;
    const { userId, suspend } = pendingAction;
    const action = suspend ? 'suspend' : 'activate';

    try {
      const response = await fetch(`/data/admn/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: suspend ? 'cancelled' : 'active',
        }),
      });
      const data = await response.json();
      if (data.success) {
        setNotification({ message: `User ${action}d successfully`, type: 'success' });
        setUsersPage(1);
      } else {
        setNotification({ message: `Error: ${data.error}`, type: 'error' });
      }
    } catch (error) {
      console.error(`[DBG][admn] Error ${action}ing user:`, error);
      setNotification({ message: `Error ${action}ing user`, type: 'error' });
    }
  };

  const handleEditExpert = (expertId: string) => {
    router.push(`/admn/experts/${expertId}`);
  };

  const handleDeleteExpert = (expertId: string) => {
    setPendingAction({ type: 'deleteExpert', expertId });
  };

  const handleDeleteExpertConfirm = async () => {
    if (!pendingAction || pendingAction.type !== 'deleteExpert') return;
    const { expertId } = pendingAction;

    try {
      const response = await fetch(`/data/admn/experts/${expertId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setNotification({ message: 'Expert deleted successfully', type: 'success' });
        setExpertsPage(1);
      } else {
        setNotification({ message: `Error: ${data.error}`, type: 'error' });
      }
    } catch (error) {
      console.error('[DBG][admn] Error deleting expert:', error);
      setNotification({ message: 'Error deleting expert', type: 'error' });
    }
  };

  const handleSuspendExpert = (expertId: string, suspend: boolean) => {
    setPendingAction({ type: 'suspendExpert', expertId, suspend });
  };

  const handleSuspendExpertConfirm = async () => {
    if (!pendingAction || pendingAction.type !== 'suspendExpert') return;
    const { expertId, suspend } = pendingAction;
    const action = suspend ? 'suspend' : 'activate';

    try {
      const response = await fetch(`/data/admn/experts/${expertId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: suspend ? 'cancelled' : 'active',
        }),
      });
      const data = await response.json();
      if (data.success) {
        setNotification({ message: `Expert ${action}d successfully`, type: 'success' });
        setExpertsPage(1);
      } else {
        setNotification({ message: `Error: ${data.error}`, type: 'error' });
      }
    } catch (error) {
      console.error(`[DBG][admn] Error ${action}ing expert:`, error);
      setNotification({ message: `Error ${action}ing expert`, type: 'error' });
    }
  };

  const handleToggleFeatured = async (expertId: string, featured: boolean) => {
    try {
      const response = await fetch(`/data/admn/experts/${expertId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featured,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setNotification({
          message: `Expert ${featured ? 'featured' : 'unfeatured'} successfully`,
          type: 'success',
        });
        setExpertsPage(1);
      } else {
        setNotification({ message: `Error: ${data.error}`, type: 'error' });
      }
    } catch (error) {
      console.error('[DBG][admn] Error toggling featured:', error);
      setNotification({ message: 'Error updating featured status', type: 'error' });
    }
  };

  const handleConfirmAction = () => {
    switch (pendingAction?.type) {
      case 'deleteUser':
        handleDeleteUserConfirm();
        break;
      case 'suspendUser':
        handleSuspendUserConfirm();
        break;
      case 'deleteExpert':
        handleDeleteExpertConfirm();
        break;
      case 'suspendExpert':
        handleSuspendExpertConfirm();
        break;
    }
  };

  const getConfirmMessage = (): string => {
    switch (pendingAction?.type) {
      case 'deleteUser':
        return 'Are you sure you want to delete this user? This action cannot be undone.';
      case 'suspendUser':
        return `Are you sure you want to ${pendingAction.suspend ? 'suspend' : 'activate'} this user?`;
      case 'deleteExpert':
        return 'Are you sure you want to delete this expert? This action cannot be undone.';
      case 'suspendExpert':
        return `Are you sure you want to ${pendingAction.suspend ? 'suspend' : 'activate'} this expert?`;
      default:
        return '';
    }
  };

  const getConfirmType = (): 'info' | 'warning' | 'error' => {
    switch (pendingAction?.type) {
      case 'deleteUser':
      case 'deleteExpert':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getConfirmText = (): string => {
    switch (pendingAction?.type) {
      case 'deleteUser':
      case 'deleteExpert':
        return 'Delete';
      case 'suspendUser':
        return pendingAction.suspend ? 'Suspend' : 'Activate';
      case 'suspendExpert':
        return pendingAction.suspend ? 'Suspend' : 'Activate';
      default:
        return 'Confirm';
    }
  };

  if (authLoading || !user) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Access denied. Admin only.</div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f7fafc' }}>
      {/* Header */}
      <section
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
          color: '#fff',
          padding: '40px 20px',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '600', marginBottom: '8px' }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: '16px', opacity: 0.9 }}>
            Manage users, experts, and platform settings
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '40px 20px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2
            style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px', color: '#2d3748' }}
          >
            Platform Overview
          </h2>
          {stats ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '24px',
              }}
            >
              <AdminStatsCard
                title="Total Users"
                value={stats.totalUsers}
                icon="👥"
                description="All registered users"
              />
              <AdminStatsCard
                title="Total Learners"
                value={stats.totalLearners}
                icon="🎓"
                description="Active learners"
              />
              <AdminStatsCard
                title="Total Experts"
                value={stats.totalExperts}
                icon="🧘"
                description="Registered experts"
              />
              <AdminStatsCard
                title="Active Users"
                value={stats.activeUsers}
                icon="✅"
                description="Active in last 30 days"
              />
              <AdminStatsCard
                title="Total Courses"
                value={stats.totalCourses}
                icon="📚"
                description="Published courses"
              />
              <AdminStatsCard
                title="Enrollments"
                value={stats.totalEnrollments}
                icon="📝"
                description="Total course enrollments"
              />
              <AdminStatsCard
                title="Revenue"
                value={`₹${stats.totalRevenue.toLocaleString()}`}
                icon="💰"
                description="Total revenue"
              />
              <AdminStatsCard
                title="Recent Signups"
                value={stats.recentSignups}
                icon="🆕"
                description="New users (last 7 days)"
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '16px', color: '#666' }}>Loading stats...</div>
            </div>
          )}
        </div>
      </section>

      {/* Users & Experts Section */}
      <section style={{ padding: '40px 20px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <AdminTabs
            tabs={[
              { id: 'learners', label: 'Learners', count: totalUsers },
              { id: 'experts', label: 'Experts', count: totalExperts },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
            </div>
          ) : activeTab === 'learners' ? (
            <>
              <UserTable
                users={users}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
                onSuspend={handleSuspendUser}
              />
              {/* Pagination for users */}
              {totalUsers > 20 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '16px',
                    marginTop: '24px',
                  }}
                >
                  <button
                    onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                    disabled={usersPage === 1}
                    style={{
                      padding: '8px 16px',
                      background: usersPage === 1 ? '#e2e8f0' : 'var(--color-primary)',
                      color: usersPage === 1 ? '#a0aec0' : '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: usersPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '8px 16px', color: '#4a5568' }}>
                    Page {usersPage} of {Math.ceil(totalUsers / 20)}
                  </span>
                  <button
                    onClick={() => setUsersPage(p => p + 1)}
                    disabled={usersPage >= Math.ceil(totalUsers / 20)}
                    style={{
                      padding: '8px 16px',
                      background:
                        usersPage >= Math.ceil(totalUsers / 20)
                          ? '#e2e8f0'
                          : 'var(--color-primary)',
                      color: usersPage >= Math.ceil(totalUsers / 20) ? '#a0aec0' : '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: usersPage >= Math.ceil(totalUsers / 20) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <ExpertTable
                experts={experts}
                onEdit={handleEditExpert}
                onDelete={handleDeleteExpert}
                onSuspend={handleSuspendExpert}
                onToggleFeatured={handleToggleFeatured}
              />
              {/* Pagination for experts */}
              {totalExperts > 20 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '16px',
                    marginTop: '24px',
                  }}
                >
                  <button
                    onClick={() => setExpertsPage(p => Math.max(1, p - 1))}
                    disabled={expertsPage === 1}
                    style={{
                      padding: '8px 16px',
                      background: expertsPage === 1 ? '#e2e8f0' : 'var(--color-primary)',
                      color: expertsPage === 1 ? '#a0aec0' : '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: expertsPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '8px 16px', color: '#4a5568' }}>
                    Page {expertsPage} of {Math.ceil(totalExperts / 20)}
                  </span>
                  <button
                    onClick={() => setExpertsPage(p => p + 1)}
                    disabled={expertsPage >= Math.ceil(totalExperts / 20)}
                    style={{
                      padding: '8px 16px',
                      background:
                        expertsPage >= Math.ceil(totalExperts / 20)
                          ? '#e2e8f0'
                          : 'var(--color-primary)',
                      color: expertsPage >= Math.ceil(totalExperts / 20) ? '#a0aec0' : '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor:
                        expertsPage >= Math.ceil(totalExperts / 20) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Confirmation Overlay */}
      <NotificationOverlay
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        message={getConfirmMessage()}
        type={getConfirmType()}
        onConfirm={handleConfirmAction}
        confirmText={getConfirmText()}
        cancelText="Cancel"
      />

      {/* Notification Overlay */}
      <NotificationOverlay
        isOpen={!!notification}
        onClose={() => setNotification(null)}
        message={notification?.message || ''}
        type={notification?.type || 'success'}
        duration={4000}
      />
    </div>
  );
}
