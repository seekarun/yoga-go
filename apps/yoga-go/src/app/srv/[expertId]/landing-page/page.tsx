'use client';

import { useParams } from 'next/navigation';
import LandingPageEditor from '@/components/landing-page/editor/LandingPageEditor';

export default function EditLandingPage() {
  const params = useParams();
  const expertId = params.expertId as string;

  return <LandingPageEditor expertId={expertId} />;
}
