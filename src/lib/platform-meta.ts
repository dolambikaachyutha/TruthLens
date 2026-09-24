import type { Platform } from "@/lib/types";

export const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X (Twitter)" },
  { value: "telegram", label: "Telegram" },
  { value: "instagram", label: "Instagram" },
  { value: "community", label: "Community group / word of mouth" },
  { value: "news_site", label: "News outlet" },
  { value: "other", label: "Other" },
];

export const PLATFORM_PLACEHOLDER = "Select a platform";
