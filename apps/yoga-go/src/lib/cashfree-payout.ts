/**
 * Cashfree Payouts Service
 *
 * Handles Cashfree Payouts for expert payouts in India.
 * Alternative to Razorpay Route for transferring course payments to experts.
 */

import { PAYMENT_CONFIG } from '@/config/payment';
import * as expertRepository from '@/lib/repositories/expertRepository';
import type { CashfreePayoutStatus, CashfreePayoutDetails } from '@/types';

interface CashfreeAuthResponse {
  status: string;
  subCode: string;
  message: string;
  data?: {
    token: string;
    expiry: number;
  };
}

interface CashfreeBeneficiaryRequest {
  beneId: string;
  name: string;
  email: string;
  phone: string;
  bankAccount: string;
  ifsc: string;
  address1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface CashfreeBeneficiaryResponse {
  status: string;
  subCode: string;
  message: string;
}

interface CashfreeGetBeneficiaryResponse {
  status: string;
  subCode: string;
  message: string;
  data?: {
    beneId: string;
    name: string;
    email: string;
    phone: string;
    bankAccount: string;
    ifsc: string;
    status: string; // 'VERIFIED' | 'INVALID' | 'PENDING'
  };
}

interface CashfreeTransferRequest {
  beneId: string;
  amount: string;
  transferId: string;
  transferMode?: 'banktransfer' | 'imps' | 'neft' | 'upi';
  remarks?: string;
}

interface CashfreeTransferResponse {
  status: string;
  subCode: string;
  message: string;
  data?: {
    referenceId: string;
    utr?: string;
    acknowledged?: number;
  };
}

interface CashfreeTransferStatusResponse {
  status: string;
  subCode: string;
  message: string;
  data?: {
    transfer: {
      referenceId: string;
      beneId: string;
      amount: string;
      status: string; // 'SUCCESS' | 'PENDING' | 'FAILED' | 'REVERSED'
      utr?: string;
      processedOn?: string;
      failureReason?: string;
    };
  };
}

/**
 * Get Cashfree Payout authorization token
 * Token is valid for 5 minutes
 */
async function getAuthToken(): Promise<string> {
  console.log('[DBG][cashfree-payout] Getting auth token');

  const { clientId, clientSecret, baseUrl } = PAYMENT_CONFIG.cashfreePayout;

  if (!clientId || !clientSecret) {
    throw new Error('Cashfree Payout credentials not configured');
  }

  const response = await fetch(`${baseUrl}/authorize`, {
    method: 'POST',
    headers: {
      'X-Client-Id': clientId,
      'X-Client-Secret': clientSecret,
      'Content-Type': 'application/json',
    },
  });

  const data: CashfreeAuthResponse = await response.json();

  if (data.status !== 'SUCCESS' || !data.data?.token) {
    console.error('[DBG][cashfree-payout] Auth failed:', data);
    throw new Error(`Cashfree auth failed: ${data.message}`);
  }

  console.log('[DBG][cashfree-payout] Auth token obtained');
  return data.data.token;
}

/**
 * Add an expert as a beneficiary in Cashfree
 */
export async function addBeneficiary(
  expertId: string,
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    beneficiaryName: string;
    email: string;
    phone: string;
  }
): Promise<{ beneficiaryId: string; status: CashfreePayoutStatus }> {
  console.log('[DBG][cashfree-payout] Adding beneficiary for expert:', expertId);

  const token = await getAuthToken();
  const { baseUrl } = PAYMENT_CONFIG.cashfreePayout;

  // Use expertId as beneficiary ID for easy lookup
  const beneficiaryId = `EXP_${expertId}`;

  const beneficiaryRequest: CashfreeBeneficiaryRequest = {
    beneId: beneficiaryId,
    name: bankDetails.beneficiaryName,
    email: bankDetails.email,
    phone: bankDetails.phone,
    bankAccount: bankDetails.accountNumber,
    ifsc: bankDetails.ifscCode.toUpperCase(),
  };

  const response = await fetch(`${baseUrl}/addBeneficiary`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(beneficiaryRequest),
  });

  const data: CashfreeBeneficiaryResponse = await response.json();

  console.log('[DBG][cashfree-payout] Add beneficiary response:', data);

  // SUCCESS or BENEFICIARY_ALREADY_EXISTS are both valid
  if (data.status !== 'SUCCESS' && data.subCode !== '409') {
    throw new Error(`Failed to add beneficiary: ${data.message}`);
  }

  // Beneficiary is pending verification initially
  const status: CashfreePayoutStatus = 'pending';

  return { beneficiaryId, status };
}

/**
 * Get beneficiary status from Cashfree
 */
export async function getBeneficiaryStatus(
  beneficiaryId: string
): Promise<CashfreePayoutStatus | null> {
  console.log('[DBG][cashfree-payout] Getting beneficiary status:', beneficiaryId);

  const token = await getAuthToken();
  const { baseUrl } = PAYMENT_CONFIG.cashfreePayout;

  const response = await fetch(`${baseUrl}/getBeneficiary/${beneficiaryId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data: CashfreeGetBeneficiaryResponse = await response.json();

  if (data.status !== 'SUCCESS' || !data.data) {
    console.log('[DBG][cashfree-payout] Beneficiary not found');
    return null;
  }

  // Map Cashfree status to our status
  const cashfreeStatus = data.data.status;
  let status: CashfreePayoutStatus;

  switch (cashfreeStatus) {
    case 'VERIFIED':
      status = 'verified';
      break;
    case 'INVALID':
      status = 'invalid';
      break;
    case 'PENDING':
    default:
      status = 'pending';
      break;
  }

  console.log('[DBG][cashfree-payout] Beneficiary status:', status);
  return status;
}

/**
 * Remove a beneficiary from Cashfree
 */
export async function removeBeneficiary(beneficiaryId: string): Promise<void> {
  console.log('[DBG][cashfree-payout] Removing beneficiary:', beneficiaryId);

  const token = await getAuthToken();
  const { baseUrl } = PAYMENT_CONFIG.cashfreePayout;

  const response = await fetch(`${baseUrl}/removeBeneficiary`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ beneId: beneficiaryId }),
  });

  const data: CashfreeBeneficiaryResponse = await response.json();

  if (data.status !== 'SUCCESS' && data.subCode !== '404') {
    throw new Error(`Failed to remove beneficiary: ${data.message}`);
  }

  console.log('[DBG][cashfree-payout] Beneficiary removed');
}

/**
 * Request a transfer to a beneficiary
 * @param beneficiaryId - Cashfree beneficiary ID
 * @param amountPaise - Amount in paise
 * @param transferId - Unique transfer ID (our internal reference)
 * @param remarks - Optional remarks
 */
export async function requestTransfer(
  beneficiaryId: string,
  amountPaise: number,
  transferId: string,
  remarks?: string
): Promise<{ referenceId: string; utr?: string }> {
  console.log('[DBG][cashfree-payout] Requesting transfer:', {
    beneficiaryId,
    amountPaise,
    transferId,
  });

  const token = await getAuthToken();
  const { baseUrl } = PAYMENT_CONFIG.cashfreePayout;

  // Convert paise to rupees (Cashfree expects rupees as string)
  const amountRupees = (amountPaise / 100).toFixed(2);

  const transferRequest: CashfreeTransferRequest = {
    beneId: beneficiaryId,
    amount: amountRupees,
    transferId,
    transferMode: 'imps', // Instant transfer
    remarks: remarks || 'Course payout',
  };

  const response = await fetch(`${baseUrl}/requestTransfer`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transferRequest),
  });

  const data: CashfreeTransferResponse = await response.json();

  if (data.status !== 'SUCCESS' && data.status !== 'PENDING') {
    throw new Error(`Transfer failed: ${data.message}`);
  }

  console.log('[DBG][cashfree-payout] Transfer initiated:', data.data?.referenceId);

  return {
    referenceId: data.data?.referenceId || transferId,
    utr: data.data?.utr,
  };
}

/**
 * Get transfer status from Cashfree
 */
export async function getTransferStatus(
  referenceId: string
): Promise<{ status: string; utr?: string; failureReason?: string } | null> {
  console.log('[DBG][cashfree-payout] Getting transfer status:', referenceId);

  const token = await getAuthToken();
  const { baseUrl } = PAYMENT_CONFIG.cashfreePayout;

  const response = await fetch(`${baseUrl}/getTransferStatus?referenceId=${referenceId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data: CashfreeTransferStatusResponse = await response.json();

  if (data.status !== 'SUCCESS' || !data.data?.transfer) {
    return null;
  }

  return {
    status: data.data.transfer.status,
    utr: data.data.transfer.utr,
    failureReason: data.data.transfer.failureReason,
  };
}

/**
 * Calculate platform fee for a given amount
 * @param amountPaise - Amount in paise
 * @param customRate - Optional custom commission rate (0-100)
 * @returns Platform fee in paise
 */
export function calculatePlatformFee(amountPaise: number, customRate?: number): number {
  const feePercent = customRate ?? PAYMENT_CONFIG.cashfreePayout.platformFeePercent;
  return Math.round(amountPaise * (feePercent / 100));
}

/**
 * Sync beneficiary status from Cashfree and update database
 */
export async function syncBeneficiaryStatus(
  expertId: string
): Promise<CashfreePayoutDetails | null> {
  console.log('[DBG][cashfree-payout] Syncing beneficiary status for expert:', expertId);

  const expert = await expertRepository.getExpertById(expertId);
  if (!expert?.cashfreePayout?.beneficiaryId) {
    return null;
  }

  const status = await getBeneficiaryStatus(expert.cashfreePayout.beneficiaryId);
  if (!status) {
    return null;
  }

  // Update if status changed
  if (status !== expert.cashfreePayout.status) {
    const updated = await expertRepository.updateCashfreePayout(expertId, { status });
    return updated.cashfreePayout || null;
  }

  return expert.cashfreePayout;
}

/**
 * Check if expert can receive Cashfree payouts
 */
export async function canReceivePayouts(expertId: string): Promise<boolean> {
  const expert = await expertRepository.getExpertById(expertId);
  return expert?.cashfreePayout?.status === 'verified';
}

/**
 * Get expert's Cashfree Payout status
 */
export async function getPayoutStatus(expertId: string): Promise<CashfreePayoutDetails | null> {
  const expert = await expertRepository.getExpertById(expertId);
  return expert?.cashfreePayout ?? null;
}
