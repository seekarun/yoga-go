import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import TeachingLead from '@/models/TeachingLead';
import type { ApiResponse } from '@/types';

/**
 * POST /api/teaching-leads
 * Submit a teaching interest application
 */
export async function POST(request: NextRequest) {
  console.log('[DBG][api/teaching-leads] POST /api/teaching-leads called');

  try {
    const body = await request.json();
    const { name, email, phone, bio, reasonForTeaching } = body;

    // Validation
    if (!name || !email || !bio || !reasonForTeaching) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Missing required fields: name, email, bio, and reasonForTeaching are required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();

    // Check if email already submitted (prevent duplicates)
    const existing = await TeachingLead.findOne({
      email: email.toLowerCase(),
      status: { $in: ['pending', 'contacted'] },
    });

    if (existing) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'An application with this email is already pending review',
      };
      return NextResponse.json(response, { status: 409 });
    }

    // Create teaching lead
    const teachingLead = await TeachingLead.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim(),
      bio: bio.trim(),
      reasonForTeaching: reasonForTeaching.trim(),
      submittedAt: new Date(),
      status: 'pending',
    });

    console.log('[DBG][api/teaching-leads] Teaching lead created:', teachingLead._id);

    // TODO: Send email notification to admin
    // sendEmailNotification({ to: process.env.ADMIN_EMAIL, subject: 'New Teaching Application', ... })

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: teachingLead._id },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[DBG][api/teaching-leads] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET /api/teaching-leads
 * List all teaching leads (admin only - for scripts)
 */
export async function GET() {
  console.log('[DBG][api/teaching-leads] GET /api/teaching-leads called');

  try {
    // TODO: Add admin authentication check
    // const session = await getSession();
    // if (!session?.user?.isAdmin) return 401

    await connectToDatabase();

    const leads = await TeachingLead.find().sort({ submittedAt: -1 }).lean();

    const response: ApiResponse<typeof leads> = {
      success: true,
      data: leads,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/teaching-leads] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
