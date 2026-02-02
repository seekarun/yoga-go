"use client";

import { useParams } from "next/navigation";
import SimpleLandingPageEditor from "@/components/landing-page/editor/SimpleLandingPageEditor";

/**
 * Landing page editor - Simple template-based approach
 */
export default function LandingPageEditorPage() {
  const params = useParams();
  const tenantId = params.expertId as string;

  return <SimpleLandingPageEditor tenantId={tenantId} />;
}
