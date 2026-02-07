// Core Email Client - AWS SES

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { EmailClientConfig, EmailClient, EmailOptions } from "./types";

/**
 * Create a reusable email client backed by AWS SES
 */
export function createEmailClient(config: EmailClientConfig): EmailClient {
  const { region = "us-west-2", fromEmail, configSet } = config;

  const sesClient = new SESClient({ region });

  console.log(
    `[DBG][core-email] SES client initialized (region=${region}, from=${fromEmail})`,
  );

  return {
    async sendEmail(options: EmailOptions): Promise<string | undefined> {
      const {
        to,
        from = fromEmail,
        subject,
        text,
        html,
        tags = [{ Name: "EmailType", Value: "transactional" }],
        replyTo,
      } = options;

      const recipients = Array.isArray(to) ? to : [to];

      console.log(
        `[DBG][core-email] Sending email to ${recipients.join(", ")}`,
      );
      console.log(`[DBG][core-email] Subject: ${subject}`);

      const command = new SendEmailCommand({
        Source: from,
        Destination: {
          ToAddresses: recipients,
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Text: {
              Data: text,
              Charset: "UTF-8",
            },
            Html: {
              Data: html || text.replace(/\n/g, "<br>"),
              Charset: "UTF-8",
            },
          },
        },
        ConfigurationSetName: configSet,
        Tags: tags,
        ...(replyTo && replyTo.length > 0 ? { ReplyToAddresses: replyTo } : {}),
      });

      try {
        const response = await sesClient.send(command);
        console.log(
          `[DBG][core-email] Email sent. MessageId: ${response.MessageId}`,
        );
        return response.MessageId;
      } catch (error) {
        console.error("[DBG][core-email] Error sending email:", error);
        if (error && typeof error === "object") {
          const awsError = error as {
            name?: string;
            message?: string;
            Code?: string;
            $metadata?: unknown;
          };
          console.error("[DBG][core-email] AWS Error name:", awsError.name);
          console.error(
            "[DBG][core-email] AWS Error message:",
            awsError.message,
          );
          console.error("[DBG][core-email] AWS Error code:", awsError.Code);
          console.error(
            "[DBG][core-email] AWS metadata:",
            JSON.stringify(awsError.$metadata),
          );
        }
        throw error;
      }
    },
  };
}
