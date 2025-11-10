/**
 * Navigation Bar Component
 * 
 * Responsive navigation with desktop top navbar and mobile bottom navbar.
 * Features user profile dropdown, navigation menu, and logout functionality.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconType } from "react-icons";
import { FaHome, FaPlus, FaBell, FaUser, FaSignOutAlt, FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../common/ThemeToggle/ThemeToggle';
import LetterAvatar from '../common/LetterAvatar/LetterAvatar';
import './Navbar.css';

interface User {
  username: string;
  email: string;
}

interface NavbarProps {
  user?: User | null;
  onLogout: () => void;
  unreadCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ user = null, onLogout, unreadCount = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = () => {
    onLogout();
    setIsProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  const navItems: { id: string; label: string; icon: IconType; path: string }[] = [
    { id: 'feed', label: 'Home', icon: FaHome, path: '/feed' },
    { id: 'create', label: 'Create', icon: FaPlus, path: '/create' },
    { id: 'notifications', label: 'Notifications', icon: FaBell, path: '/notifications' }
  ];

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="navbar navbar-desktop">
        <div className="navbar-container">
          {/* Logo */}
          <div className="navbar-logo" onClick={() => navigate('/feed')}>
            <span className="logo-icon">&lt;/&gt;</span>
            <span className="logo-text">DevShare</span>
          </div>

          {/* Navigation Items */}
          <div className="navbar-items">
            {navItems.map((item) => {
              const IconComponent = item.icon as React.ComponentType<{ className?: string }>;
              return (
                <button
                  key={item.id}
                  className={`navbar-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <span className="navbar-icon">
                    <IconComponent />
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="badge badge-dot" aria-label={`${unreadCount} unread`}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </span>
                  <span className="navbar-label">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Profile Section */}
          <div className="profile-section" ref={dropdownRef}>
            <button 
              className="profile-avatar-btn"
              onClick={toggleProfileDropdown}
            >
              <LetterAvatar 
                name={user?.username || 'User'} 
                size="medium"
                className="profile-avatar"
              />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className="profile-dropdown">
                <div className="profile-info">
                  <div className="profile-name">{user?.username || 'User'}</div>
                  <div className="profile-email">{user?.email || 'user@example.com'}</div>
                </div>
                
                <div className="dropdown-divider"></div>
                
                <div className="dropdown-menu">
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      navigate('/profile');
                      setIsProfileDropdownOpen(false);
                    }}
                  >
                    <FaUser className="dropdown-icon" />
                    Profile
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      toggleTheme();
                      setIsProfileDropdownOpen(false);
                    }}
                  >
                    {theme === 'light' ? <FaMoon className="dropdown-icon" /> : <FaSun className="dropdown-icon" />}
                    {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                  </button>
                  <button 
                    className="dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt className="dropdown-icon" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="navbar navbar-mobile">
        <div className="navbar-mobile-container">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                className={`navbar-mobile-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <div className="mobile-icon-container">
                  <span className="navbar-mobile-icon">
                    <IconComponent />
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="badge badge-dot">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </span>
                </div>
                <span className="navbar-mobile-label">{item.label}</span>
              </button>
            );
          })}
          
          {/* Mobile Profile with Dropdown */}
          <div className="mobile-profile-section" ref={mobileMenuRef}>
            <button 
              className={`navbar-mobile-item ${isActive('/profile') ? 'active' : ''}`}
              onClick={toggleMobileMenu}
            >
              <div className="mobile-icon-container">
                <LetterAvatar 
                  name={user?.username || 'User'} 
                  size="small"
                  className="mobile-profile-avatar"
                />
              </div>
              <span className="navbar-mobile-label">Profile</span>
            </button>

            {/* Mobile Profile Dropdown */}
            {isMobileMenuOpen && (
              <div className="mobile-profile-dropdown">
                <div className="profile-info">
                  <div className="profile-name">{user?.username || 'User'}</div>
                  <div className="profile-email">{user?.email || 'user@example.com'}</div>
                </div>
                
                <div className="dropdown-divider"></div>
                
                <div className="dropdown-menu">
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      navigate('/profile');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <FaUser className="dropdown-icon" />
                    Profile
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      toggleTheme();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    {theme === 'light' ? <FaMoon className="dropdown-icon" /> : <FaSun className="dropdown-icon" />}
                    {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                  </button>
                  <button 
                    className="dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt className="dropdown-icon" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
