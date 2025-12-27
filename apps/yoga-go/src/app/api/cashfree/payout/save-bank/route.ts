/**
 * API Route: Save Bank Details for Cashfree Payouts
 *
 * POST /api/cashfree/payout/save-bank
 * - Saves expert's bank account details for receiving payouts via Cashfree
 * - Creates a beneficiary in Cashfree Payouts
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as cashfreePayout from '@/lib/cashfree-payout';
import type { CashfreePayoutDetails } from '@/types';

// Validate IFSC code format (11 characters, first 4 alphabetic, 5th is 0)
function isValidIFSC(ifsc: string): boolean {
  if (!ifsc || ifsc.length !== 11) return false;
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifsc.toUpperCase());
}

// Validate account number (8-18 digits)
function isValidAccountNumber(accountNumber: string): boolean {
  if (!accountNumber) return false;
  const cleaned = accountNumber.replace(/\s/g, '');
  return /^\d{8,18}$/.test(cleaned);
}

// Validate phone number (10 digits for India)
function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[^0-9]/g, '');
  return cleaned.length === 10;
}

export async function POST(request: Request) {
  try {
    // Get authenticated session
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get expert profile
    const expert = await expertRepository.getExpertByUserId(session.user.cognitoSub);
    if (!expert) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { accountNumber, ifscCode, beneficiaryName, email, phone } = body;

    // Validate required fields
    if (!accountNumber || !ifscCode || !beneficiaryName || !email || !phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account number, IFSC code, beneficiary name, email, and phone are required',
        },
        { status: 400 }
      );
    }

    // Validate IFSC format
    if (!isValidIFSC(ifscCode)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid IFSC code format. Must be 11 characters (e.g., SBIN0001234)',
        },
        { status: 400 }
      );
    }

    // Validate account number
    if (!isValidAccountNumber(accountNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid account number. Must be 8-18 digits' },
        { status: 400 }
      );
    }

    // Validate phone
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number. Must be 10 digits' },
        { status: 400 }
      );
    }

    // Mask account number (only store last 4 digits)
    const accountNumberLast4 = accountNumber.slice(-4);

    // Add beneficiary to Cashfree
    const { beneficiaryId, status } = await cashfreePayout.addBeneficiary(expert.id, {
      accountNumber,
      ifscCode,
      beneficiaryName,
      email,
      phone,
    });

    // Prepare Cashfree Payout details
    const cashfreePayoutDetails: CashfreePayoutDetails = {
      beneficiaryId,
      status,
      lastUpdatedAt: new Date().toISOString(),
      bankAccount: {
        accountNumberLast4,
        ifscCode: ifscCode.toUpperCase(),
        beneficiaryName,
      },
    };

    // Save to expert profile
    await expertRepository.updateCashfreePayout(expert.id, cashfreePayoutDetails);

    console.log('[DBG][cashfree-payout] Saved bank details for expert:', expert.id);

    return NextResponse.json({
      success: true,
      data: {
        status: cashfreePayoutDetails.status,
        bankAccount: cashfreePayoutDetails.bankAccount,
        message:
          status === 'pending'
            ? 'Bank details saved. Account verification in progress.'
            : 'Bank details saved and verified.',
      },
    });
  } catch (error) {
    console.error('[DBG][cashfree-payout] Error saving bank details:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save bank details',
      },
      { status: 500 }
    );
  }
}
