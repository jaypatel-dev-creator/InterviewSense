import { useUIStore } from '../store/uiStore'
import SetupForm from '../components/setup/SetupForm'
import InterviewScreen from '../components/interview/InterviewScreen'
import ReportScreen from '../components/report/ReportScreen'
import SessionHistory from '../components/history/SessionHistory'

export default function App() {
  const { screen, sidebarOpen, toggleSidebar, error, clearError } = useUIStore()

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Session History Sidebar */}
      <SessionHistory isOpen={sidebarOpen} onClose={toggleSidebar} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: '#1e1e2e' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg transition-colors"
              style={{ color: '#64748b' }}
              onMouseEnter={e => e.target.style.color = '#f1f5f9'}
              onMouseLeave={e => e.target.style.color = '#64748b'}
              aria-label="Toggle session history"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="font-semibold tracking-tight" style={{ color: '#f1f5f9' }}>
              Interview<span style={{ color: '#3b82f6' }}>Sense</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-1 rounded-full font-mono"
              style={{ backgroundColor: '#1e1e2e', color: '#64748b' }}
            >
              v1.0.0
            </span>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div
            className="mx-6 mt-4 px-4 py-3 rounded-lg flex items-center justify-between text-sm"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
          >
            <span>{error}</span>
            <button onClick={clearError} style={{ color: '#fca5a5' }}>✕</button>
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