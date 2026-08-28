import { useEffect, useState } from 'react'
import { listSessions, deleteAllSessions } from '../../services/api'
import SessionCard from './SessionCard'

export default function SessionHistory({ isOpen, onClose }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    listSessions()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isOpen])

  // Reset confirm state when sidebar closes
  useEffect(() => {
    if (!isOpen) setConfirmClearAll(false)
  }, [isOpen])

  const handleDelete = (sessionId) => {
    setSessions((prev) => prev.filter((s) => s.session_id !== sessionId))
  }

  const handleClearAll = async () => {
    if (!confirmClearAll) {
      setConfirmClearAll(true)
      return
    }
    setClearingAll(true)
    try {
      await deleteAllSessions()
      setSessions([])
      setConfirmClearAll(false)
    } catch (err) {
      console.error('Clear all failed:', err)
    } finally {
      setClearingAll(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-10"
          style={{ backgroundColor: 'rgba(15,14,12,0.3)' }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className="fixed top-0 left-0 h-full z-20 flex flex-col"
        style={{
          width: '300px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e2e0db',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: '#e2e0db' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: '#0f0e0c' }}>
            Session History
          </h2>
          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={clearingAll}
                className="text-xs px-2 py-1"
                style={{
                  color: confirmClearAll ? '#dc2626' : '#a8a49e',
                  border: `1px solid ${confirmClearAll ? 'rgba(220,38,38,0.3)' : 'transparent'}`,
                  opacity: clearingAll ? 0.5 : 1,
                }}
              >
                {clearingAll ? 'Clearing...' : confirmClearAll ? 'Confirm clear all' : 'Clear all'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5"
              style={{ color: '#a8a49e' }}
              onMouseEnter={e => e.currentTarget.style.color = '#0f0e0c'}
              onMouseLeave={e => e.currentTarget.style.color = '#a8a49e'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <p className="text-xs text-center py-8" style={{ color: '#a8a49e' }}>
              Loading sessions...
            </p>
          )}
          {!loading && sessions.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm" style={{ color: '#6b6860' }}>No sessions yet</p>
              <p className="text-xs" style={{ color: '#a8a49e' }}>
                Start your first interview to see history here.
              </p>
            </div>
          )}
          {sessions.map((session) => (
            <SessionCard
              key={session.session_id}
              session={session}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </>
  )
}