# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### IMPORTANT
- this project uses AWS profile `myg`, any cli commands or cdk actions should use this profile

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

- After making changes do not start the application, let user start and verify changes
- After every request iteration, if there are type changes, build the app with `npm run build` to confirm it works
- If pushing code to remote, always verify build succeeds before pushing code
- Use logging extensively with `[DBG][$filename]` prefix to understand issues
- Code is automatically formatted and linted on commit via pre-commit hook
- Always keep the postman collection in root folder when changes to api are made (Eg. new endpoints added, updates)

### Authentication & Database

**Auth0 Setup:**
This app uses Auth0 for authentication. To set it up:

1. Create an Auth0 account at https://manage.auth0.com/
2. Create a new Regular Web Application
3. Configure Allowed Callback URLs: `http://localhost:3111/auth/callback`
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

- User logs in via `/auth/login` (redirects to Auth0)
- After authentication, Auth0 calls `/auth/callback`
- User data is synced to MongoDB via middleware callback hook
- Protected routes (`/app/*`, `/srv/*`) require authentication via middleware
- Client-side auth state is managed by `AuthContext` (`src/contexts/AuthContext.tsx`)
- Auth0 routes are automatically mounted by the middleware (v4 SDK)
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

## ESLint & Code Quality Guidelines

### Pre-Commit Standards

**IMPORTANT:** All code must pass ESLint and Prettier checks before committing. The pre-commit hook automatically runs:

- `eslint --fix` on staged .js/.jsx/.ts/.tsx files
- `prettier --write` on all staged files

### Running Linters Manually

Before creating commits, ALWAYS run:

```bash
npm run lint        # Check for ESLint errors
npm run lint:fix    # Auto-fix ESLint issues
npm run format      # Format all files with Prettier
```

If lint fails, the commit will be rejected by the pre-commit hook.

### TypeScript Best Practices

**1. Type Imports**

- Use `import type` for type-only imports:

  ```typescript
  // ✅ Correct
  import type { User, Course } from '@/types';
  import { useState } from 'react';

  // ❌ Wrong
  import { User, Course } from '@/types';
  ```

**2. Avoid `any` Type**

- Use specific types whenever possible
- If you must use `any`, add a comment explaining why
- Consider using `unknown` and type guards instead

  ```typescript
  // ❌ Avoid
  const data: any = await response.json();

  // ✅ Better
  interface ResponseData {
    success: boolean;
    data: User;
  }
  const data: ResponseData = await response.json();

  // ⚠️ Only if necessary (with justification)
  // Third-party library with no types available
  const sdkResponse: any = externalSDK.call();
  ```

**3. Unused Variables**

- Remove unused imports and variables
- If a variable must exist but isn't used (e.g., destructuring), prefix with underscore:

  ```typescript
  // ✅ Correct
  const { data, error: _error } = await fetch(...);

  // ✅ Correct for function params
  const handleClick = (_event: MouseEvent) => { /* ... */ };
  ```

### React Best Practices

**1. Component Structure**

- Use functional components only (no class components)
- Export component as default at the end of file
- Use named exports for helper components in the same file

  ```typescript
  // ✅ Correct pattern
  export default function MyPage() {
    /* ... */
  }

  // Helper component in same file
  function HelperComponent() {
    /* ... */
  }
  ```

**2. Self-Closing Tags**

- Always use self-closing tags when there are no children:

  ```typescript
  // ✅ Correct
  <div className="container" />
  <input type="text" />

  // ❌ Wrong
  <div className="container"></div>
  ```

**3. JSX Curly Braces**

- Don't use curly braces for string literals:

  ```typescript
  // ✅ Correct
  <div className="container">
    Hello World
  </div>

  // ❌ Wrong
  <div className={'container'}>
    {'Hello World'}
  </div>
  ```

**4. Lists and Keys**

- Always provide unique `key` prop when mapping arrays:

  ```typescript
  // ✅ Correct
  {courses.map(course => (
    <CourseCard key={course.id} course={course} />
  ))}

  // ❌ Wrong (missing key)
  {courses.map(course => (
    <CourseCard course={course} />
  ))}

  // ❌ Wrong (index as key - only use if items never reorder)
  {courses.map((course, i) => (
    <CourseCard key={i} course={course} />
  ))}
  ```

**5. useEffect and Hooks Dependencies**

This is the MOST COMMON source of ESLint errors. Follow these guidelines:

**a. Include all dependencies:**

```typescript
// ✅ Correct
useEffect(() => {
  fetchData(userId);
}, [userId, fetchData]); // Include all referenced variables
```

**b. When to disable exhaustive-deps (use sparingly):**

Only disable when you have a valid reason:

- **Router/Navigation calls:** `router.push()`, `router.replace()` are stable
- **One-time initialization:** Effect should only run on mount
- **Callback would cause infinite loops:** Including it would re-trigger effect

Always add a comment explaining WHY:

```typescript
// ✅ Acceptable - router.push is stable and doesn't need to be in deps
useEffect(() => {
  if (!isAuthenticated) {
    router.push('/login');
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isAuthenticated]); // router intentionally omitted

// ✅ Acceptable - one-time setup
useEffect(() => {
  initializeAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Empty deps - only run once on mount
```

**c. Better patterns to avoid disabling:**

Use `useCallback` for functions:

```typescript
// ✅ Better approach
const fetchData = useCallback(async () => {
  const data = await fetch(`/api/users/${userId}`);
  setData(data);
}, [userId]);

useEffect(() => {
  fetchData();
}, [fetchData]); // No need to disable - fetchData is memoized
```

Separate concerns into multiple effects:

```typescript
// ✅ Better - separate effects for separate concerns
useEffect(() => {
  checkAuth();
}, [userId]);

useEffect(() => {
  if (isAuthenticated) {
    loadUserData();
  }
}, [isAuthenticated]);
```

### Console Statements

**1. Logging Standards**

- Use `console.log`, `console.warn`, or `console.error` (allowed)
- Always prefix with `[DBG][$filename]` for debugging:

  ```typescript
  console.log('[DBG][CourseCard] Rendering course:', course.id);
  console.error('[DBG][auth] Login failed:', error);
  ```

- Do NOT use `console.info`, `console.debug`, etc. (will trigger warnings)

**2. Before Production**

- Remove or guard debug logs in production code
- Consider using environment checks:
  ```typescript
  if (process.env.NODE_ENV === 'development') {
    console.log('[DBG][MyComponent] Debug info');
  }
  ```

### Next.js Specific Rules

**1. Image Optimization**

- Prefer `next/image` over `<img>` tags:

  ```typescript
  // ✅ Preferred
  import Image from 'next/image';
  <Image src="/photo.jpg" alt="Description" width={500} height={300} />

  // ⚠️ Only if next/image can't be used (e.g., dynamic aspect ratios)
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src={dynamicSrc} alt="Dynamic content" />
  ```

**2. Link Component**

- Always use `next/link` for internal navigation:

  ```typescript
  import Link from 'next/link';

  // ✅ Correct
  <Link href="/courses">View Courses</Link>

  // ❌ Wrong
  <a href="/courses">View Courses</a>
  ```

### Variable Declarations

**1. const vs let**

- Use `const` by default
- Only use `let` if value will be reassigned
- Never use `var`

  ```typescript
  // ✅ Correct
  const userId = '123';
  let counter = 0;
  counter++;

  // ❌ Wrong
  let userId = '123'; // Should be const
  var counter = 0; // Never use var
  ```

### When to Use eslint-disable Comments

**Use SPARINGLY and only for:**

1. **React Hooks exhaustive-deps** - When dependency would cause infinite loop or is intentionally stable
2. **Third-party libraries with `any` types** - When library has no TypeScript definitions
3. **Next.js image optimization** - When `<img>` is required (e.g., external CDN, dynamic sizing)
4. **One-off edge cases** - With clear explanation

**ALWAYS:**

- Use `// eslint-disable-next-line` (not disable for whole file)
- Add a comment explaining WHY
- Consider refactoring instead of disabling

**Example:**

```typescript
// Third-party Razorpay SDK doesn't export types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const razorpay: any = new Razorpay(options);
```

### Pre-Commit Checklist

Before every commit:

1. ✅ Run `npm run lint` - ensure no errors
2. ✅ Run `npm run build` - confirm build succeeds
3. ✅ Check that console.logs use `[DBG][$filename]` prefix
4. ✅ Verify type imports use `import type` syntax
5. ✅ Ensure no unused variables/imports
6. ✅ Check useEffect dependencies are correct or properly disabled with comments
7. ✅ If you added eslint-disable comments, ensure they have explanations

The pre-commit hook will auto-fix many issues, but some require manual intervention.

### Troubleshooting ESLint Errors

**Common errors and fixes:**

1. **"no-unused-vars"** → Remove the import/variable or prefix with underscore
2. **"react-hooks/exhaustive-deps"** → Add missing dependencies or disable with comment explaining why
3. **"prettier/prettier"** → Run `npm run format` to auto-fix
4. **"@typescript-eslint/no-explicit-any"** → Use specific type or add comment justifying `any`
5. **"react/jsx-key"** → Add `key` prop to mapped elements
6. **"prefer-const"** → Change `let` to `const` if variable isn't reassigned
7. **"no-var"** → Replace `var` with `const` or `let`

### Deployment

- This app is deployed to Vercel
