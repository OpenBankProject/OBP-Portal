/**
 * Opey Debug Configuration
 *
 * This file contains configuration options for debugging Opey chat functionality.
 * Enable debug mode to get detailed logging and monitoring capabilities.
 */

export interface OpeyDebugConfig {
	enabled: boolean;
	logLevel: 'debug' | 'info' | 'warn' | 'error';
	enableStreamLogging: boolean;
	enableStateLogging: boolean;
	enableNetworkLogging: boolean;
	enablePerformanceMonitoring: boolean;
	maxLogEntries: number;
	autoExportOnError: boolean;
	showDebugMonitor: boolean;
	monitorPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Default debug configuration
export const defaultDebugConfig: OpeyDebugConfig = {
	enabled: false, // Set to true to enable debug mode
	logLevel: 'info',
	enableStreamLogging: true,
	enableStateLogging: true,
	enableNetworkLogging: true,
	enablePerformanceMonitoring: true,
	maxLogEntries: 100,
	autoExportOnError: true,
	showDebugMonitor: false, // Set to true to show the debug monitor overlay
	monitorPosition: 'bottom-right'
};

// Environment-based configuration
function getDebugConfigFromEnv(): Partial<OpeyDebugConfig> {
	// Always return empty config on server-side to prevent hydration issues
	if (typeof window === 'undefined') return {};

	try {
		const config: Partial<OpeyDebugConfig> = {};

		// Check for debug flags in localStorage or URL params
		const urlParams = new URLSearchParams(window.location.search);
		const debugEnabled =
			localStorage.getItem('opey_debug_enabled') === 'true' ||
			urlParams.get('opey_debug') === 'true' ||
			urlParams.get('debug') === 'opey';

		if (debugEnabled) {
			config.enabled = true;
			config.showDebugMonitor = true;
			config.logLevel = 'debug';
		}

		// Check for specific debug flags
		if (localStorage.getItem('opey_debug_monitor') === 'true') {
			config.showDebugMonitor = true;
		}

		const logLevel = localStorage.getItem('opey_log_level') as 'debug' | 'info' | 'warn' | 'error';
		if (logLevel) {
			config.logLevel = logLevel;
		}

		return config;
	} catch (error) {
		// Fallback for any browser API issues
		return {};
	}
}

// Export the final configuration - initialize with defaults only
export let opeyDebugConfig: OpeyDebugConfig = { ...defaultDebugConfig };

// Initialize client-side configuration after hydration
if (typeof window !== 'undefined') {
	// Use setTimeout to ensure this runs after hydration
	setTimeout(() => {
		const envConfig = getDebugConfigFromEnv();
		opeyDebugConfig = { ...defaultDebugConfig, ...envConfig };
	}, 0);
}

// Utility functions for debug mode
export const debugUtils = {
	/**
	 * Enable debug mode programmatically
	 */
	enable(): void {
		if (typeof window !== 'undefined') {
			localStorage.setItem('opey_debug_enabled', 'true');
			window.location.reload();
		}
	},

	/**
	 * Disable debug mode programmatically
	 */
	disable(): void {
		if (typeof window !== 'undefined') {
			localStorage.setItem('opey_debug_enabled', 'false');
			localStorage.removeItem('opey_debug_monitor');
			window.location.reload();
		}
	},

	/**
	 * Toggle debug monitor visibility
	 */
	toggleMonitor(): void {
		if (typeof window !== 'undefined') {
			const current = localStorage.getItem('opey_debug_monitor') === 'true';
			localStorage.setItem('opey_debug_monitor', (!current).toString());
			window.location.reload();
		}
	},

	/**
	 * Set log level
	 */
	setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
		if (typeof window !== 'undefined') {
			localStorage.setItem('opey_log_level', level);
			window.location.reload();
		}
	},

	/**
	 * Get current debug status
	 */
	getStatus(): OpeyDebugConfig {
		return opeyDebugConfig;
	},

	/**
	 * Reset all debug settings to defaults
	 */
	reset(): void {
		if (typeof window !== 'undefined') {
			localStorage.removeItem('opey_debug_enabled');
			localStorage.removeItem('opey_debug_monitor');
			localStorage.removeItem('opey_log_level');
			window.location.reload();
		}
	}
};

// Console helpers for debugging
export const debugConsole = {
	log: (...args: any[]) => {
		if (opeyDebugConfig.enabled && opeyDebugConfig.logLevel === 'debug') {
			console.log('[OPEY DEBUG]', ...args);
		}
	},

	info: (...args: any[]) => {
		if (opeyDebugConfig.enabled && ['debug', 'info'].includes(opeyDebugConfig.logLevel)) {
			console.info('[OPEY INFO]', ...args);
		}
	},

	warn: (...args: any[]) => {
		if (opeyDebugConfig.enabled && ['debug', 'info', 'warn'].includes(opeyDebugConfig.logLevel)) {
			console.warn('[OPEY WARN]', ...args);
		}
	},

	error: (...args: any[]) => {
		if (opeyDebugConfig.enabled) {
			console.error('[OPEY ERROR]', ...args);
		}
	}
};

// Export for global access in browser console - defer until after hydration
if (typeof window !== 'undefined') {
	// Set up global debug utilities
	(window as any).opeyDebug = debugUtils;

	// Defer console output until after initial load
	setTimeout(() => {
		console.log('Opey debug utilities available at window.opeyDebug');

		if (opeyDebugConfig.enabled) {
			console.log('🐛 Opey Debug Mode Enabled');
			console.log('Configuration:', opeyDebugConfig);
			console.log('Available commands:');
			console.log('  - window.opeyDebug.enable() - Enable debug mode');
			console.log('  - window.opeyDebug.disable() - Disable debug mode');
			console.log('  - window.opeyDebug.toggleMonitor() - Toggle debug monitor');
			console.log('  - window.opeyDebug.setLogLevel(level) - Set log level');
			console.log('  - window.opeyDebug.reset() - Reset to defaults');
		}
	}, 100);
}
