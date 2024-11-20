import React from 'react';
import { signOut } from 'next-auth/react';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <a href="/">AI Study Buddy</a>
      </div>
      <ul className="navbar-menu">
        <li>
          <a href="/dashboard">Dashboard</a>
        </li>
        <li>
          <button onClick={() => signOut()} className="logout-btn">
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
