"use client"
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function Login(){
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
    window.location.href = "http://localhost:8000/auth/google";
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="flex w-full max-w-4xl rounded-lg overflow-hidden shadow-lg">
        {/* Left Section */}
        <div className="w-1/2 bg-teal-500 text-white p-8 flex flex-col justify-between">
          <div>
            <Image
              src="/logo.png"
              alt="Company Logo"
              width={50}
              height={50}
              className="mb-4"
            />
            <h1 className="text-4xl font-bold mb-4">
              {isSignUp ? "Hi there" : "Welcome Back"}
            </h1>
            <p className="text-sm mb-6">
              {isSignUp
                ? "Sign up to use our free plan."
                : "Log in to continue to your account."}
            </p>
          </div>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setFormData({ name: "", email: "", password: "" });
            }}
            className="w-full bg-teal-600 text-white py-3 rounded-lg shadow-md hover:bg-teal-700 transition duration-300"
          >
            {isSignUp ? "SIGN IN" : "SIGN UP"}
          </button>
        </div>

        {/* Right Section */}
        <div className="w-1/2 bg-white p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-teal-500 mb-6">
              {isSignUp ? "Create Account" : "Login"}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {isSignUp && (
                <div className="flex items-center bg-gray-50 p-2 rounded-md shadow-sm">
                  <span className="text-gray-500 mr-2">👤</span>
                  <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    onKeyPress={handleSubmit}
                    className="w-full bg-transparent border-none focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center bg-gray-50 p-2 rounded-md shadow-sm">
                <span className="text-gray-500 mr-2">📧</span>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onKeyPress={handleSubmit}
                  className="w-full bg-transparent border-none focus:outline-none"
                />
              </div>

              <div className="flex items-center bg-gray-50 p-2 rounded-md shadow-sm">
                <span className="text-gray-500 mr-2">🔒</span>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onKeyPress={handleSubmit}
                  className="w-full bg-transparent border-none focus:outline-none"
                />
              </div>

              <button
                onClick={isSignUp ? handleSignUp : handleLogin}
                disabled={loading}
                className="w-full bg-teal-500 text-white py-3 rounded-lg shadow-md hover:bg-teal-600 transition duration-300 disabled:bg-gray-400"
              >
                {loading ? "Loading..." : isSignUp ? "SIGN UP" : "SIGN IN"}
              </button>
            </div>
          </div>

          <div className="text-center">
            <div className="flex justify-center gap-4 mb-4">
              <Image
                src="https://www.svgrepo.com/show/503338/facebook.svg"
                alt="Facebook"
                width={24}
                height={24}
              />
              <Image
                src="https://www.svgrepo.com/show/504392/gmail.svg"
                alt="Gmail"
                width={24}
                height={24}
              />
              <Image
                src="https://www.svgrepo.com/show/521711/instagram.svg"
                alt="Instagram"
                width={24}
                height={24}
              />
            </div>
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 rounded-md shadow-sm hover:bg-gray-50 transition duration-300"
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

      {/* Verification Modal */}
      {showVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-teal-500 mb-4">
              Verify Your Email
            </h2>
            <p className="text-gray-600 mb-6">
              We've sent a verification code to <strong>{formData.email}</strong>
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-center text-2xl tracking-widest disabled:bg-gray-100"
                />
              </div>

              {countdown > 0 && (
                <p className="text-sm text-gray-500 text-center">
                  Please wait {countdown} seconds before entering the code...
                </p>
              )}

              <button
                onClick={handleVerifyCode}
                disabled={loading || countdown > 0}
                className="w-full bg-teal-500 text-white py-3 rounded-lg shadow-md hover:bg-teal-600 transition duration-300 disabled:bg-gray-400"
              >
                {loading ? "Verifying..." : "Verify Email"}
              </button>
            </div>

            <div className="mt-4 text-center">
              {canResend ? (
                <button
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-teal-500 hover:text-teal-600 text-sm font-medium disabled:text-gray-400"
                >
                  Resend Code
                </button>
              ) : (
                <p className="text-sm text-gray-500">
                  Didn't receive the code? You can resend in {countdown}s
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setShowVerification(false);
                setVerificationCode("");
                setError("");
              }}
              className="mt-4 w-full text-gray-600 hover:text-gray-800 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}