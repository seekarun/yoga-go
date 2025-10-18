# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `npm run dev` - Start development server on port 3111 (http://localhost:3111)
- `npm run build` - Build production bundle
- `npm run start` - Start production server

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format all files with Prettier
- `npm run format:check` - Check if files are formatted correctly

### Git Hooks

- **Pre-commit hook** - Automatically runs lint-staged to lint and format staged files before commit
- Powered by Husky + lint-staged

### Important

- After every request iteration, build the app with `npm run build` to confirm it works
- Always verify build succeeds before pushing to git remote
- Use logging extensively with `[DBG][$filename]` prefix to understand issues
- Code is automatically formatted and linted on commit via pre-commit hook
- Always keep the postman collection in root folder when changes to api are made (Eg. new endpoints added, updates)

### Authentication & Database

**Auth0 Setup:**
This app uses Auth0 for authentication. To set it up:

1. Create an Auth0 account at https://manage.auth0.com/
2. Create a new Regular Web Application
3. Configure Allowed Callback URLs: `http://localhost:3111/api/auth/callback`
4. Configure Allowed Logout URLs: `http://localhost:3111`
5. Copy the following credentials to `.env.local`:
   - Domain → `AUTH0_ISSUER_BASE_URL`
   - Client ID → `AUTH0_CLIENT_ID`
   - Client Secret → `AUTH0_CLIENT_SECRET`
6. Generate AUTH0_SECRET: `openssl rand -hex 32`
7. Set `AUTH0_BASE_URL=http://localhost:3111` (update for production)

**MongoDB Setup:**
User data is stored in MongoDB. To set it up:

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster (free tier M0 is sufficient for development)
3. Create a database user with read/write permissions
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string and add it to `.env.local` as `MONGODB_URI`
6. User model is defined in `src/models/User.ts`
7. Users are automatically created on first login via Auth0

**Authentication Flow:**

- User logs in via `/api/auth/login` (redirects to Auth0)
- After authentication, Auth0 calls `/api/auth/callback`
- User data is synced to MongoDB in the callback
- Protected routes (`/app/*`, `/srv/*`) require authentication via middleware
- Client-side auth state is managed by `AuthContext` (`src/contexts/AuthContext.tsx`)
- API routes use `getSession()` from `src/lib/auth.ts` to verify authentication

## Architecture

### Project Structure

This is a Next.js 15 application using the App Router with TypeScript and Tailwind CSS.

**Key directories:**

- `src/app/` - Next.js App Router pages and API routes
- `src/app/data/` - API route handlers (guest and authenticated)
- `src/data/` - Mock data storage (experts, courses, lessons)
- `src/types/` - TypeScript type definitions
- `src/components/` - Reusable React components
- `docs/api/` - Postman collection for API testing

### Data Flow & API Architecture

**Mock Data Pattern:**
All API routes use centralized mock data from `src/data/mockData.ts` which exports:

- `mockExperts` - Expert profiles (Deepak, Kavitha)
- `mockCourses` - Course details (4 courses, 2 per expert)
- `mockLessons` - Course items/videos (10-12 per course, keyed by courseId)

**API Route Structure:**

```
/data/experts/              -> All experts
/data/experts/{expertId}    -> Single expert with courses

/data/courses/              -> All courses
/data/courses/{courseId}    -> Course details with curriculum
/data/courses/{courseId}/items              -> All lessons for course
/data/courses/{courseId}/items/{itemId}     -> Single lesson/video
/data/courses/{courseId}/progress/{savePoint}  -> Guest progress

/data/app/courses/          -> Authenticated: User's enrolled courses
/data/app/courses/{courseId}  -> Authenticated: User course with progress
/data/app/courses/{courseId}/progress/{savePoint}  -> Authenticated: User progress
/data/app/user/{userId}/details  -> Authenticated: User profile
```

**Type System:**

- All API responses use `ApiResponse<T>` wrapper type
- Domain types: `Expert`, `Course`, `Lesson` (course items/videos), `User`, `CourseProgress`
- Types are defined in `src/types/index.ts` and imported via `@/types`

### UI Routes

- `/` - Landing page (guest)
- `/experts` - Expert listing
- `/experts/{expertId}` - Expert profile
- `/courses/{courseId}` - Course details (guest)
- `/app` - User dashboard (authenticated)
- `/app/courses/{id}` - Course player (authenticated)

### Code Style

- Use ES modules (import/export), not CommonJS
- Destructure imports when possible: `import { foo } from 'bar'`
- Pure functional components only, no classes
- Keep files small and focused - recommend breaking up large files
- Use reusable components (Header, Footer, etc.)
- Prefix log messages: `console.log('[DBG][$filename] message')`

### AWS/Infrastructure

- Stick to AWS free-tier features only
- Double-confirm before using any paid features
- Deploy infra: `npm run deploy:infra`
