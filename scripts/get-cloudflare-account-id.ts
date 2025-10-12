/**
 * Script to fetch Cloudflare Account ID using the API token
 * Run with: npx tsx scripts/get-cloudflare-account-id.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function getCloudflareAccountId() {
  const cfToken = process.env.CF_TOKEN;

  if (!cfToken) {
    console.error('Error: CF_TOKEN environment variable not found');
    console.error('Make sure you have CF_TOKEN in your .env.local file');
    process.exit(1);
  }

  console.log('Fetching Cloudflare accounts...\n');

  try {
    const response = await fetch('https://api.cloudflare.com/client/v4/accounts', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cfToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error from Cloudflare API:');
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    if (data.success && data.result && data.result.length > 0) {
      console.log('✓ Found Cloudflare accounts:\n');

      data.result.forEach((account: { id: string; name: string }) => {
        console.log(`Account Name: ${account.name}`);
        console.log(`Account ID:   ${account.id}\n`);
      });

      console.log('='.repeat(60));
      console.log('\nTo use this account, add this line to your .env.local file:');
      console.log(`\nCF_ACCOUNT_ID=${data.result[0].id}\n`);
      console.log('='.repeat(60));
    } else {
      console.error('No accounts found or API token does not have access');
      console.error('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error fetching account ID:', error);
    process.exit(1);
  }
}

getCloudflareAccountId();
