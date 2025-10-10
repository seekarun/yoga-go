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
