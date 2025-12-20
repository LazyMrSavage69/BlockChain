"use client";
import Navbar from '@/app/navbar/page';
import { useRouter } from 'next/navigation';

export default function RoadMapPage() {
    const router = useRouter();

    const phases = [
        {
            id: "Phase 1",
            title: "Foundation & Launch",
            status: "completed",
            items: [
                "Core Platform Development",
                "Smart Contract Integration",
                "Basic User Authentication",
                "Initial UI/UX Design"
            ]
        },
        {
            id: "Phase 2",
            title: "Enhancement & AI",
            status: "current",
            items: [
                "Advanced AI Analysis Integration",
                "Marketplace for Templates",
                "Enhanced Security Audits",
                "Mobile Responsiveness Optimization"
            ]
        },
        {
            id: "Phase 3",
            title: "Scaling & Ecosystem",
            status: "upcoming",
            items: [
                "Cross-Chain Compatibility",
                "Mobile App Development (iOS/Android)",
                "Enterprise API Solutions",
                "DAO Governance Implementation"
            ]
        },
        {
            id: "Phase 4",
            title: "Global Adoption",
            status: "upcoming",
            items: [
                "Global Legal Compliance Frameworks",
                "Multi-Language Support",
                "Integration with Major ERP Systems",
                "Decentralized Identity Verification"
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 text-white">
            <Navbar user={null} />

            <div className="container mx-auto px-4 pt-32 pb-16">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 mb-6">
                        Project Roadmap
                    </h1>
                    <p className="text-xl text-purple-200 max-w-2xl mx-auto">
                        Our strategic vision for the future of digital contracting.
                    </p>
                </div>

                <div className="relative max-w-4xl mx-auto">
                    {/* Vertical Line */}
                    <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-purple-500/30 transform -translate-x-1/2"></div>

                    <div className="space-y-12">
                        {phases.map((phase, index) => (
                            <div key={index} className={`relative flex flex-col md:flex-row gap-8 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>

                                {/* Timeline Dot */}
                                <div className="absolute left-8 md:left-1/2 w-8 h-8 rounded-full border-4 border-indigo-900 transform -translate-x-1/2 mt-6 z-10 flex items-center justify-center
                        ${phase.status === 'completed' ? 'bg-green-500' : phase.status === 'current' ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'}">
                                </div>

                                {/* Content Card */}
                                <div className="md:w-1/2 pl-20 md:pl-0 md:pr-12 md:text-right">
                                    <div className={`bg-white/5 backdrop-blur-md border border-purple-500/20 p-6 rounded-xl hover:bg-white/10 transition-all
                            ${index % 2 === 0 ? 'md:mr-12' : 'md:ml-12 md:text-left'}`}>
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 uppercase tracking-wide
                                ${phase.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                                phase.status === 'current' ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-500/20 text-gray-400'}`}>
                                            {phase.status}
                                        </span>
                                        <h2 className="text-2xl font-bold mb-2 text-white">{phase.id}: {phase.title}</h2>
                                        <ul className="space-y-2">
                                            {phase.items.map((item, i) => (
                                                <li key={i} className={`text-purple-300 text-sm ${phase.status === 'completed' ? 'line-through opacity-70' : ''}`}>
                                                    • {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                {/* Empty Space for alignment */}
                                <div className="md:w-1/2 hidden md:block"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
