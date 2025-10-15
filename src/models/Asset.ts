import mongoose, { Schema } from 'mongoose';
import type { Asset, AssetType, AssetCategory, AssetDimensions, CropData } from '@/types';

export interface AssetDocument extends Omit<Asset, 'id'> {
  _id: string;
}

const AssetDimensionsSchema = new Schema<AssetDimensions>(
  {
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false }
);

const CropDataSchema = new Schema<CropData>(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    zoom: { type: Number },
  },
  { _id: false }
);

const AssetSchema = new Schema<AssetDocument>(
  {
    _id: { type: String, required: true },
    filename: { type: String, required: true },
    originalUrl: { type: String, required: true },
    croppedUrl: { type: String },
    cloudflareImageId: { type: String, required: true },
    croppedCloudflareImageId: { type: String },
    type: {
      type: String,
      enum: ['image', 'video', 'document'] as AssetType[],
      required: true,
    },
    category: {
      type: String,
      enum: ['avatar', 'banner', 'thumbnail', 'course', 'lesson', 'other'] as AssetCategory[],
      required: true,
    },
    dimensions: { type: AssetDimensionsSchema, required: true },
    cropData: { type: CropDataSchema },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    uploadedBy: { type: String },
    relatedTo: {
      type: {
        type: String,
        enum: ['expert', 'user', 'course', 'lesson'],
      },
      id: String,
    },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'assets',
  }
);

// Indexes
AssetSchema.index({ cloudflareImageId: 1 });
AssetSchema.index({ 'relatedTo.type': 1, 'relatedTo.id': 1 });
AssetSchema.index({ uploadedBy: 1 });
AssetSchema.index({ category: 1 });

// Prevent model recompilation in development
export default mongoose.models.Asset || mongoose.model<AssetDocument>('Asset', AssetSchema);
