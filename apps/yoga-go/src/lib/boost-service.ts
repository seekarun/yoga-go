/**
 * Boost Service - Business Logic
 *
 * Orchestrates the boost campaign lifecycle:
 * - Submitting boosts to Meta Ads
 * - Pausing/resuming campaigns
 * - Syncing metrics from Meta
 * - Handling campaign completion
 */

import type { Boost } from '@/types';
import * as boostRepository from '@/lib/repositories/boostRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as metaAds from '@/lib/meta-ads';

/**
 * Submit a draft boost to Meta Ads for review
 */
export async function submitBoost(boostId: string): Promise<Boost> {
  console.log('[DBG][boost-service] Submitting boost:', boostId);

  // Get the boost
  const boost = await boostRepository.getBoostById(boostId);
  if (!boost) {
    throw new Error('Boost not found');
  }

  // Verify it's in draft status
  if (boost.status !== 'draft') {
    throw new Error(`Cannot submit boost in ${boost.status} status`);
  }

  // Get expert profile for destination URL
  const expert = await expertRepository.getExpertById(boost.expertId);
  if (!expert) {
    throw new Error('Expert not found');
  }

  // Build destination URL (expert's landing page or course page)
  // Use expert ID for now - subdomain support can be added later
  const baseUrl = `https://myyoga.guru/experts/${boost.expertId}`;
  const destinationUrl = boost.courseId ? `${baseUrl}/courses/${boost.courseId}` : baseUrl;

  // Check if Meta Ads is configured
  if (!metaAds.isMetaAdsConfigured()) {
    console.log('[DBG][boost-service] Meta Ads not configured, marking as pending');

    // Mark as pending approval (manual review required)
    return (await boostRepository.updateBoostStatus(boostId, 'pending_approval', {
      submittedAt: new Date().toISOString(),
      statusMessage: 'Waiting for Meta Ads configuration',
    })) as Boost;
  }

  try {
    // Create campaign on Meta
    const result = await metaAds.createBoostCampaign({
      boostId: boost.id,
      expertId: boost.expertId,
      expertName: expert.name,
      goal: boost.goal,
      targeting: boost.targeting,
      creative: boost.creative,
      budget: boost.budget,
      currency: boost.currency,
      destinationUrl,
    });

    // Update boost with Meta IDs and status
    const updatedBoost = await boostRepository.updateBoostStatus(boostId, 'pending_approval', {
      submittedAt: new Date().toISOString(),
      metaCampaignId: result.campaignId,
      metaAdSetId: result.adSetId,
      metaAdId: result.adId,
      statusMessage: 'Campaign created, pending Meta review',
    });

    console.log('[DBG][boost-service] Boost submitted successfully:', boostId);
    return updatedBoost as Boost;
  } catch (error) {
    console.error('[DBG][boost-service] Error submitting boost:', error);

    // Mark as failed
    await boostRepository.updateBoostStatus(boostId, 'failed', {
      statusMessage: error instanceof Error ? error.message : 'Failed to create campaign',
    });

    throw error;
  }
}

/**
 * Activate a pending boost (after Meta approval)
 */
export async function activateBoost(boostId: string): Promise<Boost> {
  console.log('[DBG][boost-service] Activating boost:', boostId);

  const boost = await boostRepository.getBoostById(boostId);
  if (!boost) {
    throw new Error('Boost not found');
  }

  if (boost.status !== 'pending_approval') {
    throw new Error(`Cannot activate boost in ${boost.status} status`);
  }

  if (!boost.metaCampaignId || !boost.metaAdSetId || !boost.metaAdId) {
    throw new Error('Boost is missing Meta campaign IDs');
  }

  try {
    // Activate on Meta
    await metaAds.activateCampaign(boost.metaCampaignId, boost.metaAdSetId, boost.metaAdId);

    // Update status
    const updatedBoost = await boostRepository.updateBoostStatus(boostId, 'active', {
      approvedAt: new Date().toISOString(),
      statusMessage: 'Campaign is running',
    });

    console.log('[DBG][boost-service] Boost activated:', boostId);
    return updatedBoost as Boost;
  } catch (error) {
    console.error('[DBG][boost-service] Error activating boost:', error);

    await boostRepository.updateBoostStatus(boostId, 'failed', {
      statusMessage: error instanceof Error ? error.message : 'Failed to activate campaign',
    });

    throw error;
  }
}

/**
 * Pause an active boost
 */
export async function pauseBoost(boostId: string): Promise<Boost> {
  console.log('[DBG][boost-service] Pausing boost:', boostId);

  const boost = await boostRepository.getBoostById(boostId);
  if (!boost) {
    throw new Error('Boost not found');
  }

  if (boost.status !== 'active') {
    throw new Error(`Cannot pause boost in ${boost.status} status`);
  }

  if (boost.metaCampaignId) {
    try {
      await metaAds.pauseCampaign(boost.metaCampaignId);
    } catch (error) {
      console.error('[DBG][boost-service] Error pausing on Meta:', error);
      // Continue to update local status even if Meta call fails
    }
  }

  const updatedBoost = await boostRepository.updateBoostStatus(boostId, 'paused', {
    pausedAt: new Date().toISOString(),
    statusMessage: 'Campaign paused',
  });

  console.log('[DBG][boost-service] Boost paused:', boostId);
  return updatedBoost as Boost;
}

/**
 * Resume a paused boost
 */
export async function resumeBoost(boostId: string): Promise<Boost> {
  console.log('[DBG][boost-service] Resuming boost:', boostId);

  const boost = await boostRepository.getBoostById(boostId);
  if (!boost) {
    throw new Error('Boost not found');
  }

  if (boost.status !== 'paused') {
    throw new Error(`Cannot resume boost in ${boost.status} status`);
  }

  // Check if there's budget remaining
  if (boost.spentAmount >= boost.budget) {
    throw new Error('No budget remaining');
  }

  if (boost.metaCampaignId) {
    try {
      await metaAds.resumeCampaign(boost.metaCampaignId);
    } catch (error) {
      console.error('[DBG][boost-service] Error resuming on Meta:', error);
      throw error;
    }
  }

  const updatedBoost = await boostRepository.updateBoostStatus(boostId, 'active', {
    statusMessage: 'Campaign resumed',
  });

  console.log('[DBG][boost-service] Boost resumed:', boostId);
  return updatedBoost as Boost;
}

/**
 * Sync metrics from Meta for a boost
 */
export async function syncBoostMetrics(boostId: string): Promise<Boost> {
  console.log('[DBG][boost-service] Syncing metrics for boost:', boostId);

  const boost = await boostRepository.getBoostById(boostId);
  if (!boost) {
    throw new Error('Boost not found');
  }

  if (!boost.metaCampaignId) {
    console.log('[DBG][boost-service] No Meta campaign ID, skipping sync');
    return boost;
  }

  try {
    const metrics = await metaAds.getCampaignInsights(boost.metaCampaignId);

    // Update metrics in DB
    await boostRepository.updateBoostMetrics(boostId, metrics);

    // Update spent amount
    if (metrics.spend > 0) {
      await boostRepository.updateBoostSpend(boostId, metrics.spend);
    }

    // Check if budget is exhausted
    if (metrics.spend >= boost.budget) {
      await boostRepository.updateBoostStatus(boostId, 'completed', {
        completedAt: new Date().toISOString(),
        statusMessage: 'Budget exhausted',
      });
    }

    const updatedBoost = await boostRepository.getBoostById(boostId);
    console.log('[DBG][boost-service] Metrics synced:', boostId);
    return updatedBoost as Boost;
  } catch (error) {
    console.error('[DBG][boost-service] Error syncing metrics:', error);
    throw error;
  }
}

/**
 * Sync metrics for all active boosts
 */
export async function syncAllActiveBoosts(): Promise<{ synced: number; errors: number }> {
  console.log('[DBG][boost-service] Syncing all active boosts');

  const activeBoosts = await boostRepository.getActiveBoosts();
  let synced = 0;
  let errors = 0;

  for (const boost of activeBoosts) {
    try {
      await syncBoostMetrics(boost.id);
      synced++;
    } catch (error) {
      console.error('[DBG][boost-service] Error syncing boost:', boost.id, error);
      errors++;
    }
  }

  console.log('[DBG][boost-service] Sync complete:', { synced, errors });
  return { synced, errors };
}

/**
 * Complete a boost (manual or automatic when budget exhausted)
 */
export async function completeBoost(boostId: string): Promise<Boost> {
  console.log('[DBG][boost-service] Completing boost:', boostId);

  const boost = await boostRepository.getBoostById(boostId);
  if (!boost) {
    throw new Error('Boost not found');
  }

  if (!['active', 'paused'].includes(boost.status)) {
    throw new Error(`Cannot complete boost in ${boost.status} status`);
  }

  // Pause on Meta if active
  if (boost.metaCampaignId && boost.status === 'active') {
    try {
      await metaAds.pauseCampaign(boost.metaCampaignId);
    } catch (error) {
      console.error('[DBG][boost-service] Error pausing on Meta:', error);
    }
  }

  // Final metrics sync
  if (boost.metaCampaignId) {
    try {
      await syncBoostMetrics(boostId);
    } catch (error) {
      console.error('[DBG][boost-service] Error syncing final metrics:', error);
    }
  }

  const updatedBoost = await boostRepository.updateBoostStatus(boostId, 'completed', {
    completedAt: new Date().toISOString(),
    statusMessage: 'Campaign completed',
  });

  console.log('[DBG][boost-service] Boost completed:', boostId);
  return updatedBoost as Boost;
}
