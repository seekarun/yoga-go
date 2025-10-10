## Yoga-GO

##API Routes

### GUEST ROUTES

- GET /data/experts/
- GET /data/experts/{expertId}
- GET /data/courses/
- GET /data/courses/{courseId}
- GET /data/courses/{courseId}/progress/{savePoint}
- GET /data/courses/{courseId}/items
- GET /data/courses/{courseId}/items/{itemId}

### AUTH ROUTES

- GET /data/app/courses/
- GET /data/app/courses/{courseId}
- GET /data/app/courses/{courseId}/progress/{savePoint}
- GET /data/app/user/{userId}/details

## UI Routes

### Guest Routes

- / (guest)
  - Home
  - landing page
  - header
  - hero section
  - carousel with courses
  - carousel with experts
  - testimonials section
  - pricing details
  - footer section
- /experts
  - Expert listing page
- /experts/{expertId}
  - Expert profile page

### Student Routes (Authenticated)

- /app
  - User dashboard
  - Course progress section
  - New courses upsell section
- /app/courses/{id}
  - Course content player

### Expert Portal (Public - Auth to be added)

- /srv
  - Expert portal home
  - List of all experts with dashboard access
- /srv/{expertId}
  - Expert dashboard
  - Course engagement metrics
  - Subscriber statistics
  - Revenue analytics
  - Recent activity feed
  - Student demographics
- /srv/{expertId}/courses/{courseId}
  - Course management interface
  - Upload course items (videos)
  - Manage item metadata (title, description, duration)
  - Order course items
  - Edit/delete course items

## Getting Started

### Development

```bash
npm run dev        # Start development server on port 3111
npm run build      # Build production bundle
npm run start      # Start production server
```

Open [http://localhost:3111](http://localhost:3111) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Code Quality

```bash
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues automatically
npm run format         # Format all files with Prettier
npm run format:check   # Check if files are formatted
```

**Pre-commit Hook**: The project uses Husky to automatically lint and format code before each commit.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
