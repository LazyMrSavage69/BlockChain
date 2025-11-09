'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from './navbar/page'; // Import the Navbar component

// Hero Section Component
function HeroSection() {
  const router = useRouter();
  return (

    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 px-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
        <div className="text-white space-y-6">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
            Create, Sign & Execute Smart Contracts Seamlessly
          </h1>
          <p className="text-lg md:text-xl text-purple-200 max-w-xl">
            Build secure smart contracts, communicate in real-time with signers, track live crypto prices, and create your unique blockchain avatar—all in one powerful platform.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => router.push('/create-contract')}
              className="px-8 py-3 bg-white text-purple-900 rounded-full font-semibold hover:bg-purple-100 transition-all shadow-lg hover:shadow-xl"
            >
              Create Contract
            </button>
            <button className="px-8 py-3 bg-purple-800 text-white rounded-full font-semibold hover:bg-purple-700 transition-all border border-purple-600">
              View Demo
            </button>
          </div>
        </div>

        {/* Smart Contract Illustration */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-md h-96">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-full opacity-30 blur-2xl animate-pulse"></div>
            <svg className="relative z-10 w-full h-full" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Smart contract document icon */}
              <rect x="100" y="80" width="200" height="240" rx="10" fill="url(#gradient1)" />
              <line x1="130" y1="120" x2="270" y2="120" stroke="white" strokeWidth="3" />
              <line x1="130" y1="150" x2="270" y2="150" stroke="white" strokeWidth="3" />
              <line x1="130" y1="180" x2="220" y2="180" stroke="white" strokeWidth="3" />
              {/* Blockchain nodes */}
              <circle cx="200" cy="280" r="20" fill="#8b5cf6" />
              <circle cx="150" cy="320" r="15" fill="#6366f1" />
              <circle cx="250" cy="320" r="15" fill="#6366f1" />
              <line x1="200" y1="300" x2="150" y2="305" stroke="#a855f7" strokeWidth="2" />
              <line x1="200" y1="300" x2="250" y2="305" stroke="#a855f7" strokeWidth="2" />
              <defs>
                <linearGradient id="gradient1" x1="100" y1="80" x2="300" y2="320">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

// Live Crypto Prices & Activity Section
function LiveActivitySection() {
  const [cryptoPrices, setCryptoPrices] = useState([
    { symbol: 'BTC', price: 0, change: 0 },
    { symbol: 'ETH', price: 0, change: 0 },
    { symbol: 'BNB', price: 0, change: 0 },
    { symbol: 'SOL', price: 0, change: 0 }
  ]);
  const [stats] = useState({
    activeContracts: 1247,
    totalSigned: 8956,
    activeUsers: 3421,
    blockchainTx: 15783
  });

  useEffect(() => {
    const fetchCryptoPrices = async () => {
      try {
        const [priceResponse, marketResponse] = await Promise.all([
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana&vs_currencies=usd'),
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana&vs_currencies=usd&include_24hr_change=true')
        ]);

        const priceData = await priceResponse.json();
        const marketData = await marketResponse.json();

        const updatedPrices = [
          {
            symbol: 'BTC',
            price: priceData.bitcoin?.usd || 0,
            change: marketData.bitcoin?.usd_24h_change || 0
          },
          {
            symbol: 'ETH',
            price: priceData.ethereum?.usd || 0,
            change: marketData.ethereum?.usd_24h_change || 0
          },
          {
            symbol: 'BNB',
            price: priceData.binancecoin?.usd || 0,
            change: marketData.binancecoin?.usd_24h_change || 0
          },
          {
            symbol: 'SOL',
            price: priceData.solana?.usd || 0,
            change: marketData.solana?.usd_24h_change || 0
          }
        ];

        setCryptoPrices(updatedPrices);
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
      }
    };

    fetchCryptoPrices();
    const interval = setInterval(fetchCryptoPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-indigo-950 to-purple-950">
      <div className="container mx-auto">
        <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Platform Activity & Live Crypto Prices</h2>
            <p className="text-purple-200">Real-time blockchain data and cryptocurrency market updates</p>
          </div>

          {/* Live Crypto Prices */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {cryptoPrices.map((crypto, index) => (
              <div
                key={index}
                className="bg-purple-950 rounded-lg p-4 text-center hover:bg-purple-900 transition-all"
              >
                <div className="text-purple-300 text-sm mb-1">{crypto.symbol}</div>
                <div className="text-2xl font-bold text-white mb-1">
                  ${crypto.price.toLocaleString()}
                </div>
                <div className={`text-sm font-semibold ${crypto.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {crypto.change >= 0 ? '↑' : '↓'} {Math.abs(crypto.change).toFixed(2)}%
                </div>
              </div>
            ))}
          </div>

          {/* Platform Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stats.activeContracts}</div>
              <div className="text-purple-300 text-sm">Active Contracts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stats.totalSigned}</div>
              <div className="text-purple-300 text-sm">Total Signed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stats.activeUsers}</div>
              <div className="text-purple-300 text-sm">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stats.blockchainTx}</div>
              <div className="text-purple-300 text-sm">Blockchain TX</div>
            </div>
          </div>

          {/* Progress Bar for platform adoption */}
          <div className="mt-8 space-y-4">
            <div className="flex justify-between text-white text-sm">
              <span>Platform Adoption</span>
              <span>82% to next milestone</span>
            </div>
            <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full" style={{ width: '82%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Features Section Component
function FeaturesSection() {
  const features = [
    {
      title: 'Smart Contract Creation',
      description: 'Build custom smart contracts with our intuitive interface. No coding required for simple contracts.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: 'Blockchain Storage',
      description: 'All contracts are securely stored on the blockchain with immutable records and transparent verification.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    {
      title: 'Real-Time Communication',
      description: 'Chat instantly with other parties when contracts are ready to sign. Get notifications and updates live.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      title: 'Live Crypto Tracking',
      description: 'Monitor real-time cryptocurrency prices and market data integrated directly into your dashboard.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      )
    },
    {
      title: 'Custom Avatars',
      description: 'Create and personalize your unique blockchain avatar that represents you across the platform.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      title: 'Digital Signatures',
      description: 'Sign contracts securely with cryptographic signatures. Verify authenticity instantly on the blockchain.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      )
    }
  ];

  return (
    <section id="features" className="py-20 px-4 bg-gradient-to-b from-purple-950 to-indigo-950">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Powerful Features for Blockchain Contracts
          </h2>
          <p className="text-purple-200 text-lg max-w-2xl mx-auto">
            Everything you need to create, manage, and execute smart contracts with confidence
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all hover:transform hover:scale-105"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-purple-200">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Roadmap Section Component
function RoadmapSection() {
  const roadmapItems = [
    {
      phase: 'Phase 1',
      title: 'Platform Launch',
      status: 'Completed',
      items: [
        'Smart contract creation interface',
        'Blockchain integration (Ethereum)',
        'User authentication & wallet connection',
        'Basic avatar system'
      ]
    },
    {
      phase: 'Phase 2',
      title: 'Enhanced Features',
      status: 'In Progress',
      items: [
        'Real-time chat for contract signers',
        'Live crypto price tracking',
        'Advanced avatar customization',
        'Multi-signature support'
      ]
    },
    {
      phase: 'Phase 3',
      title: 'Expansion',
      status: 'Upcoming',
      items: [
        'Multi-chain support (Polygon, BSC)',
        'Contract templates marketplace',
        'AI-powered contract analysis',
        'Mobile application launch'
      ]
    },
    {
      phase: 'Phase 4',
      title: 'Enterprise Solutions',
      status: 'Planned',
      items: [
        'Enterprise-grade API access',
        'White-label solutions',
        'Advanced analytics dashboard',
        'Compliance & legal integrations'
      ]
    }
  ];

  return (
    <section id="roadmap" className="py-20 px-4 bg-gradient-to-b from-indigo-950 to-purple-950">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Development Roadmap</h2>
          <p className="text-purple-200 text-lg max-w-2xl mx-auto">
            Our journey to revolutionize blockchain-based contracts
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {roadmapItems.map((item, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl p-8 border border-purple-500/20 hover:border-purple-500/40 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">{item.phase}</h3>
                <span className={`px-4 py-1 rounded-full text-sm font-semibold ${item.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                    item.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' :
                      item.status === 'Upcoming' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-purple-500/20 text-purple-400'
                  }`}>
                  {item.status}
                </span>
              </div>
              <h4 className="text-xl font-semibold text-purple-200 mb-4">{item.title}</h4>
              <ul className="space-y-2">
                {item.items.map((subItem, subIndex) => (
                  <li key={subIndex} className="flex items-start gap-2 text-purple-200">
                    <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{subItem}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Team Section Component
function TeamSection() {
  const teamMembers = [
    { name: 'Sarah Chen', role: 'CEO & Blockchain Architect', specialty: 'Smart Contracts' },
    { name: 'Michael Rodriguez', role: 'CTO & Lead Developer', specialty: 'Full-Stack' },
    { name: 'Emily Watson', role: 'Head of Security', specialty: 'Cryptography' },
    { name: 'David Kim', role: 'Blockchain Developer', specialty: 'Solidity' },
    { name: 'Jessica Park', role: 'UI/UX Designer', specialty: 'Product Design' },
    { name: 'Alex Johnson', role: 'Smart Contract Auditor', specialty: 'Security' }
  ];

  return (
    <section id="team" className="py-20 px-4 bg-gradient-to-b from-purple-950 via-pink-950 to-purple-950">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Meet Our Team</h2>
          <p className="text-purple-200 text-lg max-w-2xl mx-auto">
            Blockchain experts and developers building the future of smart contracts
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl p-8 text-center hover:transform hover:scale-105 transition-all"
            >
              <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold">
                {member.name.split(' ').map(n => n[0]).join('')}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
              <p className="text-purple-300 font-medium mb-1">{member.role}</p>
              <p className="text-purple-400 text-sm mb-4">{member.specialty}</p>
              <div className="flex justify-center gap-3">
                <a href="#" className="w-8 h-8 bg-purple-800 rounded-full flex items-center justify-center hover:bg-purple-700 transition-all" aria-label="LinkedIn">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 bg-purple-800 rounded-full flex items-center justify-center hover:bg-purple-700 transition-all" aria-label="Twitter">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 bg-purple-800 rounded-full flex items-center justify-center hover:bg-purple-700 transition-all" aria-label="GitHub">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Testimonials Section Component
function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Jennifer Martinez',
      role: 'Freelance Developer',
      text: 'This platform transformed how I handle contracts with clients. The real-time signing feature saved me days of back-and-forth emails.',
      rating: 5
    },
    {
      name: 'Robert Chang',
      role: 'Startup Founder',
      text: 'Being able to create and store contracts on the blockchain gives me peace of mind. The transparency is unmatched.',
      rating: 5
    },
    {
      name: 'Amanda Foster',
      role: 'Legal Consultant',
      text: 'The built-in communication feature makes coordinating with multiple signers incredibly easy. Highly recommended!',
      rating: 5
    },
    {
      name: 'Carlos Rivera',
      role: 'Business Owner',
      text: 'I love the avatar feature—it adds a personal touch. Plus, having live crypto prices integrated is super convenient.',
      rating: 5
    }
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-indigo-950 to-purple-950">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">What Our Users Say</h2>
          <p className="text-purple-200 text-lg max-w-2xl mx-auto">
            Success stories from individuals and businesses using our platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl p-8 border border-purple-500/20 hover:border-purple-500/40 transition-all"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{testimonial.name}</h3>
                  <p className="text-purple-300 text-sm">{testimonial.role}</p>
                </div>
              </div>
              <div className="flex gap-1 mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-purple-200 italic">&quot;{testimonial.text}&quot;</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// FAQ Section Component
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How do I create a smart contract on your platform?',
      answer: 'Simply sign up, connect your wallet, and use our intuitive contract builder. You can choose from templates or create custom contracts. No coding experience required for basic contracts.'
    },
    {
      question: 'Are my contracts secure on the blockchain?',
      answer: 'Yes! All contracts are stored on the blockchain with cryptographic security. Once deployed, they are immutable and transparent, ensuring maximum security and trust.'
    },
    {
      question: 'How does the real-time communication work?',
      answer: 'When a contract is ready for signing, all parties receive notifications. You can chat in real-time within the platform, discuss terms, and coordinate the signing process seamlessly.'
    },
    {
      question: 'Can I customize my blockchain avatar?',
      answer: 'Absolutely! Create your unique avatar with various customization options including colors, accessories, and styles. Your avatar represents you across the entire platform.'
    },
    {
      question: 'What cryptocurrencies do you support?',
      answer: 'We support major cryptocurrencies including BTC, ETH, BNB, and more. Live prices are displayed in real-time, and you can execute contracts using your preferred crypto.'
    },
    {
      question: 'How do digital signatures work?',
      answer: 'Digital signatures use your wallet\'s private key to cryptographically sign contracts. This ensures authenticity and non-repudiation. All signatures are verified on the blockchain.'
    },
    {
      question: 'What happens if there\'s a dispute?',
      answer: 'All contract terms and signatures are permanently recorded on the blockchain, providing an immutable audit trail. This transparency helps resolve disputes quickly and fairly.'
    },
    {
      question: 'Is there a fee for creating contracts?',
      answer: 'Basic contract creation is free. You only pay blockchain gas fees when deploying contracts to the network. Premium features and templates may have additional costs.'
    }
  ];

  return (
    <section id="faq" className="py-20 px-4 bg-gradient-to-b from-purple-950 to-indigo-950">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left side - Title and illustration */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-purple-200 text-lg mb-8">
              Everything you need to know about creating and managing smart contracts on our platform
            </p>
            <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl p-8 max-w-md">
              <div className="w-full h-64 bg-purple-800/30 rounded-lg flex items-center justify-center">
                <svg className="w-32 h-32 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Right side - FAQ List */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-xl border border-purple-500/20 overflow-hidden"
              >
                <button
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-purple-800/30 transition-all"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  aria-expanded={openIndex === index}
                >
                  <span className="text-white font-semibold pr-4">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-purple-400 transition-transform flex-shrink-0 ${openIndex === index ? 'rotate-180' : ''
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-4">
                    <p className="text-purple-200">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Footer Component
function Footer() {
  return (
    <footer className="bg-gradient-to-b from-indigo-950 to-black py-12 px-4">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="text-white font-bold text-xl mb-4">SmartContract.io</h3>
            <p className="text-purple-200 text-sm">
              Revolutionizing how contracts are created, signed, and executed on the blockchain.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-purple-200 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Create Contract</a></li>
              <li><a href="#" className="hover:text-white transition-colors">My Contracts</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Live Crypto Prices</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Avatar Studio</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-purple-200 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-semibold mb-4">Stay Updated</h4>
            <p className="text-purple-200 text-sm mb-3">Get the latest updates on blockchain contracts</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-4 py-2 rounded-full bg-purple-900 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <button className="px-4 py-2 bg-white text-purple-900 rounded-full font-semibold hover:bg-purple-100 transition-all text-sm">
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Social Links & Copyright */}
        <div className="border-t border-purple-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-purple-300 text-sm">
            Copyright © 2025 SmartContract.io. All Rights Reserved
          </p>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 bg-purple-800 rounded-full flex items-center justify-center hover:bg-purple-700 transition-all" aria-label="Twitter">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
              </svg>
            </a>
            <a href="#" className="w-10 h-10 bg-purple-800 rounded-full flex items-center justify-center hover:bg-purple-700 transition-all" aria-label="Discord">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>
            <a href="#" className="w-10 h-10 bg-purple-800 rounded-full flex items-center justify-center hover:bg-purple-700 transition-all" aria-label="GitHub">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a href="#" className="w-10 h-10 bg-purple-800 rounded-full flex items-center justify-center hover:bg-purple-700 transition-all" aria-label="Telegram">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Page Component
export default function Page() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-950 to-black">
      {/* Use Navbar component with null user to show not logged in state */}
      <Navbar user={null} />

      <div className="pt-16"> {/* Padding to account for fixed navbar */}
        <HeroSection />
        <LiveActivitySection />
        <FeaturesSection />
        <RoadmapSection />
        <TeamSection />
        <TestimonialsSection />
        <FAQSection />
        <Footer />
      </div>
    </main>
  );
}
