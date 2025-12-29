"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../navbar/page";

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

interface Contract {
  id: string;
  title: string;
  initiator_id: number;
  counterparty_id: number;
}

interface SearchResult {
  user: User;
  contracts?: Contract[];
}

export default function InteractPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"name" | "contracts">("name");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [sentInvitations, setSentInvitations] = useState<Set<number>>(new Set());
  const [friends, setFriends] = useState<Set<number>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [allInvitations, setAllInvitations] = useState<any[]>([]);

  const GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || "http://4.251.143.80.nip.io";

  useEffect(() => {
    fetchUser();
    fetchPendingInvitations();
    fetchFriends();
    fetchAllInvitations();
  }, []);

  const fetchAllInvitations = async () => {
    if (!user) return;

    try {
      const response = await fetch(`${GATEWAY_URL}/friends/invitations`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAllInvitations(data.data || []);
          // Update sent invitations set
          const sent = new Set<number>();
          (data.data || []).forEach((inv: any) => {
            if (inv.sender_id === user.id && inv.status === 'pending') {
              sent.add(inv.receiver_id);
            }
          });
          setSentInvitations(sent);
        }
      }
    } catch (err) {
      console.error("Error fetching all invitations:", err);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/me", {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push("/login");
      }
    } catch (err) {
      console.error("Auth error:", err);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    if (!user) return;

    try {
      const response = await fetch(`${GATEWAY_URL}/friends/invitations/pending`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPendingInvitations(data.data || []);
        }
      }
    } catch (err) {
      console.error("Error fetching pending invitations:", err);
    }
  };

  useEffect(() => {
    if (user) {
      // Refresh invitations periodically
      const interval = setInterval(() => {
        fetchPendingInvitations();
        fetchAllInvitations();
        fetchFriends();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;

    try {
      const response = await fetch(`${GATEWAY_URL}/friends`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const friendIds = new Set<number>(data.data.map((f: any) => f.id));
          setFriends(friendIds);
        }
      }
    } catch (err) {
      console.error("Error fetching friends:", err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      if (searchType === "name") {
        // Search by name
        const response = await fetch(
          `/api/users/search?query=${encodeURIComponent(searchQuery)}&limit=10`,
          { credentials: "include" }
        );

        if (response.ok) {
          const data = await response.json();
          const users = (data.users || []).filter((u: User) => u.id !== user.id);

          // Fetch avatars for each user
          const usersWithAvatars = await Promise.all(
            users.map(async (u: User) => {
              try {
                const avatarResponse = await fetch(
                  `${GATEWAY_URL}/api/avatars/${u.id}`,
                  { credentials: "include" }
                );
                if (avatarResponse.ok) {
                  const avatarData = await avatarResponse.json();
                  if (avatarData.success && avatarData.data) {
                    u.avatar = avatarData.data.avatar_url;
                  }
                }
              } catch (err) {
                // Avatar fetch failed, continue without avatar
              }
              return { user: u };
            })
          );

          setSearchResults(usersWithAvatars);
        }
      } else {
        // Search by contracts - get contracts and find users
        const response = await fetch(
          `${GATEWAY_URL}/contracts/user/${user.id}`,
          { credentials: "include" }
        );

        if (response.ok) {
          const data = await response.json();
          const allContracts = [
            ...(data.data?.created || []),
            ...(data.data?.received || []),
          ];

          // Filter contracts by search query
          const matchingContracts = allContracts.filter((c: Contract) =>
            c.title.toLowerCase().includes(searchQuery.toLowerCase())
          );

          // Get unique user IDs from contracts
          const userIds = new Set<number>();
          matchingContracts.forEach((c: Contract) => {
            if (c.initiator_id !== user.id) userIds.add(c.initiator_id);
            if (c.counterparty_id !== user.id) userIds.add(c.counterparty_id);
          });

          // Fetch user info for each ID
          const userPromises = Array.from(userIds).map(async (userId) => {
            try {
              const userResponse = await fetch(
                `${GATEWAY_URL}/api/users/${userId}`,
                { credentials: "include" }
              );
              if (userResponse.ok) {
                const userData = await userResponse.json();
                // Fetch avatar if available
                try {
                  const avatarResponse = await fetch(
                    `${GATEWAY_URL}/api/avatars/${userId}`,
                    { credentials: "include" }
                  );
                  if (avatarResponse.ok) {
                    const avatarData = await avatarResponse.json();
                    if (avatarData.success && avatarData.data) {
                      userData.avatar = avatarData.data.avatar_url;
                    }
                  }
                } catch (err) {
                  // Avatar fetch failed, continue without avatar
                }
                const userContracts = matchingContracts.filter(
                  (c: Contract) =>
                    c.initiator_id === userId || c.counterparty_id === userId
                );
                return { user: userData, contracts: userContracts };
              }
            } catch (err) {
              console.error(`Error fetching user ${userId}:`, err);
            }
            return null;
          });

          const results = (await Promise.all(userPromises)).filter(
            (r) => r !== null
          ) as SearchResult[];
          setSearchResults(results);
        }
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendInvitation = async (receiverId: number) => {
    if (!user) return;

    try {
      const response = await fetch(`${GATEWAY_URL}/friends/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiver_id: receiverId,
          userId: user.id // Pass user ID from frontend
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSentInvitations((prev) => new Set([...prev, receiverId]));
          setSuccessMessage(data.message || "Friend request sent successfully!");
          setShowSuccessModal(true);
          // Refresh invitations
          fetchAllInvitations();
        }
      } else {
        const error = await response.json();
        // Check if it's a conflict (invitation already exists)
        if (response.status === 409) {
          setSuccessMessage("Invitation already sent. The user will see it in their pending requests.");
          setShowSuccessModal(true);
          // Still refresh to show the existing invitation
          fetchAllInvitations();
        } else {
          setSuccessMessage(error.error || "Failed to send friend request");
          setShowSuccessModal(true);
        }
      }
    } catch (err) {
      console.error("Error sending invitation:", err);
      setSuccessMessage("Failed to send friend request. Please try again.");
      setShowSuccessModal(true);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`${GATEWAY_URL}/friends/invitations/${invitationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: "accepted",
          userId: user.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          fetchPendingInvitations();
          fetchAllInvitations();
          fetchFriends();
          setSuccessMessage("Friend request accepted! You are now friends.");
          setShowSuccessModal(true);
        }
      } else {
        const error = await response.json();
        console.error("Error accepting invitation:", error);
        setSuccessMessage(error.error || error.message || "Failed to accept friend request. Please try again.");
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error("Error accepting invitation:", err);
      setSuccessMessage("Failed to accept friend request. Please try again.");
      setShowSuccessModal(true);
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`${GATEWAY_URL}/friends/invitations/${invitationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: "rejected",
          userId: user.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          fetchPendingInvitations();
          fetchAllInvitations();
          setSuccessMessage("Friend request rejected");
          setShowSuccessModal(true);
        }
      } else {
        const error = await response.json();
        console.error("Error rejecting invitation:", error);
        setSuccessMessage(error.error || error.message || "Failed to reject friend request. Please try again.");
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error("Error rejecting invitation:", err);
      setSuccessMessage("Failed to reject friend request. Please try again.");
      setShowSuccessModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
        <Navbar user={user} />
        <div className="flex items-center justify-center h-screen">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
      <Navbar user={user} />
      <div className="container mx-auto px-4 pt-24 pb-8">
        <h1 className="text-4xl font-bold text-white mb-8">Interact with Users</h1>

        {/* Pending Invitations - Received */}
        {pendingInvitations.length > 0 && (
          <div className="mb-8 bg-indigo-900/50 rounded-lg p-6 border border-purple-500/30">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Pending Friend Requests ({pendingInvitations.length})
            </h2>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between bg-indigo-800/50 rounded-lg p-4 border border-purple-500/20 hover:bg-indigo-800/70 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {invitation.sender?.avatar ? (
                      <img
                        src={invitation.sender.avatar}
                        alt={invitation.sender.name || "User"}
                        className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold';
                            fallback.textContent = invitation.sender?.name?.[0] || "U";
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                        {invitation.sender?.name?.[0] || "U"}
                      </div>
                    )}
                    <div>
                      <p className="text-white font-semibold text-lg">
                        {invitation.sender?.name || "Unknown"}
                      </p>
                      <p className="text-purple-300 text-sm">
                        Sent {new Date(invitation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectInvitation(invitation.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sent Invitations */}
        {allInvitations.filter((inv) => inv.sender_id === user?.id && inv.status === 'pending').length > 0 && (
          <div className="mb-8 bg-indigo-900/50 rounded-lg p-6 border border-purple-500/30">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Sent Friend Requests
            </h2>
            <div className="space-y-3">
              {allInvitations
                .filter((inv) => inv.sender_id === user?.id && inv.status === 'pending')
                .map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between bg-indigo-800/50 rounded-lg p-4 border border-purple-500/20"
                  >
                    <div className="flex items-center gap-4">
                      {invitation.receiver?.avatar ? (
                        <img
                          src={invitation.receiver.avatar}
                          alt={invitation.receiver.name || "User"}
                          className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const fallback = document.createElement('div');
                              fallback.className = 'w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold';
                              fallback.textContent = invitation.receiver?.name?.[0] || "U";
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                          {invitation.receiver?.name?.[0] || "U"}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-semibold text-lg">
                          {invitation.receiver?.name || "Unknown"}
                        </p>
                        <p className="text-purple-300 text-sm">
                          Waiting for response...
                        </p>
                      </div>
                    </div>
                    <span className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold">
                      Pending
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Search Section */}
        <div className="bg-indigo-900/50 rounded-lg p-6 border border-purple-500/30 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Search Users</h2>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search by name or contracts..."
                className="w-full px-4 py-2 bg-indigo-800 text-white rounded-lg border border-purple-500/30 focus:outline-none focus:border-purple-500"
              />
            </div>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as "name" | "contracts")}
              className="px-4 py-2 bg-indigo-800 text-white rounded-lg border border-purple-500/30 focus:outline-none focus:border-purple-500"
            >
              <option value="name">By Name</option>
              <option value="contracts">By Contracts</option>
            </select>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-indigo-900/50 rounded-lg p-6 border border-purple-500/30">
            <h2 className="text-2xl font-semibold text-white mb-4">Search Results</h2>
            <div className="space-y-4">
              {searchResults.map((result) => {
                const isFriend = friends.has(result.user.id);
                const hasSentInvitation = sentInvitations.has(result.user.id);

                return (
                  <div
                    key={result.user.id}
                    className="bg-indigo-800/50 rounded-lg p-4 border border-purple-500/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {result.user.avatar ? (
                          <img
                            src={result.user.avatar}
                            alt={result.user.name || "User"}
                            className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                            onError={(e) => {
                              // Fallback to initial if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = document.createElement('div');
                                fallback.className = 'w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold';
                                fallback.textContent = result.user.name?.[0] || "U";
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                            {result.user.name?.[0] || "U"}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-semibold text-lg">
                            {result.user.name || "Unknown"}
                          </p>
                          {result.contracts && result.contracts.length > 0 && (
                            <p className="text-purple-400 text-xs mt-1">
                              {result.contracts.length} contract(s) found
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        {isFriend ? (
                          <span className="px-4 py-2 bg-green-600 text-white rounded-lg">
                            Friend
                          </span>
                        ) : hasSentInvitation ? (
                          <span className="px-4 py-2 bg-yellow-600 text-white rounded-lg">
                            Request Sent
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendInvitation(result.user.id)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                          >
                            Send Request
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {searchQuery && searchResults.length === 0 && !isSearching && (
          <div className="text-center text-purple-300 py-8">
            No users found matching your search.
          </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-indigo-900 rounded-lg p-6 border border-purple-500/30 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Notification</h3>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="text-purple-300 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-white mb-4">{successMessage}</p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

