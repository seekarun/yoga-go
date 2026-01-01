/**
 * DynamoDB Stream Lambda for User Welcome Emails & Analytics
 *
 * Triggered by two tables:
 * - yoga-go-users: USER records (PK={cognitoSub}, SK=PROFILE)
 * - yoga-go-core: TENANT records (entityType=TENANT)
 *
 * For USER records:
 * - Expert: Skipped (handled by TENANT creation)
 * - Learner (on expert subdomain): Branded welcome with expert's colors/logo
 * - Learner (main site): Generic welcome email
 *
 * For TENANT records:
 * - Sends expert welcome email with dashboard links
 * - Tracks CREATE_TENANT analytics event for admin dashboard
 */

import {
  SESClient,
  SendEmailCommand,
  SendTemplatedEmailCommand,
} from "@aws-sdk/client-ses";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { DynamoDBStreamEvent, DynamoDBRecord } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { AttributeValue } from "@aws-sdk/client-dynamodb";

// SES is in us-west-2
const ses = new SESClient({ region: "us-west-2" });
// DynamoDB is in ap-southeast-2
const dynamodb = new DynamoDBClient({ region: "ap-southeast-2" });

const TABLE_NAME = process.env.DYNAMODB_TABLE || "yoga-go-core";
const USERS_TABLE = process.env.USERS_TABLE || "yoga-go-users";
const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE || "yoga-go-analytics";
const FROM_EMAIL = process.env.SES_FROM_EMAIL || "hi@myyoga.guru";
const CONFIG_SET = process.env.SES_CONFIG_SET;

// Color palette generation (simplified version)
function generatePalette(primaryColor: string): Record<number, string> {
  // Simple palette - just return primary variations
  // In production, this could be more sophisticated
  return {
    50: lightenColor(primaryColor, 0.9),
    200: lightenColor(primaryColor, 0.6),
    300: lightenColor(primaryColor, 0.4),
    900: darkenColor(primaryColor, 0.4),
  };
}

function lightenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#f0fdf9";
  const r = Math.round(rgb.r + (255 - rgb.r) * factor);
  const g = Math.round(rgb.g + (255 - rgb.g) * factor);
  const b = Math.round(rgb.b + (255 - rgb.b) * factor);
  return rgbToHex(r, g, b);
}

function darkenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#134e4a";
  const r = Math.round(rgb.r * (1 - factor));
  const g = Math.round(rgb.g * (1 - factor));
  const b = Math.round(rgb.b * (1 - factor));
  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

interface UserRecord {
  id: string;
  email: string;
  name?: string;
  role?: string | string[];
  expertProfile?: string;
  signupExpertId?: string;
  createdAt?: string;
}

interface ExpertRecord {
  id: string;
  name: string;
  avatar?: string;
  logo?: string;
  primaryColor?: string;
}

/**
 * Get expert data from DynamoDB
 */
async function getExpert(expertId: string): Promise<ExpertRecord | null> {
  console.log(`[user-welcome-stream] Looking up expert/tenant: ${expertId}`);

  try {
    // Experts are stored as TENANT records (PK: TENANT, SK: expertId)
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: "TENANT" },
          SK: { S: expertId },
        },
      }),
    );

    if (!result.Item) {
      console.log(`[user-welcome-stream] Expert not found: ${expertId}`);
      return null;
    }

    const item = unmarshall(result.Item as Record<string, AttributeValue>);
    return {
      id: item.id || expertId,
      name: item.name || expertId,
      avatar: item.avatar,
      logo: item.logo,
      primaryColor: item.primaryColor,
    };
  } catch (error) {
    console.error(`[user-welcome-stream] Error getting expert:`, error);
    return null;
  }
}

/**
 * Send expert welcome email
 * Called when TENANT is created, so we have the actual subdomain
 */
async function sendExpertWelcomeEmail(
  user: UserRecord,
  tenantId: string,
): Promise<void> {
  const subdomain = `${tenantId}.myyoga.guru`;
  const dashboardUrl = `https://${subdomain}/srv/${tenantId}`;
  const expertEmail = `${tenantId}@myyoga.guru`;

  console.log(
    `[user-welcome-stream] Sending expert welcome to ${user.email} for tenant: ${tenantId}`,
  );

  const brandPrimary = "#7a2900";
  const brandPrimaryLight = "#fed094";
  const logoUrl = "https://myyoga.guru/myg_light.png";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #faf8f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf8f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(122, 41, 0, 0.1);">
          <tr>
            <td style="background: ${brandPrimary}; padding: 35px 30px; text-align: center;">
              <img src="${logoUrl}" alt="MyYoga.guru" width="180" style="display: block; margin: 0 auto 15px auto;" />
              <p style="color: ${brandPrimaryLight}; margin: 0; font-size: 16px; font-weight: 500;">
                Your journey as an expert begins here
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #333; margin: 0 0 20px 0;">
                Hi ${user.name || "there"},
              </p>
              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 25px 0;">
                Congratulations on joining MyYoga.guru as an expert! We're thrilled to have you on board.
              </p>
              <div style="background: ${brandPrimaryLight}; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 4px solid ${brandPrimary};">
                <h2 style="margin: 0 0 15px 0; font-size: 18px; color: ${brandPrimary};">What's ready for you:</h2>
                <p style="margin: 10px 0;"><strong>Your subdomain:</strong> <a href="https://${subdomain}" style="color: ${brandPrimary};">${subdomain}</a></p>
                <p style="margin: 10px 0;"><strong>Your email:</strong> ${expertEmail}</p>
                <p style="margin: 10px 0;"><strong>Dashboard:</strong> <a href="${dashboardUrl}" style="color: ${brandPrimary};">Access your dashboard</a></p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background: ${brandPrimary}; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Go to Your Dashboard
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: ${brandPrimary}; padding: 25px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: ${brandPrimaryLight};">
                Empowering yoga experts to share their knowledge
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Welcome to MyYoga.guru!

Hi ${user.name || "there"},

Congratulations on joining MyYoga.guru as an expert!

What's ready for you:
- Your subdomain: ${subdomain}
- Your email: ${expertEmail}
- Dashboard: ${dashboardUrl}

Go to your dashboard: ${dashboardUrl}

---
MyYoga.guru`;

  await ses.send(
    new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [user.email] },
      Message: {
        Subject: { Data: `Welcome to MyYoga.guru, ${user.name || "Expert"}!` },
        Body: {
          Text: { Data: text },
          Html: { Data: html },
        },
      },
      ConfigurationSetName: CONFIG_SET,
      Tags: [
        { Name: "EmailType", Value: "expert-welcome-stream" },
        { Name: "TenantId", Value: tenantId },
      ],
    }),
  );

  console.log(
    `[user-welcome-stream] Expert welcome email sent to ${user.email}`,
  );
}

/**
 * Send branded learner welcome email
 */
async function sendBrandedLearnerWelcomeEmail(
  user: UserRecord,
  expert: ExpertRecord,
): Promise<void> {
  const expertUrl = `https://${expert.id}.myyoga.guru`;
  const coursesUrl = `${expertUrl}/courses`;

  console.log(
    `[user-welcome-stream] Sending branded learner welcome to ${user.email} (expert: ${expert.id})`,
  );

  const primaryColor = expert.primaryColor || "#2A9D8F";
  const palette = generatePalette(primaryColor);
  const lightBg = palette[50];
  const darkText = palette[900];
  const logoUrl =
    expert.logo || expert.avatar || "https://myyoga.guru/myg_light.png";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${lightBg};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${lightBg}; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: ${primaryColor}; padding: 35px 30px; text-align: center;">
              <img src="${logoUrl}" alt="${expert.name}" width="120" style="display: block; margin: 0 auto; max-height: 80px; object-fit: contain;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="font-size: 28px; color: ${darkText}; margin: 0 0 20px 0; text-align: center;">
                Welcome, ${user.name || "there"}!
              </h1>
              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 25px 0; text-align: center;">
                You've successfully joined <strong>${expert.name}</strong>'s yoga community.
                We're excited to have you on this journey to wellness and transformation.
              </p>
              <div style="background: ${lightBg}; padding: 25px; border-radius: 10px; margin-bottom: 25px; text-align: center;">
                <h2 style="margin: 0 0 15px 0; font-size: 18px; color: ${darkText};">Ready to begin?</h2>
                <p style="font-size: 14px; color: #666; margin: 0 0 20px 0;">
                  Explore courses, join live sessions, and start your practice today.
                </p>
                <a href="${coursesUrl}" style="display: inline-block; background: ${primaryColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Browse Courses
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: ${primaryColor}; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.9);">${expert.name}</p>
              <p style="margin: 10px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.7);">
                Powered by <a href="https://myyoga.guru" style="color: rgba(255,255,255,0.9); text-decoration: none;">MyYoga.guru</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Welcome to ${expert.name}!

Hi ${user.name || "there"},

You've successfully joined ${expert.name}'s yoga community.

Ready to begin? Browse courses: ${coursesUrl}

---
${expert.name}
Powered by MyYoga.guru`;

  await ses.send(
    new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [user.email] },
      Message: {
        Subject: { Data: `Welcome to ${expert.name}!` },
        Body: {
          Text: { Data: text },
          Html: { Data: html },
        },
      },
      ConfigurationSetName: CONFIG_SET,
      Tags: [
        { Name: "EmailType", Value: "learner-welcome-stream" },
        { Name: "ExpertId", Value: expert.id },
      ],
    }),
  );

  console.log(
    `[user-welcome-stream] Branded learner welcome sent to ${user.email}`,
  );
}

/**
 * Send generic learner welcome email (using SES template)
 */
async function sendGenericLearnerWelcomeEmail(user: UserRecord): Promise<void> {
  console.log(
    `[user-welcome-stream] Sending generic learner welcome to ${user.email}`,
  );

  try {
    await ses.send(
      new SendTemplatedEmailCommand({
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [user.email] },
        Template: "yoga-go-welcome",
        TemplateData: JSON.stringify({ name: user.name || "there" }),
        ConfigurationSetName: CONFIG_SET,
        Tags: [{ Name: "EmailType", Value: "learner-welcome-generic-stream" }],
      }),
    );

    console.log(
      `[user-welcome-stream] Generic learner welcome sent to ${user.email}`,
    );
  } catch (error) {
    console.error(
      `[user-welcome-stream] Error sending generic welcome:`,
      error,
    );
    // Don't throw - email is nice to have, not critical
  }
}

/**
 * Track CREATE_USER analytics event for admin dashboard
 * PK: GLOBAL (admin-level analytics)
 * SK: CREATE_USER#{timestamp}#{userId}
 */
async function trackUserCreatedEvent(
  userData: Record<string, unknown>,
): Promise<void> {
  // For new structure: id is the cognitoSub, or extract from PK
  const userId =
    (userData.id as string) || (userData.PK as string) || "unknown";
  const timestamp = new Date().toISOString();
  const profile = userData.profile as Record<string, unknown> | undefined;
  const roles = Array.isArray(userData.role) ? userData.role : [userData.role];
  const signupExperts = userData.signupExperts as string[] | undefined;

  console.log(
    `[user-welcome-stream] Tracking CREATE_USER event for: ${userId}`,
  );

  try {
    await dynamodb.send(
      new PutItemCommand({
        TableName: ANALYTICS_TABLE,
        Item: {
          PK: { S: "GLOBAL" },
          SK: { S: `CREATE_USER#${timestamp}#${userId}` },
          eventType: { S: "CREATE_USER" },
          userId: { S: userId },
          email: profile?.email
            ? { S: profile.email as string }
            : { NULL: true },
          name: profile?.name ? { S: profile.name as string } : { NULL: true },
          roles: { SS: roles.filter(Boolean).map(String) },
          isExpert: { BOOL: roles.includes("expert") },
          isLearner: { BOOL: roles.includes("learner") },
          signupExpertId: signupExperts?.[0]
            ? { S: signupExperts[0] }
            : { NULL: true },
          userCreatedAt: userData.createdAt
            ? { S: userData.createdAt as string }
            : { NULL: true },
          createdAt: { S: timestamp },
        },
      }),
    );

    console.log(
      `[user-welcome-stream] CREATE_USER event tracked for: ${userId}`,
    );
  } catch (error) {
    console.error(
      `[user-welcome-stream] Error tracking CREATE_USER event:`,
      error,
    );
    // Don't throw - analytics is non-critical
  }
}

/**
 * Process a USER record - track analytics and send learner welcome emails
 * Experts are handled by TENANT creation trigger for welcome emails
 */
async function processUserRecord(item: Record<string, unknown>): Promise<void> {
  // Extract email and name from profile (they're nested, not top-level)
  const profile = item.profile as Record<string, unknown> | undefined;
  const email = profile?.email as string | undefined;
  const name = profile?.name as string | undefined;

  // signupExperts is an array, get first element
  const signupExperts = item.signupExperts as string[] | undefined;
  const signupExpertId = signupExperts?.[0];

  // Check if user has expert role
  const roles = Array.isArray(item.role) ? item.role : [item.role];
  const isExpert = roles.includes("expert");

  console.log(`[user-welcome-stream] Processing new USER record:`, {
    id: item.id,
    email,
    name,
    role: item.role,
    isExpert,
    signupExpertId,
  });

  // Track analytics event for admin dashboard (always, for all user types)
  await trackUserCreatedEvent(item);

  // Skip welcome email if no email address
  if (!email) {
    console.log(`[user-welcome-stream] No email address - skipping welcome email`);
    return;
  }

  // Skip welcome email for experts (they get welcome via TENANT trigger)
  if (isExpert) {
    console.log(`[user-welcome-stream] User is expert - skipping learner welcome email`);
    return;
  }

  // Send welcome email to learner
  const user: UserRecord = {
    id: (item.id as string) || (item.PK as string) || "unknown",
    email,
    name,
    role: item.role as string | string[],
    signupExpertId,
  };

  try {
    if (signupExpertId) {
      // Learner signed up via expert subdomain - send branded email
      const expert = await getExpert(signupExpertId);
      if (expert) {
        await sendBrandedLearnerWelcomeEmail(user, expert);
      } else {
        // Expert not found, send generic welcome
        await sendGenericLearnerWelcomeEmail(user);
      }
    } else {
      // Learner signed up on main site - send generic welcome
      await sendGenericLearnerWelcomeEmail(user);
    }
  } catch (error) {
    console.error(`[user-welcome-stream] Error sending welcome email:`, error);
    // Don't throw - email is nice to have, not critical
  }
}

/**
 * Get USER record by userId (cognitoSub) to retrieve email for welcome email
 * Users are now stored in yoga-go-users table with PK={cognitoSub}, SK=PROFILE
 */
async function getUserById(
  userId: string,
): Promise<{ email: string; name?: string } | null> {
  console.log(`[user-welcome-stream] Looking up user by id: ${userId}`);

  try {
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: USERS_TABLE,
        Key: {
          PK: { S: userId },
          SK: { S: "PROFILE" },
        },
        ProjectionExpression: "id, #p",
        ExpressionAttributeNames: {
          "#p": "profile",
        },
      }),
    );

    if (!result.Item) {
      console.log(`[user-welcome-stream] User not found: ${userId}`);
      return null;
    }

    const userItem = unmarshall(result.Item as Record<string, AttributeValue>);
    const profile = userItem.profile as Record<string, unknown> | undefined;
    console.log(
      `[user-welcome-stream] Found user: ${userId}, email: ${profile?.email}`,
    );

    return {
      email: profile?.email as string,
      name: profile?.name as string | undefined,
    };
  } catch (error) {
    console.error(`[user-welcome-stream] Error fetching user:`, error);
    return null;
  }
}

/**
 * Track CREATE_TENANT analytics event for admin dashboard
 * PK: GLOBAL (admin-level analytics)
 * SK: CREATE_TENANT#{timestamp}#{tenantId}
 */
async function trackTenantCreatedEvent(
  tenantData: Record<string, unknown>,
): Promise<void> {
  // Extract tenantId from item.id (preferred) or from PK (TENANT#{tenantId})
  const tenantId =
    (tenantData.id as string) ||
    (tenantData.PK as string)?.replace("TENANT#", "") ||
    "unknown";
  const timestamp = new Date().toISOString();

  console.log(
    `[user-welcome-stream] Tracking CREATE_TENANT event for: ${tenantId}`,
  );

  try {
    await dynamodb.send(
      new PutItemCommand({
        TableName: ANALYTICS_TABLE,
        Item: {
          PK: { S: "GLOBAL" },
          SK: { S: `CREATE_TENANT#${timestamp}#${tenantId}` },
          eventType: { S: "CREATE_TENANT" },
          tenantId: { S: tenantId },
          tenantName: tenantData.name
            ? { S: tenantData.name as string }
            : { NULL: true },
          userId: tenantData.userId
            ? { S: tenantData.userId as string }
            : { NULL: true },
          primaryDomain: tenantData.primaryDomain
            ? { S: tenantData.primaryDomain as string }
            : { NULL: true },
          status: tenantData.status
            ? { S: tenantData.status as string }
            : { S: "active" },
          featuredOnPlatform: {
            BOOL: (tenantData.featuredOnPlatform as boolean) ?? true,
          },
          createdAt: { S: timestamp },
          // Store the full tenant data as JSON for reference
          tenantData: { S: JSON.stringify(tenantData) },
        },
      }),
    );

    console.log(
      `[user-welcome-stream] CREATE_TENANT event tracked for: ${tenantId}`,
    );
  } catch (error) {
    console.error(
      `[user-welcome-stream] Error tracking CREATE_TENANT event:`,
      error,
    );
    // Don't throw - analytics is non-critical
  }
}

/**
 * Process a TENANT record - send expert welcome email and track analytics
 * The TENANT record contains userId (cognitoSub) which links to the USER record.
 * New structure: PK=TENANT#{tenantId}, SK=META
 */
async function processTenantRecord(
  item: Record<string, unknown>,
): Promise<void> {
  // Extract tenantId from item.id (preferred) or from PK (TENANT#{tenantId})
  const tenantId =
    (item.id as string) ||
    (item.PK as string)?.replace("TENANT#", "") ||
    "unknown";
  const userId = item.userId as string | undefined;
  const displayName = item.name as string | undefined;

  console.log(`[user-welcome-stream] Processing new TENANT record:`, {
    tenantId,
    userId,
    displayName,
  });

  // Track analytics event for admin dashboard (always, regardless of email)
  await trackTenantCreatedEvent(item);

  // Send expert welcome email if we have a userId to look up email
  if (!userId) {
    console.log(`[user-welcome-stream] No userId on tenant - skipping welcome email`);
    return;
  }

  try {
    // Look up user to get their email address
    const userInfo = await getUserById(userId);
    if (!userInfo?.email) {
      console.log(`[user-welcome-stream] Could not find user email for tenant: ${tenantId}`);
      return;
    }

    const user: UserRecord = {
      id: userId,
      email: userInfo.email,
      name: userInfo.name || displayName,
    };

    await sendExpertWelcomeEmail(user, tenantId);
  } catch (error) {
    console.error(`[user-welcome-stream] Error sending expert welcome email:`, error);
    // Don't throw - email is nice to have, not critical
  }
}

/**
 * Process a single DynamoDB stream record
 * Handles records from both yoga-go-users table (USER) and yoga-go-core table (TENANT)
 */
async function processRecord(record: DynamoDBRecord): Promise<void> {
  // Only process INSERT events (new records)
  if (record.eventName !== "INSERT") {
    return;
  }

  const newImage = record.dynamodb?.NewImage;
  if (!newImage) {
    return;
  }

  // Unmarshall the DynamoDB record
  const item = unmarshall(newImage as Record<string, AttributeValue>);
  const sk = item.SK as string;
  const entityType = item.entityType as string | undefined;

  // USER records from yoga-go-users table: PK={cognitoSub}, SK=PROFILE
  if (sk === "PROFILE") {
    await processUserRecord(item);
  }
  // TENANT records from yoga-go-core table: entityType=TENANT
  else if (entityType === "TENANT") {
    await processTenantRecord(item);
  }
}

/**
 * Lambda handler for DynamoDB Stream events
 */
export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  console.log(
    `[user-welcome-stream] Processing ${event.Records.length} record(s)`,
  );

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error(`[user-welcome-stream] Error processing record:`, error);
      // Continue processing other records
    }
  }

  console.log(`[user-welcome-stream] Finished processing`);
}
