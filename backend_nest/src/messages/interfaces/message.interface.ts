export interface Message {
  id: string;
  sender_id: number;
  receiver_id: number;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface MessageWithUser extends Message {
  sender?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  receiver?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface Conversation {
  friend: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  lastMessage: MessageWithUser | null;
  unreadCount: number;
}

