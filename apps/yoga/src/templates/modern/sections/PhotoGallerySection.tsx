import PhotoGalleryLightbox from '@/components/PhotoGalleryLightbox';
import type { PhotoGallerySectionProps } from '../../types';

export default function PhotoGallerySection({
  title,
  description,
  images,
}: PhotoGallerySectionProps) {
  if (images.length === 0) return null;

  return (
    <div id="photoGallery">
      <PhotoGalleryLightbox
        images={images}
        title={title || 'Gallery'}
        description={description}
        theme="dark"
      />
    </div>
  );
}
