import React, { useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';

const Navbar = () => {
  const navbarRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const navbar = navbarRef.current;
      if (navbar && navbar.classList) {
        if (window.scrollY > 50) {
          navbar.classList.add('edu-navbar-scrolled');
        } else {
          navbar.classList.remove('edu-navbar-scrolled');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="edu-navbar" ref={navbarRef}>
      <div className="edu-navbar-brand">
        <a href="/">EDUGRAM</a>
      </div>

      <ul className="edu-navbar-menu">
        <li>
          <a href="/dashboard">Dashboard</a>
        </li>
        <li>
          <a href="/courses">Courses</a>
        </li>
        <li>
          <a href="/resources">Resources</a>
        </li>
        <li>
          <button onClick={() => signOut()} className="edu-logout-btn">
            Log Out
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
