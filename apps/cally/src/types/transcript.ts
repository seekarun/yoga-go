/**
 * Transcript Types for Cally
 *
 * Used for meeting transcription via OpenAI Whisper
 */

export type TranscriptStatus =
  | "uploading"
  | "queued"
  | "transcribing"
  | "summarizing"
  | "completed"
  | "failed";

export interface MeetingTranscript {
  id: string; // same as eventId
  tenantId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  status: TranscriptStatus;
  audioFileKey: string; // S3 key
  audioFileSizeBytes: number;
  audioDurationSeconds?: number;
  transcriptText?: string;
  summary?: string;
  topics?: string[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateTranscriptInput {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  audioFileKey: string;
  audioFileSizeBytes: number;
}
