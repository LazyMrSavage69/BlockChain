"use client";
import { useState, useEffect } from 'react';
import Navbar from '@/app/navbar/page';
import { useRouter } from 'next/navigation';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

interface DashboardStats {
    totalContracts: number;
    cryptoSpent: number;
    interactionCount: number;
}

interface User {
    id: number;
    email: string;
    name: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState<DashboardStats>({
        totalContracts: 0,
        cryptoSpent: 0,
        interactionCount: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    // Mock data for charts (since we don't have historical data endpoints yet)
    const activityData = [
        { name: 'Jan', contracts: 2 },
        { name: 'Feb', contracts: 5 },
        { name: 'Mar', contracts: 3 },
        { name: 'Apr', contracts: 8 },
        { name: 'May', contracts: 12 },
        { name: 'Jun', contracts: 7 },
    ];

    const contractStatusData = [
        { name: 'Active', value: 4, color: '#8884d8' },
        { name: 'Pending', value: 3, color: '#82ca9d' },
        { name: 'Completed', value: 7, color: '#ffc658' },
    ];

    useEffect(() => {
        fetchUserAndStats();
    }, []);

    const fetchUserAndStats = async () => {
        try {
            // 1. Fetch User
            const userRes = await fetch('/api/me', { credentials: 'include' });
            if (!userRes.ok) {
                router.push('/');
                return;
            }
            const userData = await userRes.json();
            setUser(userData);

            // 2. Fetch Stats using User ID
            const statsRes = await fetch(`/api/dashboard/stats?userId=${userData.id}`, {
                credentials: 'include'
            });

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
            setUser(null);
            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-indigo-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 text-white">
            <Navbar user={user} onLogout={handleLogout} />

            <div className="container mx-auto px-4 pt-24 pb-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}</h1>
                    <p className="text-purple-300">Here is an overview of your all-time activity and performance.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {/* Contracts Card */}
                    <div className="bg-white/10 backdrop-blur-md border border-purple-500/20 rounded-2xl p-6 shadow-xl hover:transform hover:scale-105 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-blue-500/20 rounded-full text-blue-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-purple-300 text-sm font-medium">Total Contracts</p>
                                <h3 className="text-3xl font-bold">{stats.totalContracts}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Interactions Card */}
                    <div className="bg-white/10 backdrop-blur-md border border-purple-500/20 rounded-2xl p-6 shadow-xl hover:transform hover:scale-105 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-green-500/20 rounded-full text-green-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-purple-300 text-sm font-medium">Unique Interactions</p>
                                <h3 className="text-3xl font-bold">{stats.interactionCount}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Crypto Spent Card */}
                    <div className="bg-white/10 backdrop-blur-md border border-purple-500/20 rounded-2xl p-6 shadow-xl hover:transform hover:scale-105 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-yellow-500/20 rounded-full text-yellow-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-purple-300 text-sm font-medium">Crypto Spent</p>
                                <h3 className="text-3xl font-bold">${stats.cryptoSpent.toLocaleString()}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Activity Chart */}
                    <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-6">
                        <h3 className="text-xl font-bold mb-6">Contract Activity (Mock Data)</h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={activityData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#4a4a4a" />
                                    <XAxis dataKey="name" stroke="#a78bfa" />
                                    <YAxis stroke="#a78bfa" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e1b4b', borderColor: '#7c3aed' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Line type="monotone" dataKey="contracts" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* User Distribution Chart */}
                    <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-6">
                        <h3 className="text-xl font-bold mb-6">Contract Status (Mock Data)</h3>
                        <div className="h-72 w-full flex justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={contractStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {contractStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e1b4b', borderColor: '#7c3aed' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col justify-center space-y-2 ml-4">
                                {contractStatusData.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                        <span className="text-sm text-purple-200">{entry.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
