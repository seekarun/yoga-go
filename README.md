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

## MongoDB Collections

The application uses MongoDB for data persistence. All collections are actively used in the application.

### 1. `users` ✅ ACTIVE

**Purpose**: Stores user account information, profiles, memberships, and activity data.

**Model**: `src/models/User.ts`

**Key Fields**:

- `_id`: User ID (string)
- `auth0Id`: Auth0 authentication ID (unique, indexed)
- `profile`: User profile data (name, email, avatar, bio, location, timezone, phone)
- `membership`: Subscription details (type: free/basic/premium/lifetime, status, dates, benefits)
- `statistics`: User activity metrics (courses, lessons, practice time, streaks)
- `achievements`: Array of unlocked achievements
- `enrolledCourses`: Array of courses user is enrolled in
- `preferences`: User settings (notifications, reminders, video quality, language)
- `billing`: Payment history and upcoming payments
- `savedItems`: Favorite courses, watchlist, bookmarked lessons
- `social`: Following, followers, public profile settings

**Indexes**:

- `auth0Id` (unique)
- `profile.email`
- `membership.type`
- `membership.status`

**Used In**:

- `src/lib/auth.ts` - User authentication and session management
- `src/lib/enrollment.ts` - Course enrollment and user updates

---

### 2. `course_progress` ✅ ACTIVE

**Purpose**: Tracks detailed user progress through courses including lesson completion, time tracking, streaks, and notes.

**Model**: `src/models/CourseProgress.ts`

**Key Fields**:

- `_id`: Composite ID format `{userId}_{courseId}`
- `userId`: Reference to user (indexed)
- `courseId`: Reference to course (indexed)
- `enrolledAt`, `lastAccessed`, `completedAt`: Timestamp tracking
- `totalLessons`, `completedLessons`, `percentComplete`: Progress metrics
- `currentLessonId`: User's current position in course
- `totalTimeSpent`, `averageSessionTime`: Time tracking (in minutes)
- `streak`, `longestStreak`, `lastPracticeDate`: Engagement tracking
- `lessonProgress`: Array of per-lesson progress details
- `sessions`: Array of practice session history
- `notes`: Array of user notes on lessons
- `achievementIds`: Achievements unlocked for this course

**Indexes**:

- `userId` + `courseId` (unique compound index)
- `userId`
- `courseId`
- `percentComplete`

**Used In**:

- `src/lib/enrollment.ts` - Progress tracking and updates

---

### 3. `course` ✅ ACTIVE

**Purpose**: Stores course metadata, curriculum structure, pricing, and reviews.

**Model**: `src/models/Course.ts`

**Key Fields**:

- `_id`: Course ID (string)
- `title`, `description`, `longDescription`: Course content
- `instructor`: Instructor details (id, name, title, avatar)
- `thumbnail`, `coverImage`: Image assets
- `promoVideoCloudflareId`: Cloudflare Stream video UID for promo
- `promoVideoStatus`: Video processing status (uploading/processing/ready/error)
- `level`, `duration`, `totalLessons`, `freeLessons`: Course metadata
- `price`: Course price (number)
- `rating`, `totalRatings`, `totalStudents`: Social proof metrics
- `category`, `tags`: Categorization
- `featured`, `isNew`: Display flags
- `status`: Publication status (IN_PROGRESS/PUBLISHED/ARCHIVED)
- `requirements`, `whatYouWillLearn`: Course details
- `curriculum`: Array of week-based curriculum with lesson IDs
- `reviews`: Array of course reviews

**Indexes**:

- `featured`
- `category`
- `status`
- `instructor.id`

**Used In**:

- `src/app/data/courses/route.ts` - List all courses
- `src/app/data/courses/[courseId]/route.ts` - Course details
- `src/app/data/courses/[courseId]/items/route.ts` - Course curriculum
- `src/app/data/courses/[courseId]/items/[itemId]/route.ts` - Individual lessons
- `src/app/data/app/courses/route.ts` - Authenticated course access
- `src/app/data/app/courses/[courseId]/route.ts` - User course data
- `src/app/data/experts/[expertId]/route.ts` - Expert's courses
- `src/lib/enrollment.ts` - Course enrollment
- `scripts/update-course-status.ts` - Status management
- `scripts/migrate-to-mongodb.ts` - Data migration

---

### 4. `lessons` ✅ ACTIVE

**Purpose**: Stores individual lesson/video content within courses.

**Model**: `src/models/Lesson.ts`

**Key Fields**:

- `_id`: Lesson ID (string)
- `courseId`: Parent course reference (indexed)
- `title`, `description`: Lesson content
- `duration`: Lesson length
- `isFree`: Whether lesson is free to preview
- `cloudflareVideoId`: Cloudflare Stream video UID
- `cloudflareVideoStatus`: Video processing status
- `videoUrl`: Deprecated field (use cloudflareVideoId instead)
- `resources`: Array of additional resources
- `completed`, `completedAt`: Completion tracking
- `notes`: User notes
- `locked`: Whether lesson is locked for user

**Indexes**:

- `courseId`

**Used In**:

- `src/app/data/courses/[courseId]/route.ts` - Course with lessons
- `src/app/data/courses/[courseId]/items/route.ts` - List lessons
- `src/app/data/courses/[courseId]/items/[itemId]/route.ts` - Individual lesson
- `src/app/data/app/courses/[courseId]/route.ts` - Authenticated lesson access
- `scripts/migrate-to-mongodb.ts` - Data migration

---

### 5. `experts` ✅ ACTIVE

**Purpose**: Stores expert/instructor profiles and their associated courses.

**Model**: `src/models/Expert.ts`

**Key Fields**:

- `_id`: Expert ID (string)
- `name`, `title`, `bio`: Expert profile
- `avatar`: Profile image URL
- `rating`: Expert rating
- `totalCourses`, `totalStudents`: Statistics
- `specializations`: Array of expertise areas
- `featured`: Whether expert is featured
- `certifications`: Array of certifications
- `experience`: Experience description
- `courses`: Array of course summaries (id, title, level, duration, students)
- `socialLinks`: Social media links (Instagram, YouTube, Facebook, Twitter, website)

**Indexes**: None defined

**Used In**:

- `src/app/data/experts/route.ts` - List all experts
- `src/app/data/experts/[expertId]/route.ts` - Expert profile
- `src/app/data/courses/route.ts` - Course listings with expert info
- `src/app/data/courses/[courseId]/route.ts` - Course with expert details
- `scripts/migrate-to-mongodb.ts` - Data migration

---

### 6. `assets` ✅ ACTIVE

**Purpose**: Stores uploaded media assets (images, videos, documents) with Cloudflare integration.

**Model**: `src/models/Asset.ts`

**Key Fields**:

- `_id`: Asset ID (string)
- `filename`, `originalUrl`: Original file information
- `croppedUrl`: URL for cropped version
- `cloudflareImageId`: Cloudflare Images ID (indexed)
- `croppedCloudflareImageId`: Cloudflare ID for cropped version
- `type`: Asset type (image/video/document)
- `category`: Asset category (avatar/banner/thumbnail/course/lesson/other)
- `dimensions`: Width and height
- `cropData`: Crop coordinates (x, y, width, height, zoom)
- `size`: File size in bytes
- `mimeType`: File MIME type
- `uploadedBy`: User ID who uploaded
- `relatedTo`: Related entity (type: expert/user/course/lesson, id)
- `metadata`: Additional metadata

**Indexes**:

- `cloudflareImageId`
- `relatedTo.type` + `relatedTo.id`
- `uploadedBy`
- `category`

**Used In**:

- `src/app/api/cloudflare/images/upload/route.ts` - Image upload and management

---

### Summary

**Total Collections**: 6
**All Active**: ✅ Yes
**Unused Collections**: None

All MongoDB collections are actively used in the application. No cleanup required.

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

## AWS Deployment

This application is deployed to AWS using ECS on EC2 with automated CI/CD via GitHub Actions.

### Architecture

- **Container Registry**: AWS ECR (Elastic Container Registry)
- **Compute**: ECS on EC2 (single t3.micro instance - free tier eligible)
- **Infrastructure**: AWS CDK (TypeScript) in `infra/` directory
- **Secrets**: AWS Secrets Manager
- **Logging**: CloudWatch Logs
- **CI/CD**: GitHub Actions (automatic on push to main)

### Quick Commands

```bash
# Infrastructure management
npm run infra:deploy    # Deploy/update AWS infrastructure
npm run infra:diff      # Preview infrastructure changes
npm run infra:synth     # Generate CloudFormation template

# View available Docker images in ECR
./infra/scripts/list-images.sh

# Deploy specific image tag (rollback capability)
./infra/scripts/deploy-tag.sh <tag>      # Deploy specific tag
./infra/scripts/deploy-tag.sh b727c7a   # Example: deploy commit SHA
./infra/scripts/deploy-tag.sh latest    # Deploy latest image

# Get application URL
./infra/scripts/get-service-url.sh

# View application logs
aws logs tail /ecs/yoga-go --follow --region ap-southeast-2 --profile myg
```

### Automatic Deployment

Every push to `main` branch automatically:

1. Builds Docker image
2. Pushes to ECR with tags:
   - Git commit SHA (e.g., `b727c7a`)
   - `latest`
3. Deploys to ECS (forces service update)
4. Deployment takes 2-3 minutes

### Rollback & Tag Deployment

You can deploy any previous version from ECR:

**View available versions:**

```bash
./infra/scripts/list-images.sh
```

**Deploy specific version:**

```bash
# List available tags
./infra/scripts/deploy-tag.sh

# Deploy specific commit
./infra/scripts/deploy-tag.sh b727c7a

# Or use GitHub Actions manual workflow:
# Go to Actions → "Deploy Specific Tag to ECS" → Run workflow
```

**Quick rollback example:**

```bash
# 1. List available images
./infra/scripts/list-images.sh

# 2. Deploy previous version
./infra/scripts/deploy-tag.sh <previous-tag>

# 3. Verify deployment
curl http://YOUR_IP/api/health
```

### Image Tagging Strategy

- **Commit SHA tags** (e.g., `b727c7a`) - Use for production deployments (traceable)
- **`latest` tag** - Always points to most recent build
- **Lifecycle policy** - Keeps last 10 images, removes untagged after 1 day

### Monitoring

```bash
# Check service status
aws ecs describe-services \
  --cluster yoga-go-cluster \
  --services yoga-go-service \
  --region ap-southeast-2 \
  --profile myg

# View application logs
aws logs tail /ecs/yoga-go --follow \
  --region ap-southeast-2 \
  --profile myg

# Get EC2 instance public IP
./infra/scripts/get-service-url.sh
```

### Secrets Management

Application secrets are stored in AWS Secrets Manager:

```bash
# Update secrets from .env.production file
./infra/scripts/update-secrets.sh .env.production

# Restart service to apply new secrets
aws ecs update-service \
  --cluster yoga-go-cluster \
  --service yoga-go-service \
  --force-new-deployment \
  --region ap-southeast-2 \
  --profile myg
```

### Detailed Documentation

For comprehensive deployment documentation, troubleshooting, and best practices, see:

📖 **[DEPLOYMENT.md](./DEPLOYMENT.md)**

Topics covered:

- Complete infrastructure setup guide
- GitHub Actions configuration
- Secrets management
- Rollback procedures and scenarios
- Deployment verification checklist
- Troubleshooting common issues
- Cost optimization tips

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
