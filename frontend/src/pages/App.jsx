import { useUIStore } from '../store/uiStore'
import SetupForm from '../components/setup/SetupForm'
import InterviewScreen from '../components/interview/InterviewScreen'
import ReportScreen from '../components/report/ReportScreen'
import SessionHistory from '../components/history/SessionHistory'

export default function App() {
  const { screen, sidebarOpen, toggleSidebar, error, clearError } = useUIStore()

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Session History Sidebar */}
      <SessionHistory isOpen={sidebarOpen} onClose={toggleSidebar} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Top Bar — only show on interview and report screens */}
        {screen !== 'setup' && (
          <header
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: '#1a1a1a', backgroundColor: '#0a0a0a' }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#404040' }}
                onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                onMouseLeave={e => e.currentTarget.style.color = '#404040'}
                aria-label="Toggle session history"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <span className="font-semibold tracking-tight text-sm" style={{ color: '#f1f5f9' }}>
                Interview<span style={{ color: '#3b82f6' }}>Sense</span>
              </span>
            </div>

            <span
              className="text-xs font-mono"
              style={{ color: '#2a2a2a' }}
            >
              v1.0.0
            </span>
          </header>
        )}

        {/* Setup screen has its own full-screen layout with branding */}
        {screen === 'setup' && (
          <div
            className="absolute top-6 left-6 flex items-center gap-3 z-10"
          >
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg transition-colors"
              style={{ color: '#2a2a2a' }}
              onMouseEnter={e => e.currentTarget.style.color = '#555'}
              onMouseLeave={e => e.currentTarget.style.color = '#2a2a2a'}
              aria-label="Toggle session history"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="font-semibold tracking-tight text-sm" style={{ color: '#2a2a2a' }}>
              Interview<span style={{ color: '#1e3a5f' }}>Sense</span>
            </span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div
            className="mx-6 mt-4 px-4 py-3 rounded-xl flex items-center justify-between text-sm"
            style={{
              backgroundColor: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5',
            }}
          >
            <span>{error}</span>
            <button onClick={clearError} style={{ color: '#555' }}>✕</button>
          </div>
        )}

        {/* Screen Router */}
        <main className="flex-1 flex flex-col">
          {screen === 'setup' && <SetupForm />}
          {screen === 'interview' && <InterviewScreen />}
          {screen === 'report' && <ReportScreen />}
        </main>
      </div>
    </div>
  )
}