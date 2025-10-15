import { NextResponse } from 'next/server';
import type { ApiResponse, Expert } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import ExpertModel from '@/models/Expert';

export async function GET() {
  console.log('[DBG][experts/route.ts] GET /data/experts called');

  try {
    await connectToDatabase();

    // Fetch all experts from MongoDB
    const expertDocs = await ExpertModel.find({}).lean().exec();

    // Transform MongoDB documents to Expert type
    const experts: Expert[] = expertDocs.map((doc: any) => ({
      ...doc,
      id: doc._id as string,
    }));

    const response: ApiResponse<Expert[]> = {
      success: true,
      data: experts,
      total: experts.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][experts/route.ts] Error fetching experts:', error);
    const response: ApiResponse<Expert[]> = {
      success: false,
      error: 'Failed to fetch experts',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('[DBG][experts/route.ts] POST /data/experts called');

  try {
    const body = await request.json();
    console.log('[DBG][experts/route.ts] Received expert data:', body);

    // Validate required fields
    const requiredFields = ['id', 'name', 'title', 'bio', 'avatar'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      const response: ApiResponse<Expert> = {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      };
      return NextResponse.json(response, { status: 400 });
    }

    await connectToDatabase();

    // Check if expert with this ID already exists
    const existingExpert = await ExpertModel.findById(body.id).exec();
    if (existingExpert) {
      const response: ApiResponse<Expert> = {
        success: false,
        error: 'Expert with this ID already exists',
      };
      return NextResponse.json(response, { status: 409 });
    }

    // Create new expert with defaults
    const newExpertData = {
      _id: body.id,
      name: body.name,
      title: body.title,
      bio: body.bio,
      avatar: body.avatar,
      rating: body.rating || 0,
      totalCourses: body.totalCourses || 0,
      totalStudents: body.totalStudents || 0,
      specializations: body.specializations || [],
      featured: body.featured || false,
      certifications: body.certifications || [],
      experience: body.experience || '',
      courses: body.courses || [],
      socialLinks: body.socialLinks || {},
    };

    const newExpert = new ExpertModel(newExpertData);
    await newExpert.save();

    console.log('[DBG][experts/route.ts] Expert created successfully:', newExpert._id);

    // Transform to Expert type for response
    const expert: Expert = {
      ...newExpert.toObject(),
      id: newExpert._id as string,
    };

    const response: ApiResponse<Expert> = {
      success: true,
      data: expert,
      message: 'Expert created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[DBG][experts/route.ts] Error creating expert:', error);
    const response: ApiResponse<Expert> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create expert',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
