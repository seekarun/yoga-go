# Creating a New App in the Monorepo

This document describes the process of creating a new app in the yoga-go monorepo, using the "cally" app as an example.

## Overview

The cally app was created to test the core package restructure. It's a simplified version of the yoga app focused on:
- Landing pages
- Calendar management
- Live session scheduling
- User management
- Domain & email settings
- Third-party integrations (Stripe, Google, Zoom)

**Key difference from yoga**: No courses, webinars, blog, recordings, analytics, surveys, or assets.

## Prerequisites

- Node.js 18+
- npm workspaces configured in root `package.json`
- Core packages already extracted (`@core/types`, `@core/lib`, etc.)

---

## Phase 1: Create App Scaffold

### 1.1 Create the app directory structure

```bash
mkdir -p apps/cally/src/{app,components,contexts,lib,types}
mkdir -p apps/cally/public
```

### 1.2 Create package.json

The `package.json` defines the app's dependencies and scripts. Key points:
- Name must match the workspace directory name
- Include `@core/*` packages if using shared code
- Set up dev/build/start scripts

```json
{
  "name": "cally",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "devH": "next dev -p 3113 -H 0.0.0.0 --turbo",
    "dev": "next dev -p 3113 --turbo",
    "build": "next build",
    "start": "next start -p 3113",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write ."
  }
}
```

### 1.3 Create tsconfig.json

Configure TypeScript with path aliases for clean imports:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@core/types": ["../../core/types/src"],
      "@core/lib": ["../../core/lib/src"],
      "@core/components": ["../../core/components/src"],
      "@core/contexts": ["../../core/contexts/src"],
      "@core/hooks": ["../../core/hooks/src"],
      "@core/repositories": ["../../core/repositories/src"]
    }
  }
}
```

### 1.4 Create next.config.ts

Configure Next.js to transpile workspace packages:

```typescript
const nextConfig = {
  transpilePackages: [
    '@core/types',
    '@core/lib',
    '@core/components',
    '@core/contexts',
    '@core/hooks',
    '@core/repositories',
  ],
};
```

### 1.5 Create vercel.json

For Vercel deployment in a monorepo:

```json
{
  "framework": "nextjs",
  "buildCommand": "cd ../.. && npm run build:cally",
  "installCommand": "cd ../.. && npm ci"
}
```

### 1.6 Update root package.json

Add workspace scripts for the new app:

```json
{
  "scripts": {
    "dev:cally": "npm run devH -w cally",
    "build:cally": "npm run build -w cally",
    "start:cally": "npm run start -w cally",
    "lint:cally": "npm run lint -w cally"
  }
}
```

---

## Phase 2: Core App Structure

### 2.1 Root Layout (src/app/layout.tsx)

The root layout wraps all pages with providers:
- AuthProvider for authentication state
- Any global styles

### 2.2 Middleware (src/middleware.ts)

Protect routes that require authentication:
- `/srv/*` routes require login
- `/api/srv/*` routes require authentication
- Redirect unauthenticated users to signin

### 2.3 Types (src/types/index.ts)

Re-export core types and add app-specific types:

```typescript
// Re-export everything from core
export * from '@core/types';

// App-specific type overrides (if any)
export * from './vertical';
```

---

## Phase 3: Authentication

### 3.1 Copy auth utilities

Copy from existing app:
- `src/lib/auth.ts` - Session management
- `src/lib/cognito-auth.ts` - Cognito integration
- `src/contexts/AuthContext.tsx` - React auth context

### 3.2 Auth pages

- `src/app/auth/signin/page.tsx` - Login form
- `src/app/auth/callback/page.tsx` - OAuth callback handler

### 3.3 Environment variables

Create `.env.local` with:
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`
- `NEXT_PUBLIC_COGNITO_DOMAIN`
- AWS credentials for DynamoDB, SES, etc.

---

## Phase 4: Dashboard Structure

### 4.1 Onboarding Gateway (src/app/srv/page.tsx)

Checks if user has completed onboarding:
- Not authenticated → redirect to signin
- No expert profile → show onboarding wizard
- Has profile → redirect to dashboard

### 4.2 Dashboard Layout (src/app/srv/[expertId]/layout.tsx)

Wraps all dashboard pages with:
- Sidebar navigation
- Header
- Authorization checks (user owns this profile)

### 4.3 Sidebar Component

Create a simplified sidebar with only needed navigation items.

---

## Phase 5: Copy & Adapt Pages

For each page needed:

1. Copy the source file from the reference app
2. Update imports to use `@/` paths
3. Remove unused features/sections
4. Update any app-specific text/branding
5. Test the page works

---

## Phase 6: API Routes

Copy only the API routes needed for your app's features:

```
/api/auth/*        - Authentication
/api/user/*        - User management
/api/stripe/*      - Payments (if needed)
/data/experts/*    - Expert CRUD
/data/app/*        - Dashboard data
```

---

## Phase 7: Testing

1. Run `npm install` from root to link workspaces
2. Run `npm run build:cally` to verify TypeScript
3. Run `npm run dev:cally` to start dev server
4. Test all user flows manually

---

## Checklist

- [x] package.json created with correct name and scripts
- [x] tsconfig.json with path aliases
- [x] next.config.ts with transpilePackages
- [x] vercel.json for deployment
- [x] Root package.json updated with workspace scripts
- [x] Auth context and utilities copied
- [x] Middleware protecting routes
- [ ] Onboarding flow implemented (placeholder only)
- [x] Dashboard layout with sidebar
- [x] All required pages copied and adapted (placeholders)
- [ ] API routes copied (only /api/auth/me)
- [ ] Environment variables configured
- [x] Build passes
- [ ] Dev server runs
- [ ] All user flows tested

---

## Cally App Structure (Created)

```
apps/cally/
├── package.json              # Dependencies, scripts (port 3113)
├── tsconfig.json             # TypeScript with @core/* paths
├── next.config.ts            # transpilePackages for core
├── eslint.config.mjs         # ESLint flat config
├── postcss.config.mjs        # Tailwind CSS
├── vercel.json               # Vercel deployment
├── public/
│   └── .gitkeep
└── src/
    ├── app/
    │   ├── globals.css       # Cally brand colors (blue theme)
    │   ├── layout.tsx        # Root layout with AuthProvider
    │   ├── page.tsx          # Landing page
    │   ├── auth/
    │   │   └── signin/page.tsx
    │   ├── api/
    │   │   └── auth/
    │   │       └── me/route.ts
    │   └── srv/
    │       ├── page.tsx      # Onboarding gateway
    │       └── [expertId]/
    │           ├── layout.tsx        # Dashboard with sidebar
    │           ├── page.tsx          # Dashboard home
    │           ├── users/page.tsx
    │           ├── landing-page/page.tsx
    │           ├── calendar/page.tsx
    │           ├── preferences/page.tsx
    │           └── settings/
    │               ├── page.tsx      # Integrations
    │               ├── domain/page.tsx
    │               ├── google/page.tsx
    │               └── zoom/page.tsx
    ├── components/
    │   └── dashboard/
    │       └── CallySidebar.tsx
    ├── contexts/
    │   └── AuthContext.tsx
    ├── middleware.ts
    └── types/
        ├── index.ts
        └── vertical.ts       # Cally config (features enabled/disabled)
```

## Commands

```bash
# Development
npm run dev:cally          # Start on port 3113

# Build
npm run build:cally        # Build for production

# Lint
npm run lint:cally         # Run ESLint
```

## Next Steps to Make Cally Fully Functional

1. **Copy API routes** from yoga app:
   - `/api/auth/*` (signin, logout, callbacks)
   - `/data/experts/*` (expert CRUD)
   - `/data/app/expert/*` (dashboard data)
   - `/data/app/tenant` (tenant data)

2. **Copy lib utilities** from yoga app:
   - `lib/auth.ts` (full implementation)
   - `lib/repositories/*` (needed repositories)
   - `lib/cognito.ts` (Cognito integration)

3. **Implement onboarding**:
   - Create `CallyOnboarding.tsx` component (simplified 2-step wizard)
   - Remove yoga-specific niche selection

4. **Copy and adapt pages**:
   - Landing page editor (remove courses/webinars sections)
   - Calendar (FullCalendar integration)
   - Users page (with DynamoDB queries)
   - Domain/email settings (full implementation)
   - Integration settings (OAuth flows)

5. **Set up environment variables**:
   - Copy `.env.local` from yoga app
   - Update any app-specific values
