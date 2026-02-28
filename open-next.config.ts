import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Opsional: uncomment jika pakai R2 untuk caching
  // incrementalCache: r2IncrementalCache,
});
