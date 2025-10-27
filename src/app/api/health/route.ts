import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Docker and load balancer health checks
 * GET /api/health
 */
export async function GET() {
  try {
    // Basic health check - can be extended to check MongoDB, Auth0, etc.
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };

    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    console.error('[DBG][health] Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
