'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Recording, RecordingSource, RecordingImportStatus } from '@/types';
import NotificationOverlay from '@/components/NotificationOverlay';
import LoadingSpinner from '@/components/LoadingSpinner';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${secs}s`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getSourceBadge(source: RecordingSource) {
  const styles: Record<RecordingSource, { bg: string; text: string; label: string }> = {
    zoom: { bg: '#dbeafe', text: '#1d4ed8', label: 'Zoom' },
    google_meet: { bg: '#dcfce7', text: '#16a34a', label: 'Google Meet' },
    upload: { bg: '#f3e8ff', text: '#9333ea', label: 'Upload' },
    live: { bg: '#fef3c7', text: '#d97706', label: 'Live Session' },
  };

  const style = styles[source] || styles.upload;

  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        background: style.bg,
        color: style.text,
      }}
    >
      {style.label}
    </span>
  );
}

function getStatusBadge(status: RecordingImportStatus) {
  const styles: Record<RecordingImportStatus, { bg: string; text: string; label: string }> = {
    pending: { bg: '#fef3c7', text: '#d97706', label: 'Pending' },
    downloading: { bg: '#dbeafe', text: '#1d4ed8', label: 'Downloading' },
    uploading: { bg: '#e0e7ff', text: '#4f46e5', label: 'Uploading' },
    processing: { bg: '#fae8ff', text: '#a855f7', label: 'Processing' },
    ready: { bg: '#d1fae5', text: '#059669', label: 'Ready' },
    failed: { bg: '#fee2e2', text: '#dc2626', label: 'Failed' },
  };

  const style = styles[status] || styles.pending;

  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        background: style.bg,
        color: style.text,
      }}
    >
      {style.label}
    </span>
  );
}

export default function ExpertRecordingsPage() {
  const params = useParams();
  const expertId = params.expertId as string;

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recordingToDelete, setRecordingToDelete] = useState<Recording | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [filterSource, setFilterSource] = useState<RecordingSource | ''>('');
  const [filterStatus, setFilterStatus] = useState<RecordingImportStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSource, filterStatus]);

  const fetchRecordings = async () => {
    try {
      console.log('[DBG][expert-recordings] Fetching recordings');
      const params = new URLSearchParams();
      if (filterSource) params.set('source', filterSource);
      if (filterStatus) params.set('status', filterStatus);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/data/app/expert/me/recordings?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setRecordings(data.data?.recordings || []);
      } else {
        setError(data.error || 'Failed to load recordings');
      }
    } catch (err) {
      console.error('[DBG][expert-recordings] Error:', err);
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecordings();
  };

  const handleDeleteClick = (recording: Recording, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecordingToDelete(recording);
  };

  const handleDeleteConfirm = async () => {
    if (!recordingToDelete) return;

    try {
      // For live (100ms) recordings, use hmsAssetId and pass source param
      const recordingId =
        recordingToDelete.source === 'live' && recordingToDelete.hmsAssetId
          ? recordingToDelete.hmsAssetId
          : recordingToDelete.id;
      const sourceParam = recordingToDelete.source === 'live' ? '?source=live' : '';

      const response = await fetch(`/data/app/expert/me/recordings/${recordingId}${sourceParam}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setRecordings(recordings.filter(r => r.id !== recordingToDelete.id));
        setRecordingToDelete(null);
      } else {
        setError(data.error || 'Failed to delete recording');
      }
    } catch (err) {
      console.error('[DBG][expert-recordings] Delete error:', err);
      setError('Failed to delete recording');
    }
  };

  const handleRecordingClick = async (recording: Recording) => {
    if (recording.status !== 'ready') return;

    // For live (100ms) recordings, fetch presigned URL
    if (recording.source === 'live' && recording.hmsAssetId) {
      setLoadingVideo(true);
      setSelectedRecording(recording);
      try {
        const response = await fetch(
          `/data/app/expert/me/recordings/${recording.hmsAssetId}/presigned-url`
        );
        const data = await response.json();
        if (data.success && data.data?.url) {
          setPresignedUrl(data.data.url);
        } else {
          setError('Failed to load video URL');
          setSelectedRecording(null);
        }
      } catch (err) {
        console.error('[DBG][expert-recordings] Error getting presigned URL:', err);
        setError('Failed to load video');
        setSelectedRecording(null);
      } finally {
        setLoadingVideo(false);
      }
    } else if (recording.cloudflarePlaybackUrl || recording.cloudflareStreamId) {
      // For Cloudflare recordings
      setSelectedRecording(recording);
      setPresignedUrl(null);
    }
  };

  const handleClosePlayer = () => {
    setSelectedRecording(null);
    setPresignedUrl(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <>
      <div className="px-6 lg:px-8 py-6">
        {error && (
          <div
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            {error}
          </div>
        )}

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <form onSubmit={handleSearch} style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search recordings..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 40px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
              <svg
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: '#9ca3af',
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </form>

          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value as RecordingSource | '')}
            style={{
              padding: '10px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              background: '#fff',
            }}
          >
            <option value="">All Sources</option>
            <option value="live">Live Sessions</option>
            <option value="zoom">Zoom</option>
            <option value="google_meet">Google Meet</option>
            <option value="upload">Upload</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as RecordingImportStatus | '')}
            style={{
              padding: '10px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              background: '#fff',
            }}
          >
            <option value="">All Status</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Recordings Grid */}
        {recordings.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '60px 40px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>
              <svg
                style={{ width: '64px', height: '64px', margin: '0 auto', color: '#9ca3af' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                />
              </svg>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              No recordings yet
            </h3>
            <p
              style={{
                color: '#6b7280',
                marginBottom: '24px',
                maxWidth: '400px',
                margin: '0 auto',
              }}
            >
              Your live session recordings will automatically appear here when you record a session.
              Start a live session and click the record button to create your first recording.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px',
            }}
          >
            {recordings.map(recording => (
              <div
                key={recording.id}
                onClick={() => handleRecordingClick(recording)}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: recording.status === 'ready' ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (recording.status === 'ready') {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    height: '160px',
                    background: recording.thumbnailUrl
                      ? `url(${recording.thumbnailUrl}) center/cover`
                      : 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                    position: 'relative',
                  }}
                >
                  {recording.status === 'ready' && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.3)',
                        opacity: 0,
                        transition: 'opacity 0.15s ease',
                      }}
                      className="play-overlay"
                    >
                      <svg
                        style={{ width: '48px', height: '48px', color: '#fff' }}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.75)',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    {formatDuration(recording.duration)}
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    {getSourceBadge(recording.source)}
                    {getStatusBadge(recording.status)}
                  </div>

                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      marginBottom: '8px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {recording.title}
                  </h3>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px',
                      color: '#6b7280',
                    }}
                  >
                    <span>
                      {formatDate(
                        recording.recordedAt || recording.createdAt || new Date().toISOString()
                      )}
                    </span>
                    <span>{formatFileSize(recording.fileSize)}</span>
                  </div>

                  {recording.statusMessage && recording.status === 'failed' && (
                    <p
                      style={{
                        color: '#dc2626',
                        fontSize: '12px',
                        marginTop: '8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {recording.statusMessage}
                    </p>
                  )}

                  {/* Actions */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid #f3f4f6',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    {recording.status === 'ready' && (
                      <button
                        onClick={() => handleRecordingClick(recording)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: 'var(--color-primary)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        Play
                      </button>
                    )}
                    <button
                      onClick={e => handleDeleteClick(recording, e)}
                      style={{
                        padding: '8px 12px',
                        background: '#fff',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {selectedRecording && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={handleClosePlayer}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '1200px',
              background: '#000',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                background: '#111',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>
                  {selectedRecording.title}
                </h3>
                {getSourceBadge(selectedRecording.source)}
              </div>
              <button
                onClick={handleClosePlayer}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '8px',
                }}
              >
                <svg
                  style={{ width: '24px', height: '24px' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div style={{ aspectRatio: '16/9' }}>
              {loadingVideo ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <LoadingSpinner size="md" />
                </div>
              ) : selectedRecording.source === 'live' && presignedUrl ? (
                <video
                  src={presignedUrl}
                  controls
                  autoPlay
                  style={{ width: '100%', height: '100%', background: '#000' }}
                />
              ) : selectedRecording.cloudflareStreamId ? (
                <iframe
                  src={`https://customer-${process.env.NEXT_PUBLIC_CF_ACCOUNT_ID || ''}.cloudflarestream.com/${selectedRecording.cloudflareStreamId}/iframe`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                  }}
                >
                  Video not available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Overlay */}
      <NotificationOverlay
        isOpen={!!recordingToDelete}
        onClose={() => setRecordingToDelete(null)}
        message={`Are you sure you want to delete "${recordingToDelete?.title}"? This action cannot be undone.`}
        type="warning"
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <style jsx>{`
        .play-overlay {
          opacity: 0;
        }
        div:hover .play-overlay {
          opacity: 1;
        }
      `}</style>
    </>
  );
}
