# Architecture Documentation - MiniProjet V0

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Gateway System](#gateway-system)
4. [Authentication & Session Management](#authentication--session-management)
5. [Endpoints & Services](#endpoints--services)
6. [Message System](#message-system)
7. [Friend Invitation System](#friend-invitation-system)
8. [Request Flow Diagrams](#request-flow-diagrams)

---

## System Overview

The application follows a **microservices architecture** with the following components:

- **Frontend**: Next.js application (Port 3000)
- **Gateway**: Go-based API Gateway (Port 8000) - Single entry point
- **Auth Service**: Go service handling authentication (Port 3060)
- **Backend NestJS**: Node.js/NestJS service for business logic (Port 5000)
- **MySQL Database**: User data and sessions (Port 3306)
- **Supabase**: PostgreSQL database for messages, friends, contracts (External)

---

## Architecture Components

### 1. Frontend (Next.js)
- **Location**: `frontend/`
- **Port**: 3000
- **Role**: User interface, makes requests to Gateway
- **Key Features**:
  - React components for UI
  - API routes (`/api/*`) that proxy to Gateway
  - Real-time subscriptions via Supabase client

### 2. Gateway (Go)
- **Location**: `gateway/`
- **Port**: 8000
- **Role**: Single entry point, request routing, CORS handling, session cookie management
- **Key Features**:
  - Routes requests to appropriate services
  - Handles CORS for frontend
  - Manages session cookies
  - Strips CORS headers from backend responses

### 3. Auth Service (Go)
- **Location**: `auth/`
- **Port**: 3060
- **Database**: MySQL
- **Role**: User authentication, session management, user search
- **Key Features**:
  - Google OAuth2 authentication
  - Email/Password authentication
  - Session token generation and validation
  - User registration and email verification

### 4. Backend NestJS (Node.js)
- **Location**: `backend_nest/`
- **Port**: 5000
- **Database**: Supabase (PostgreSQL)
- **Role**: Business logic for messages, friends, contracts, subscriptions, avatars
- **Key Features**:
  - RESTful API endpoints
  - Validates sessions via Auth Service
  - Manages business data in Supabase

---

## Gateway System

### Gateway Routing Logic

The Gateway acts as a **reverse proxy** and routes requests based on URL patterns:

#### Route Priority (Order Matters!)

1. **OAuth Callback** (`/auth/callback`)
   - Special handler that sets session cookie and redirects to frontend

2. **Auth Routes** (`/auth/*`)
   - Proxied to Auth Service
   - Includes: `/auth/google`, `/auth/google/callback`, `/auth/login`, `/auth/register`, `/auth/verify`, `/auth/logout`, `/auth/resend-code`

3. **User Search** (`/api/users/search`)
   - Proxied to Auth Service

4. **Current User** (`/api/me`)
   - Gateway reads `session_token` cookie
   - Forwards request to Auth Service `/api/me`
   - Returns user info

5. **Subscription Routes** (`/api/subscriptions/*`)
   - Proxied to Backend NestJS
   - Includes webhook endpoints

6. **Avatar Routes** (`/api/avatars`)
   - Special handler that validates session cookie before proxying to Backend NestJS

7. **Generic API Routes** (`/api/*`)
   - Default catch-all: proxied to Auth Service

8. **Contracts** (`/contracts`, `/contracts/*`)
   - Proxied to Backend NestJS

9. **Friends** (`/friends`, `/friends/*`)
   - Proxied to Backend NestJS

10. **Messages** (`/messages`, `/messages/*`)
    - Proxied to Backend NestJS

### Gateway Features

- **CORS Middleware**: Allows requests from frontend, handles preflight OPTIONS
- **Cookie Forwarding**: Forwards `session_token` cookie to backend services
- **Header Management**: Strips CORS headers from backend responses (handled by gateway)
- **Request Logging**: Logs all incoming requests

---

## Authentication & Session Management

### Session-Based Authentication Flow

#### 1. **Google OAuth Flow**

```
User → Frontend → Gateway → Auth Service → Google OAuth
                                 ↓
                    Google redirects to: /auth/google/callback
                                 ↓
                    Auth Service creates session token
                                 ↓
                    Redirects to: /auth/callback?token=xxx
                                 ↓
                    Gateway sets cookie: session_token=xxx
                                 ↓
                    Redirects to: Frontend /avatar
```

**Steps:**
1. User clicks "Sign in with Google" → Frontend redirects to `/auth/google`
2. Gateway proxies to Auth Service
3. Auth Service redirects to Google OAuth
4. Google redirects back to `/auth/google/callback` (via Gateway)
5. Auth Service:
   - Completes OAuth flow
   - Finds or creates user in MySQL
   - Generates 32-byte hex session token
   - Deletes old sessions for user
   - Creates new session in `sessions` table
   - Redirects to Gateway: `/auth/callback?token=xxx`
6. Gateway:
   - Sets HTTP-only cookie: `session_token=xxx`
   - Redirects to frontend `/avatar`

#### 2. **Email/Password Flow**

```
User → Frontend → Gateway → Auth Service
                                 ↓
                    Validates credentials
                                 ↓
                    Creates session token
                                 ↓
                    Returns token in JSON
                                 ↓
                    Gateway sets cookie from response
```

**Steps:**
1. User submits login form → Frontend POST to `/auth/login`
2. Gateway proxies to Auth Service
3. Auth Service:
   - Validates email/password
   - Checks email is verified
   - Generates session token
   - Deletes old sessions
   - Creates new session
   - Returns JSON: `{token: "xxx", user: {...}}`
4. Gateway:
   - Extracts token from response
   - Sets cookie: `session_token=xxx`
   - Returns response to frontend

#### 3. **Session Validation**

**How Backend Services Validate Sessions:**

When a NestJS service (Friends, Messages, etc.) receives a request:

1. Extracts `session_token` from cookie/header
2. Makes internal HTTP request to Gateway `/api/me` (or directly to Auth Service)
3. Auth Service:
   - Reads `session_token` cookie
   - Queries MySQL: `SELECT u.* FROM users u INNER JOIN sessions s ON u.id = s.user_id WHERE s.session_token = ? AND s.expires_at > NOW()`
   - Returns user info if valid
4. NestJS service uses returned `user.id` for business logic

**Session Storage:**
- **Table**: `sessions` in MySQL
- **Fields**: `user_id`, `session_token`, `expires_at`
- **Token Format**: 32-byte hex string (64 characters)
- **Expiration**: Currently set to `2030-01-01` (should be changed in production)
- **Single Session**: Old sessions are deleted when new one is created

#### 4. **Registration Flow**

```
User → Frontend → Gateway → Auth Service
                                 ↓
                    Creates user (unverified)
                                 ↓
                    Generates 6-digit code
                                 ↓
                    Sends email with code
                                 ↓
                    Returns success
                                 ↓
User enters code → Gateway → Auth Service
                                 ↓
                    Verifies code
                                 ↓
                    Marks user as verified
```

**Steps:**
1. POST `/auth/register` with email, password, name
2. Auth Service creates user with `verified = false`
3. Generates verification code, saves to `verification_codes` table
4. Sends email via SMTP
5. User enters code → POST `/auth/verify`
6. Auth Service validates code (checks expiration, not used)
7. Marks user as verified

---

## Endpoints & Services

### Auth Service Endpoints (Go - Port 3060)

| Endpoint | Method | Description | Gateway Route |
|----------|--------|-------------|---------------|
| `/auth/google` | GET | Initiates Google OAuth | `/auth/google` |
| `/auth/google/callback` | GET | Google OAuth callback | `/auth/google/callback` |
| `/auth/register` | POST | Register new user | `/auth/register` |
| `/auth/verify` | POST | Verify email with code | `/auth/verify` |
| `/auth/login` | POST | Login with email/password | `/auth/login` |
| `/auth/logout` | POST | Logout (delete session) | `/auth/logout` |
| `/auth/resend-code` | POST | Resend verification code | `/auth/resend-code` |
| `/api/me` | GET | Get current user from session | `/api/me` |
| `/api/users/search` | GET | Search users by query | `/api/users/search?query=...` |
| `/api/users/{id}` | GET | Get user by ID | `/api/users/{id}` |

### Backend NestJS Endpoints (Port 5000)

#### Friends Service

| Endpoint | Method | Description | Gateway Route |
|----------|--------|-------------|---------------|
| `POST /friends/invitations` | POST | Send friend invitation | `/friends/invitations` |
| `GET /friends/invitations` | GET | Get all invitations (sent + received) | `/friends/invitations` |
| `GET /friends/invitations/pending` | GET | Get pending invitations | `/friends/invitations/pending` |
| `PUT /friends/invitations/:id` | PUT | Accept/reject invitation | `/friends/invitations/:id` |
| `GET /friends` | GET | Get list of friends | `/friends` |
| `GET /friends/check/:otherUserId` | GET | Check if users are friends | `/friends/check/:otherUserId` |

**Authentication**: Extracts `session_token` cookie, calls `/api/me` to get user ID

#### Messages Service

| Endpoint | Method | Description | Gateway Route |
|----------|--------|-------------|---------------|
| `POST /messages` | POST | Send message | `/messages` |
| `GET /messages/conversations` | GET | Get all conversations | `/messages/conversations` |
| `GET /messages/conversation/:otherUserId` | GET | Get conversation with specific user | `/messages/conversation/:otherUserId` |
| `PUT /messages/read/:messageId` | PUT | Mark message as read | `/messages/read/:messageId` |
| `PUT /messages/read-conversation/:otherUserId` | PUT | Mark entire conversation as read | `/messages/read-conversation/:otherUserId` |

**Authentication**: Extracts `session_token` cookie, calls `/api/me` to get user ID

**Business Logic**:
- Validates users are friends before sending message
- Stores messages in Supabase `messages` table
- Real-time updates via Supabase subscriptions

#### Contracts Service

| Endpoint | Method | Description | Gateway Route |
|----------|--------|-------------|---------------|
| `GET /contracts` | GET | Get all contracts | `/contracts` |
| `GET /contracts/:id` | GET | Get contract by ID | `/contracts/:id` |
| `GET /contracts/user/:userId` | GET | Get contracts for user | `/contracts/user/:userId` |
| `POST /contracts/signed` | POST | Create signed contract | `/contracts/signed` |

#### Subscription Service

| Endpoint | Method | Description | Gateway Route |
|----------|--------|-------------|---------------|
| `GET /api/subscriptions/health` | GET | Health check | `/api/subscriptions/health` |
| `POST /api/subscriptions` | POST | Create subscription | `/api/subscriptions` |
| `GET /api/subscriptions/user/:email` | GET | Get user subscription | `/api/subscriptions/user/:email` |
| `POST /api/subscriptions/checkout` | POST | Create checkout session | `/api/subscriptions/checkout` |
| `POST /api/subscriptions/webhook` | POST | Stripe webhook | `/api/subscriptions/webhook` |
| `POST /api/subscriptions/usage/check` | POST | Check usage limits | `/api/subscriptions/usage/check` |

#### Avatar Service

| Endpoint | Method | Description | Gateway Route |
|----------|--------|-------------|---------------|
| `GET /api/avatars/health` | GET | Health check | `/api/avatars/health` |
| `GET /api/avatars/check/:userId` | GET | Check if user has avatar | `/api/avatars/check/:userId` |
| `POST /api/avatars` | POST | Upload avatar | `/api/avatars` |
| `GET /api/avatars/:userId` | GET | Get avatar URL | `/api/avatars/:userId` |
| `PUT /api/avatars/:userId` | PUT | Update avatar | `/api/avatars/:userId` |
| `DELETE /api/avatars/:userId` | DELETE | Delete avatar | `/api/avatars/:userId` |

**Authentication**: Gateway validates session cookie before proxying

---

## Message System

### Architecture

- **Database**: Supabase (PostgreSQL)
- **Table**: `messages`
- **Real-time**: Supabase Realtime subscriptions

### Message Flow

#### 1. **Sending a Message**

```
Frontend → Gateway → Backend NestJS (MessagesController)
                            ↓
                    Validates session (calls /api/me)
                            ↓
                    MessagesService.sendMessage()
                            ↓
                    Checks if users are friends (FriendsService.areFriends())
                            ↓
                    Inserts message into Supabase
                            ↓
                    Returns message
```

**Steps:**
1. Frontend POST `/messages` with `{receiver_id, content}`
2. Gateway forwards to Backend NestJS
3. MessagesController:
   - Extracts `session_token` cookie
   - Calls `/api/me` to get sender ID
   - Validates `receiver_id` and `content`
4. MessagesService:
   - Calls `FriendsService.areFriends(senderId, receiverId)`
   - If not friends → throws `ForbiddenException`
   - Inserts into Supabase `messages` table:
     ```sql
     INSERT INTO messages (sender_id, receiver_id, content, read, created_at)
     VALUES (?, ?, ?, false, NOW())
     ```
5. Returns message object

#### 2. **Receiving Messages (Real-time)**

**Frontend Implementation:**
- Uses Supabase client to subscribe to `messages` table
- Filters: `receiver_id = current_user.id`
- On INSERT event, updates UI immediately

**Polling Fallback:**
- If Supabase subscription fails, falls back to polling `/messages/conversations`

#### 3. **Getting Conversations**

```
Frontend → Gateway → Backend NestJS
                            ↓
                    Validates session
                            ↓
                    Queries Supabase:
                      - All messages where user is sender OR receiver
                      - Groups by conversation partner
                      - Gets latest message per conversation
                            ↓
                    Enriches with user info (calls Auth Service)
                            ↓
                    Returns conversations list
```

**Query Logic:**
```sql
SELECT * FROM messages
WHERE sender_id = ? OR receiver_id = ?
ORDER BY created_at DESC
GROUP BY conversation partner
```

#### 4. **Marking as Read**

- Updates `read` field in Supabase
- Can mark single message or entire conversation

---

## Friend Invitation System

### Architecture

- **Database**: Supabase (PostgreSQL)
- **Table**: `friend_invitations`
- **Status Values**: `pending`, `accepted`, `rejected`

### Invitation Flow

#### 1. **Sending Invitation**

```
Frontend → Gateway → Backend NestJS (FriendsController)
                            ↓
                    Validates session
                            ↓
                    FriendsService.sendInvitation()
                            ↓
                    Checks for existing invitation (both directions)
                            ↓
                    If exists:
                      - If accepted → Error: "Already friends"
                      - If pending from sender → Return existing
                      - If pending from receiver → Error: "Already sent to you"
                    If not exists:
                      - Creates new invitation
                            ↓
                    Returns invitation
```

**Validation Logic:**
- Cannot send to yourself
- Checks both directions: `(sender_id, receiver_id)` OR `(receiver_id, sender_id)`
- Prevents duplicate invitations
- Returns existing invitation if already sent

#### 2. **Accepting/Rejecting Invitation**

```
Frontend → Gateway → Backend NestJS
                            ↓
                    Validates session
                            ↓
                    FriendsService.updateInvitation()
                            ↓
                    Validates invitation belongs to user
                            ↓
                    Updates status to 'accepted' or 'rejected'
                            ↓
                    If accepted:
                      - Creates friendship record (if needed)
                            ↓
                    Returns updated invitation
```

**Status Update:**
- Only receiver can accept/reject
- Validates invitation `receiver_id` matches current user
- Updates `status` and `updated_at` in Supabase

#### 3. **Getting Invitations**

**Endpoints:**
- `GET /friends/invitations`: All invitations (sent + received)
- `GET /friends/invitations/pending`: Only pending invitations

**Query Logic:**
```sql
SELECT * FROM friend_invitations
WHERE sender_id = ? OR receiver_id = ?
ORDER BY created_at DESC
```

**Enrichment:**
- Adds sender and receiver user info (calls Auth Service)

#### 4. **Getting Friends List**

```
Frontend → Gateway → Backend NestJS
                            ↓
                    Validates session
                            ↓
                    FriendsService.getFriends()
                            ↓
                    Queries accepted invitations:
                      WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'
                            ↓
                    Enriches with friend user info
                            ↓
                    Returns friends list
```

**Query Logic:**
```sql
SELECT * FROM friend_invitations
WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
AND status = 'accepted'
```

---

## Request Flow Diagrams

### 1. **Complete Authentication Flow (Google OAuth)**

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌──────────┐
│ Browser │      │Gateway  │      │  Auth   │      │  Google  │
│         │      │         │      │ Service │      │   OAuth  │
└────┬────┘      └────┬────┘      └────┬────┘      └────┬──────┘
     │                │                │                │
     │ 1. GET /auth/google             │                │
     ├─────────────────────────────────>                │
     │                │                │                │
     │                │ 2. Proxy to Auth                │
     │                ├────────────────>                │
     │                │                │                │
     │                │                │ 3. Redirect to Google
     │                │                ├────────────────>
     │                │                │                │
     │ 4. Redirect to Google            │                │
     │<─────────────────────────────────                │
     │                │                │                │
     │ 5. User authenticates            │                │
     │──────────────────────────────────────────────────>
     │                │                │                │
     │ 6. Callback with code            │                │
     │<──────────────────────────────────────────────────
     │                │                │                │
     │ 7. GET /auth/google/callback?code=xxx
     ├─────────────────────────────────>                │
     │                │                │                │
     │                │ 8. Proxy to Auth                │
     │                ├────────────────>                │
     │                │                │                │
     │                │                │ 9. Exchange code for token
     │                │                ├────────────────>
     │                │                │                │
     │                │                │ 10. Return user info
     │                │                │<────────────────
     │                │                │                │
     │                │                │ 11. Create/find user
     │                │                │     Generate session token
     │                │                │     Save to MySQL
     │                │                │                │
     │                │                │ 12. Redirect to /auth/callback?token=xxx
     │                │                │<────────────────
     │                │                │                │
     │ 13. Redirect to /auth/callback?token=xxx
     │<─────────────────────────────────                │
     │                │                │                │
     │                │ 14. Set cookie: session_token=xxx
     │                │     Redirect to /avatar
     │                │                │                │
     │ 15. Redirect to /avatar          │                │
     │<─────────────────────────────────                │
```

### 2. **Sending a Message Flow**

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌──────────┐
│ Browser │      │Gateway  │      │ Backend │      │  Auth   │      │ Supabase │
│         │      │         │      │ NestJS  │      │ Service │      │          │
└────┬────┘      └────┬────┘      └────┬────┘      └────┬────┘      └────┬──────┘
     │                │                │                │                │
     │ 1. POST /messages {receiver_id, content}
     │    Cookie: session_token=xxx
     ├────────────────>                │                │                │
     │                │                │                │                │
     │                │ 2. Forward to Backend NestJS
     │                │    Cookie: session_token=xxx
     │                ├────────────────>                │                │
     │                │                │                │                │
     │                │                │ 3. Extract session_token
     │                │                │    GET /api/me
     │                │                ├────────────────>
     │                │                │                │                │
     │                │                │                │ 4. Validate session
     │                │                │                │    Query MySQL
     │                │                │                │                │
     │                │                │                │ 5. Return user {id, ...}
     │                │                │<────────────────                │
     │                │                │                │                │
     │                │                │ 6. Check if friends
     │                │                │    (calls FriendsService)
     │                │                │                │                │
     │                │                │ 7. Insert message
     │                │                ├──────────────────────────────────>
     │                │                │                │                │
     │                │                │                │                │ 8. Return message
     │                │                │<──────────────────────────────────
     │                │                │                │                │
     │                │                │ 9. Return success
     │                │                │<────────────────                │
     │                │                │                │                │
     │                │ 10. Return response
     │                │<────────────────                │                │
     │                │                │                │                │
     │ 11. Receive response            │                │                │
     │<────────────────                │                │                │
```

### 3. **Friend Invitation Flow**

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌──────────┐
│ Browser │      │Gateway  │      │ Backend │      │  Auth   │      │ Supabase │
│         │      │         │      │ NestJS  │      │ Service │      │          │
└────┬────┘      └────┬────┘      └────┬────┘      └────┬────┘      └────┬──────┘
     │                │                │                │                │
     │ 1. POST /friends/invitations {receiver_id}
     │    Cookie: session_token=xxx
     ├────────────────>                │                │                │
     │                │                │                │                │
     │                │ 2. Forward to Backend NestJS
     │                ├────────────────>                │                │
     │                │                │                │                │
     │                │                │ 3. Validate session
     │                │                ├────────────────>
     │                │                │                │                │
     │                │                │                │ 4. Return user ID
     │                │                │<────────────────                │
     │                │                │                │                │
     │                │                │ 5. Check existing invitations
     │                │                ├──────────────────────────────────>
     │                │                │                │                │
     │                │                │                │                │ 6. Return results
     │                │                │<──────────────────────────────────
     │                │                │                │                │
     │                │                │ 7. If no conflict, create invitation
     │                │                ├──────────────────────────────────>
     │                │                │                │                │
     │                │                │                │                │ 8. Return invitation
     │                │                │<──────────────────────────────────
     │                │                │                │                │
     │                │                │ 9. Return success
     │                │                │<────────────────                │
     │                │                │                │                │
     │                │ 10. Return response
     │                │<────────────────                │                │
     │                │                │                │                │
     │ 11. Receive response            │                │                │
     │<────────────────                │                │                │
```

### 4. **Session Validation Flow (Backend Service)**

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌──────────┐
│ Backend │      │Gateway  │      │  Auth   │      │  MySQL   │
│ NestJS  │      │         │      │ Service │      │          │
└────┬────┘      └────┬────┘      └────┬────┘      └────┬──────┘
     │                │                │                │
     │ 1. Request with session_token cookie
     │                │                │                │
     │ 2. GET /api/me
     │    Cookie: session_token=xxx
     ├────────────────>                │                │
     │                │                │                │
     │                │ 3. Forward to Auth Service
     │                │    Cookie: session_token=xxx
     │                ├────────────────>                │
     │                │                │                │
     │                │                │ 4. Query sessions table
     │                │                ├────────────────>
     │                │                │                │
     │                │                │                │ 5. SELECT u.* FROM users u
     │                │                │                │    INNER JOIN sessions s
     │                │                │                │    WHERE s.session_token = ?
     │                │                │                │    AND s.expires_at > NOW()
     │                │                │                │
     │                │                │                │ 6. Return user data
     │                │                │<────────────────
     │                │                │                │
     │                │                │ 7. Return user {id, email, name, avatar}
     │                │                │<────────────────
     │                │                │                │
     │                │ 8. Return user data
     │                │<────────────────                │
     │                │                │                │
     │ 9. Receive user ID              │                │
     │<────────────────                │                │
     │                │                │                │
     │ 10. Use user.id for business logic
```

---

## Database Schemas

### MySQL (Auth Service)

**users**
- `id` (INT, PRIMARY KEY)
- `google_id` (VARCHAR, nullable)
- `email` (VARCHAR, UNIQUE)
- `password` (VARCHAR, nullable, hashed)
- `name` (VARCHAR)
- `picture` (VARCHAR, nullable)
- `verified` (BOOLEAN)

**sessions**
- `id` (INT, PRIMARY KEY)
- `user_id` (INT, FOREIGN KEY)
- `session_token` (VARCHAR, UNIQUE)
- `expires_at` (DATETIME)
- `created_at` (DATETIME)

**verification_codes**
- `id` (INT, PRIMARY KEY)
- `email` (VARCHAR)
- `code` (VARCHAR)
- `used` (BOOLEAN)
- `expires_at` (DATETIME)
- `created_at` (DATETIME)

### Supabase (Backend NestJS)

**messages**
- `id` (UUID, PRIMARY KEY)
- `sender_id` (INT)
- `receiver_id` (INT)
- `content` (TEXT)
- `read` (BOOLEAN)
- `created_at` (TIMESTAMP)

**friend_invitations**
- `id` (UUID, PRIMARY KEY)
- `sender_id` (INT)
- `receiver_id` (INT)
- `status` (VARCHAR: 'pending', 'accepted', 'rejected')
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**contracts**
- `id` (UUID, PRIMARY KEY)
- `creator_id` (INT)
- `signer_id` (INT)
- `content` (TEXT)
- `signed` (BOOLEAN)
- `created_at` (TIMESTAMP)

---

## Key Design Patterns

### 1. **Session-Based Authentication**
- Stateless tokens stored in database
- Single session per user (old sessions deleted on login)
- Cookie-based (HTTP-only, SameSite=Lax)

### 2. **Microservices Communication**
- Gateway as single entry point
- Services communicate via HTTP
- Session validation via Auth Service

### 3. **Database Separation**
- MySQL: User data, sessions (Auth Service)
- Supabase: Business data (Messages, Friends, Contracts)

### 4. **Real-time Updates**
- Supabase Realtime subscriptions for messages
- Polling fallback if subscription fails

### 5. **Error Handling**
- Consistent error responses
- Validation at multiple layers (Gateway, Controller, Service)

---

## Environment Variables

### Gateway
- `AUTH_SERVICE_URL`: http://auth-service:3060 (Docker) or http://localhost:3060
- `BACKEND_SERVICE_URL`: http://backend_nest:5000 (Docker) or http://localhost:5000
- `FRONTEND_URL`: http://localhost:3000
- `PORT`: 8000

### Auth Service
- `GOOGLE_CLIENT_ID`: OAuth client ID
- `GOOGLE_CLIENT_SECRET`: OAuth client secret
- `GATEWAY_URL`: http://localhost:8000
- `PORT`: 3060

### Backend NestJS
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (bypasses RLS)
- `AUTH_SERVICE_URL`: http://auth-service:3060 (Docker) or http://localhost:3060
- `GATEWAY_URL`: http://gateway:8000 (Docker) or http://localhost:8000
- `PORT`: 5000

### Frontend
- `NEXT_PUBLIC_API_URL`: http://localhost:8000
- `API_URL`: http://gateway:8000 (Docker) or http://localhost:8000

---

## Summary

This architecture provides:

1. **Centralized Gateway**: Single entry point for all requests
2. **Session Management**: Secure, database-backed sessions
3. **Service Separation**: Auth (Go/MySQL) and Business Logic (NestJS/Supabase)
4. **Real-time Communication**: Supabase Realtime for messages
5. **Scalable Design**: Microservices can be scaled independently

The system ensures:
- **Security**: Session validation on every request
- **Consistency**: Gateway handles CORS and routing
- **Reliability**: Fallback mechanisms (polling, error handling)
- **Maintainability**: Clear separation of concerns


