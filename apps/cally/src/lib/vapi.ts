/**
 * Vapi.ai Server Helper
 *
 * Builds inline assistant configurations for the Vapi web SDK.
 * Used by the voice start endpoint to create tenant-specific voice assistants.
 */

/**
 * Vapi assistant configuration for inline assistant creation.
 * This is a simplified type matching the Vapi CreateAssistantDTO shape.
 * Passed to vapi.start(config) on the client.
 */
export interface VapiAssistantConfig {
  model: {
    provider: "openai";
    model: string;
    messages: Array<{ role: "system"; content: string }>;
    tools: VapiToolDefinition[];
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  transcriber: {
    provider: "deepgram";
    model: string;
    language: string;
  };
  firstMessage: string;
  server: {
    url: string;
    secret: string;
  };
  endCallMessage: string;
  maxDurationSeconds: number;
  metadata: Record<string, string>;
}

interface VapiToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
  async?: boolean;
}

/**
 * Build a Vapi inline assistant configuration.
 *
 * @param systemPrompt - The tenant's system prompt (built by buildSystemPrompt)
 * @param serverUrl - URL for function call handling (our API endpoint)
 * @param serverSecret - Secret to validate function call webhooks
 * @param firstMessage - Opening message the assistant speaks
 * @param tenantId - Tenant ID passed via call metadata for function handlers
 */
export function buildVapiAssistantConfig(
  systemPrompt: string,
  serverUrl: string,
  serverSecret: string,
  firstMessage: string,
  tenantId: string,
): VapiAssistantConfig {
  return {
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      tools: [
        {
          type: "function",
          function: {
            name: "search_knowledge",
            description:
              "Search the business knowledge base for relevant information to answer the user's question. Use this when you need specific details about pricing, policies, services, etc.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to find relevant information",
                },
              },
              required: ["query"],
            },
          },
          async: false,
        },
        {
          type: "function",
          function: {
            name: "get_todays_schedule",
            description:
              "Get the business owner's calendar schedule for today or a specific date. Use this when they ask about their schedule, appointments, bookings, or what's coming up.",
            parameters: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description:
                    "Date in YYYY-MM-DD format. Defaults to today if not specified.",
                },
              },
              required: [],
            },
          },
          async: false,
        },
        {
          type: "function",
          function: {
            name: "reschedule_appointment",
            description:
              "Reschedule an appointment to a new time. Use this when the business owner asks to move, reschedule, or change the time of an appointment. You must provide the eventId and date from the schedule context.",
            parameters: {
              type: "object",
              properties: {
                eventId: {
                  type: "string",
                  description:
                    "The event ID from the schedule context (e.g. from [eventId=...])",
                },
                date: {
                  type: "string",
                  description:
                    "The current date of the event in YYYY-MM-DD format (from the schedule context)",
                },
                newStartTime: {
                  type: "string",
                  description:
                    "The new start time in ISO 8601 format (e.g. 2025-02-14T10:30:00)",
                },
                newEndTime: {
                  type: "string",
                  description:
                    "The new end time in ISO 8601 format. If not specified, duration will be preserved from the original event.",
                },
              },
              required: ["eventId", "date", "newStartTime"],
            },
          },
          async: false,
        },
        {
          type: "function",
          function: {
            name: "cancel_appointment",
            description:
              "Cancel an appointment. Use this when the business owner asks to cancel or remove an appointment. This will process refunds if applicable and notify the visitor.",
            parameters: {
              type: "object",
              properties: {
                eventId: {
                  type: "string",
                  description:
                    "The event ID from the schedule context (e.g. from [eventId=...])",
                },
                date: {
                  type: "string",
                  description:
                    "The date of the event in YYYY-MM-DD format (from the schedule context)",
                },
              },
              required: ["eventId", "date"],
            },
          },
          async: false,
        },
        {
          type: "function",
          function: {
            name: "save_business_info",
            description:
              "Save extracted business information. Call this when the business owner provides new or updated information about their business.",
            parameters: {
              type: "object",
              properties: {
                businessName: {
                  type: "string",
                  description: "The name of the business",
                },
                description: {
                  type: "string",
                  description: "A brief description of what the business does",
                },
                openingHours: {
                  type: "string",
                  description: "The business opening hours",
                },
                services: {
                  type: "string",
                  description: "The services or products offered",
                },
                location: {
                  type: "string",
                  description: "The business location or address",
                },
                contactInfo: {
                  type: "string",
                  description: "Contact information (email, phone)",
                },
                additionalNotes: {
                  type: "string",
                  description: "Any additional business information",
                },
              },
              required: [],
            },
          },
          async: false,
        },
      ],
    },
    voice: {
      provider: "11labs",
      voiceId: "319bKIhetA5g6tmywrwj",
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en",
    },
    firstMessage,
    server: {
      url: serverUrl,
      secret: serverSecret,
    },
    endCallMessage: "Goodbye! Your changes have been saved.",
    maxDurationSeconds: 600,
    metadata: { tenantId },
  };
}
