import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as assetRepository from '@/lib/repositories/assetRepository';

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_TOKEN = process.env.CF_TOKEN;

/**
 * DELETE /data/app/expert/me/assets/[assetId]
 * Delete an asset owned by the current expert
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  console.log('[DBG][expert/me/assets/[assetId]] DELETE called for:', assetId);

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session || !session.user || !session.user.cognitoSub) {
      console.log('[DBG][expert/me/assets/[assetId]] Unauthorized - no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<null>, {
        status: 401,
      });
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);

    if (!user) {
      console.log('[DBG][expert/me/assets/[assetId]] User not found');
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';

    if (!isExpert) {
      console.log('[DBG][expert/me/assets/[assetId]] User is not an expert');
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    if (!user.expertProfile) {
      console.log('[DBG][expert/me/assets/[assetId]] Expert profile not found');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const tenantId = user.expertProfile;

    // Get the asset to verify ownership
    const asset = await assetRepository.getAssetById(assetId, tenantId);

    if (!asset) {
      console.log('[DBG][expert/me/assets/[assetId]] Asset not found:', assetId);
      return NextResponse.json({ success: false, error: 'Asset not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    // Verify the asset belongs to this expert (belt and suspenders)
    if (asset.tenantId !== tenantId) {
      console.log('[DBG][expert/me/assets/[assetId]] Asset does not belong to this expert');
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to delete this asset',
        } as ApiResponse<null>,
        { status: 403 }
      );
    }

    // Delete from Cloudflare Images if credentials are configured
    if (CF_ACCOUNT_ID && CF_TOKEN) {
      // Delete original image
      if (asset.cloudflareImageId) {
        try {
          console.log(
            '[DBG][expert/me/assets/[assetId]] Deleting from Cloudflare:',
            asset.cloudflareImageId
          );
          const deleteResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${asset.cloudflareImageId}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${CF_TOKEN}`,
              },
            }
          );

          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            console.warn('[DBG][expert/me/assets/[assetId]] Cloudflare delete warning:', errorData);
            // Don't fail the whole operation if Cloudflare delete fails
          } else {
            console.log(
              '[DBG][expert/me/assets/[assetId]] Deleted from Cloudflare:',
              asset.cloudflareImageId
            );
          }
        } catch (cfError) {
          console.warn('[DBG][expert/me/assets/[assetId]] Cloudflare delete error:', cfError);
          // Continue with DynamoDB deletion even if Cloudflare fails
        }
      }

      // Delete cropped image if exists
      if (asset.croppedCloudflareImageId) {
        try {
          console.log(
            '[DBG][expert/me/assets/[assetId]] Deleting cropped from Cloudflare:',
            asset.croppedCloudflareImageId
          );
          await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${asset.croppedCloudflareImageId}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${CF_TOKEN}`,
              },
            }
          );
          console.log('[DBG][expert/me/assets/[assetId]] Deleted cropped from Cloudflare');
        } catch (cfError) {
          console.warn(
            '[DBG][expert/me/assets/[assetId]] Cloudflare cropped delete error:',
            cfError
          );
        }
      }
    }

    // Delete from DynamoDB
    await assetRepository.deleteAsset(assetId, tenantId);

    console.log('[DBG][expert/me/assets/[assetId]] Asset deleted successfully:', assetId);
    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
    } as ApiResponse<null>);
  } catch (error) {
    console.error('[DBG][expert/me/assets/[assetId]] Error deleting asset:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete asset',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
