import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link${isActive ? ' nav-link--active' : ''}`;

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="logo">CartScout</span>
          <nav className="nav-main">
            <NavLink to="/home" className={navClass} end>
              Home
            </NavLink>
            <NavLink to="/lists" className={navClass}>
              Lists
            </NavLink>
            <NavLink to="/settings" className={navClass}>
              Settings
            </NavLink>
          </nav>
          <div className="topbar-user">
            <span className="muted small">{user?.email}</span>
            <button type="button" className="btn btn-ghost" onClick={() => logout()}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
