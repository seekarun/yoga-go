import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { PAYMENT_CONFIG } from '@/config/payment';

function getRazorpayInstance() {
  if (!PAYMENT_CONFIG.razorpay.keyId || !PAYMENT_CONFIG.razorpay.keySecret) {
    throw new Error('Razorpay API keys not configured');
  }
  return new Razorpay({
    key_id: PAYMENT_CONFIG.razorpay.keyId,
    key_secret: PAYMENT_CONFIG.razorpay.keySecret,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, currency, type, itemId, userId } = body;

    // Validate required fields
    if (!amount || !currency || !type || !itemId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Razorpay order
    const razorpay = getRazorpayInstance();
    // Generate short receipt (max 40 chars) - full details in notes
    const receiptId = `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const options = {
      amount: amount, // amount in smallest currency unit (paise)
      currency: currency,
      receipt: receiptId,
      notes: {
        type,
        itemId,
        userId,
      },
    };

    const order = await razorpay.orders.create(options);

    console.log('[Razorpay] Order created:', order.id);

    // TODO: Store order in database
    // await db.payments.create({
    //   orderId: order.id,
    //   userId,
    //   amount,
    //   currency,
    //   type,
    //   itemId,
    //   status: 'pending',
    //   gateway: 'razorpay',
    // });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    });
  } catch (error) {
    console.error('[Razorpay] Order creation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      },
      { status: 500 }
    );
  }
}
