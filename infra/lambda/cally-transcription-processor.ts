/**
 * Cally Transcription Processor Lambda
 *
 * Processes transcription messages from SQS:
 * 1. Download audio from S3
 * 2. Transcribe with OpenAI Whisper API
 * 3. Summarize with GPT-4o-mini
 * 4. Store transcript + summary in DynamoDB
 *
 * SQS Message format:
 * {
 *   tenantId: string;
 *   eventId: string;
 *   audioFileKey: string;
 * }
 */

import type { SQSEvent, SQSRecord } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

// AWS clients
const ddbClient = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({ region: "ap-southeast-2" });
const secretsManager = new SecretsManagerClient({ region: "ap-southeast-2" });

// Environment variables
const TABLE_NAME = process.env.DYNAMODB_TABLE || "cally-main";
const S3_BUCKET = process.env.S3_BUCKET || "cally-audio-files";
const SECRETS_NAME = process.env.SECRETS_NAME || "cally/production";

// Types
interface TranscriptionMessage {
  tenantId: string;
  eventId: string;
  audioFileKey: string;
}

interface AppSecrets {
  OPENAI_API_KEY: string;
}

/**
 * Get secrets from Secrets Manager
 */
async function getSecrets(): Promise<AppSecrets> {
  console.log("[cally-transcription] Fetching secrets");

  const result = await secretsManager.send(
    new GetSecretValueCommand({
      SecretId: SECRETS_NAME,
    }),
  );

  if (!result.SecretString) {
    throw new Error("Secrets not found");
  }

  return JSON.parse(result.SecretString) as AppSecrets;
}

/**
 * Update transcript status in DynamoDB
 */
async function updateTranscriptStatus(
  tenantId: string,
  eventId: string,
  status: string,
  additionalUpdates?: Record<string, unknown>,
): Promise<void> {
  console.log("[cally-transcription] Updating status to:", status);

  const updateExpressions: string[] = [
    "#status = :status",
    "#updatedAt = :updatedAt",
  ];
  const expressionNames: Record<string, string> = {
    "#status": "status",
    "#updatedAt": "updatedAt",
  };
  const expressionValues: Record<string, unknown> = {
    ":status": status,
    ":updatedAt": new Date().toISOString(),
  };

  if (additionalUpdates) {
    let index = 0;
    for (const [key, value] of Object.entries(additionalUpdates)) {
      updateExpressions.push(`#k${index} = :v${index}`);
      expressionNames[`#k${index}`] = key;
      expressionValues[`:v${index}`] = value;
      index++;
    }
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `TENANT#${tenantId}`,
        SK: `TRANSCRIPT#${eventId}`,
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
    }),
  );
}

/**
 * Download audio file from S3
 */
async function downloadAudioFromS3(key: string): Promise<Buffer> {
  console.log("[cally-transcription] Downloading audio from S3:", key);

  const result = await s3Client.send(
    new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    }),
  );

  if (!result.Body) {
    throw new Error("Empty S3 response body");
  }

  const chunks: Uint8Array[] = [];
  const stream = result.Body as AsyncIterable<Uint8Array>;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  const buffer = Buffer.concat(chunks);
  console.log(
    "[cally-transcription] Downloaded audio, size:",
    buffer.length,
    "bytes",
  );
  return buffer;
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeWithWhisper(
  audioBuffer: Buffer,
  fileName: string,
  apiKey: string,
): Promise<string> {
  console.log(
    "[cally-transcription] Sending to Whisper API, size:",
    audioBuffer.length,
  );

  // Build multipart form data manually for Lambda environment
  const boundary =
    "----FormBoundary" + Math.random().toString(36).substring(2);
  const ext = fileName.split(".").pop() || "webm";
  const mimeTypes: Record<string, string> = {
    webm: "audio/webm",
    mp3: "audio/mpeg",
    mp4: "audio/mp4",
    m4a: "audio/mp4",
    wav: "audio/wav",
    ogg: "audio/ogg",
  };
  const contentType = mimeTypes[ext] || "audio/webm";

  // Construct multipart body
  const header = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
    `Content-Type: ${contentType}`,
    "",
    "",
  ].join("\r\n");

  const modelPart = [
    "",
    `--${boundary}`,
    'Content-Disposition: form-data; name="model"',
    "",
    "whisper-1",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const headerBuffer = Buffer.from(header, "utf-8");
  const modelBuffer = Buffer.from(modelPart, "utf-8");
  const body = Buffer.concat([headerBuffer, audioBuffer, modelBuffer]);

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "[cally-transcription] Whisper API error:",
      response.status,
      errorText,
    );
    throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
  }

  const result = (await response.json()) as { text: string };
  console.log(
    "[cally-transcription] Transcription complete, length:",
    result.text.length,
  );
  return result.text;
}

/**
 * Summarize transcript and extract topics using GPT-4o-mini
 */
async function summarizeTranscript(
  transcriptText: string,
  apiKey: string,
): Promise<{ summary: string; topics: string[] }> {
  console.log("[cally-transcription] Summarizing transcript...");

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that summarizes meeting transcripts. " +
              "Provide a concise summary (2-3 paragraphs) and extract 3-7 key topics discussed. " +
              "Respond with JSON: { \"summary\": \"...\", \"topics\": [\"...\"] }",
          },
          {
            role: "user",
            content: `Summarize this meeting transcript and extract key topics:\n\n${transcriptText.slice(0, 12000)}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "[cally-transcription] GPT API error:",
      response.status,
      errorText,
    );
    throw new Error(`GPT API error: ${response.status} - ${errorText}`);
  }

  const result = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = result.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(content) as {
      summary?: string;
      topics?: string[];
    };
    return {
      summary: parsed.summary || "No summary generated.",
      topics: parsed.topics || [],
    };
  } catch {
    console.error(
      "[cally-transcription] Failed to parse GPT response:",
      content,
    );
    return { summary: content, topics: [] };
  }
}

/**
 * Process a single transcription message
 */
async function processMessage(message: TranscriptionMessage): Promise<void> {
  const { tenantId, eventId, audioFileKey } = message;
  console.log(
    "[cally-transcription] Processing event:",
    eventId,
    "tenant:",
    tenantId,
  );

  // Get secrets (OpenAI API key)
  const secrets = await getSecrets();

  // Update status: transcribing
  await updateTranscriptStatus(tenantId, eventId, "transcribing");

  // Download audio from S3
  const audioBuffer = await downloadAudioFromS3(audioFileKey);

  // Transcribe with Whisper
  const fileName = audioFileKey.split("/").pop() || "audio.webm";
  const transcriptText = await transcribeWithWhisper(
    audioBuffer,
    fileName,
    secrets.OPENAI_API_KEY,
  );

  if (!transcriptText || transcriptText.trim().length === 0) {
    await updateTranscriptStatus(tenantId, eventId, "failed", {
      errorMessage: "Transcription returned empty text",
    });
    return;
  }

  // Update status: summarizing
  await updateTranscriptStatus(tenantId, eventId, "summarizing", {
    transcriptText,
  });

  // Summarize with GPT
  const { summary, topics } = await summarizeTranscript(
    transcriptText,
    secrets.OPENAI_API_KEY,
  );

  // Update status: completed
  await updateTranscriptStatus(tenantId, eventId, "completed", {
    summary,
    topics,
    completedAt: new Date().toISOString(),
  });

  console.log("[cally-transcription] Processing complete for event:", eventId);
}

/**
 * Lambda handler - processes SQS messages
 */
export async function handler(event: SQSEvent): Promise<void> {
  console.log(
    "[cally-transcription] Received",
    event.Records.length,
    "messages",
  );

  for (const record of event.Records) {
    await processRecord(record);
  }
}

async function processRecord(record: SQSRecord): Promise<void> {
  let message: TranscriptionMessage;

  try {
    message = JSON.parse(record.body) as TranscriptionMessage;
  } catch (err) {
    console.error(
      "[cally-transcription] Failed to parse message:",
      record.body,
      err,
    );
    return; // Don't retry malformed messages
  }

  try {
    await processMessage(message);
  } catch (err) {
    console.error(
      "[cally-transcription] Processing failed for event:",
      message.eventId,
      err,
    );

    // Update status to failed
    try {
      await updateTranscriptStatus(
        message.tenantId,
        message.eventId,
        "failed",
        {
          errorMessage:
            err instanceof Error ? err.message : "Unknown error",
        },
      );
    } catch (updateErr) {
      console.error(
        "[cally-transcription] Failed to update error status:",
        updateErr,
      );
    }

    // Throw to trigger SQS retry
    throw err;
  }
}
