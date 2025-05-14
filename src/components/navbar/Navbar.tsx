/**
 * @fileoverview Navigation Bar Component
 * A responsive navigation bar with user authentication state,
 * mobile menu support, and profile dropdown functionality.
 */

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../config/firebase';
import { signOut } from 'firebase/auth';
import { useState, useRef, useEffect } from 'react';
import { FaHome, FaPlus, FaUser, FaSignOutAlt, FaBars, FaBell, FaCode, FaKeyboard, FaSun, FaMoon } from 'react-icons/fa';
import { LetterAvatar } from '../../components/common';
import { useNotifications } from '../../pages/notifications/NotificationsPage';
import './Navbar.css';
import { useTheme } from '../../context/ThemeContext';

// Define navigation item type
interface NavItem {
  path: string;
  label: string;
  icon: JSX.Element;
  showWhen: 'always' | 'authenticated';
}

/**
 * Navbar Component
 * Main navigation component with responsive design and authentication features
 */
const Navbar = () => {
  // Authentication and routing hooks
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { theme, toggleTheme } = useTheme();

  // Local state for menu controls
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileProfileMenu, setShowMobileProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);

  // Define navigation items in a single place
  const navItems: NavItem[] = [
    {
      path: '/feed',
      label: 'Home',
      icon: <FaHome />,
      showWhen: 'always'
    },
    {
      path: '/createPost',
      label: 'Create',
      icon: <FaPlus />,
      showWhen: 'always'
    },
    {
      path: '/notifications',
      label: 'Notifications',
      icon: (
        <div className="notification-icon">
          <FaBell />
          {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
        </div>
      ),
      showWhen: 'authenticated'
    }
  ];

  /**
   * Handle clicks outside both menus to close them
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Desktop profile menu
      if (profileMenuRef.current && 
          !profileMenuRef.current.contains(event.target as Node) && 
          !(event.target as Element).closest('.avatar-button')) {
        setShowProfileMenu(false);
      }
      
      // Mobile menu
      if (mobileMenuRef.current && 
          !mobileMenuRef.current.contains(event.target as Node) && 
          !(event.target as Element).closest('.mobile-toggle')) {
        setIsOpen(false);
      }
      
      // Don't handle mobile profile menu here - it's handled by the overlay
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handle keyboard accessibility for dropdown menus
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close menus on Escape
      if (e.key === 'Escape') {
        if (showProfileMenu) {
          setShowProfileMenu(false);
          profileMenuButtonRef.current?.focus();
        }
        if (showMobileProfileMenu) {
          setShowMobileProfileMenu(false);
        }
        if (isOpen) {
          setIsOpen(false);
          mobileMenuButtonRef.current?.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showProfileMenu, showMobileProfileMenu, isOpen]);

  /**
   * Set focus on first menu item when menus open
   */
  useEffect(() => {
    if (showProfileMenu && firstMenuItemRef.current) {
      firstMenuItemRef.current.focus();
    }
  }, [showProfileMenu]);

  /**
   * Handle navigation and menu state
   * @param {string} path - Route path to navigate to
   */
  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setShowProfileMenu(false);
    setShowMobileProfileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Handle user logout
   */
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsOpen(false);
      setShowProfileMenu(false);
      setShowMobileProfileMenu(false);
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  /**
   * Check if current route is an authentication page
   */
  const isAuthPage = () => {
    return ['/forgot-password', '/register', '/'].includes(location.pathname);
  };

  /**
   * Check if a route is currently active
   * @param {string} path - Route path to check
   */
  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  // Don't render navbar on auth pages
  if (isAuthPage()) {
    return null;
  }

  /**
   * Toggle profile menu with keyboard support
   */
  const toggleProfileMenu = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowProfileMenu(prev => !prev);
  };

  /**
   * Toggle mobile menu with keyboard support
   */
  const toggleMobileMenu = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsOpen(prev => !prev);
  };

  // Render a navigation item
  const renderNavItem = (item: NavItem, isMobile = false, itemIndex: number = 0) => {
    if (item.showWhen === 'authenticated' && !user) return null;
    
    const className = isMobile ? 
      `bottom-nav-item ${isActiveRoute(item.path) ? 'active' : ''}` : 
      `nav-link ${isActiveRoute(item.path) ? 'active' : ''}`;
    
    return (
      <button 
        key={item.path}
        className={className}
        onClick={() => handleNavigation(item.path)}
        aria-label={item.label}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleNavigation(item.path);
          }
        }}
        ref={itemIndex === 0 ? firstMenuItemRef : undefined}
      >
        {item.icon}
        <span>{item.label}</span>
      </button>
    );
  };

  /**
   * Render a profile dropdown with user info and options
   */
  const renderProfileDropdown = (isMobile = false) => {
    const containerClass = isMobile ? "mobile-profile-dropdown" : "profile-dropdown";
    const containerRef = isMobile ? mobileProfileMenuRef : profileMenuRef;
    
    return (
      <>
        {isMobile && <div className="mobile-overlay" onClick={() => setShowMobileProfileMenu(false)} />}
        <div 
          className={containerClass} 
          ref={containerRef}
          role="menu"
          aria-label="User menu"
        >
          <div className="dropdown-header">
            <span>{user?.displayName}</span>
            <small>{user?.email}</small>
          </div>
          <button 
            className="dropdown-item theme-toggle-mobile"
            onClick={(e) => {
              e.stopPropagation();
              toggleTheme();
              setShowProfileMenu(false);
              setShowMobileProfileMenu(false);
            }}
          >
            {theme === 'light' ? (
              <>
                <FaMoon /> Switch to Dark Mode
              </>
            ) : (
              <>
                <FaSun /> Switch to Light Mode
              </>
            )}
          </button>
          <button 
            className="dropdown-item"
            onClick={(e) => {
              e.stopPropagation(); // Stop event propagation
              handleNavigation('/profile');
            }}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNavigation('/profile');
              }
            }}
          >
            <FaUser /> Profile
          </button>
          <button 
            className="dropdown-item"
            onClick={(e) => {
              e.stopPropagation(); // Stop event propagation
              handleNavigation('/settings/keyboard-shortcuts');
            }}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNavigation('/settings/keyboard-shortcuts');
              }
            }}
          >
            <FaKeyboard /> Keyboard Shortcuts
          </button>
          <button 
            className="dropdown-item"
            onClick={(e) => {
              e.stopPropagation(); // Stop event propagation
              handleLogout();
            }}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleLogout();
              }
            }}
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </>
    );
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo/Brand */}
        <Link 
          to="/feed" 
          className="navbar-logo"
          onClick={() => setIsOpen(false)}
        >
          <FaCode className="logo-icon" />
          <span className="logo-text">DevShare</span>
        </Link>

        {/* Main Navigation Content */}
        <div 
          ref={mobileMenuRef}
          className={`navbar-content ${isOpen ? 'active' : ''}`}
        >
          <div className="nav-links">
            {/* Navigation Links */}
            {navItems.filter(item => item.label !== 'Profile').map((item, index) => renderNavItem(item, false, index))}
          </div>
            
          {/* Profile Menu - Desktop only */}
          {user && (
            <div className="profile-menu-container" ref={profileMenuRef}>
              <button 
                className="avatar-button"
                onClick={toggleProfileMenu}
                aria-label="User menu"
                ref={profileMenuButtonRef}
              >
                <LetterAvatar 
                  name={user?.displayName || "User"} 
                  size="small" 
                />
              </button>

              {showProfileMenu && renderProfileDropdown()}
            </div>
          )}
        </div>

        {/* Mobile Bottom Navbar Toggle Button - Only visible on mobile */}
        <button 
          className="mobile-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation"
          ref={mobileMenuButtonRef}
        >
          <FaBars />
        </button>
      </div>
      
      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-bottom-navbar">
        {navItems.filter(item => item.label !== 'Profile').map((item, index) => renderNavItem(item, true, index))}
        
        {/* Add Profile Avatar with Dropdown for Mobile */}
        {user && (
          <div className="mobile-profile-container" ref={mobileProfileMenuRef}>
            <button 
              className="bottom-nav-item"
              onClick={(e) => {
                e.stopPropagation();
                setShowMobileProfileMenu(!showMobileProfileMenu);
              }}
              aria-label="User menu"
              ref={mobileMenuButtonRef}
            >
              <LetterAvatar 
                name={user.displayName || 'User'} 
                size="small"
              />
              <span>Profile</span>
            </button>
            
            {showMobileProfileMenu && renderProfileDropdown(true)}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
