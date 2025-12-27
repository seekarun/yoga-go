import PhotoGalleryLightbox from '@/components/PhotoGalleryLightbox';
import { SECTION_MAX_WIDTH } from '../../shared';
import type { PhotoGallerySectionProps } from '../../types';

export default function PhotoGallerySection({
  title,
  description,
  images,
}: PhotoGallerySectionProps) {
  if (images.length === 0) return null;

  return (
    <div style={{ background: '#fff' }}>
      <div id="photoGallery" style={{ maxWidth: SECTION_MAX_WIDTH, margin: '0 auto' }}>
        <PhotoGalleryLightbox
          images={images}
          title={title || 'Gallery'}
          description={description}
        />
      </div>
    </div>
  );
}
