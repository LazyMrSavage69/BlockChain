"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../navbar/page";
import { supabase } from "@/lib/supabase";

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

interface Message {
  id: string;
  sender_id: number;
  receiver_id: number;
  content: string;
  read_at: string | null;
  created_at: string;
  sender?: User;
  receiver?: User;
}

interface Conversation {
  friend: User;
  lastMessage: Message | null;
  unreadCount: number;
}

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || "http://4.251.143.80.nip.io";

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedFriend && user) {
      fetchMessages(selectedFriend.id);
      markConversationAsRead(selectedFriend.id);
    }
  }, [selectedFriend, user]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!user || !selectedFriend) return;

    console.log('🔔 Setting up real-time subscription for messages between', user.id, 'and', selectedFriend.id);

    let subscriptionActive = false;
    let pollInterval: NodeJS.Timeout | null = null;

    // Subscribe to messages where current user is receiver
    const channelReceiver = supabase
      .channel(`messages:receiver:${user.id}:${selectedFriend.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as any;

          // Verify it's from the selected friend
          if (newMessage.sender_id === selectedFriend.id) {
            console.log('✅ New message received via Realtime (receiver):', payload);
            subscriptionActive = true;

            // Add message directly to state (optimistic update)
            const messageWithUsers: Message = {
              ...newMessage,
              sender: selectedFriend,
              receiver: user,
            };
            setMessages((prev) => [...prev, messageWithUsers]);

            // Update conversations list
            fetchConversations();

            // Mark as read
            markConversationAsRead(selectedFriend.id);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Receiver subscription status:', status);
        if (status === 'SUBSCRIBED') {
          subscriptionActive = true;
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
      });

    // Subscribe to messages where current user is sender (to see own messages instantly)
    const channelSender = supabase
      .channel(`messages:sender:${user.id}:${selectedFriend.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as any;

          // Verify it's to the selected friend
          if (newMessage.receiver_id === selectedFriend.id) {
            console.log('✅ New message received via Realtime (sender):', payload);
            subscriptionActive = true;

            // Add message directly to state (optimistic update)
            const messageWithUsers: Message = {
              ...newMessage,
              sender: user,
              receiver: selectedFriend,
            };
            setMessages((prev) => {
              // Avoid duplicates
              const exists = prev.some(m => m.id === newMessage.id);
              if (exists) return prev;
              return [...prev, messageWithUsers];
            });

            // Update conversations list
            fetchConversations();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Sender subscription status:', status);
      });

    // Fallback: Polling if Realtime doesn't connect within 3 seconds
    const pollTimeout = setTimeout(() => {
      if (!subscriptionActive) {
        console.warn('⚠️ Realtime not connected, falling back to polling');
        pollInterval = setInterval(() => {
          if (selectedFriend && user) {
            fetchMessages(selectedFriend.id);
            fetchConversations();
          }
        }, 2000); // Poll every 2 seconds
      }
    }, 3000);

    // Cleanup subscription when component unmounts or friend changes
    return () => {
      console.log('🧹 Cleaning up real-time subscriptions');
      clearTimeout(pollTimeout);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      supabase.removeChannel(channelReceiver);
      supabase.removeChannel(channelSender);
    };
  }, [user, selectedFriend]);

  // Real-time subscription for conversations list (to update when new messages arrive from any friend)
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time subscription for all conversations');

    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as any;

          // Filter: only process messages where user is sender or receiver
          if (newMessage.sender_id === user.id || newMessage.receiver_id === user.id) {
            console.log('New message in any conversation:', payload);
            // Refresh conversations list to update last message and unread count
            fetchConversations();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMessage = payload.new as any;

          // Filter: only process messages where user is sender or receiver
          if (updatedMessage.sender_id === user.id || updatedMessage.receiver_id === user.id) {
            console.log('Message updated in any conversation:', payload);
            // Refresh conversations list
            fetchConversations();
          }
        }
      )
      .subscribe((status) => {
        console.log('Conversations subscription status:', status);
      });

    // Cleanup subscription
    return () => {
      console.log('Cleaning up conversations subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const response = await fetch(`${GATEWAY_URL}/messages/conversations`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConversations(data.data || []);
        }
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  };

  const fetchMessages = async (otherUserId: number) => {
    if (!user) return;

    try {
      const response = await fetch(
        `${GATEWAY_URL}/messages/conversation/${otherUserId}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(data.data || []);
        }
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const markConversationAsRead = async (otherUserId: number) => {
    if (!user) return;

    try {
      await fetch(
        `${GATEWAY_URL}/messages/read-conversation/${otherUserId}`,
        {
          method: "PUT",
          credentials: "include",
        }
      );
      // Refresh conversations to update unread count
      fetchConversations();
    } catch (err) {
      console.error("Error marking conversation as read:", err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend || !user || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(`${GATEWAY_URL}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiver_id: selectedFriend.id,
          content: newMessage.trim(),
          userId: user.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNewMessage("");

          // Optimistically add the message to the UI immediately
          const optimisticMessage: Message = {
            ...data.data,
            sender: user,
            receiver: selectedFriend,
          };
          setMessages((prev) => {
            // Avoid duplicates
            const exists = prev.some(m => m.id === optimisticMessage.id);
            if (exists) return prev;
            return [...prev, optimisticMessage];
          });

          // Update conversations list
          fetchConversations();

          // Also fetch to ensure we have the latest (in case of any sync issues)
          setTimeout(() => {
            fetchMessages(selectedFriend.id);
          }, 500);
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
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
        <h1 className="text-4xl font-bold text-white mb-8">Messages</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          {/* Friends List */}
          <div className="bg-indigo-900/50 rounded-lg border border-purple-500/30 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-purple-500/20">
              <h2 className="text-xl font-semibold text-white">Friends</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-purple-300">
                  No friends yet. Go to Interact to add friends!
                </div>
              ) : (
                <div className="divide-y divide-purple-500/20">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.friend.id}
                      onClick={() => setSelectedFriend(conversation.friend)}
                      className={`w-full p-4 text-left hover:bg-indigo-800/50 transition-colors ${selectedFriend?.id === conversation.friend.id
                        ? "bg-indigo-800/70"
                        : ""
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {conversation.friend.avatar ? (
                          <img
                            src={conversation.friend.avatar}
                            alt={conversation.friend.name || "User"}
                            className="w-12 h-12 rounded-full object-cover border-2 border-purple-500 flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = document.createElement('div');
                                fallback.className = 'w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0';
                                fallback.textContent = conversation.friend.name?.[0] || "U";
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {conversation.friend.name?.[0] || "U"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">
                            {conversation.friend.name || "Unknown"}
                          </p>
                          {conversation.lastMessage ? (
                            <p className="text-purple-300 text-sm truncate">
                              {conversation.lastMessage.content}
                            </p>
                          ) : (
                            <p className="text-purple-400 text-sm">No messages yet</p>
                          )}
                        </div>
                        {conversation.unreadCount > 0 && (
                          <div className="bg-purple-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                            {conversation.unreadCount}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-2 bg-indigo-900/50 rounded-lg border border-purple-500/30 overflow-hidden flex flex-col">
            {selectedFriend ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-purple-500/20 flex items-center gap-3">
                  {selectedFriend.avatar ? (
                    <img
                      src={selectedFriend.avatar}
                      alt={selectedFriend.name || "User"}
                      className="w-10 h-10 rounded-full object-cover border-2 border-purple-500"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement('div');
                          fallback.className = 'w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold';
                          fallback.textContent = selectedFriend.name?.[0] || "U";
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                      {selectedFriend.name?.[0] || "U"}
                    </div>
                  )}
                  <div>
                    <p className="text-white font-semibold text-lg">
                      {selectedFriend.name || "Unknown"}
                    </p>
                  </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-purple-300 py-8">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwnMessage = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${isOwnMessage
                              ? "bg-purple-600 text-white"
                              : "bg-indigo-800 text-white"
                              }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${isOwnMessage ? "text-purple-200" : "text-purple-300"
                                }`}
                            >
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-purple-500/20">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 bg-indigo-800 text-white rounded-lg border border-purple-500/30 focus:outline-none focus:border-purple-500"
                      disabled={isSending}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isSending || !newMessage.trim()}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      {isSending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-purple-300">
                Select a friend to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

