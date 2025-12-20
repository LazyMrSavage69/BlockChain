"use client";
import Navbar from '@/app/navbar/page';
import { useRouter } from 'next/navigation';

export default function FeaturesPage() {
    const router = useRouter();

    const features = [
        {
            title: "Smart Contract Templates",
            description: "Choose from a variety of pre-vetted, legally sound templates for various needs including freelance work, rentals, and sales.",
            icon: (
                <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            title: "AI-Powered Assistance",
            description: "Our advanced AI helps you draft, review, and understand contract clauses, ensuring clarity and fairness for all parties.",
            icon: (
                <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            )
        },
        {
            title: "Blockchain Security",
            description: "Contracts are secured on the blockchain, providing immutable proof of agreement and transaction history.",
            icon: (
                <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            )
        },
        {
            title: "Secure Payments",
            description: "Integrated escrow and payment systems ensure funds are released only when contract terms are met.",
            icon: (
                <svg className="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 text-white">
            <Navbar user={null} />

            <div className="container mx-auto px-4 pt-32 pb-16">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-6">
                        Platform Features
                    </h1>
                    <p className="text-xl text-purple-200 max-w-2xl mx-auto">
                        Discover the tools that make Ethéré the advanced solution for secure and intelligent digital agreements.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="bg-white/5 backdrop-blur-lg border border-purple-500/20 p-8 rounded-2xl hover:bg-white/10 transition-all transform hover:-translate-y-2">
                            <div className="bg-indigo-900/50 rounded-full w-20 h-20 flex items-center justify-center mb-6">
                                {feature.icon}
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-white">{feature.title}</h3>
                            <p className="text-purple-300 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
