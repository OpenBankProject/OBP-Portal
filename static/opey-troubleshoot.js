/**
 * Opey Troubleshooting Script
 *
 * Paste this script into your browser console to run diagnostic checks
 * and troubleshoot Opey message delivery issues.
 *
 * Usage:
 * 1. Open browser developer tools (F12)
 * 2. Go to Console tab
 * 3. Paste this entire script and press Enter
 * 4. Run: OpeyTroubleshoot.runFullDiagnostic()
 */

window.OpeyTroubleshoot = (function() {
    'use strict';

    // Configuration
    const OPEY_BASE_URL = window.location.origin.replace('5173', '5000').replace('3000', '5000');
    const PORTAL_BASE_URL = window.location.origin;

    // Utility functions
    function log(level, message, ...args) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const prefix = `[${timestamp}] [OPEY-${level.toUpperCase()}]`;

        switch(level) {
            case 'error':
                console.error(prefix, message, ...args);
                break;
            case 'warn':
                console.warn(prefix, message, ...args);
                break;
            case 'info':
                console.info(prefix, message, ...args);
                break;
            case 'debug':
            default:
                console.log(prefix, message, ...args);
        }
    }

    function createTestResult(name, status, details = null, error = null) {
        return {
            test: name,
            status, // 'pass', 'fail', 'warn'
            details,
            error,
            timestamp: new Date().toISOString()
        };
    }

    function formatResults(results) {
        console.log('\n' + '='.repeat(60));
        console.log('🔍 OPEY DIAGNOSTIC RESULTS');
        console.log('='.repeat(60));

        let passCount = 0;
        let failCount = 0;
        let warnCount = 0;

        results.forEach(result => {
            const icon = result.status === 'pass' ? '✅' :
                        result.status === 'fail' ? '❌' : '⚠️';

            console.log(`${icon} ${result.test}: ${result.status.toUpperCase()}`);

            if (result.details) {
                console.log(`   Details: ${JSON.stringify(result.details)}`);
            }

            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }

            if (result.status === 'pass') passCount++;
            else if (result.status === 'fail') failCount++;
            else warnCount++;
        });

        console.log('\n' + '-'.repeat(60));
        console.log(`📊 Summary: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`);
        console.log('='.repeat(60));

        return { passCount, failCount, warnCount, results };
    }

    // Individual test functions
    async function testOpeyConnection() {
        log('info', 'Testing Opey service connection...');

        try {
            const response = await fetch(`${OPEY_BASE_URL}/status`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                return createTestResult('Opey Connection', 'pass', {
                    url: `${OPEY_BASE_URL}/status`,
                    status: response.status,
                    data
                });
            } else {
                return createTestResult('Opey Connection', 'fail', {
                    url: `${OPEY_BASE_URL}/status`,
                    status: response.status,
                    statusText: response.statusText
                });
            }
        } catch (error) {
            return createTestResult('Opey Connection', 'fail', null, error.message);
        }
    }

    async function testPortalAuth() {
        log('info', 'Testing Portal-Opey authentication...');

        try {
            const response = await fetch('/api/opey/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                return createTestResult('Portal Auth', 'pass', {
                    authenticated: data.authenticated,
                    hasError: !!data.error
                });
            } else {
                const errorData = await response.text();
                return createTestResult('Portal Auth', 'fail', {
                    status: response.status,
                    error: errorData
                });
            }
        } catch (error) {
            return createTestResult('Portal Auth', 'fail', null, error.message);
        }
    }

    async function testStreamingEndpoint() {
        log('info', 'Testing streaming endpoint...');

        return new Promise((resolve) => {
            const testMessage = 'Test message for debugging - ' + Date.now();
            const streamData = {
                message: testMessage,
                stream_tokens: true
            };

            let eventCount = 0;
            let hasError = false;
            let completedNormally = false;

            const timeout = setTimeout(() => {
                log('warn', 'Stream test timeout after 15 seconds');
                resolve(createTestResult('Streaming Test', 'warn', {
                    eventCount,
                    timeout: true,
                    message: 'Stream took longer than 15 seconds'
                }));
            }, 15000);

            fetch(`${OPEY_BASE_URL}/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(streamData)
            })
            .then(async response => {
                if (!response.ok) {
                    clearTimeout(timeout);
                    const errorText = await response.text();
                    resolve(createTestResult('Streaming Test', 'fail', {
                        status: response.status,
                        error: errorText
                    }));
                    return;
                }

                const reader = response.body?.getReader();
                if (!reader) {
                    clearTimeout(timeout);
                    resolve(createTestResult('Streaming Test', 'fail', null, 'No response body'));
                    return;
                }

                const decoder = new TextDecoder();
                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();

                        if (done) {
                            clearTimeout(timeout);
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6).trim();

                                if (data === '[DONE]') {
                                    completedNormally = true;
                                    break;
                                }

                                try {
                                    const eventData = JSON.parse(data);
                                    eventCount++;
                                    log('debug', `Stream event ${eventCount}:`, eventData.type);

                                    if (eventData.type === 'assistant_complete') {
                                        completedNormally = true;
                                        break;
                                    }
                                } catch (parseError) {
                                    log('warn', 'Failed to parse stream data:', data);
                                }
                            }
                        }

                        if (completedNormally) break;
                    }
                } catch (readError) {
                    hasError = true;
                    log('error', 'Error reading stream:', readError);
                } finally {
                    reader.releaseLock();
                    clearTimeout(timeout);
                }

                const status = hasError ? 'fail' :
                              completedNormally ? 'pass' :
                              eventCount > 0 ? 'warn' : 'fail';

                resolve(createTestResult('Streaming Test', status, {
                    eventCount,
                    completedNormally,
                    hasError,
                    testMessage
                }));
            })
            .catch(error => {
                clearTimeout(timeout);
                resolve(createTestResult('Streaming Test', 'fail', null, error.message));
            });
        });
    }

    function testBrowserSupport() {
        log('info', 'Testing browser support...');

        const checks = {
            fetch: typeof fetch !== 'undefined',
            readableStream: typeof ReadableStream !== 'undefined',
            eventSource: typeof EventSource !== 'undefined',
            textDecoder: typeof TextDecoder !== 'undefined',
            localStorage: typeof localStorage !== 'undefined'
        };

        const failedChecks = Object.entries(checks)
            .filter(([key, supported]) => !supported)
            .map(([key]) => key);

        const status = failedChecks.length === 0 ? 'pass' : 'fail';

        return createTestResult('Browser Support', status, {
            supported: checks,
            failed: failedChecks
        });
    }

    function testCurrentChatState() {
        log('info', 'Testing current chat state...');

        // Try to find chat components in the DOM/window
        const checks = {
            opeyDebugAvailable: typeof window.opeyDebug !== 'undefined',
            chatElementExists: document.querySelector('[data-opey-chat]') !== null,
            localStorageDebug: localStorage.getItem('opey_debug_enabled') === 'true',
            urlDebugParam: new URLSearchParams(window.location.search).get('opey_debug') === 'true'
        };

        return createTestResult('Current Chat State', 'pass', checks);
    }

    function testNetworkConnectivity() {
        log('info', 'Testing network connectivity...');

        const isOnline = navigator.onLine;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        const details = {
            online: isOnline,
            connectionType: connection?.effectiveType || 'unknown',
            downlink: connection?.downlink || 'unknown'
        };

        const status = isOnline ? 'pass' : 'fail';

        return createTestResult('Network Connectivity', status, details);
    }

    // Main diagnostic functions
    async function runBasicChecks() {
        log('info', '🚀 Running basic diagnostic checks...');

        const results = [];

        // Synchronous tests
        results.push(testBrowserSupport());
        results.push(testNetworkConnectivity());
        results.push(testCurrentChatState());

        // Asynchronous tests
        try {
            results.push(await testOpeyConnection());
        } catch (error) {
            results.push(createTestResult('Opey Connection', 'fail', null, error.message));
        }

        try {
            results.push(await testPortalAuth());
        } catch (error) {
            results.push(createTestResult('Portal Auth', 'fail', null, error.message));
        }

        return formatResults(results);
    }

    async function runStreamingTest() {
        log('info', '📡 Running streaming endpoint test...');

        const results = [];
        results.push(await testStreamingEndpoint());

        return formatResults(results);
    }

    async function runFullDiagnostic() {
        log('info', '🔍 Starting full diagnostic...');
        console.log('Opey Base URL:', OPEY_BASE_URL);
        console.log('Portal Base URL:', PORTAL_BASE_URL);
        console.log('Current Time:', new Date().toISOString());
        console.log('User Agent:', navigator.userAgent);

        const results = [];

        // Basic checks
        results.push(testBrowserSupport());
        results.push(testNetworkConnectivity());
        results.push(testCurrentChatState());

        // Connection tests
        try {
            results.push(await testOpeyConnection());
        } catch (error) {
            results.push(createTestResult('Opey Connection', 'fail', null, error.message));
        }

        try {
            results.push(await testPortalAuth());
        } catch (error) {
            results.push(createTestResult('Portal Auth', 'fail', null, error.message));
        }

        // Streaming test (most comprehensive)
        try {
            results.push(await testStreamingEndpoint());
        } catch (error) {
            results.push(createTestResult('Streaming Test', 'fail', null, error.message));
        }

        const summary = formatResults(results);

        // Provide recommendations based on results
        console.log('\n🔧 RECOMMENDATIONS:');

        if (summary.failCount > 0) {
            console.log('❌ Issues detected. Please check:');
            results.filter(r => r.status === 'fail').forEach(result => {
                console.log(`   • ${result.test}: ${result.error || 'Check details above'}`);
            });
        }

        if (summary.warnCount > 0) {
            console.log('⚠️ Warnings found. Consider:');
            results.filter(r => r.status === 'warn').forEach(result => {
                console.log(`   • ${result.test}: May need attention`);
            });
        }

        if (summary.failCount === 0 && summary.warnCount === 0) {
            console.log('✅ All tests passed! If you\'re still experiencing issues:');
            console.log('   • Check browser console for errors');
            console.log('   • Enable debug mode: OpeyTroubleshoot.enableDebugMode()');
            console.log('   • Monitor network tab during chat interactions');
        }

        console.log('\n📝 Next steps:');
        console.log('   • OpeyTroubleshoot.enableDebugMode() - Enable detailed logging');
        console.log('   • OpeyTroubleshoot.exportResults() - Export diagnostic data');
        console.log('   • OpeyTroubleshoot.runStreamingTest() - Test streaming only');

        return summary;
    }

    // Utility functions
    function enableDebugMode() {
        localStorage.setItem('opey_debug_enabled', 'true');
        localStorage.setItem('opey_debug_monitor', 'true');
        log('info', '✅ Debug mode enabled. Refresh the page to see changes.');
        return 'Refresh the page to see debug changes';
    }

    function disableDebugMode() {
        localStorage.removeItem('opey_debug_enabled');
        localStorage.removeItem('opey_debug_monitor');
        localStorage.removeItem('opey_log_level');
        log('info', '✅ Debug mode disabled. Refresh the page to see changes.');
        return 'Refresh the page to see changes';
    }

    function exportResults() {
        // This would export the last run results if we stored them
        const data = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            opeyBaseUrl: OPEY_BASE_URL,
            localStorage: {
                opeyDebug: localStorage.getItem('opey_debug_enabled'),
                opeyMonitor: localStorage.getItem('opey_debug_monitor')
            }
        };

        console.log('📋 Diagnostic Export Data:');
        console.log(JSON.stringify(data, null, 2));

        // Copy to clipboard if possible
        if (navigator.clipboard) {
            navigator.clipboard.writeText(JSON.stringify(data, null, 2))
                .then(() => log('info', '✅ Diagnostic data copied to clipboard'))
                .catch(() => log('warn', 'Could not copy to clipboard'));
        }

        return data;
    }

    function showHelp() {
        console.log(`
🔍 Opey Troubleshooting Commands:

Basic Usage:
  OpeyTroubleshoot.runFullDiagnostic()    - Run all diagnostic tests
  OpeyTroubleshoot.runBasicChecks()       - Run basic connectivity checks
  OpeyTroubleshoot.runStreamingTest()     - Test streaming endpoint only

Debug Mode:
  OpeyTroubleshoot.enableDebugMode()      - Enable detailed logging
  OpeyTroubleshoot.disableDebugMode()     - Disable debug logging

Utilities:
  OpeyTroubleshoot.exportResults()        - Export diagnostic data
  OpeyTroubleshoot.showHelp()             - Show this help message

Configuration:
  OPEY_BASE_URL: ${OPEY_BASE_URL}
  PORTAL_BASE_URL: ${PORTAL_BASE_URL}
        `);
    }

    // Public API
    return {
        runFullDiagnostic,
        runBasicChecks,
        runStreamingTest,
        enableDebugMode,
        disableDebugMode,
        exportResults,
        showHelp,

        // Advanced
        testOpeyConnection,
        testPortalAuth,
        testStreamingEndpoint,

        // Internal utilities (for advanced users)
        log,
        OPEY_BASE_URL,
        PORTAL_BASE_URL
    };
})();

// Auto-run help on first load
console.log('🔧 Opey Troubleshooting Script Loaded!');
console.log('📖 Run OpeyTroubleshoot.showHelp() for commands');
console.log('🚀 Quick start: OpeyTroubleshoot.runFullDiagnostic()');
