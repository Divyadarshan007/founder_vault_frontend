"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AgencyDashboardPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/founder/dashboard");
  }, [router]);
  return null;
}
