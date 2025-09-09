#!/usr/bin/env node

/**
 * Test script to simulate CodeSandbox environment
 * This helps test the preview URL functionality locally
 */

// Simulate CodeSandbox environment variables
process.env.CODESANDBOX_HOST = 'abc123-def456.csb.app';
process.env.HOSTNAME = 'abc123-def456.csb.app';

console.log('🧪 Simulating CodeSandbox environment...');
console.log('📍 CODESANDBOX_HOST:', process.env.CODESANDBOX_HOST);
console.log('📍 HOSTNAME:', process.env.HOSTNAME);
console.log('');

// Import and run the main script
import('./get-preview-urls.js');
