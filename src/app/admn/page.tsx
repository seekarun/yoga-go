'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminStatsCard from '@/components/AdminStatsCard';
import AdminTabs from '@/components/AdminTabs';
import UserTable from '@/components/UserTable';
import ExpertTable from '@/components/ExpertTable';
import type { AdminStats, UserListItem, ExpertListItem } from '@/types';

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

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/data/admn/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        alert('User deleted successfully');
        // Refresh users list
        setUsersPage(1);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('[DBG][admn] Error deleting user:', error);
      alert('Error deleting user');
    }
  };

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    const action = suspend ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

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
        alert(`User ${action}d successfully`);
        // Refresh users list
        setUsersPage(1);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(`[DBG][admn] Error ${action}ing user:`, error);
      alert(`Error ${action}ing user`);
    }
  };

  const handleEditExpert = (expertId: string) => {
    router.push(`/admn/experts/${expertId}`);
  };

  const handleDeleteExpert = async (expertId: string) => {
    if (!confirm('Are you sure you want to delete this expert? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/data/admn/experts/${expertId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        alert('Expert deleted successfully');
        // Refresh experts list
        setExpertsPage(1);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('[DBG][admn] Error deleting expert:', error);
      alert('Error deleting expert');
    }
  };

  const handleSuspendExpert = async (expertId: string, suspend: boolean) => {
    const action = suspend ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this expert?`)) {
      return;
    }

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
        alert(`Expert ${action}d successfully`);
        // Refresh experts list
        setExpertsPage(1);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(`[DBG][admn] Error ${action}ing expert:`, error);
      alert(`Error ${action}ing expert`);
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
        alert(`Expert ${featured ? 'featured' : 'unfeatured'} successfully`);
        // Refresh experts list
        setExpertsPage(1);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('[DBG][admn] Error toggling featured:', error);
      alert('Error updating featured status');
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
    </div>
  );
}
