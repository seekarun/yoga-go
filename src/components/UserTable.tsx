'use client';

import Link from 'next/link';
import type { UserListItem } from '@/types';

interface UserTableProps {
  users: UserListItem[];
  onEdit: (userId: string) => void;
  onDelete: (userId: string) => void;
  onSuspend: (userId: string, suspend: boolean) => void;
}

export default function UserTable({ users, onEdit, onDelete, onSuspend }: UserTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2d3748',
                }}
              >
                User
              </th>
              <th
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2d3748',
                }}
              >
                Email
              </th>
              <th
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2d3748',
                }}
              >
                Member Since
              </th>
              <th
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2d3748',
                }}
              >
                Last Login
              </th>
              <th
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2d3748',
                }}
              >
                Membership
              </th>
              <th
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2d3748',
                }}
              >
                Courses
              </th>
              <th
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2d3748',
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2d3748',
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: user.avatar ? `url(${user.avatar})` : '#667eea',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}
                    >
                      {!user.avatar && user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
                        {user.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568' }}>
                  {user.email}
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568' }}>
                  {formatDate(user.joinedAt)}
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568' }}>
                  {formatDate(user.lastActive)}
                </td>
                <td style={{ padding: '16px' }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background:
                        user.membershipType === 'free'
                          ? '#e2e8f0'
                          : user.membershipType === 'lifetime'
                            ? '#fef3c7'
                            : '#dbeafe',
                      color:
                        user.membershipType === 'free'
                          ? '#4a5568'
                          : user.membershipType === 'lifetime'
                            ? '#92400e'
                            : '#1e40af',
                    }}
                  >
                    {user.membershipType}
                  </span>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568' }}>
                  {user.totalCourses}
                </td>
                <td style={{ padding: '16px' }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: user.status === 'active' ? '#d1fae5' : '#fee2e2',
                      color: user.status === 'active' ? '#065f46' : '#991b1b',
                    }}
                  >
                    {user.status}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link
                      href={`/admn/users/${user.id}`}
                      style={{
                        padding: '6px 12px',
                        background: '#667eea',
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textDecoration: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      View
                    </Link>
                    <button
                      onClick={() => onEdit(user.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#f7fafc',
                        color: '#4a5568',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onSuspend(user.id, user.status === 'active')}
                      style={{
                        padding: '6px 12px',
                        background: user.status === 'active' ? '#fef3c7' : '#d1fae5',
                        color: user.status === 'active' ? '#92400e' : '#065f46',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {user.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                    <button
                      onClick={() => onDelete(user.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#fee2e2',
                        color: '#991b1b',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>No users found</div>
      )}
    </div>
  );
}
