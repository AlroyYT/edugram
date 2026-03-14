import React, { useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { useTranslation } from 'react-i18next';

const Navbar = () => {
  const navbarRef = useRef<HTMLElement | null>(null);
  const { t } = useTranslation();

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
        <a href="/">{t("navbar_brand")}</a>
      </div>

      <ul className="edu-navbar-menu">
        <li>
          <a href="/dashboard">{t("nav_dashboard")}</a>
        </li>
        <li>
          <a href="/courses">{t("nav_courses")}</a>
        </li>
        <li>
          <a href="/resources">{t("nav_resources")}</a>
        </li>
        <li>
          <button onClick={() => signOut()} className="edu-logout-btn">
            {t("nav_logout")}
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
