"use client";

import type { ReactNode } from "react";
import { can, type Permission } from "@/lib/permissions";
import type { Session } from "@/lib/adminApi";

/**
 * JEDYNY sposób warunkowego pokazywania elementów UI wg uprawnień w panelu —
 * mirror can() z src/lib/permissions.ts. Ukrycie tu jest wyłącznie KONSEKWENCJĄ
 * braku uprawnienia, nigdy jedynym zabezpieczeniem — backend odrzuca każde
 * żądanie bez odpowiedniego uprawnienia niezależnie od tego, co pokazuje UI
 * (patrz backend/src/Support/Authorization.php).
 */
export default function Can({
  session,
  permission,
  children,
  fallback = null,
}: {
  session: Session | null;
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return can(session?.permissions, permission) ? <>{children}</> : <>{fallback}</>;
}
