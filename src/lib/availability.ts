import { connectToDatabase } from './mongodb';
import ExpertAvailability from '@/models/ExpertAvailability';
import LiveSession from '@/models/LiveSession';
import type { AvailableSlot } from '@/types';
import { nanoid } from 'nanoid';

/**
 * Generate available time slots for an expert on a specific date
 * @param expertId Expert's ID
 * @param date Date string in YYYY-MM-DD format
 * @param sessionDuration Duration of session in minutes (default 60)
 * @returns Array of available time slots
 */
export async function generateAvailableSlots(
  expertId: string,
  date: string,
  sessionDuration: number = 60
): Promise<AvailableSlot[]> {
  console.log(`[DBG][lib/availability] Generating slots for expert ${expertId} on ${date}`);

  await connectToDatabase();

  // Get day of week for the date (0=Sunday, 6=Saturday)
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();

  // Get expert's availability for this day
  const availabilities = await ExpertAvailability.find({
    expertId,
    isActive: true,
    $or: [
      // Recurring weekly availability for this day
      { isRecurring: true, dayOfWeek },
      // One-time availability for this specific date
      { isRecurring: false, date },
    ],
  });

  if (availabilities.length === 0) {
    console.log('[DBG][lib/availability] No availability found for this date');
    return [];
  }

  // Get existing sessions for this expert on this date to check conflicts
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existingSessions = await LiveSession.find({
    expertId,
    status: { $in: ['scheduled', 'live'] }, // Only check active sessions
    scheduledStartTime: {
      $gte: startOfDay.toISOString(),
      $lt: endOfDay.toISOString(),
    },
  });

  console.log(`[DBG][lib/availability] Found ${existingSessions.length} existing sessions`);

  // Generate time slots
  const slots: AvailableSlot[] = [];

  for (const availability of availabilities) {
    const [startHour, startMinute] = availability.startTime.split(':').map(Number);
    const [endHour, endMinute] = availability.endTime.split(':').map(Number);

    // Create datetime objects for this availability window
    let slotStart = new Date(date);
    slotStart.setHours(startHour, startMinute, 0, 0);

    const windowEnd = new Date(date);
    windowEnd.setHours(endHour, endMinute, 0, 0);

    // Generate slots within this availability window
    while (slotStart < windowEnd) {
      const slotEnd = new Date(slotStart.getTime() + sessionDuration * 60000);

      // Don't create slots that extend past the availability window
      if (slotEnd > windowEnd) {
        break;
      }

      // Check if this slot conflicts with existing sessions
      const hasConflict = existingSessions.some(session => {
        const sessionStart = new Date(session.scheduledStartTime);
        const sessionEnd = new Date(session.scheduledEndTime);

        // Check for overlap: slot starts before session ends AND slot ends after session starts
        return slotStart < sessionEnd && slotEnd > sessionStart;
      });

      // Don't allow booking slots in the past
      const now = new Date();
      const isPast = slotEnd <= now;

      slots.push({
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        duration: sessionDuration,
        available: !hasConflict && !isPast,
      });

      // Move to next slot
      slotStart = new Date(slotStart.getTime() + sessionDuration * 60000);
    }
  }

  console.log(`[DBG][lib/availability] Generated ${slots.length} slots`);
  return slots;
}

/**
 * Check if expert has a scheduling conflict for a given time range
 * @param expertId Expert's ID
 * @param startTime Start time ISO string
 * @param endTime End time ISO string
 * @param excludeSessionId Optional session ID to exclude (for editing existing sessions)
 * @returns true if conflict exists, false otherwise
 */
export async function checkSchedulingConflict(
  expertId: string,
  startTime: string,
  endTime: string,
  excludeSessionId?: string
): Promise<boolean> {
  console.log(`[DBG][lib/availability] Checking conflicts for expert ${expertId}`);

  await connectToDatabase();

  const start = new Date(startTime);
  const end = new Date(endTime);

  // Find sessions that overlap with this time range
  const query: any = {
    expertId,
    status: { $in: ['scheduled', 'live'] },
    $or: [
      // Session starts during this time
      {
        scheduledStartTime: { $gte: start.toISOString(), $lt: end.toISOString() },
      },
      // Session ends during this time
      {
        scheduledEndTime: { $gt: start.toISOString(), $lte: end.toISOString() },
      },
      // Session completely encompasses this time
      {
        scheduledStartTime: { $lte: start.toISOString() },
        scheduledEndTime: { $gte: end.toISOString() },
      },
    ],
  };

  // Exclude specific session if provided (for editing)
  if (excludeSessionId) {
    query._id = { $ne: excludeSessionId };
  }

  const conflicts = await LiveSession.find(query);

  console.log(`[DBG][lib/availability] Found ${conflicts.length} conflicts`);
  return conflicts.length > 0;
}

/**
 * Check if a time slot is available for booking
 * Checks both expert availability rules AND scheduling conflicts
 * @param expertId Expert's ID
 * @param startTime Start time ISO string
 * @param endTime End time ISO string
 * @returns true if slot is available, false otherwise
 */
export async function isSlotAvailable(
  expertId: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  console.log(`[DBG][lib/availability] Checking if slot is available`);

  await connectToDatabase();

  const start = new Date(startTime);
  const end = new Date(endTime);

  // Check if slot is in the past
  const now = new Date();
  if (end <= now) {
    console.log('[DBG][lib/availability] Slot is in the past');
    return false;
  }

  // Extract date and time components
  const date = start.toISOString().split('T')[0]; // YYYY-MM-DD
  const dayOfWeek = start.getDay();
  const startTimeStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
  const endTimeStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

  // Check if expert has availability for this time
  const availabilities = await ExpertAvailability.find({
    expertId,
    isActive: true,
    $or: [
      // Recurring weekly availability for this day
      { isRecurring: true, dayOfWeek },
      // One-time availability for this specific date
      { isRecurring: false, date },
    ],
  });

  // Check if requested time falls within any availability window
  const withinAvailability = availabilities.some(availability => {
    return startTimeStr >= availability.startTime && endTimeStr <= availability.endTime;
  });

  if (!withinAvailability) {
    console.log('[DBG][lib/availability] Slot is outside expert availability');
    return false;
  }

  // Check for scheduling conflicts
  const hasConflict = await checkSchedulingConflict(expertId, startTime, endTime);
  if (hasConflict) {
    console.log('[DBG][lib/availability] Slot has scheduling conflict');
    return false;
  }

  console.log('[DBG][lib/availability] Slot is available!');
  return true;
}

/**
 * Create a default availability schedule for a new expert
 * Monday-Friday, 9am-5pm
 * @param expertId Expert's ID
 */
export async function createDefaultAvailability(expertId: string): Promise<void> {
  console.log(`[DBG][lib/availability] Creating default availability for expert ${expertId}`);

  await connectToDatabase();

  // Check if expert already has availability
  const existing = await ExpertAvailability.findOne({ expertId, isActive: true });
  if (existing) {
    console.log('[DBG][lib/availability] Expert already has availability');
    return;
  }

  // Create Monday-Friday, 9am-5pm schedule
  const weekdays = [1, 2, 3, 4, 5]; // Monday to Friday
  const availabilities = weekdays.map(dayOfWeek => ({
    _id: nanoid(),
    expertId,
    dayOfWeek,
    startTime: '09:00',
    endTime: '17:00',
    isRecurring: true,
    isActive: true,
  }));

  await ExpertAvailability.insertMany(availabilities);
  console.log('[DBG][lib/availability] Default availability created');
}
