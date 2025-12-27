/**
 * API Route: Save Bank Details for Razorpay Route (Linked Accounts)
 *
 * POST /api/razorpay/route/save-bank
 * - Saves expert's bank account details for receiving payouts
 * - When Razorpay Route is enabled, this will also create a linked account
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';
import type { RazorpayRouteDetails } from '@/types';

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
    const { accountNumber, ifscCode, beneficiaryName, legalBusinessName, email } = body;

    // Validate required fields
    if (!accountNumber || !ifscCode || !beneficiaryName) {
      return NextResponse.json(
        { success: false, error: 'Account number, IFSC code, and beneficiary name are required' },
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

    // Mask account number (only store last 4 digits)
    const accountNumberLast4 = accountNumber.slice(-4);

    // Prepare Razorpay Route details
    // Status will be 'pending' until Razorpay Route is enabled and account is created
    const razorpayRouteDetails: RazorpayRouteDetails = {
      accountId: '', // Will be set when Razorpay Route is enabled and linked account is created
      status: 'pending',
      transfersEnabled: false,
      lastUpdatedAt: new Date().toISOString(),
      legalBusinessName: legalBusinessName || expert.name,
      email: email || session.user.email || '',
      bankAccount: {
        accountNumberLast4,
        ifscCode: ifscCode.toUpperCase(),
        beneficiaryName,
      },
    };

    // TODO: When Razorpay Route is enabled, call Razorpay API to create linked account
    // const razorpay = getRazorpayInstance();
    // const linkedAccount = await razorpay.accounts.create({
    //   email: razorpayRouteDetails.email,
    //   contact_name: beneficiaryName,
    //   legal_business_name: legalBusinessName || expert.name,
    //   business_type: 'individual',
    //   legal_info: { pan: panNumber },
    //   bank_account: {
    //     ifsc_code: ifscCode,
    //     account_number: accountNumber, // Full account number sent to Razorpay only
    //     beneficiary_name: beneficiaryName,
    //   },
    // });
    // razorpayRouteDetails.accountId = linkedAccount.id;
    // razorpayRouteDetails.status = linkedAccount.status === 'activated' ? 'activated' : 'pending';

    // Save to expert profile
    const updatedExpert = await expertRepository.updateRazorpayRoute(
      expert.id,
      razorpayRouteDetails
    );

    console.log('[DBG][razorpay-route] Saved bank details for expert:', expert.id);

    return NextResponse.json({
      success: true,
      data: {
        status: razorpayRouteDetails.status,
        bankAccount: razorpayRouteDetails.bankAccount,
        message:
          'Bank details saved. Payout account will be activated once Razorpay Route is enabled.',
      },
    });
  } catch (error) {
    console.error('[DBG][razorpay-route] Error saving bank details:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save bank details',
      },
      { status: 500 }
    );
  }
}
