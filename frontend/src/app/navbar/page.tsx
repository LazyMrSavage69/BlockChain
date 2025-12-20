"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  user?: {
    name: string;
    email?: string;
  } | null;
  onLogout?: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const notLoggedLinks = [
    { name: "Home", href: "/" },
    { name: "Features", href: "/Features" },
    { name: "RoadMap", href: "/RoadMap" },
    { name: "Team", href: "/Team" },
    { name: "FAQ", href: "/FAQ" },
  ];

  const loggedLinks = [
    { name: "Avatar", href: "/avatar" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "MarketPlace", href: "/marketplace" },
    { name: "Contracts", href: "/contractspage" },
    { name: "Subscription", href: "/subscription" },
    { name: "Ask Ai", href: "/askai" },
    { name: "Interact", href: "/interact" },
    { name: "Messages", href: "/messages" }
  ];

  const activeLinks = user ? loggedLinks : notLoggedLinks;

  const handleLogin = () => router.push('/login');

  const handleLogout = () => {
    onLogout?.();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-indigo-950/80 backdrop-blur-lg border-b border-purple-500/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => router.push('/')}
            className="text-white font-bold text-2xl flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Ethéré
          </button>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {activeLinks.map(link => (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className="text-white hover:text-purple-300 transition-colors"
              >
                {link.name}
              </button>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* User Menu or Login Button */}
            {user ? (
              <div className="relative hidden md:block" ref={userMenuRef}>
                {/* User Menu Button */}
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-full bg-purple-800 hover:bg-purple-700 transition-all"
                  aria-label="User menu"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-indigo-900 rounded-lg shadow-xl border border-purple-500/30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-purple-500/20">
                      <p className="text-white font-semibold">{user.name}</p>
                      {user.email && <p className="text-purple-300 text-sm">{user.email}</p>}
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          router.push('/report-contract');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-purple-800/50 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Report a Contract
                      </button>

                      <button
                        onClick={() => {
                          router.push('/report-user');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-purple-800/50 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Report a User
                      </button>

                      <hr className="my-2 border-purple-500/20" />

                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="hidden md:block px-6 py-2 bg-white text-purple-900 rounded-full font-semibold hover:bg-purple-100 transition-all"
              >
                Sign In
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-white"
              aria-label="Toggle mobile menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-purple-500/20">
            <div className="flex flex-col space-y-4">
              {activeLinks.map(link => (
                <button
                  key={link.href}
                  onClick={() => {
                    router.push(link.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-white hover:text-purple-300 transition-colors text-left"
                >
                  {link.name}
                </button>
              ))}

              {user ? (
                <>
                  <hr className="border-purple-500/20" />
                  <button
                    onClick={() => {
                      router.push('/report-contract');
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-white hover:text-purple-300 transition-colors text-left"
                  >
                    Report a Contract
                  </button>
                  <button
                    onClick={() => {
                      router.push('/report-user');
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-white hover:text-purple-300 transition-colors text-left"
                  >
                    Report a User
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="px-6 py-2 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition-all w-full"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  className="px-6 py-2 bg-white text-purple-900 rounded-full font-semibold hover:bg-purple-100 transition-all w-full"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
