import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  // common classes for nav links
  const getLinkClasses = (path) => {
    return `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
      isActive(path)
        ? 'border-indigo-500 text-indigo-400'
        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
    }`;
  };

  return (
    // Main Wrapper with Dark Background
    <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-indigo-500/30">
      
      {/* Fixed Ambient Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] opacity-20"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] opacity-20"></div>
          {/* Noise Texture */}
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo Area */}
              <div className="flex-shrink-0 flex items-center gap-3">
                 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30">
                    C
                 </div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Commission<span className="text-indigo-500">Mgmt</span>
                </h1>
              </div>

              {/* Desktop Menu Links */}
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                <Link to="/dashboard" className={getLinkClasses('/dashboard')}>
                  Dashboard
                </Link>
                <Link to="/transactions" className={getLinkClasses('/transactions')}>
                  Transactions
                </Link>
                <Link to="/reports" className={getLinkClasses('/reports')}>
                  Reports
                </Link>
                <Link to="/filing-locks" className={getLinkClasses('/filing-locks')}>
                  Filing Locks
                </Link>
              </div>
            </div>

            {/* Right Side: User Profile & Logout */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-medium text-white">
                  {user?.name || 'User'}
                </span>
                <span className="text-xs text-slate-500 uppercase tracking-wide">
                  {user?.role || 'Guest'}
                </span>
              </div>
              
              <button
                onClick={logout}
                className="group relative inline-flex items-center justify-center p-0.5 mb-2 mr-2 overflow-hidden text-sm font-medium rounded-lg group bg-gradient-to-br from-pink-500 to-orange-400 group-hover:from-pink-500 group-hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800"
              >
                  {/* Styled Logout Button */}
                  <span className="relative px-4 py-1.5 transition-all ease-in duration-75 bg-[#0f172a] rounded-md group-hover:bg-opacity-0">
                      Logout
                  </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content (Outlet) */}
      <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;