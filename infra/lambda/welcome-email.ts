import { SESClient, SendTemplatedEmailCommand } from "@aws-sdk/client-ses";
import type { PostConfirmationTriggerEvent, Context } from "aws-lambda";

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

const fromEmail = process.env.SES_FROM_EMAIL || "hi@myyoga.guru";
const configSet = process.env.SES_CONFIG_SET;
const templateName = process.env.SES_WELCOME_TEMPLATE || "yoga-go-welcome";

export const handler = async (
  event: PostConfirmationTriggerEvent,
  _context: Context,
): Promise<PostConfirmationTriggerEvent> => {
  console.log(
    "[welcome-email] Received event:",
    JSON.stringify(event, null, 2),
  );

  // Only send welcome email for confirmed signups (not forgot password confirmations)
  if (event.triggerSource !== "PostConfirmation_ConfirmSignUp") {
    console.log("[welcome-email] Skipping - not a signup confirmation");
    return event;
  }

  const userEmail = event.request.userAttributes.email;
  const userName = event.request.userAttributes.name || "there";

  if (!userEmail) {
    console.log("[welcome-email] No email found in user attributes");
    return event;
  }

  console.log(
    `[welcome-email] Sending welcome email to ${userEmail} using template ${templateName}`,
  );

  try {
    const command = new SendTemplatedEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [userEmail],
      },
      Template: templateName,
      TemplateData: JSON.stringify({
        name: userName,
      }),
      ConfigurationSetName: configSet,
      Tags: [
        {
          Name: "EmailType",
          Value: "welcome",
        },
      ],
    });

    const response = await sesClient.send(command);
    console.log(
      `[welcome-email] Email sent successfully. MessageId: ${response.MessageId}`,
    );
  } catch (error) {
    // Log error but don't fail the signup - email is nice to have
    console.error("[welcome-email] Failed to send email:", error);
  }

  // Must return the event for Cognito to continue
  return event;
};
