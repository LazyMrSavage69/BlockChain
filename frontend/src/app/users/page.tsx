"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/navbar/page';

interface User {
    id: number;
    email: string;
    name: string;
}

export default function UsersPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const response = await fetch('/api/me', {
                credentials: 'include',
            });
            if (response.ok) {
                const userData = await response.json();
                setCurrentUser(userData);
            }
        } catch (err) {
            console.error('Error fetching current user:', err);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setHasSearched(true);
        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setSearchResults(data || []);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Error searching users:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
            setCurrentUser(null);
            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
            <Navbar user={currentUser} onLogout={handleLogout} />

            <div className="pt-24 px-4 container mx-auto max-w-4xl">
                <h1 className="text-4xl font-bold text-white mb-8 text-center">User Directory</h1>

                {/* Search Section */}
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-purple-500/30 mb-8">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search users by name or email..."
                            className="flex-1 px-6 py-4 bg-indigo-900/50 border border-purple-500/30 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-lg"
                        />
                        <button
                            type="submit"
                            disabled={isSearching}
                            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
                        >
                            {isSearching ? (
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            )}
                            Search
                        </button>
                    </form>
                </div>

                {/* Results Section */}
                {hasSearched && (
                    <div className="grid gap-4">
                        {searchResults.length > 0 ? (
                            searchResults.map((user) => (
                                <div key={user.id} className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20 hover:bg-white/10 transition-all flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                        {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">{user.name}</h3>
                                        <p className="text-purple-300">{user.email}</p>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/report-user?name=${encodeURIComponent(user.name)}`)}
                                        className="ml-auto px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all text-sm font-medium border border-red-500/30"
                                    >
                                        Report
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-purple-300 bg-white/5 rounded-xl border border-purple-500/20">
                                <p className="text-xl">No users found matching "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
