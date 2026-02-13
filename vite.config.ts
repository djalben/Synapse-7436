import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwind from "@tailwindcss/vite"
import path from "path";

// On Vercel: skip cloudflare plugin (it overrides Edge function detection)
// Locally: include cloudflare plugin for Workers dev
const isVercel = process.env.VERCEL === '1';

export default defineConfig({
	plugins: [react(), ...(!isVercel ? [cloudflare()] : []), tailwind()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src/web"),
		},
	},
	server: {
		allowedHosts: true,
	}
});
