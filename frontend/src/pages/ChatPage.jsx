import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import Avatar from '../components/ui/Avatar.jsx'
import Spinner from '../components/ui/Spinner.jsx'

export default function ChatPage() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-700/60 flex flex-col bg-slate-900/90">
        {/* User Profile Header */}
        <div className="p-4 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar name={user.name} src={user.avatarUrl} size="md" />
            <div>
              <p className="font-semibold text-sm text-white">{user.name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-slate-800"
            title="Log out"
          >
            Logout
          </button>
        </div>

        {/* Chats heading */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="font-semibold text-sm text-slate-300">Conversations</span>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-4 text-slate-400 text-sm flex items-center justify-center text-center">
          No conversations yet.<br />Ready to start messaging!
        </div>
      </aside>

      {/* Chat window */}
      <main className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 text-2xl">
            💬
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Welcome, {user.name}!</h2>
          <p className="text-slate-400 text-sm max-w-sm">
            Select or start a conversation to begin real-time messaging with your team.
          </p>
        </div>
      </main>
    </div>
  )
}
