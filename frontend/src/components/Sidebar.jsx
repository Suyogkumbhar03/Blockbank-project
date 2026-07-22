import { Link, useLocation } from 'react-router-dom';
import { logoutUser } from '../services/api';

function Sidebar({ role = 'user', activeTab, setActiveTab }) {
  const location = useLocation();

  if (role === 'admin') {
    const adminNavItems = [
      { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
      { id: 'accounts', label: 'Accounts', icon: 'account_balance' },
      { id: 'approve-users', label: 'Approve Users', icon: 'person_check' },
      { id: 'transactions', label: 'Transactions', icon: 'receipt_long' },
      { id: 'explorer', label: 'Blockchain Explorer', icon: 'account_tree' },
      { id: 'fraud', label: 'Fraud Alerts', icon: 'gpp_bad' },
    ];

    return (
      <aside className="w-64 border-r border-surface-variant flex flex-col justify-between hidden md:flex sticky top-0 h-screen bg-surface-container-lowest z-50 shrink-0">
        <div>
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-surface-variant">
            <span
              className="material-symbols-outlined text-primary text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_balance
            </span>
            <span className="font-bold text-lg tracking-tight text-on-surface">BlockBank</span>
          </div>

          {/* Navigation */}
          <nav className="p-4 flex flex-col gap-2">
            {adminNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <a
                  key={item.id}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (setActiveTab) setActiveTab(item.id);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                    isActive
                      ? 'bg-surface-container text-on-surface font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 flex flex-col gap-2 mb-4">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="flex items-center gap-3 px-4 py-3 rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-sm">Settings</span>
          </a>
          <button
            type="button"
            onClick={logoutUser}
            className="flex items-center gap-3 px-4 py-3 rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors w-full text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>
    );
  }

  // User Sidebar
  const userNavItems = [
    { label: 'Dashboard', to: '/dashboard', icon: 'dashboard' },
    { label: 'Accounts', to: '#', icon: 'account_balance' },
    { label: 'Transfer Money', to: '/transfer', icon: 'payments' },
    { label: 'Transactions', to: '#', icon: 'receipt_long' },
    { label: 'Fraud Alerts', to: '#', icon: 'gpp_maybe' },
  ];

  return (
    <nav className="h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col py-lg z-50">
      <div className="px-md mb-xl flex flex-col gap-sm">
        <div className="flex items-center gap-sm">
          <span
            className="material-symbols-outlined text-[24px] text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            account_balance
          </span>
          <span className="font-sans text-lg font-bold text-on-surface tracking-tight">
            BlockBank
          </span>
        </div>
      </div>

      <ul className="flex flex-col flex-1 px-sm gap-xs">
        {userNavItems.map((item) => {
          const isActive = location.pathname === item.to;
          if (item.to === '#') {
            return (
              <li key={item.label}>
                <a
                  className="flex items-center gap-md px-md py-sm rounded text-on-surface-variant hover:bg-surface-container transition-colors"
                  href="#"
                  onClick={(e) => e.preventDefault()}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {item.label}
                  </span>
                </a>
              </li>
            );
          }
          return (
            <li key={item.label}>
              <Link
                className={`flex items-center gap-md px-md py-sm rounded ${
                  isActive
                    ? 'text-on-surface font-bold border-r-2 border-primary bg-surface-container transition-transform duration-100 scale-[0.98]'
                    : 'text-on-surface-variant hover:bg-surface-container transition-colors'
                }`}
                to={item.to}
              >
                <span
                  className="material-symbols-outlined"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="mt-auto">
          <a
            className="flex items-center gap-md px-md py-sm rounded text-on-surface-variant hover:bg-surface-container transition-colors"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="text-xs font-semibold uppercase tracking-wider">Settings</span>
          </a>
        </li>
        <li>
          <button
            type="button"
            onClick={logoutUser}
            className="flex items-center gap-md px-md py-sm rounded text-on-surface-variant hover:bg-surface-container transition-colors w-full text-left cursor-pointer"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-xs font-semibold uppercase tracking-wider">Logout</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default Sidebar;
