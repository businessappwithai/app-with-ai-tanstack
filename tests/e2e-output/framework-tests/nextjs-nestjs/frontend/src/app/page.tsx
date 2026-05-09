"use client";

/**
 * Home Page - Redirect to Dashboard
 *
 * Automatically redirects to the main dashboard page.
 *
 * Generated: 2026-03-20T16:41:26.606Z
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard which has all entities
    router.replace("/dashboard");
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );
}
