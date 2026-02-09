/**
 * Transcript Types for Cally
 *
 * Used for meeting transcription via OpenAI Whisper and 100ms post-call transcription
 */

export type TranscriptStatus =
  | "uploading"
  | "queued"
  | "transcribing"
  | "summarizing"
  | "recording"
  | "processing"
  | "completed"
  | "failed";

export interface SpeakerSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
}

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
  speakerSegments?: SpeakerSegment[];
  transcriptionSource?: "whisper" | "100ms";
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
