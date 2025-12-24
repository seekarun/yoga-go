import * as expertRepository from '@/lib/repositories/expertRepository';
import { validateExpertId, validateExpertIdWithAI } from '@/lib/reservedIds';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET /data/experts/validate-id?id=<expertId>
 * Validate an expert ID before registration
 *
 * Checks:
 * 1. ID format (length, valid characters)
 * 2. ID is not reserved/blocked (hard blocklist)
 * 3. ID is not already taken
 * 4. AI validation for profanity, impersonation, etc. (soft rejection - flagged for review)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({
      success: false,
      isValid: false,
      error: 'ID is required',
    });
  }

  const normalizedId = id.toLowerCase().trim();

  // Check format and blocklist (hard rejection)
  const basicValidation = validateExpertId(normalizedId);
  if (!basicValidation.isValid) {
    return NextResponse.json({
      success: true,
      isValid: false,
      isReserved: true,
      error: basicValidation.error,
    });
  }

  // Check if ID already exists
  try {
    const existingExpert = await expertRepository.getExpertById(normalizedId);
    if (existingExpert) {
      return NextResponse.json({
        success: true,
        isValid: false,
        isTaken: true,
        error: 'This ID is already taken',
      });
    }
  } catch (error) {
    console.error('[DBG][validate-id] Error checking expert:', error);
    // If DB check fails, allow to proceed (will fail at registration if taken)
  }

  // Run AI validation (checks for profanity, impersonation, etc.)
  try {
    const aiValidation = await validateExpertIdWithAI(normalizedId);

    // Hard rejection from AI (shouldn't happen since blocklist passed, but just in case)
    if (!aiValidation.isValid && aiValidation.hardRejection) {
      return NextResponse.json({
        success: true,
        isValid: false,
        isReserved: true,
        error: aiValidation.error || 'This ID is not allowed',
      });
    }

    // Soft rejection - flagged for review (profanity, suspicious, etc.)
    if (aiValidation.flaggedForReview) {
      return NextResponse.json({
        success: true,
        isValid: false,
        isFlagged: true,
        error:
          'This ID is not suitable for this platform and cannot be used. Please choose a different ID.',
      });
    }
  } catch (error) {
    console.error('[DBG][validate-id] AI validation error:', error);
    // If AI validation fails, allow to proceed (will be caught at registration)
  }

  return NextResponse.json({
    success: true,
    isValid: true,
    message: 'This ID is available!',
  });
}
