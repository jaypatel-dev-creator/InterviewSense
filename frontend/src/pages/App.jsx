import { useUIStore } from '../store/uiStore'
import SetupForm from '../components/setup/SetupForm'
import InterviewScreen from '../components/interview/InterviewScreen'
import ReportScreen from '../components/report/ReportScreen'
import SessionHistory from '../components/history/SessionHistory'

export default function App() {
  const { screen, sidebarOpen, toggleSidebar, error, clearError } = useUIStore()

  return (
    <div className="min-h-screen flex w-full" style={{ backgroundColor: '#f8f7f4' }}>
      {/* Session History Sidebar */}
      <SessionHistory isOpen={sidebarOpen} onClose={toggleSidebar} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Top Bar — only show on interview and report screens */}
        {screen !== 'setup' && (
          <header
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: '#e2e0db', backgroundColor: '#f8f7f4' }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="p-2 transition-colors"
                style={{ color: '#a8a49e' }}
                onMouseEnter={e => e.currentTarget.style.color = '#0f0e0c'}
                onMouseLeave={e => e.currentTarget.style.color = '#a8a49e'}
                aria-label="Toggle session history"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <span className="font-semibold tracking-tight text-sm" style={{ color: '#0f0e0c', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                Interview<span style={{ color: '#c84b1a' }}>Sense</span>
              </span>
            </div>

            <span
              className="text-xs font-mono"
              style={{ color: '#d4d2cd' }}
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
              className="p-2 transition-colors"
              style={{ color: '#a8a49e' }}
              onMouseEnter={e => e.currentTarget.style.color = '#0f0e0c'}
              onMouseLeave={e => e.currentTarget.style.color = '#a8a49e'}
              aria-label="Toggle session history"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="font-semibold tracking-tight text-sm" style={{ color: '#0f0e0c', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Interview<span style={{ color: '#c84b1a' }}>Sense</span>
            </span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div
            className="mx-6 mt-4 px-4 py-3 flex items-center justify-between text-sm"
            style={{
              backgroundColor: 'rgba(200,75,26,0.06)',
              border: '1px solid rgba(200,75,26,0.2)',
              color: '#c84b1a',
            }}
          >
            <span>{error}</span>
            <button onClick={clearError} style={{ color: '#a8a49e' }}>✕</button>
          </div>
        )}

        {/* Screen Router */}
        <main className="flex-1 flex flex-col" style={{ width: "100%" }}>
          {screen === 'setup' && <SetupForm />}
          {screen === 'interview' && <InterviewScreen />}
          {screen === 'report' && <ReportScreen />}
        </main>
      </div>
    </div>
  )
}