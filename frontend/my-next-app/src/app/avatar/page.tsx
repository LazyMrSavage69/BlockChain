"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
    { id: 'avataaars', name: 'Avataaars', desc: 'Cartoon avatars' },
    { id: 'adventurer', name: 'Adventurer', desc: 'Adventure style' },
    { id: 'adventurer-neutral', name: 'Adventurer Neutral', desc: 'Neutral adventure' },
    { id: 'big-ears', name: 'Big Ears', desc: 'Cute with big ears' },
    { id: 'big-ears-neutral', name: 'Big Ears Neutral', desc: 'Neutral big ears' },
    { id: 'big-smile', name: 'Big Smile', desc: 'Happy faces' },
    { id: 'bottts', name: 'Bottts', desc: 'Robot avatars' },
    { id: 'croodles', name: 'Croodles', desc: 'Doodle style' },
    { id: 'croodles-neutral', name: 'Croodles Neutral', desc: 'Neutral doodles' },
    { id: 'fun-emoji', name: 'Fun Emoji', desc: 'Emoji style' },
    { id: 'identicon', name: 'Identicon', desc: 'Geometric pattern' },
    { id: 'lorelei', name: 'Lorelei', desc: 'Illustrated faces' },
    { id: 'micah', name: 'Micah', desc: 'Minimalist style' },
    { id: 'miniavs', name: 'Miniavs', desc: 'Tiny avatars' },
    { id: 'notionists', name: 'Notionists', desc: 'Notion style' },
    { id: 'open-peeps', name: 'Open Peeps', desc: 'Hand-drawn style' },
    { id: 'personas', name: 'Personas', desc: 'Character personas' },
    { id: 'pixel-art', name: 'Pixel Art', desc: '8-bit style' },
  ];

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    // Generate avatar URL when style or seed changes
    if (user) {
      const name = seed || user.name || user.email;
      const url = `https://api.dicebear.com/7.x/${selectedStyle}/svg?seed=${encodeURIComponent(name)}`;
      setAvatarUrl(url);
    }
  }, [selectedStyle, seed, user]);

  const fetchUser = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setSeed(userData.name || userData.email);
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error('Auth error:', err);
      router.push('/');
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
      await fetch('http://localhost:8000/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
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
  if (!user) return;

  try {
    const response = await fetch('http://localhost:8000/api/avatars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // IMPORTANT: sends your session_token cookie
      body: JSON.stringify({
        userId: user.id,
        avatarUrl,
        style: selectedStyle,
        seed,
      }),
    });


    const data = await response.json();

    if (response.ok) {
      alert('Avatar saved: ' + data.data.avatarUrl);
    } else {
      alert('Failed to save avatar: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error saving avatar:', err);
  }
};





  const copyAvatarUrl = () => {
    navigator.clipboard.writeText(avatarUrl);
    alert('Avatar URL copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                🎨 Avatar Creator
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome, <span className="font-semibold">{user?.name}</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Avatar Preview */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Your Avatar
            </h2>

            {/* Large Avatar Display */}
            <div className="bg-gradient-to-br from-purple-200 to-blue-200 rounded-2xl p-8 mb-6 flex items-center justify-center">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt="Generated Avatar"
                  className="w-64 h-64 rounded-full border-8 border-white shadow-2xl"
                />
              )}
            </div>

            {/* Seed Input */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Avatar Seed (Name/Text)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Enter any text to generate avatar"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={generateRandomSeed}
                  className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  title="Generate Random"
                >
                  🎲
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Change the text to generate a different avatar
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={downloadAvatar}
                className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
              <button
                onClick={copyAvatarUrl}
                className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy URL
              </button>
            </div>

            <button
              onClick={saveAvatarToDB}
              className="w-full mt-4 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              💾 Save to MongoDB
            </button>


          </div>

          {/* Right: Style Selection */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Choose Avatar Style
            </h2>
            <p className="text-gray-600 mb-6">
              Select a style to customize your avatar appearance
            </p>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {styles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                    selectedStyle === style.id
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {/* Mini Preview */}
                  <img
                    src={`https://api.dicebear.com/7.x/${style.id}/svg?seed=${seed || 'preview'}`}
                    alt={style.name}
                    className="w-12 h-12 rounded-full border-2 border-gray-200"
                  />

                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-800">
                      {style.name}
                    </div>
                    <div className="text-sm text-gray-500">{style.desc}</div>
                  </div>

                  {selectedStyle === style.id && (
                    <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">
                How to use:
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Choose an avatar style from the right panel</li>
                <li>• Modify the seed text to change the avatar appearance</li>
                <li>• Click the dice 🎲 to generate a random avatar</li>
                <li>• Download your avatar or copy the URL</li>
                <li>• MongoDB saving feature coming soon!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}