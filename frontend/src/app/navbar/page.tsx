"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Marketplace from '../marketplace/page';
interface NavbarProps {
  user?: {
    name: string;
    email?: string;
  } | null;
  onLogout?: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const notLoggedLinks = [
    { name: "Home", href: "/" },
    { name: "Features", href: "/Features" },
    { name: "RoadMap", href: "/RoadMap" },
    { name: "Team", href: "/Team" },
    { name: "FAQ", href: "/FAQ" },
  ];

  const loggedLinks = [
    { name: "Avatar", href: "/avatar" },
    { name: "User Info", href: "/users" },
    { name: "MarketPlace", href: "/marketplace" },
    { name: "Contracts", href: "/contractspage" },
  ];

  const activeLinks = user ? loggedLinks : notLoggedLinks;

  const handleLogin = () => router.push('/login');

  const handleLogout = () => {
    onLogout?.();
    router.push('/');
  };

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
            SmartContract
          </button>

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

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full bg-purple-800 hover:bg-purple-700 transition-all"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>

            {/* User Menu or Login Button */}
            {user ? (
              // keep your existing user dropdown here (unchanged)
              <div className="relative hidden md:block">
                {/* ... your current user dropdown code ... */}
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="hidden md:block px-6 py-2 bg-white text-purple-900 rounded-full font-semibold hover:bg-purple-100 transition-all"
              >
                Sign In
              </button>
            )}

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

        {/* ✅ Mobile Menu (dynamic) */}
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
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-6 py-2 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition-all w-full"
                >
                  Logout
                </button>
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
