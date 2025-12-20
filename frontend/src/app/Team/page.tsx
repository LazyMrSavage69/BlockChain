"use client";
import Navbar from '@/app/navbar/page';
import { useRouter } from 'next/navigation';

export default function TeamPage() {
    const router = useRouter();

    const team = [
        {
            name: "Oussama Mahersi",
            role: "Full Stack Expert",
            description: " Lead Architect & Developer. Passionate about blockchain, scalable systems, and building seamless user experiences.",
            avatar: "OM", // Initials as placeholder or link to image
            color: "from-blue-500 to-indigo-600"
        },
        {
            name: "Front End Dev",
            role: "Front End Developer",
            description: "UI/UX Specialist. Focused on crafting intuitive, responsive, and beautiful interfaces using modern web technologies.",
            avatar: "FE",
            color: "from-purple-500 to-pink-600"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 text-white">
            <Navbar user={null} />

            <div className="container mx-auto px-4 pt-32 pb-16">
                <div className="text-center mb-20">
                    <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-indigo-400 mb-6">
                        Meet Our Team
                    </h1>
                    <p className="text-xl text-purple-200 max-w-2xl mx-auto">
                        The minds behind the innovation.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-12">
                    {team.map((member, index) => (
                        <div key={index} className="group relative w-full max-w-sm">
                            <div className={`absolute -inset-0.5 bg-gradient-to-r ${member.color} rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt`}></div>
                            <div className="relative bg-indigo-900 rounded-2xl p-8 flex flex-col items-center text-center h-full border border-white/10">
                                <div className={`w-32 h-32 mb-6 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center text-3xl font-bold border-4 border-indigo-950 shadow-lg`}>
                                    {member.avatar}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">{member.name}</h3>
                                <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-purple-300 text-sm font-semibold mb-4">
                                    {member.role}
                                </span>
                                <p className="text-gray-300 leading-relaxed">
                                    {member.description}
                                </p>

                                <div className="mt-6 flex space-x-4">
                                    {/* Placeholder Social Icons */}
                                    <button className="text-purple-400 hover:text-white transition-colors">
                                        <span className="sr-only">GitHub</span>
                                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <button className="text-purple-400 hover:text-white transition-colors">
                                        <span className="sr-only">LinkedIn</span>
                                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
