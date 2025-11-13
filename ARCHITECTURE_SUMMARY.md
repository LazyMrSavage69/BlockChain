# Architecture Summary - Quick Reference for Diagrams

## System Components

```
┌─────────────┐
│  Frontend   │  Next.js (Port 3000)
│  (Next.js)  │  - React UI
│             │  - API routes proxy to Gateway
└──────┬──────┘
       │ HTTP
       │
┌──────▼──────┐
│   Gateway   │  Go (Port 8000)
│             │  - Single entry point
│             │  - Routes requests
│             │  - CORS handling
│             │  - Cookie management
└───┬──────┬──┘
    │      │
    │      │
┌───▼──┐ ┌─▼──────────┐
│ Auth │ │  Backend   │
│(Go)  │ │  NestJS    │
│3060  │ │  5000      │
└───┬──┘ └─┬──────────┘
    │      │
┌───▼──┐ ┌─▼──────────┐
│MySQL │ │  Supabase  │
│3306  │ │ (Postgres) │
└──────┘ └────────────┘
```

## Gateway Routing Table

| Path Pattern | Destination | Service |
|--------------|-------------|---------|
| `/auth/*` | Auth Service | Go |
| `/api/me` | Auth Service | Go |
| `/api/users/search` | Auth Service | Go |
| `/api/subscriptions/*` | Backend NestJS | Node.js |
| `/api/avatars` | Backend NestJS | Node.js |
| `/contracts/*` | Backend NestJS | Node.js |
| `/friends/*` | Backend NestJS | Node.js |
| `/messages/*` | Backend NestJS | Node.js |
| `/api/*` (catch-all) | Auth Service | Go |

## Authentication Flow

### Google OAuth
```
User → Frontend → Gateway → Auth Service → Google
                                    ↓
                            Create session token
                                    ↓
                            Redirect to Gateway
                                    ↓
                            Gateway sets cookie
                                    ↓
                            Redirect to Frontend
```

### Email/Password
```
User → Frontend → Gateway → Auth Service
                                    ↓
                            Validate credentials
                                    ↓
                            Create session token
                                    ↓
                            Gateway sets cookie
                                    ↓
                            Return user data
```

## Session Management

**Session Token:**
- Format: 32-byte hex string (64 chars)
- Stored in: MySQL `sessions` table
- Cookie: `session_token` (HTTP-only, SameSite=Lax)
- Expiration: Currently 2030-01-01 (should be changed)

**Validation:**
```
Request → Extract session_token cookie
       → Call /api/me (Gateway → Auth Service)
       → Query MySQL: SELECT u.* FROM users u 
                      INNER JOIN sessions s 
                      WHERE s.session_token = ? 
                      AND s.expires_at > NOW()
       → Return user {id, email, name, avatar}
```

## Message System

**Flow:**
1. Frontend sends message → Gateway → Backend NestJS
2. Validate session → Get sender ID
3. Check if users are friends
4. Insert into Supabase `messages` table
5. Real-time: Supabase subscription notifies frontend

**Endpoints:**
- `POST /messages` - Send message
- `GET /messages/conversations` - Get all conversations
- `GET /messages/conversation/:otherUserId` - Get specific conversation
- `PUT /messages/read/:messageId` - Mark as read
- `PUT /messages/read-conversation/:otherUserId` - Mark conversation as read

**Database Schema:**
```sql
messages:
  - id (UUID)
  - sender_id (INT)
  - receiver_id (INT)
  - content (TEXT)
  - read (BOOLEAN)
  - created_at (TIMESTAMP)
```

## Friend Invitation System

**Flow:**
1. Frontend sends invitation → Gateway → Backend NestJS
2. Validate session → Get sender ID
3. Check for existing invitations (both directions)
4. Create invitation in Supabase `friend_invitations` table
5. Receiver can accept/reject → Updates status

**Endpoints:**
- `POST /friends/invitations` - Send invitation
- `GET /friends/invitations` - Get all invitations
- `GET /friends/invitations/pending` - Get pending invitations
- `PUT /friends/invitations/:id` - Accept/reject (status: 'accepted' or 'rejected')
- `GET /friends` - Get friends list
- `GET /friends/check/:otherUserId` - Check if friends

**Database Schema:**
```sql
friend_invitations:
  - id (UUID)
  - sender_id (INT)
  - receiver_id (INT)
  - status (VARCHAR: 'pending', 'accepted', 'rejected')
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
```

**Business Logic:**
- Cannot send to yourself
- Checks both directions for existing invitations
- Prevents duplicates
- Only receiver can accept/reject
- Friends = invitations with status 'accepted'

## Key Interactions

### Backend Service → Auth Service
```
Backend NestJS receives request
  ↓
Extract session_token from cookie
  ↓
Call Gateway /api/me (or Auth Service directly)
  ↓
Auth Service validates session in MySQL
  ↓
Returns user {id, email, name, avatar}
  ↓
Backend uses user.id for business logic
```

### Message Validation
```
Send Message Request
  ↓
Validate session → Get sender ID
  ↓
Check FriendsService.areFriends(senderId, receiverId)
  ↓
If not friends → ForbiddenException
  ↓
If friends → Insert message into Supabase
```

### Invitation Validation
```
Send Invitation Request
  ↓
Validate session → Get sender ID
  ↓
Check existing invitations (both directions):
  - (sender_id, receiver_id) OR
  - (receiver_id, sender_id)
  ↓
If exists:
  - accepted → Error: "Already friends"
  - pending from sender → Return existing
  - pending from receiver → Error: "Already sent to you"
  ↓
If not exists → Create new invitation
```

## Database Separation

**MySQL (Auth Service):**
- `users` - User accounts
- `sessions` - Active sessions
- `verification_codes` - Email verification

**Supabase (Backend NestJS):**
- `messages` - Chat messages
- `friend_invitations` - Friend requests
- `contracts` - User contracts
- Other business data

## Real-time Features

**Messages:**
- Supabase Realtime subscription on `messages` table
- Filters: `receiver_id = current_user.id`
- Fallback: Polling `/messages/conversations` if subscription fails

## Security

1. **Session Validation**: Every backend request validates session
2. **HTTP-only Cookies**: Prevents XSS attacks
3. **SameSite=Lax**: CSRF protection
4. **Single Session**: Old sessions deleted on new login
5. **Friend Validation**: Messages only between friends
6. **Invitation Validation**: Prevents duplicate invitations

## Request Flow Example: Send Message

```
1. Frontend: POST /messages
   Body: {receiver_id: 2, content: "Hello"}
   Cookie: session_token=abc123

2. Gateway: Receives request
   - Forwards to Backend NestJS:5000/messages
   - Includes session_token cookie

3. Backend NestJS MessagesController:
   - Extracts session_token cookie
   - Calls Gateway /api/me with cookie
   - Gateway proxies to Auth Service /api/me
   - Auth Service queries MySQL sessions table
   - Returns user {id: 1, email: "...", name: "..."}

4. MessagesService:
   - Gets senderId = 1 from session
   - Calls FriendsService.areFriends(1, 2)
   - If true: Inserts message into Supabase
   - Returns message object

5. Response flows back:
   Backend NestJS → Gateway → Frontend

6. Frontend:
   - Supabase subscription receives INSERT event
   - Updates UI with new message
```

## Ports & Services

| Service | Port | Technology | Database |
|---------|------|------------|----------|
| Frontend | 3000 | Next.js | - |
| Gateway | 8000 | Go | - |
| Auth Service | 3060 | Go | MySQL |
| Backend NestJS | 5000 | Node.js | Supabase |
| MySQL | 3306 | MySQL | - |

## Environment Variables Summary

**Gateway:**
- `AUTH_SERVICE_URL`
- `BACKEND_SERVICE_URL`
- `FRONTEND_URL`
- `PORT`

**Auth Service:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GATEWAY_URL`
- `PORT`

**Backend NestJS:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_SERVICE_URL`
- `GATEWAY_URL`
- `PORT`

**Frontend:**
- `NEXT_PUBLIC_API_URL`
- `API_URL`


