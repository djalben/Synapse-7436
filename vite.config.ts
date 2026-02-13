import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite"
import path from "path";

// On Vercel: skip cloudflare plugin entirely (it overrides Edge function detection)
// Locally: dynamically import cloudflare plugin for Workers dev
export default defineConfig(async ({ mode }) => {
	const plugins = [react(), tailwind()];

	if (process.env.VERCEL !== '1') {
		const { cloudflare } = await import("@cloudflare/vite-plugin");
		plugins.splice(1, 0, cloudflare());
	}

	return {
		plugins,
		resolve: {
			alias: {
				"@": path.resolve(import.meta.dirname, "./src/web"),
			},
		},
		server: {
			allowedHosts: true,
		}
	};
});
