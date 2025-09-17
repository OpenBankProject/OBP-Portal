#!/usr/bin/env node

/**
 * Opey Debug Script
 *
 * This script helps debug connectivity and message flow issues with Opey.
 * It tests various endpoints and streaming functionality to identify where
 * messages might be getting lost.
 */

const fetch = require('node-fetch');
const EventSource = require('eventsource');

// Configuration - update these values based on your environment
const OPEY_BASE_URL = process.env.OPEY_BASE_URL || 'http://localhost:5000';
const PORTAL_BASE_URL = process.env.PORTAL_BASE_URL || 'http://localhost:5173';

console.log('🔍 Opey Debug Script Starting...');
console.log(`📡 Opey Base URL: ${OPEY_BASE_URL}`);
console.log(`🌐 Portal Base URL: ${PORTAL_BASE_URL}`);
console.log('=' .repeat(60));

async function testOpeyHealth() {
    console.log('\n🏥 Testing Opey Health Check...');
    try {
        const response = await fetch(`${OPEY_BASE_URL}/status`, {
            method: 'GET',
            timeout: 5000
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Opey health check successful');
            console.log('📊 Status data:', JSON.stringify(data, null, 2));
            return true;
        } else {
            console.log(`❌ Opey health check failed: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Opey health check error:', error.message);
        return false;
    }
}

async function testPortalOpeyAuth() {
    console.log('\n🔐 Testing Portal Opey Auth Endpoint...');
    try {
        const response = await fetch(`${PORTAL_BASE_URL}/api/opey/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Portal Opey auth successful');
            console.log('🎫 Auth data:', JSON.stringify(data, null, 2));
            return data;
        } else {
            const errorText = await response.text();
            console.log(`❌ Portal Opey auth failed: ${response.status} ${response.statusText}`);
            console.log('📄 Error response:', errorText);
            return null;
        }
    } catch (error) {
        console.log('❌ Portal Opey auth error:', error.message);
        return null;
    }
}

async function testOpeyCreateSession() {
    console.log('\n🚀 Testing Direct Opey Session Creation...');
    try {
        const response = await fetch(`${OPEY_BASE_URL}/create-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({}),
            timeout: 10000
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Opey session creation successful');
            console.log('🎯 Session data:', JSON.stringify(data, null, 2));
            return data;
        } else {
            const errorText = await response.text();
            console.log(`❌ Opey session creation failed: ${response.status} ${response.statusText}`);
            console.log('📄 Error response:', errorText);
            return null;
        }
    } catch (error) {
        console.log('❌ Opey session creation error:', error.message);
        return null;
    }
}

async function testOpeyStreamingEndpoint(testMessage = "Hello, this is a test message") {
    console.log('\n📡 Testing Opey Streaming Endpoint...');

    return new Promise((resolve) => {
        const streamData = {
            message: testMessage,
            stream_tokens: true
        };

        console.log('📤 Sending message:', testMessage);

        fetch(`${OPEY_BASE_URL}/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(streamData),
            timeout: 30000
        }).then(async response => {
            console.log(`📊 Stream response status: ${response.status} ${response.statusText}`);
            console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.log('❌ Stream request failed');
                console.log('📄 Error response:', errorText);
                resolve(false);
                return;
            }

            if (!response.body) {
                console.log('❌ No response body received');
                resolve(false);
                return;
            }

            console.log('✅ Stream connection established, reading events...');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let eventCount = 0;
            let messageComplete = false;
            let timeout;

            // Set a timeout for the stream reading
            timeout = setTimeout(() => {
                console.log('⏰ Stream reading timeout after 30 seconds');
                reader.cancel();
                resolve(eventCount > 0);
            }, 30000);

            try {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        console.log('📡 Stream ended naturally');
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6).trim();

                            if (data === '[DONE]') {
                                console.log('🏁 Received [DONE] marker');
                                messageComplete = true;
                                break;
                            }

                            try {
                                const eventData = JSON.parse(data);
                                eventCount++;
                                console.log(`📨 Event ${eventCount}:`, JSON.stringify(eventData, null, 2));

                                // Check if this is a completion event
                                if (eventData.type === 'assistant_complete') {
                                    messageComplete = true;
                                    break;
                                }
                            } catch (parseError) {
                                console.log('⚠️ Failed to parse event data:', data);
                                console.log('❌ Parse error:', parseError.message);
                            }
                        }
                    }

                    if (messageComplete) break;
                }
            } catch (readError) {
                console.log('❌ Error reading stream:', readError.message);
            } finally {
                clearTimeout(timeout);
                reader.releaseLock();
            }

            console.log(`📊 Stream completed. Total events received: ${eventCount}`);
            console.log(`✅ Message completion status: ${messageComplete ? 'Complete' : 'Incomplete'}`);

            resolve(eventCount > 0 && messageComplete);

        }).catch(error => {
            console.log('❌ Stream connection error:', error.message);
            resolve(false);
        });
    });
}

async function testMessagePersistence() {
    console.log('\n💾 Testing Message Persistence...');

    // Send a few messages and check if they persist
    const testMessages = [
        "Test message 1 - checking persistence",
        "Test message 2 - checking for removal",
        "Test message 3 - final persistence test"
    ];

    let successCount = 0;

    for (let i = 0; i < testMessages.length; i++) {
        console.log(`\n📤 Sending test message ${i + 1}...`);
        const success = await testOpeyStreamingEndpoint(testMessages[i]);
        if (success) {
            successCount++;
        }

        // Wait a bit between messages
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n📊 Message persistence test complete: ${successCount}/${testMessages.length} successful`);
    return successCount === testMessages.length;
}

async function checkOpeyLogs() {
    console.log('\n📋 Checking for recent Opey log patterns...');

    // This would ideally check log files or endpoints if available
    console.log('ℹ️ Manual log check recommended:');
    console.log('  - Check for RemoveMessage operations');
    console.log('  - Look for conversation_summary activity');
    console.log('  - Monitor SQLite checkpoint operations');
    console.log('  - Watch for message streaming interruptions');
}

async function runDiagnostics() {
    console.log('🔧 Running Full Opey Diagnostics...\n');

    const results = {
        health: false,
        portalAuth: false,
        sessionCreation: false,
        streaming: false,
        persistence: false
    };

    // Test each component
    results.health = await testOpeyHealth();

    if (results.health) {
        const authResult = await testPortalOpeyAuth();
        results.portalAuth = authResult !== null;

        const sessionResult = await testOpeyCreateSession();
        results.sessionCreation = sessionResult !== null;

        results.streaming = await testOpeyStreamingEndpoint();

        if (results.streaming) {
            results.persistence = await testMessagePersistence();
        }
    }

    // Check logs
    await checkOpeyLogs();

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('=' .repeat(60));

    const statusIcon = (success) => success ? '✅' : '❌';

    console.log(`${statusIcon(results.health)} Health Check: ${results.health ? 'PASS' : 'FAIL'}`);
    console.log(`${statusIcon(results.portalAuth)} Portal Auth: ${results.portalAuth ? 'PASS' : 'FAIL'}`);
    console.log(`${statusIcon(results.sessionCreation)} Session Creation: ${results.sessionCreation ? 'PASS' : 'FAIL'}`);
    console.log(`${statusIcon(results.streaming)} Message Streaming: ${results.streaming ? 'PASS' : 'FAIL'}`);
    console.log(`${statusIcon(results.persistence)} Message Persistence: ${results.persistence ? 'PASS' : 'FAIL'}`);

    const overallSuccess = Object.values(results).every(Boolean);
    console.log(`\n🎯 Overall Status: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    if (!overallSuccess) {
        console.log('\n🔧 TROUBLESHOOTING RECOMMENDATIONS:');

        if (!results.health) {
            console.log('  • Check if Opey service is running and accessible');
            console.log('  • Verify OPEY_BASE_URL configuration');
            console.log('  • Check network connectivity and firewall settings');
        }

        if (!results.streaming) {
            console.log('  • Check Opey streaming endpoint implementation');
            console.log('  • Verify Server-Sent Events (SSE) support');
            console.log('  • Check for request/response timeout issues');
        }

        if (!results.persistence) {
            console.log('  • Review conversation summarization settings');
            console.log('  • Check message cleanup/removal policies');
            console.log('  • Monitor database operations and checkpoints');
        }

        console.log('\n📝 Next Steps:');
        console.log('  1. Fix failing components in order of dependency');
        console.log('  2. Monitor Opey logs during message exchanges');
        console.log('  3. Test with minimal message payloads first');
        console.log('  4. Consider increasing timeout values if needed');
    }

    return overallSuccess;
}

// Run diagnostics if this script is executed directly
if (require.main === module) {
    runDiagnostics()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('❌ Diagnostic script failed:', error);
            process.exit(1);
        });
}

module.exports = {
    testOpeyHealth,
    testPortalOpeyAuth,
    testOpeyCreateSession,
    testOpeyStreamingEndpoint,
    testMessagePersistence,
    runDiagnostics
};
