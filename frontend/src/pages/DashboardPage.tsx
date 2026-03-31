import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="bg-[#09090b] min-h-screen flex items-center justify-center font-['Roboto_Condensed'] text-zinc-300">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-medium text-white">Welcome, {user?.username}</h1>
        <p className="text-zinc-400">You're authenticated. Dashboard coming soon.</p>
        <button
          onClick={handleLogout}
          className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-white/5 transition-all duration-300 hover:-translate-y-0.5 text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
