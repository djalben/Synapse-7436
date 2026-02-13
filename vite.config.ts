import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite"
import path from "path";

// cloudflare() plugin removed — it overrides Vercel Edge function detection
export default defineConfig({
	plugins: [react(), tailwind()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src/web"),
		},
	},
	server: {
		allowedHosts: true,
	}
});
