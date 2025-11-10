# Live Sessions API Documentation

## Overview

The Live Sessions API enables real-time video conferencing between yoga experts and students using 100ms video SDK. This API supports creating scheduled sessions, starting video rooms, enrolling participants, and managing two-way video calls where both experts and students can use their camera and microphone.

## Authentication

All endpoints require Auth0 authentication except where noted. Include the auth cookie in requests.

## Endpoints

### 1. Create Live Session

**POST** `/api/live/sessions`

Creates a new scheduled live session (Expert only).

**Request Body:**

```json
{
  "title": "Morning Vinyasa Flow",
  "description": "Start your day with an energizing vinyasa practice",
  "sessionType": "group",
  "scheduledStartTime": "2025-11-01T08:00:00Z",
  "scheduledEndTime": "2025-11-01T09:00:00Z",
  "maxParticipants": 50,
  "price": 499,
  "currency": "INR",
  "thumbnail": "https://example.com/thumbnail.jpg",
  "metadata": {
    "category": "Vinyasa",
    "difficulty": "Intermediate",
    "equipment": ["Yoga Mat", "Blocks"],
    "tags": ["morning", "energizing"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "abc123",
      "expertId": "exp_456",
      "expertName": "Deepak Kumar",
      "expertAvatar": "https://...",
      "title": "Morning Vinyasa Flow",
      "description": "...",
      "sessionType": "group",
      "scheduledStartTime": "2025-11-01T08:00:00Z",
      "scheduledEndTime": "2025-11-01T09:00:00Z",
      "maxParticipants": 50,
      "price": 499,
      "currency": "INR",
      "status": "scheduled",
      "enrolledCount": 0,
      "attendedCount": 0,
      "currentViewers": 0,
      "isFree": false,
      "createdAt": "2025-10-31T10:00:00Z",
      "updatedAt": "2025-10-31T10:00:00Z"
    }
  },
  "message": "Live session created successfully. Start the session when ready to generate video room."
}
```

---

### 2. List Live Sessions

**GET** `/api/live/sessions`

Retrieves list of live sessions with optional filters.

**Query Parameters:**

- `status` (optional): Filter by status - `scheduled`, `live`, `ended`, `cancelled`
- `expertId` (optional): Filter by expert ID
- `featured` (optional): `true` to show only featured sessions
- `limit` (optional): Number of sessions to return (default: 20, max: 100)
- `skip` (optional): Number of sessions to skip for pagination (default: 0)

**Example Request:**

```
GET /api/live/sessions?status=live&limit=10
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "title": "Morning Vinyasa Flow",
      "status": "live",
      "currentViewers": 25,
      ...
    }
  ],
  "total": 45
}
```

---

### 3. Start Live Session

**POST** `/api/live/sessions/:id/start`

Starts a live session and creates 100ms video room (Expert only).

**Path Parameters:**

- `id`: Session ID

**Response:**

```json
{
  "success": true,
  "data": {
    "roomId": "674c3dc4c70c30e6b3e9c5d8",
    "roomCode": "pjp-lhyy-zfm",
    "sessionUrl": "http://localhost:3111/app/live/host/abc123"
  },
  "message": "Session started. Click the link to join the video room."
}
```

**Usage:**
Click the `sessionUrl` to open the expert video interface in your browser. No additional software needed!

---

### 4. Enroll in Live Session

**POST** `/api/live/sessions/:id/enroll`

Enrolls authenticated user in a live session.

**Path Parameters:**

- `id`: Session ID

**Request Body (optional):**

```json
{
  "paymentId": "pay_abc123",
  "paymentGateway": "stripe"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "participantId": "part_xyz789"
  },
  "message": "Successfully enrolled in live session"
}
```

---

### 5. Get Join Token

**POST** `/api/live/sessions/:id/join-token`

Gets authentication token to join the video room (Enrolled users and expert only).

**Path Parameters:**

- `id`: Session ID

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "role": "host",
    "userName": "Deepak Kumar"
  },
  "message": "Join token generated"
}
```

**Roles:**

- `host`: For experts (full permissions)
- `guest`: For students (can publish video/audio, view others)

---

### 6. End Live Session

**POST** `/api/live/sessions/:id/end`

Ends a live session and disables the video room (Expert only).

**Path Parameters:**

- `id`: Session ID

**Response:**

```json
{
  "success": true,
  "data": {
    "sessionId": "abc123",
    "duration": 65
  },
  "message": "Session ended successfully"
}
```

---

## Data Models

### LiveSession

```typescript
{
  id: string;
  expertId: string;
  expertName: string;
  expertAvatar?: string;

  title: string;
  description: string;
  thumbnail?: string;

  sessionType: '1-on-1' | 'group' | 'workshop';
  scheduledStartTime: string; // ISO date
  scheduledEndTime: string;   // ISO date
  actualStartTime?: string;
  actualEndTime?: string;

  maxParticipants?: number;
  currentViewers?: number;

  price: number;
  currency: string;

  status: 'scheduled' | 'live' | 'ended' | 'cancelled';

  hmsDetails?: {
    roomId: string;      // 100ms room ID
    roomCode: string;    // Room code for joining
    sessionId?: string;  // 100ms session ID (created when first person joins)
    recordingId?: string;
  };

  recordingS3Key?: string;
  recordedLessonId?: string;
  recordingAvailable?: boolean;

  enrolledCount: number;
  attendedCount: number;

  metadata?: {
    tags?: string[];
    difficulty?: string;
    equipment?: string[];
    category?: string;
  };

  featured?: boolean;
  isFree?: boolean;

  createdAt?: string;
  updatedAt?: string;
}
```

### LiveSessionParticipant

```typescript
{
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;

  enrolledAt: string;
  attended: boolean;
  joinedAt?: string;
  leftAt?: string;
  watchTime?: number; // in seconds

  paid: boolean;
  paymentId?: string;
  paymentGateway?: 'stripe' | 'razorpay';
  amountPaid?: number;

  chatMessages?: number;
  feedbackRating?: number;
  feedbackComment?: string;

  createdAt?: string;
  updatedAt?: string;
}
```

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common Error Codes

- **401 Unauthorized**: Not authenticated
- **403 Forbidden**: Not authorized (e.g., not an expert, not enrolled)
- **404 Not Found**: Session or resource not found
- **400 Bad Request**: Invalid request parameters
- **500 Internal Server Error**: Server error

---

## Integration Flow

### For Experts:

1. **Create Session** → POST `/api/live/sessions`
2. **Start Session** → POST `/api/live/sessions/:id/start`
3. **Click Session URL** to join video room in browser
4. **Students join** automatically when they navigate to the session
5. **Monitor** participants in grid view
6. **End Session** → POST `/api/live/sessions/:id/end`

### For Students:

1. **Browse Sessions** → GET `/api/live/sessions?status=live`
2. **Enroll** → POST `/api/live/sessions/:id/enroll`
3. **Navigate to Join URL** → `/app/live/join/:sessionId`
4. **Automatically connects** to video room
5. **Watch & interact** with expert and other students
6. **Watch Recording** (if available after session ends)

---

## 100ms Configuration

### Required Environment Variables

```bash
# 100ms Credentials
HMS_APP_ACCESS_KEY=your_access_key_here
HMS_APP_SECRET=your_app_secret_here
HMS_TEMPLATE_ID=your_template_id_here
```

### Getting 100ms Credentials

1. Sign up at https://dashboard.100ms.live/
2. Create a new project
3. Navigate to Developer section
4. Copy App Access Key and App Secret
5. Create a template or use existing one
6. Copy Template ID

### 100ms Free Tier

- **Video Minutes**: 10,000 minutes per month
- **Participants**: Unlimited
- **Recording**: Available
- **Browser Support**: Chrome, Firefox, Safari, Edge
- **Mobile Support**: iOS Safari, Android Chrome

### Cost After Free Tier

- **Video**: $0.004 per participant-minute
- **Example**: 10-person session for 1 hour = 10 × 60 × $0.004 = $2.40
- **Recording**: Additional $0.002 per minute
- **Storage**: Separate S3/Cloudflare costs

---

## Frontend Integration

### Using 100ms React SDK

**Expert Video Room:**

```typescript
import { HMSRoomProvider } from '@100mslive/react-sdk';
import ExpertVideoRoom from '@/components/ExpertVideoRoom';

<HMSRoomProvider>
  <ExpertVideoRoom
    authToken={token}
    sessionId={sessionId}
    onLeave={handleLeave}
  />
</HMSRoomProvider>
```

**Student Video Room:**

```typescript
import { HMSRoomProvider } from '@100mslive/react-sdk';
import StudentVideoRoom from '@/components/StudentVideoRoom';

<HMSRoomProvider>
  <StudentVideoRoom
    authToken={token}
    sessionId={sessionId}
    onLeave={handleLeave}
  />
</HMSRoomProvider>
```

### Display Session Cards

```typescript
import LiveSessionCard from '@/components/LiveSessionCard';

<LiveSessionCard
  session={session}
  variant="default"
  onEnroll={handleEnroll}
/>
```

---

## Notes

- Sessions must be started before the scheduled end time
- Video rooms are browser-based, no downloads required
- Both expert and students can use camera and microphone
- Recordings are processed asynchronously after session ends
- Chat is built into the 100ms SDK
- Maximum session duration: 6 hours
- Mobile support via iOS Safari and Android Chrome
