'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/navbar/page';

interface User {
  id: number;
  email: string;
  name: string;
}

export default function AvatarCreator() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState('avataaars');
  const [seed, setSeed] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const router = useRouter();

  // DiceBear styles
  const styles = [
    { id: 'avataaars', name: 'Avataaars', desc: 'Playful cartoon avatars' },
    { id: 'bottts', name: 'Bottts', desc: 'Cute robot characters' },
    { id: 'personas', name: 'Personas', desc: 'Modern minimal faces' },
    { id: 'lorelei', name: 'Lorelei', desc: 'Elegant illustrated portraits' },
    { id: 'notionists', name: 'Notionists', desc: 'Notion-style avatars' },
    { id: 'pixel-art', name: 'Pixel Art', desc: 'Retro 8-bit style' },
    { id: 'adventurer', name: 'Adventurer', desc: 'Adventure characters' },
    { id: 'big-smile', name: 'Big Smile', desc: 'Happy smiley faces' },
    { id: 'micah', name: 'Micah', desc: 'Geometric abstract' },
    { id: 'miniavs', name: 'Miniavs', desc: 'Minimal avatars' },
    { id: 'adventurer-neutral', name: 'Adventurer Neutral', desc: 'Neutral adventure' },
    { id: 'big-ears', name: 'Big Ears', desc: 'Cute with big ears' },
    { id: 'big-ears-neutral', name: 'Big Ears Neutral', desc: 'Neutral big ears' },
    { id: 'croodles', name: 'Croodles', desc: 'Doodle style' },
    { id: 'croodles-neutral', name: 'Croodles Neutral', desc: 'Neutral doodles' },
    { id: 'fun-emoji', name: 'Fun Emoji', desc: 'Emoji style' },
    { id: 'identicon', name: 'Identicon', desc: 'Geometric pattern' },
    { id: 'open-peeps', name: 'Open Peeps', desc: 'Hand-drawn style' }
  ];

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    // Generate avatar URL when style or seed changes
    if (seed) {
      const url = `https://api.dicebear.com/7.x/${selectedStyle}/svg?seed=${encodeURIComponent(seed)}`;
      setAvatarUrl(url);
    }
  }, [selectedStyle, seed]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setSeed(userData.name || userData.email);
      } else {
        // User not authenticated, but allow them to use avatar creator as guest
        setSeed('guest');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setSeed('guest');
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomSeed = () => {
    const randomString = Math.random().toString(36).substring(7);
    setSeed(randomString);
  };

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const downloadAvatar = () => {
    const link = document.createElement('a');
    link.href = avatarUrl;
    link.download = `avatar-${seed}.svg`;
    link.click();
  };
  
  const saveAvatarToDB = async () => {
    if (!user) {
      alert('Please login to save your avatar');
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/avatars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          email: user.email,        
          name: user.name, 
          avatarUrl,
          style: selectedStyle,
          seed,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Avatar saved successfully to database!');
      } else {
        alert('Failed to save avatar: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error saving avatar:', err);
      alert('Error saving avatar. Please try again.');
    }
  };

  const copyAvatarUrl = () => {
    navigator.clipboard.writeText(avatarUrl);
    alert('Avatar URL copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-purple-200 text-lg">Loading Avatar Creator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
      {/* Navbar Component */}
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl shadow-2xl p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h1 className="text-3xl md:text-4xl font-bold text-white">
                    Avatar Creator
                  </h1>
                </div>
                <p className="text-purple-200 text-lg">
                  Welcome back, <span className="font-semibold text-white">{user?.name}</span>
                </p>
              </div>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-white/10 border border-purple-400/30 text-white rounded-full hover:bg-white/20 transition-all"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Avatar Preview */}
            <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl shadow-2xl p-6 md:p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="text-3xl">🎨</span>
                Your Avatar
              </h2>

              {/* Large Avatar Display */}
              <div className="relative bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl p-8 mb-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-2xl blur-xl"></div>
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt="Generated Avatar"
                    className="relative z-10 w-64 h-64 rounded-full border-8 border-white/20 shadow-2xl"
                  />
                )}
              </div>

              {/* Seed Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-purple-200 mb-2">
                  Avatar Seed (Name/Text)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="Enter any text to generate avatar"
                    className="flex-1 px-4 py-3 bg-purple-950/50 border border-purple-500/30 text-white placeholder-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={generateRandomSeed}
                    className="px-4 py-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
                    title="Generate Random"
                  >
                    🎲
                  </button>
                </div>
                <p className="text-xs text-purple-300 mt-2">
                  Change the text to generate a different avatar
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={downloadAvatar}
                  className="px-4 py-3 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={copyAvatarUrl}
                  className="px-4 py-3 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy URL
                </button>
              </div>

              <button
                onClick={saveAvatarToDB}
                className="w-full px-4 py-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg font-semibold"
              >
                💾 Save to Database
              </button>
            </div>

            {/* Right: Style Selection */}
            <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl shadow-2xl p-6 md:p-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Choose Avatar Style
              </h2>
              <p className="text-purple-200 mb-6">
                Select a style to customize your avatar appearance
              </p>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-purple-900/20">
                {styles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      selectedStyle === style.id
                        ? 'border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/20'
                        : 'border-purple-500/20 hover:border-purple-400/50 hover:bg-purple-500/10'
                    }`}
                  >
                    {/* Mini Preview */}
                    <div className="relative">
                      <div className={`absolute inset-0 rounded-full blur-md ${
                        selectedStyle === style.id ? 'bg-purple-500/50' : 'bg-purple-500/20'
                      }`}></div>
                      <img
                        src={`https://api.dicebear.com/7.x/${style.id}/svg?seed=${seed || 'preview'}`}
                        alt={style.name}
                        className="relative z-10 w-14 h-14 rounded-full border-2 border-purple-400/30"
                      />
                    </div>

                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white">
                        {style.name}
                      </div>
                      <div className="text-sm text-purple-300">{style.desc}</div>
                    </div>

                    {selectedStyle === style.id && (
                      <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="mt-8 bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="text-4xl">💡</div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-xl mb-3">
                  How to Create Your Avatar:
                </h3>
                <div className="grid md:grid-cols-2 gap-3 text-purple-200">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Choose an avatar style from the style panel</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Modify the seed text to change appearance</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Click the dice 🎲 for random generation</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Download or copy URL to use anywhere</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save to database for permanent storage</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Use your avatar across the platform</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}