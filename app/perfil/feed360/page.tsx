"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PerfilFeed360Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/perfil/feed360/publicaciones");
  }, [router]);

  return null;
}
