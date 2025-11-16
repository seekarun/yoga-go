import { connectToDatabase } from './mongodb';
import ExpertAvailability from '@/models/ExpertAvailability';
import LiveSession from '@/models/LiveSession';
import type { AvailableSlot } from '@/types';
import { nanoid } from 'nanoid';

/**
 * Generate available time slots for an expert on a specific date
 * Each ExpertAvailability record defines a time window that gets subdivided into bookable slots
 * based on the expert's configured sessionDuration and bufferMinutes
 * @param expertId Expert's ID
 * @param date Date string in YYYY-MM-DD format
 * @param sessionDuration Duration override (optional, ignored - uses expert's configured durations)
 * @returns Array of available time slots (available = not booked)
 */
export async function generateAvailableSlots(
  expertId: string,
  date: string,
  sessionDuration?: number
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

  // Get existing sessions for this expert on this date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existingSessions = await LiveSession.find({
    expertId,
    status: { $in: ['scheduled', 'live'] },
    scheduledStartTime: {
      $gte: startOfDay.toISOString(),
      $lt: endOfDay.toISOString(),
    },
  });

  console.log(`[DBG][lib/availability] Found ${existingSessions.length} existing sessions`);

  // Generate time slots by subdividing availability windows
  const slots: AvailableSlot[] = [];

  for (const availability of availabilities) {
    const [startHour, startMinute] = availability.startTime.split(':').map(Number);
    const [endHour, endMinute] = availability.endTime.split(':').map(Number);

    // Get session configuration (with defaults)
    const sessionDurationMinutes = availability.sessionDuration || 60;
    const bufferMinutes = availability.bufferMinutes || 0;

    // Create datetime objects for this availability window
    const windowStart = new Date(date);
    windowStart.setHours(startHour, startMinute, 0, 0);

    const windowEnd = new Date(date);
    windowEnd.setHours(endHour, endMinute, 0, 0);

    // Subdivide the window into bookable slots
    let currentSlotStart = new Date(windowStart);

    while (currentSlotStart < windowEnd) {
      // Calculate slot end time (start + session duration)
      const currentSlotEnd = new Date(
        currentSlotStart.getTime() + sessionDurationMinutes * 60 * 1000
      );

      // Check if this slot fits within the availability window
      if (currentSlotEnd > windowEnd) {
        console.log('[DBG][lib/availability] Slot would exceed window end, stopping subdivision');
        break;
      }

      // Check if this slot is already booked
      const isBooked = existingSessions.some(session => {
        const sessionStart = new Date(session.scheduledStartTime);
        const sessionEnd = new Date(session.scheduledEndTime);
        // Check for any time overlap
        return (
          (sessionStart >= currentSlotStart && sessionStart < currentSlotEnd) ||
          (sessionEnd > currentSlotStart && sessionEnd <= currentSlotEnd) ||
          (sessionStart <= currentSlotStart && sessionEnd >= currentSlotEnd)
        );
      });

      // Don't allow booking slots in the past (with 2hr minimum notice)
      const now = new Date();
      const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      const isPast = currentSlotStart <= minBookingTime;

      slots.push({
        startTime: currentSlotStart.toISOString(),
        endTime: currentSlotEnd.toISOString(),
        duration: sessionDurationMinutes,
        available: !isBooked && !isPast,
      });

      // Move to next slot (add session duration + buffer)
      currentSlotStart = new Date(
        currentSlotStart.getTime() + (sessionDurationMinutes + bufferMinutes) * 60 * 1000
      );
    }
  }

  // Sort slots by start time
  slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  console.log(
    `[DBG][lib/availability] Generated ${slots.length} slots from ${availabilities.length} availability windows`
  );
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
