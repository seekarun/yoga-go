/**
 * Command Types - Natural Language Calendar Command Parsing
 *
 * Types for the parse-command API endpoint that converts natural language
 * into structured calendar actions.
 */

// ============================================
// Request Types
// ============================================

export interface EventSummary {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface ParseCommandRequest {
  command: string;
  currentDate: string; // YYYY-MM-DD
  currentTime: string; // HH:mm
  existingEvents?: EventSummary[];
}

// ============================================
// Response Types
// ============================================

export type CommandAction =
  | "create_event"
  | "update_event"
  | "delete_event"
  | "find_availability"
  | "query_event"
  | "set_availability"
  | "unknown";

export interface EventData {
  title?: string;
  date?: string; // YYYY-MM-DD (resolved from NL)
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  duration_minutes?: number; // If end time not specified
  description?: string;
}

export interface TargetEvent {
  searchQuery?: string; // e.g., "dentist appointment"
  date?: string; // YYYY-MM-DD (resolved from NL)
  time?: string; // HH:mm
  matchedEventId?: string; // If AI can match from existingEvents
}

export interface FindSlotParams {
  duration_minutes: number;
  purpose?: string; // e.g., "cleanup"
  constraints?: {
    afterDate?: string;
    beforeDate?: string;
    preferredTimeOfDay?: "morning" | "afternoon" | "evening";
  };
}

export interface QueryParams {
  date?: string; // YYYY-MM-DD
  dateRange?: {
    start: string;
    end: string;
  };
  searchTerm?: string;
}

export interface AvailabilityRule {
  type: "weekly" | "date-specific";
  days?: number[]; // 0-6 for weekly (0 = Sunday)
  date?: string; // YYYY-MM-DD for date-specific
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  available: boolean;
}

export interface AvailabilityData {
  rules: AvailabilityRule[];
  action: "set" | "add" | "clear";
}

export interface ParsedCommand {
  action: CommandAction;

  // For create_event / update_event
  event?: EventData;

  // For update_event / delete_event - event identification
  targetEvent?: TargetEvent;

  // For find_availability
  findSlot?: FindSlotParams;

  // For query_event
  query?: QueryParams;

  // For set_availability (existing format)
  availability?: AvailabilityData;

  // Human-friendly response message
  message: string;

  // Original user command
  raw_text: string;
}

// ============================================
// API Response Types
// ============================================

export interface ParseCommandResponse {
  success: boolean;
  data?: ParsedCommand;
  error?: string;
}

// ============================================
// UI State Types
// ============================================

export interface EventPrefill {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
}

export interface CandidateSelection {
  events: EventSummary[];
  action: "update" | "delete";
  pendingCommand: ParsedCommand;
}

export interface QueryResultsData {
  events: EventSummary[];
  label: string; // e.g., "Tomorrow" or "December 15, 2024"
}
