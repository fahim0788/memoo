'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RotateCw } from 'lucide-react';

type Tab = 'generator' | 'requests' | 'events';

interface CertificationRequest {
  id: string;
  certCode: string;
  status: string;
  deckId: string | null;
  createdAt: string;
  errorLog: string | null;
}

interface Event {
  id: string;
  type: string;
  category: string;
  status: string;
  userId: string | null;
  createdAt: string;
  metadata?: any;
}

const certifications = [
  { code: 'AZ-900', label: 'Azure Fundamentals' },
  { code: 'AZ-104', label: 'Azure Administrator' },
  { code: 'AZ-305', label: 'Azure Solutions Architect' },
  { code: 'AWS-SAA', label: 'AWS Solutions Architect Associate' },
  { code: 'AWS-SAP', label: 'AWS Solutions Architect Professional' },
  { code: 'GCP-ACE', label: 'Google Cloud Associate Cloud Engineer' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('generator');
  const [selectedCert, setSelectedCert] = useState('AZ-900');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState('');
  const [requests, setRequests] = useState<CertificationRequest[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [requestPage, setRequestPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [requestTotalPages, setRequestTotalPages] = useState(1);
  const [eventTotalPages, setEventTotalPages] = useState(1);
  const [requestSort, setRequestSort] = useState<'asc' | 'desc'>('desc');
  const [eventSort, setEventSort] = useState<'asc' | 'desc'>('desc');
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [allLoadedRequests, setAllLoadedRequests] = useState<CertificationRequest[]>([]);
  const [allLoadedEvents, setAllLoadedEvents] = useState<Event[]>([]);
  const router = useRouter();

  // Fetch requests
  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests();
    }
  }, [activeTab, requestPage]);

  // Fetch events
  useEffect(() => {
    if (activeTab === 'events') {
      fetchEvents();
    }
  }, [activeTab, eventPage]);

  const fetchRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const res = await fetch(`/api/admin/certifications?page=${requestPage}`);
      if (res.ok) {
        const data = await res.json();
        const newRequests = data.requests || [];
        const updated = [...allLoadedRequests];
        newRequests.forEach((req: CertificationRequest) => {
          if (!updated.find(r => r.id === req.id)) {
            updated.push(req);
          }
        });
        setAllLoadedRequests(updated);
        setRequests(data.requests || []);
        setRequestTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const fetchEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const res = await fetch(`/api/admin/events?page=${eventPage}`);
      if (res.ok) {
        const data = await res.json();
        const newEvents = data.events || [];
        const updated = [...allLoadedEvents];
        newEvents.forEach((evt: Event) => {
          if (!updated.find(e => e.id === evt.id)) {
            updated.push(evt);
          }
        });
        setAllLoadedEvents(updated);
        setEvents(data.events || []);
        setEventTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedCert) return;

    setIsGenerating(true);
    setGeneratingStatus('Initializing...');

    try {
      const res = await fetch('/api/admin/certifications/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certCode: selectedCert }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratingStatus(`✅ Success! Deck ID: ${data.deckId}`);
        setTimeout(() => {
          setIsGenerating(false);
          setGeneratingStatus('');
          fetchRequests();
          setActiveTab('requests');
        }, 2000);
      } else {
        const error = await res.json();
        setGeneratingStatus(`❌ Error: ${error.message || 'Unknown error'}`);
        setIsGenerating(false);
      }
    } catch (err) {
      setGeneratingStatus(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsGenerating(false);
    }
  };

  const handleRefreshRequests = async () => {
    setIsLoadingRequests(true);
    setRequestPage(1);
    setAllLoadedRequests([]);
    try {
      const res = await fetch(`/api/admin/certifications?page=1`);
      if (res.ok) {
        const data = await res.json();
        setAllLoadedRequests(data.requests || []);
        setRequests(data.requests || []);
        setRequestTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleRefreshEvents = async () => {
    setIsLoadingEvents(true);
    setEventPage(1);
    setAllLoadedEvents([]);
    try {
      const res = await fetch(`/api/admin/events?page=1`);
      if (res.ok) {
        const data = await res.json();
        setAllLoadedEvents(data.events || []);
        setEvents(data.events || []);
        setEventTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Delete this request?')) return;

    try {
      const res = await fetch(`/api/admin/certifications/${requestId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchRequests();
      }
    } catch (err) {
      console.error('Failed to delete request:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const requestTotalPagesLocal = Math.max(requestTotalPages, Math.ceil(allLoadedRequests.length / 10));
  const eventTotalPagesLocal = Math.max(eventTotalPages, Math.ceil(allLoadedEvents.length / 10));

  const sortedRequests = [...allLoadedRequests]
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return requestSort === 'desc' ? dateB - dateA : dateA - dateB;
    })
    .slice((requestPage - 1) * 10, requestPage * 10);

  const sortedEvents = [...allLoadedEvents]
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return eventSort === 'desc' ? dateB - dateA : dateA - dateB;
    })
    .slice((eventPage - 1) * 10, eventPage * 10);

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: '#0a0e1a', color: '#e2e8f0' }}>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

        body { font-family: 'Plus Jakarta Sans', sans-serif; }

        .bg-grid {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 0;
        }

        .bg-glow-1 {
          position: fixed;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%);
          top: -100px;
          left: -100px;
          pointer-events: none;
          z-index: 0;
        }

        .bg-glow-2 {
          position: fixed;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(52,211,153,0.04) 0%, transparent 70%);
          bottom: -100px;
          right: -100px;
          pointer-events: none;
          z-index: 0;
        }

        .card {
          background: rgba(17,24,39,0.6);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 20px 18px;
          backdrop-filter: blur(8px);
          transition: all 0.25s ease;
        }

        .card:hover {
          background: rgba(17,24,39,0.6);
          border-color: rgba(255,255,255,0.06);
        }

        .header-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 100px;
          padding: 6px 18px;
          font-size: 12px;
          font-weight: 600;
          color: #818cf8;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-family: 'JetBrains Mono', monospace;
        }

        .tab-button {
          padding: 10px 18px;
          border-bottom: 2px solid transparent;
          font-weight: 500;
          transition: all 0.25s ease;
          cursor: pointer;
          white-space: nowrap;
          font-size: 13px;
        }

        .tab-button.active {
          color: #60a5fa;
          border-bottom-color: #60a5fa;
          background: transparent;
        }

        .tab-button:hover {
          color: inherit;
          background: transparent;
        }

        .status-badge {
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          display: inline-block;
        }

        .status-success {
          background: rgba(52,211,153,0.15);
          color: #34d399;
        }

        .status-failed {
          background: rgba(248,113,113,0.15);
          color: #f87171;
        }

        .status-pending {
          background: rgba(251,191,36,0.15);
          color: #fbbf24;
        }

        .input-field {
          background: rgba(17,24,39,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 9px 12px;
          color: #e2e8f0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
          font-size: 13px;
        }

        .input-field:hover {
          border-color: rgba(255,255,255,0.06);
          background: rgba(17,24,39,0.8);
        }

        .input-field:focus {
          outline: none;
          border-color: rgba(96,165,250,0.5);
          background: rgba(17,24,39,0.95);
          box-shadow: 0 0 20px rgba(96,165,250,0.1);
        }

        .btn-primary {
          background: linear-gradient(135deg, #60a5fa, #818cf8);
          color: white;
          font-weight: 600;
          padding: 9px 18px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.25s ease;
          font-size: 13px;
        }

        .btn-primary:hover {
          transform: none;
          box-shadow: none;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #94a3b8;
          font-weight: 500;
          padding: 7px 14px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 12px;
        }

        .btn-secondary:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.1);
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-danger {
          color: #f87171;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 12px;
        }

        .btn-danger:hover {
          color: #f87171;
        }

        .table-container {
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead {
          background: rgba(26,34,54,0.5);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        th {
          padding: 10px 14px;
          text-align: left;
          font-weight: 600;
          color: #64748b;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        td {
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          font-size: 13px;
        }

        tbody tr {
          transition: background 0.2s ease;
        }

        tbody tr:hover {
          background: transparent;
        }

        .mono {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
        }

        .th-sortable {
          cursor: pointer;
          user-select: none;
        }

        .th-sortable:hover {
          color: #94a3b8;
        }

        .page-btn {
          min-width: 28px;
          height: 28px;
          padding: 0 6px;
          border-radius: 5px;
          border: 1px solid transparent;
          background: transparent;
          color: #64748b;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: 'JetBrains Mono', monospace;
        }

        .page-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.05);
          color: #cbd5e1;
        }

        .page-btn.active {
          background: rgba(96,165,250,0.12);
          border-color: rgba(96,165,250,0.3);
          color: #60a5fa;
          font-weight: 700;
        }

        .page-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .page-btn.nav {
          color: #475569;
          font-size: 11px;
          letter-spacing: 0.5px;
        }

        .page-btn.nav:hover:not(:disabled) {
          color: #94a3b8;
          background: rgba(255,255,255,0.04);
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: #60a5fa;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-overlay {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: #64748b;
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .bg-glow-1 {
            width: 400px;
            height: 400px;
            top: -50px;
            left: -50px;
          }

          .bg-glow-2 {
            width: 300px;
            height: 300px;
            bottom: -50px;
            right: -50px;
          }

          .card {
            padding: 20px 16px;
          }

          .header-badge {
            font-size: 11px;
            padding: 4px 12px;
          }

          .tab-button {
            padding: 10px 14px;
            font-size: 13px;
            flex: 1;
            text-align: center;
          }

          .header-flex {
            flex-direction: column;
            gap: 12px !important;
          }

          .header-flex > div:last-child {
            text-align: left;
          }

          table {
            font-size: 13px;
          }

          th {
            padding: 12px;
            font-size: 11px;
          }

          td {
            padding: 12px;
          }

          .mono {
            font-size: 11px;
          }

          .btn-primary {
            padding: 10px 18px;
            font-size: 13px;
          }

          .btn-secondary {
            padding: 8px 16px;
            font-size: 13px;
          }

          .status-badge {
            padding: 4px 10px;
            font-size: 10px;
          }

          .pagination-container {
            gap: 4px;
            overflow-x: auto;
          }

          .content-padding {
            padding: 20px 16px;
          }

          .header-padding {
            padding: 32px 16px;
          }
        }
      `}</style>

      <div className="bg-grid"></div>
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      <div style={{ position: 'relative', zIndex: 1 }} className="min-h-screen">
        {/* Header */}
        <div style={{ backgroundColor: 'rgba(17,24,39,0.4)', borderBottom: '1px solid rgba(255,255,255,0.06)' }} className="backdrop-blur-sm">
          <div style={{ maxWidth: '1400px' }} className="mx-auto header-padding px-8">
            <div className="header-flex flex justify-between items-end gap-8">
              <div>
                <h1 style={{ fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 700, background: 'linear-gradient(135deg, #e2e8f0, #818cf8, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} className="mb-1">
                  Memoo Admin
                </h1>
                <p style={{ color: '#64748b', fontSize: '13px' }}>Create decks, review requests & analyze user activity</p>
              </div>
              <Link href="/" style={{ color: '#60a5fa', fontSize: '13px' }} className="transition-colors pb-1">
               Aller à l'app →
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ backgroundColor: 'rgba(17,24,39,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)', maxWidth: '1400px' }} className="mx-auto backdrop-blur-sm overflow-x-auto">
          <div className="px-8 flex gap-2">
            {(['generator', 'requests', 'events'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setRequestPage(1);
                  setEventPage(1);
                }}
                className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              >
                {tab === 'generator' && '⚙️ Generator'}
                {tab === 'requests' && '📋 Requests'}
                {tab === 'events' && '📊 Events'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: '1400px' }} className="mx-auto content-padding px-8">
          {/* Generator Tab */}
          {activeTab === 'generator' && (
            <div className="space-y-6">
              <div className="card">
                <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#cbd5e1' }}>Create a new deck</h2>

                <div className="space-y-4">
                  <div>
                    <label style={{ color: '#94a3b8' }} className="block text-sm font-semibold mb-3">
                      Pick a certification:
                    </label>
                    <select
                      value={selectedCert}
                      onChange={(e) => setSelectedCert(e.target.value)}
                      disabled={isGenerating}
                      className="w-full input-field text-white disabled:opacity-50"
                    >
                      {certifications.map((cert) => (
                        <option key={cert.code} value={cert.code}>
                          {cert.code} - {cert.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full btn-primary py-3 text-base"
                  >
                    {isGenerating ? '⏳ Creating...' : '✨ Create Deck'}
                  </button>

                  {generatingStatus && (
                    <div style={{
                      background: generatingStatus.startsWith('❌')
                        ? 'rgba(248,113,113,0.1)'
                        : generatingStatus.startsWith('✅')
                        ? 'rgba(52,211,153,0.1)'
                        : 'rgba(96,165,250,0.1)',
                      color: generatingStatus.startsWith('❌')
                        ? '#f87171'
                        : generatingStatus.startsWith('✅')
                        ? '#34d399'
                        : '#60a5fa',
                      border: `1px solid ${
                        generatingStatus.startsWith('❌')
                          ? 'rgba(248,113,113,0.2)'
                          : generatingStatus.startsWith('✅')
                          ? 'rgba(52,211,153,0.2)'
                          : 'rgba(96,165,250,0.2)'
                      }`
                    }} className="p-4 rounded-lg text-sm font-semibold">
                      {generatingStatus}
                    </div>
                  )}
                </div>
              </div>

              <div className="card" style={{ borderColor: 'rgba(251,146,60,0.2)' }}>
                <h3 style={{ color: '#fb923c', fontWeight: 700, marginBottom: '16px' }}>What happens</h3>
                <ul style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.8' }} className="space-y-2">
                  <li>✓ Gets the official syllabus</li>
                  <li>✓ Creates questions with answers & hints</li>
                  <li>✓ Checks everything makes sense</li>
                  <li>✓ Runs plagiarism detection</li>
                  <li>✓ Sets up Deck → Chapters → Cards</li>
                </ul>
              </div>
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#cbd5e1' }}>Recent decks</h2>
                <button
                  onClick={handleRefreshRequests}
                  disabled={isLoadingRequests}
                  className="btn-secondary"
                  style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Refresh requests"
                >
                  <RotateCw size={16} />
                </button>
              </div>

              {isLoadingRequests ? (
                <div className="loading-overlay">
                  <div className="spinner" style={{ marginRight: '8px' }}></div>
                  <span>Loading requests...</span>
                </div>
              ) : requests.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Cert</th>
                        <th>Status</th>
                        <th>Deck</th>
                        <th className="th-sortable" onClick={() => setRequestSort(requestSort === 'desc' ? 'asc' : 'desc')}>
                        {requestSort === 'desc' ? '↓' : '↑'} Date {requestSort === 'desc' ? '↓' : '↑'}
                        </th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRequests.map((req) => (
                        <tr key={req.id}>
                          <td className="mono font-semibold" style={{ color: '#60a5fa' }}>{req.certCode}</td>
                          <td>
                            <span className={`status-badge status-${
                              req.status === 'success' ? 'success' : req.status === 'failed' ? 'failed' : 'pending'
                            }`}>
                              {req.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="mono text-xs" style={{ color: '#64748b' }}>
                            {req.deckId ? (
                              <Link href={`/?deckId=${req.deckId}`} style={{ color: '#60a5fa' }} className="hover:text-blue-300">
                                {req.deckId.substring(0, 8)}...
                              </Link>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td style={{ color: '#64748b', fontSize: '13px' }}>
                            {formatDate(req.createdAt)}
                          </td>
                          <td>
                            <button
                              onClick={() => handleDeleteRequest(req.id)}
                              className="btn-danger text-sm font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card text-center" style={{ color: '#94a3b8' }}>
                  <p style={{ fontSize: '15px' }}>No decks created yet</p>
                </div>
              )}

              {/* Pagination */}
              <div className="pagination-container flex items-center gap-1">
                <button onClick={() => setRequestPage((p) => Math.max(1, p - 1))} disabled={requestPage === 1 || isLoadingRequests} className="page-btn nav">← Back</button>
                {Array.from({ length: requestTotalPagesLocal }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setRequestPage(p)} disabled={isLoadingRequests} className={`page-btn ${p === requestPage ? 'active' : ''}`}>{p}</button>
                ))}
                <button onClick={() => setRequestPage((p) => p + 1)} disabled={requestPage === requestTotalPagesLocal || isLoadingRequests} className="page-btn nav">Next →</button>
              </div>
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#cbd5e1' }}>User activity</h2>
                <button
                  onClick={handleRefreshEvents}
                  disabled={isLoadingEvents}
                  className="btn-secondary"
                  style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Refresh events"
                >
                  <RotateCw size={16} />
                </button>
              </div>

              {isLoadingEvents ? (
                <div className="loading-overlay">
                  <div className="spinner" style={{ marginRight: '8px' }}></div>
                  <span>Loading events...</span>
                </div>
              ) : events.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Category</th>
                        <th>Event</th>
                        <th className="th-sortable" onClick={() => setEventSort(eventSort === 'desc' ? 'asc' : 'desc')}>Date {eventSort === 'desc' ? '↓' : '↑'}</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEvents.map((event) => (
                        <tr key={event.id}>
                          <td style={{ color: '#94a3b8', fontSize: '13px' }}>
                            {event.userId ? event.userId.substring(0, 8) : 'Anonymous'}
                          </td>
                          <td style={{ color: '#94a3b8' }}>{event.category}</td>
                          <td className="mono font-semibold" style={{ color: '#60a5fa' }}>{event.type}</td>
                          <td style={{ color: '#64748b', fontSize: '13px' }}>
                            {formatDate(event.createdAt)}
                          </td>
                          <td>
                            <span className={`status-badge status-${
                              event.status === 'success' ? 'success' : event.status === 'failed' ? 'failed' : 'pending'
                            }`}>
                              {event.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card text-center" style={{ color: '#94a3b8' }}>
                  <p style={{ fontSize: '15px' }}>No activity yet</p>
                </div>
              )}

              {/* Pagination */}
              <div className="pagination-container flex items-center gap-1">
                <button onClick={() => setEventPage((p) => Math.max(1, p - 1))} disabled={eventPage === 1 || isLoadingEvents} className="page-btn nav">← Back</button>
                {Array.from({ length: eventTotalPagesLocal }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setEventPage(p)} disabled={isLoadingEvents} className={`page-btn ${p === eventPage ? 'active' : ''}`}>{p}</button>
                ))}
                <button onClick={() => setEventPage((p) => p + 1)} disabled={eventPage === eventTotalPagesLocal || isLoadingEvents} className="page-btn nav">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
