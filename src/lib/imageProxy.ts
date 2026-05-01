const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function proxyImage(url: string | undefined | null): string {
  if (!url) return "";
  if (
    !url.includes("instagram.com") &&
    !url.includes("cdninstagram.com") &&
    !url.includes("fbcdn.net")
  ) {
    return url;
  }
  return `${SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
}
