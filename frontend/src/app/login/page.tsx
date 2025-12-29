"use client"
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import Navbar from "../navbar/page";

export default function Login() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(true);
  const [showVerification, setShowVerification] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [canResend, setCanResend] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });

  // Countdown timer for verification
  useEffect(() => {
    if (showVerification && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [showVerification, countdown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError("");
  };

  const handleGoogleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://4.251.143.80.nip.io";
    window.location.href = `${apiUrl}/auth/google`;
  };

  // Check if user has avatar and redirect accordingly
  const checkAvatarAndRedirect = async (userId: number) => {
    try {
      const response = await fetch(`/api/avatars/check/${userId}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.hasAvatar) {
          // User has avatar, go to contracts
          router.push('/contractspage');
        } else {
          // User doesn't have avatar, go to avatar creator
          router.push('/avatar');
        }
      } else {
        router.push('/avatar');
      }
    } catch (err) {
      router.push('/avatar');
    }
  };

  const handleSignUp = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setShowVerification(true);
        setCountdown(10);
        setCanResend(false);
      } else {
        setError(data.error || "Signup failed");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Login successful, checking avatar status...');

        // Get user info first
        const userResponse = await fetch('/api/me', {
          credentials: 'include',
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          // Check avatar and redirect
          await checkAvatarAndRedirect(userData.id);
        } else {
          // Fallback to avatar page
          router.push('/avatar');
        }
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowVerification(false);
        setIsSignUp(false);
        setVerificationCode("");
        setError("");
        alert("Email verified successfully! Please login.");
      } else {
        setError(data.error || "Invalid verification code");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/auth/resend-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setCountdown(10);
        setCanResend(false);
        setVerificationCode("");
        alert("Verification code resent!");
      } else {
        setError(data.error || "Failed to resend code");
      }
    } catch (err) {
      console.error("Resend error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isSignUp) {
        handleSignUp();
      } else {
        handleLogin();
      }
    }
  };

  const handleVerifySubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && countdown === 0) {
      handleVerifyCode();
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-900 to-indigo-950">
      <Navbar user={null} />

      <div className="pt-16 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-4xl">
          <div className="bg-gradient-to-br from-indigo-900/80 to-purple-900/80 backdrop-blur-lg rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* Left Section */}
              <div className="w-full md:w-1/2 bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-8 md:p-12 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-2xl font-bold">Ethéré</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    {isSignUp ? "Hi there" : "Welcome Back"}
                  </h1>
                  <p className="text-purple-100 text-lg mb-6">
                    {isSignUp
                      ? "Sign up to use our free plan and start creating smart contracts."
                      : "Log in to continue to your account and manage your contracts."}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError("");
                    setFormData({ name: "", email: "", password: "" });
                  }}
                  className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-lg font-semibold transition-all backdrop-blur-sm border border-white/30"
                >
                  {isSignUp ? "Already have an account? SIGN IN" : "New here? SIGN UP"}
                </button>
              </div>

              {/* Right Section */}
              <div className="w-full md:w-1/2 bg-indigo-900/50 backdrop-blur-sm p-8 md:p-12 flex flex-col justify-between">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                    {isSignUp ? "Create Account" : "Login"}
                  </h2>

                  {error && (
                    <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    {isSignUp && (
                      <div className="flex items-center bg-indigo-800/50 border border-purple-500/30 p-3 rounded-lg">
                        <svg className="w-5 h-5 text-purple-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <input
                          type="text"
                          name="name"
                          placeholder="Name"
                          value={formData.name}
                          onChange={handleInputChange}
                          onKeyPress={handleSubmit}
                          className="w-full bg-transparent text-white placeholder-purple-300 border-none focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="flex items-center bg-indigo-800/50 border border-purple-500/30 p-3 rounded-lg">
                      <svg className="w-5 h-5 text-purple-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onKeyPress={handleSubmit}
                        className="w-full bg-transparent text-white placeholder-purple-300 border-none focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center bg-indigo-800/50 border border-purple-500/30 p-3 rounded-lg">
                      <svg className="w-5 h-5 text-purple-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onKeyPress={handleSubmit}
                        className="w-full bg-transparent text-white placeholder-purple-300 border-none focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={isSignUp ? handleSignUp : handleLogin}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-lg font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Loading..." : isSignUp ? "SIGN UP" : "SIGN IN"}
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-purple-500/30"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-indigo-900/50 text-purple-300">Or continue with</span>
                    </div>
                  </div>
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 border border-purple-500/30 text-white py-3 rounded-lg font-semibold transition-all backdrop-blur-sm"
                  >
                    <Image
                      src="https://www.svgrepo.com/show/353817/google-icon.svg"
                      alt="Google logo"
                      width={24}
                      height={24}
                    />
                    Login with Google
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      {showVerification && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-8 max-w-md w-full border border-purple-500/30 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">
                Verify Your Email
              </h2>
              <button
                onClick={() => {
                  setShowVerification(false);
                  setVerificationCode("");
                  setError("");
                }}
                className="text-purple-300 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-purple-200 mb-6">
              We've sent a verification code to <strong className="text-white">{formData.email}</strong>
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setVerificationCode(value);
                    setError("");
                  }}
                  onKeyPress={handleVerifySubmit}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  disabled={countdown > 0}
                  className="w-full px-4 py-3 bg-indigo-800/50 border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-center text-2xl tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {countdown > 0 && (
                <p className="text-sm text-purple-300 text-center">
                  Please wait {countdown} seconds before entering the code...
                </p>
              )}

              <button
                onClick={handleVerifyCode}
                disabled={loading || countdown > 0}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Verify Email"}
              </button>
            </div>

            <div className="mt-4 text-center">
              {canResend ? (
                <button
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-purple-300 hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Resend Code
                </button>
              ) : (
                <p className="text-sm text-purple-300">
                  Didn't receive the code? You can resend in {countdown}s
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}