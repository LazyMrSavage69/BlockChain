export interface FriendInvitation {
  id: string;
  sender_id: number;
  receiver_id: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface FriendInvitationWithUser extends FriendInvitation {
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

export interface Friend {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  friendship_id: string;
  created_at: string;
}

