import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: true
	},
	testDir: 'e2e',
	use: {
		// Run tests in headed mode (visible browser) with slow motion
		headless: false,
		launchOptions: {
			slowMo: 500
		}
	}
});
