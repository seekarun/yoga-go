'use client';

import Link from 'next/link';
import type { ExpertListItem } from '@/types';

interface ExpertTableProps {
  experts: ExpertListItem[];
  onEdit: (expertId: string) => void;
  onDelete: (expertId: string) => void;
  onSuspend: (expertId: string, suspend: boolean) => void;
  onToggleFeatured: (expertId: string, featured: boolean) => void;
}

export default function ExpertTable({
  experts,
  onEdit,
  onDelete,
  onSuspend,
  onToggleFeatured,
}: ExpertTableProps) {
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
                Expert
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
                Expert Since
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
                Last Active
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
                Students
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
                Featured
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
            {experts.map(expert => (
              <tr key={expert.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: expert.avatar ? `url(${expert.avatar})` : '#667eea',
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
                      {!expert.avatar && expert.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
                        {expert.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568' }}>
                  {expert.email}
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568' }}>
                  {formatDate(expert.joinedAt)}
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568' }}>
                  {formatDate(expert.lastActive)}
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568' }}>
                  {expert.totalCourses}
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568' }}>
                  {expert.totalStudents}
                </td>
                <td style={{ padding: '16px' }}>
                  {expert.featured ? (
                    <span style={{ fontSize: '20px' }}>⭐</span>
                  ) : (
                    <span style={{ fontSize: '14px', color: '#a0aec0' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '16px' }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: expert.status === 'active' ? '#d1fae5' : '#fee2e2',
                      color: expert.status === 'active' ? '#065f46' : '#991b1b',
                    }}
                  >
                    {expert.status}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Link
                      href={`/admn/experts/${expert.expertId}`}
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
                      onClick={() => onEdit(expert.id)}
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
                      onClick={() => onToggleFeatured(expert.expertId, !expert.featured)}
                      style={{
                        padding: '6px 12px',
                        background: expert.featured ? '#fef3c7' : '#dbeafe',
                        color: expert.featured ? '#92400e' : '#1e40af',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {expert.featured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button
                      onClick={() => onSuspend(expert.id, expert.status === 'active')}
                      style={{
                        padding: '6px 12px',
                        background: expert.status === 'active' ? '#fef3c7' : '#d1fae5',
                        color: expert.status === 'active' ? '#92400e' : '#065f46',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {expert.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                    <button
                      onClick={() => onDelete(expert.id)}
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
      {experts.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
          No experts found
        </div>
      )}
    </div>
  );
}
