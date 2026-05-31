import ShenutePageClient from "@/features/shenute/components/ShenutePageClient";

/**
 * Keeps the Shenute route entry point thin while the chat workspace lives in
 * the Shenute feature.
 */
export default function ShenutePage() {
  return <ShenutePageClient />;
}
