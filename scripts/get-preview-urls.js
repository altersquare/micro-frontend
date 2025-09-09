#!/usr/bin/env node

/**
 * Script to get CodeSandbox preview URLs for each port
 * This script will be used to automatically update environment variables
 * when running in CodeSandbox environment
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the ports used by each micro frontend
const PORTS = {
  'shell-app': 3000,
  'demo-one-app': 3001,
  'demo-two-app': 3002,
  'demo-three-app': 3003,
  'demo-counter-app': 3004
};

/**
 * Check if we're running in CodeSandbox environment
 */
function isCodeSandbox() {
  return process.env.CODESANDBOX_SSE || process.env.CODESANDBOX_HOST || process.env.HOSTNAME?.includes('codesandbox');
}

/**
 * Get CodeSandbox preview URL for a specific port
 */
async function getCodeSandboxPreviewUrl(port) {
  try {
    // Try to import @codesandbox/utils
    const { getCodeSandboxHost } = await import('@codesandbox/utils');
    const host = getCodeSandboxHost(port);

    if (host && host !== 'undefined' && host.trim() !== '') {
      const previewUrl = `https://${host}`;
      return previewUrl;
    }
  } catch (error) {
    console.warn(`⚠️  @codesandbox/utils not available: ${error.message}`);
  }

  // Fallback: try to construct URL based on environment variables
  if (process.env.CODESANDBOX_HOST) {
    // Format: https://port-hostname
    const hostname = process.env.CODESANDBOX_HOST;
    return `https://${port}-${hostname}`;
  }

  // Another fallback pattern
  if (process.env.HOSTNAME && process.env.HOSTNAME.includes('csb.app')) {
    return `https://${port}-${process.env.HOSTNAME}`;
  }

  // CodeSandbox container hostname pattern
  if (process.env.HOSTNAME && process.env.HOSTNAME.includes('codesandbox')) {
    return `https://${port}-${process.env.HOSTNAME}`;
  }

  return null;
}

/**
 * Get preview URLs for all ports
 */
async function getPreviewUrls() {
  console.log('🔍 Checking environment...');
  
  if (!isCodeSandbox()) {
    console.log('📍 Not running in CodeSandbox - using localhost URLs');
    
    // Return localhost URLs for local development
    const localUrls = {};
    for (const [appName, port] of Object.entries(PORTS)) {
      localUrls[appName] = `http://localhost:${port}`;
    }
    return localUrls;
  }
  
  console.log('🏖️  Running in CodeSandbox - getting preview URLs...');
  
  const previewUrls = {};
  
  for (const [appName, port] of Object.entries(PORTS)) {
    console.log(`\n🔗 Getting preview URL for ${appName} (port ${port})...`);
    
    try {
      const previewUrl = await getCodeSandboxPreviewUrl(port);
      
      if (previewUrl) {
        previewUrls[appName] = previewUrl;
        console.log(`✅ ${appName}: ${previewUrl}`);
      } else {
        // Fallback to localhost if preview URL can't be determined
        previewUrls[appName] = `http://localhost:${port}`;
        console.log(`⚠️  ${appName}: Fallback to localhost:${port}`);
      }
    } catch (error) {
      console.error(`❌ Error getting preview URL for ${appName}:`, error.message);
      previewUrls[appName] = `http://localhost:${port}`;
    }
  }
  
  return previewUrls;
}

/**
 * Display the preview URLs in a formatted way
 */
function displayPreviewUrls(urls) {
  console.log('\n' + '='.repeat(60));
  console.log('🌐 MICRO FRONTEND PREVIEW URLS');
  console.log('='.repeat(60));
  
  for (const [appName, url] of Object.entries(urls)) {
    const port = PORTS[appName];
    console.log(`📱 ${appName.padEnd(20)} (${port}): ${url}`);
  }
  
  console.log('='.repeat(60));
  
  // Also log in JSON format for potential programmatic use
  console.log('\n📋 JSON Format:');
  console.log(JSON.stringify(urls, null, 2));
}

/**
 * Generate environment variables based on preview URLs
 */
function generateEnvVars(urls) {
  console.log('\n🔧 ENVIRONMENT VARIABLES:');
  console.log('-'.repeat(40));
  
  // App URLs
  console.log(`VITE_SHELL_APP_URL=${urls['shell-app']}`);
  console.log(`VITE_DEMO_ONE_APP_URL=${urls['demo-one-app']}`);
  console.log(`VITE_DEMO_TWO_APP_URL=${urls['demo-two-app']}`);
  console.log(`VITE_DEMO_THREE_APP_URL=${urls['demo-three-app']}`);
  console.log(`VITE_DEMO_COUNTER_APP_URL=${urls['demo-counter-app']}`);
  
  console.log('');
  
  // Remote Entry Points
  console.log(`VITE_SHELL_REMOTE_ENTRY=${urls['shell-app']}/remoteEntry.js`);
  console.log(`VITE_DEMO_ONE_REMOTE_ENTRY=${urls['demo-one-app']}/remoteEntry.js`);
  console.log(`VITE_DEMO_TWO_REMOTE_ENTRY=${urls['demo-two-app']}/remoteEntry.js`);
  console.log(`VITE_DEMO_THREE_REMOTE_ENTRY=${urls['demo-three-app']}/remoteEntry.js`);
  console.log(`VITE_DEMO_COUNTER_REMOTE_ENTRY=${urls['demo-counter-app']}/remoteEntry.js`);
  
  console.log('');
  
  // CSS URLs
  console.log(`VITE_DEMO_ONE_CSS_URL=${urls['demo-one-app']}/assets/style.css`);
  console.log(`VITE_DEMO_TWO_CSS_URL=${urls['demo-two-app']}/assets/style.css`);
  console.log(`VITE_DEMO_THREE_CSS_URL=${urls['demo-three-app']}/assets/style.css`);
  console.log(`VITE_DEMO_COUNTER_CSS_URL=${urls['demo-counter-app']}/assets/style.css`);
  
  console.log('');
  
  // Ports
  console.log(`VITE_SHELL_PORT=${PORTS['shell-app']}`);
  console.log(`VITE_DEMO_ONE_PORT=${PORTS['demo-one-app']}`);
  console.log(`VITE_DEMO_TWO_PORT=${PORTS['demo-two-app']}`);
  console.log(`VITE_DEMO_THREE_PORT=${PORTS['demo-three-app']}`);
  console.log(`VITE_DEMO_COUNTER_PORT=${PORTS['demo-counter-app']}`);
}

/**
 * Update .env.local files with CodeSandbox preview URLs
 */
function updateEnvFiles(urls) {
  if (!isCodeSandbox()) {
    console.log('📍 Not in CodeSandbox - skipping .env.local file updates');
    return;
  }

  console.log('\n🔄 Updating .env.local files with CodeSandbox preview URLs...');

  try {
    // Update root .env.local
    const rootEnvContent = `# Root Development Environment Configuration for Micro Frontend Architecture (CodeSandbox)

# Development URLs
VITE_SHELL_APP_URL=${urls['shell-app']}
VITE_DEMO_ONE_APP_URL=${urls['demo-one-app']}
VITE_DEMO_TWO_APP_URL=${urls['demo-two-app']}
VITE_DEMO_THREE_APP_URL=${urls['demo-three-app']}
VITE_DEMO_COUNTER_APP_URL=${urls['demo-counter-app']}

# Remote Entry Points
VITE_SHELL_REMOTE_ENTRY=${urls['shell-app']}/remoteEntry.js
VITE_DEMO_ONE_REMOTE_ENTRY=${urls['demo-one-app']}/remoteEntry.js
VITE_DEMO_TWO_REMOTE_ENTRY=${urls['demo-two-app']}/remoteEntry.js
VITE_DEMO_THREE_REMOTE_ENTRY=${urls['demo-three-app']}/remoteEntry.js
VITE_DEMO_COUNTER_REMOTE_ENTRY=${urls['demo-counter-app']}/remoteEntry.js

# CSS URLs for development
VITE_DEMO_ONE_CSS_URL=${urls['demo-one-app']}/assets/style.css
VITE_DEMO_TWO_CSS_URL=${urls['demo-two-app']}/assets/style.css
VITE_DEMO_THREE_CSS_URL=${urls['demo-three-app']}/assets/style.css
VITE_DEMO_COUNTER_CSS_URL=${urls['demo-counter-app']}/assets/style.css

# Ports
VITE_SHELL_PORT=${PORTS['shell-app']}
VITE_DEMO_ONE_PORT=${PORTS['demo-one-app']}
VITE_DEMO_TWO_PORT=${PORTS['demo-two-app']}
VITE_DEMO_THREE_PORT=${PORTS['demo-three-app']}
VITE_DEMO_COUNTER_PORT=${PORTS['demo-counter-app']}

# Environment
NODE_ENV=development`;

    writeFileSync(join(__dirname, '../.env.local'), rootEnvContent);
    console.log('✅ Updated root .env.local');

    // Update shell-app .env.local
    const shellEnvContent = `# Shell App Development Environment Configuration (CodeSandbox)

# Development URLs
VITE_SHELL_APP_URL=${urls['shell-app']}
VITE_DEMO_ONE_APP_URL=${urls['demo-one-app']}
VITE_DEMO_TWO_APP_URL=${urls['demo-two-app']}
VITE_DEMO_THREE_APP_URL=${urls['demo-three-app']}
VITE_DEMO_COUNTER_APP_URL=${urls['demo-counter-app']}

# Remote Entry Points
VITE_DEMO_ONE_REMOTE_ENTRY=${urls['demo-one-app']}/remoteEntry.js
VITE_DEMO_TWO_REMOTE_ENTRY=${urls['demo-two-app']}/remoteEntry.js
VITE_DEMO_THREE_REMOTE_ENTRY=${urls['demo-three-app']}/remoteEntry.js
VITE_DEMO_COUNTER_REMOTE_ENTRY=${urls['demo-counter-app']}/remoteEntry.js

# CSS URLs
VITE_DEMO_ONE_CSS_URL=${urls['demo-one-app']}/assets/style.css
VITE_DEMO_TWO_CSS_URL=${urls['demo-two-app']}/assets/style.css
VITE_DEMO_THREE_CSS_URL=${urls['demo-three-app']}/assets/style.css
VITE_DEMO_COUNTER_CSS_URL=${urls['demo-counter-app']}/assets/style.css

# Port
VITE_SHELL_PORT=${PORTS['shell-app']}`;

    writeFileSync(join(__dirname, '../shell-app/.env.local'), shellEnvContent);
    console.log('✅ Updated shell-app/.env.local');

    // Update individual app .env.local files
    const apps = [
      { name: 'demo-one-app', port: PORTS['demo-one-app'], url: urls['demo-one-app'] },
      { name: 'demo-two-app', port: PORTS['demo-two-app'], url: urls['demo-two-app'] },
      { name: 'demo-three-app', port: PORTS['demo-three-app'], url: urls['demo-three-app'] },
      { name: 'demo-counter-app', port: PORTS['demo-counter-app'], url: urls['demo-counter-app'] }
    ];

    apps.forEach(app => {
      const appEnvContent = `# ${app.name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Development Environment Configuration (CodeSandbox)

# Development URLs
VITE_SHELL_APP_URL=${urls['shell-app']}
VITE_${app.name.toUpperCase().replace(/-/g, '_')}_URL=${app.url}

# Remote Entry Points
VITE_SHELL_REMOTE_ENTRY=${urls['shell-app']}/remoteEntry.js

# Port
VITE_${app.name.toUpperCase().replace(/-/g, '_').replace('_APP', '')}_PORT=${app.port}`;

      writeFileSync(join(__dirname, `../${app.name}/.env.local`), appEnvContent);
      console.log(`✅ Updated ${app.name}/.env.local`);
    });

    console.log('\n🎉 All .env.local files updated successfully!');

  } catch (error) {
    console.error('❌ Error updating .env.local files:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Getting preview URLs for micro frontends...\n');

    const previewUrls = await getPreviewUrls();

    displayPreviewUrls(previewUrls);
    generateEnvVars(previewUrls);

    // Check if we should update .env.local files
    const shouldUpdate = process.argv.includes('--update') || isCodeSandbox();

    if (shouldUpdate) {
      updateEnvFiles(previewUrls);
    } else {
      console.log('\n💡 Tip: Run with --update flag to automatically update .env.local files');
      console.log('   Example: npm run get-preview-urls -- --update');
    }

    console.log('\n✨ Done! Use these URLs to update your .env.local files when running in CodeSandbox.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
