# Chatly — Real-Time Chat Application

A full-featured real-time chat application built with React, Node.js, Socket.io, and PostgreSQL.

---

##  Feature Checklist

| # | Requirement | Status |
|---|---|---|
| 1 | Email/password signup & login (bcrypt hashed) 
| 1 | JWT access token + httpOnly refresh token cookie 
| 1 | Socket handshake authentication (unauthenticated → disconnected) 
| 1 | Token expiry handled on socket (auto-refresh interceptor in frontend) 
| 2 | One-to-one chat — search users, start/open DM 
| 2 | Direct conversation is unique (no duplicates) 
| 3 | Group chat — any user can create, becomes Owner 
| 3 | Owner: delete group, transfer ownership, promote/demote admins 
| 3 | Admin: add/remove members, update group name/avatar 
| 3 | Member: send & read messages only 
| 3 | Role rules enforced on both REST + socket events 
| 3 | Removed member stops receiving messages instantly (no page refresh) 
| 4 | Socket rooms require membership (unauthorized join → rejected) 
| 4 | Sending to a conversation you're not part of → rejected 
| 5 | Text messages persisted in PostgreSQL 
| 5 | Cursor-based pagination — infinite scroll upward 
| 5 | Messages sent while offline visible on reconnect 
| 5 | Client-generated message IDs prevent duplicates on retry 
| 6 | Online/offline status with "last seen" time 
| 6 | Multi-tab: offline only after ALL tabs closed 
| 6 | Typing indicators per conversation (throttled) 
| 7 | Sent/delivered/read status for 1-to-1 chats 
| 7 | "Seen by X of Y" for group chats 
| 7 | Unread count per conversation in sidebar (real-time) 
| 8 | Edit own messages (marked "edited") 
| 8 | Delete for everyone within 10 minutes 
| 8 | Emoji reactions with live sync for everyone 
| 9 | Login/signup pages 
| 9 | Sidebar sorted by latest message 
| 9 | Group info panel with members & role-based controls 
| 9 | Responsive mobile layout 
| 9 | "Reconnecting..." banner + missed message sync 
| 10 | Seed data: 6 users, 2 groups, 3 DMs with messages

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Database | PostgreSQL (Supabase) |
| Sequelize |
| Auth | JWT (access token in localStorage, refresh token in httpOnly cookie) |

---

##  Quick Start

### Prerequisites
- Node.js 18+
- A PostgreSQL database (Supabase recommended, or local Docker)

### 1. Clone & install

```bash
git clone <repo-url>
cd Real-Time\ Chat\ Application

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure environment

#### Backend — `backend/.env`

```env
# PostgreSQL connection
DB_HOST=aws-0-ap-northeast-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.qcdqqkhqylkcicxmqblk
DB_PASSWORD=

# JWT secrets (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Access token expiry (e.g. 15m, 1h)
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend origin for CORS
CLIENT_URL=http://localhost:5173

# Server port
PORT=5001

NODE_ENV=development
```

#### Frontend — `frontend/.env`

```env
VITE_API_URL=http://localhost:5001
```

### 3. Seed the database

Tables are auto-created on first `npm run dev` (Sequelize sync). Then run:

```bash
cd backend
npm run seed
```

This creates:
- **6 users** — `sarah@demo.com`, `alex@demo.com`, `maya@demo.com`, `david@demo.com`, `priya@demo.com`, `omar@demo.com`
- **Password for all**: `password123`
- **2 groups**: Team Alpha , Design Crew 
- **3 DMs** with message history

### 4. Start servers

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Visit **http://localhost:5173** — log in with any seed user.

---

## 🐳 Docker Compose (optional)

```bash
docker-compose up
```

See `docker-compose.yml` in the project root.

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login (returns access token, sets refresh cookie) |
| POST | `/api/auth/refresh` | Get new access token via refresh cookie |
| POST | `/api/auth/logout` | Clear refresh cookie |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/auth/google` | Google OAuth |

### Conversations
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/conversations` | List all conversations with unread counts |
| POST | `/api/conversations/direct` | Find or create a DM |
| GET | `/api/conversations/:id` | Get conversation details |
| GET | `/api/conversations/:id/messages?before=<cursor>&limit=40` | Load messages (cursor pagination) |
| POST | `/api/conversations/:id/messages` | Send a message |
| POST | `/api/conversations/:id/read` | Mark conversation as read |

### Message Actions
| Method | Endpoint | Description |
|---|---|---|
| PATCH | `/api/conversations/:id/messages/:msgId` | Edit own message |
| DELETE | `/api/conversations/:id/messages/:msgId` | Delete for everyone (10 min window) |
| POST | `/api/conversations/:id/messages/:msgId/reactions` | Toggle emoji reaction |
| GET | `/api/conversations/:id/messages/:msgId/receipts` | Get "seen by X of Y" info |

### Groups
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/groups` | Create group (requester becomes OWNER) |
| GET | `/api/groups/:id` | Get group details + members |
| PATCH | `/api/groups/:id` | Update name/avatar (ADMIN+) |
| POST | `/api/groups/:id/members` | Add members (ADMIN+) |
| DELETE | `/api/groups/:id/members/:memberId` | Remove member (ADMIN+) |
| PATCH | `/api/groups/:id/members/:memberId/role` | Promote/demote admin (OWNER) |
| POST | `/api/groups/:id/transfer-ownership` | Transfer ownership (OWNER) |
| DELETE | `/api/groups/:id` | Delete group (OWNER) |
| POST | `/api/groups/:id/leave` | Leave group |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/search?q=<query>` | Search users by name or email |

---

## 📡 Socket Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `join_conversation` | `conversationId` | Join a room (membership verified) |
| `leave_conversation` | `conversationId` | Leave a room |
| `typing_start` | `{ conversationId }` | Start typing indicator |
| `typing_stop` | `{ conversationId }` | Stop typing indicator |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `new_message` | `{ conversationId, message }` | New message in a conversation |
| `conversation_updated` | `{ conversationId, lastMessage }` | Sidebar refresh (sent to user rooms) |
| `message_edited` | `{ conversationId, message }` | Message was edited |
| `message_deleted` | `{ conversationId, messageId }` | Message was deleted |
| `reaction_updated` | `{ conversationId, messageId, reactions }` | Reactions changed |
| `messages_read` | `{ conversationId, readByUserId, latestMessageId, readAt }` | Read receipt |
| `user_typing` | `{ conversationId, userId }` | Someone is typing |
| `user_stopped_typing` | `{ conversationId, userId }` | Typing stopped |
| `user:status` | `{ userId, status, lastSeenAt }` | Online/offline presence |
| `users:online_list` | `userId[]` | Initial list of online users |
| `removed_from_group` | `{ conversationId }` | You were removed from a group |
| `group_deleted` | `{ conversationId }` | Group was deleted |
| `group_updated` | `{ conversationId, name, avatarUrl }` | Group info changed |
| `member_role_updated` | `{ conversationId, userId, role }` | Your role changed |
| `added_to_group` | — | You were added to a new group |

---

## 🗄 Database Schema

```
users                   conversations             conversation_members
─────────────────────   ─────────────────────    ──────────────────────────────
id (UUID PK)            id (UUID PK)             conversation_id (FK)
name                    type (direct|group)      user_id (FK)
email (unique)          name                     role (OWNER|ADMIN|MEMBER)
password_hash           avatar_url               last_read_at
avatar_url              created_by (FK→users)    removed_at
last_seen_at            created_at               joined_at

messages                message_receipts          message_reactions
────────────────────    ─────────────────────    ──────────────────────
id (UUID PK)            message_id (PK FK)       message_id (PK FK)
conversation_id (FK)    user_id (PK FK)          user_id (PK FK)
sender_id (FK)          delivered_at             emoji (PK)
client_message_id       read_at                  created_at
content
edited_at               direct_conversations
deleted_at              ─────────────────────
created_at              conversation_id (PK FK)
                        user_low_id (FK)
refresh_tokens          user_high_id (FK)
──────────────
id (UUID PK)
user_id (FK)
token (unique)
expires_at
```

---

##  Security Notes

- All REST endpoints require a valid `Authorization: Bearer <token>` header
- All socket connections require the access token in `socket.handshake.auth.token`
- Unauthenticated sockets are disconnected during handshake
- Role enforcement happens server-side on every API call and socket event
- Removed group members are instantly evicted from socket rooms
- Messages cannot be sent to conversations the user doesn't belong to (checked server-side)
- Delete action enforces a 10-minute window
- Edit/delete are restricted to message owners
- Duplicate messages prevented with client-generated UUIDs (idempotency)
