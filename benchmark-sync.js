#!/usr/bin/env node
/**
 * Benchmark script for JSON → SQLite sync performance
 * Measures actual latency from file write to DB resync completion
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const HOME = process.env.HOME
const SOURCES_DIR = path.join(HOME, '.openclaw/sources')
const TEST_FILE = path.join(SOURCES_DIR, 'agents.json')
const LOG_FILE = '/tmp/benchmark-sync.log'

console.log('🔥 JSON → SQLite Sync Benchmark')
console.log('================================\n')

// Start server
console.log('🚀 Starting dev server...')
const server = spawn('npm', ['run', 'dev'], {
  cwd: path.join(HOME, 'Desktop/coding-projects/openclaw-ui'),
  stdio: ['ignore', 'pipe', 'pipe']
})

let serverLogs = ''
server.stdout.on('data', d => serverLogs += d.toString())
server.stderr.on('data', d => serverLogs += d.toString())

// Wait for server to be ready
setTimeout(() => {
  console.log('✅ Server ready\n')
  
  // Run 5 benchmark iterations
  let iteration = 0
  const latencies = []
  
  const runBenchmark = () => {
    if (iteration >= 5) {
      // Show results
      console.log('\n📊 Results:')
      console.log('─────────────────────────────')
      latencies.forEach((lat, i) => {
        console.log(`  Run ${i + 1}: ${lat}ms`)
      })
      const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      const min = Math.min(...latencies)
      const max = Math.max(...latencies)
      console.log('─────────────────────────────')
      console.log(`  Average: ${avg}ms`)
      console.log(`  Min: ${min}ms`)
      console.log(`  Max: ${max}ms`)
      console.log('')
      
      if (avg < 1000) {
        console.log('✅ Target <1000ms: PASSED')
      } else {
        console.log('❌ Target <1000ms: FAILED')
      }
      
      // Cleanup
      server.kill()
      process.exit(0)
    }
    
    iteration++
    console.log(`🎯 Run ${iteration}/5...`)
    
    // Clear previous logs
    const logMarker = `\n=== BENCHMARK ${iteration} START ===\n`
    serverLogs = logMarker
    
    // Modify file
    const startTime = Date.now()
    fs.appendFileSync(TEST_FILE, `\n// Benchmark ${iteration} at ${new Date().toISOString()}`)
    
    // Wait for sync to complete (check logs every 50ms)
    const checkInterval = setInterval(() => {
      if (serverLogs.includes('[watcher] DB resynced and clients notified')) {
        clearInterval(checkInterval)
        const endTime = Date.now()
        const latency = endTime - startTime
        latencies.push(latency)
        console.log(`  ⏱️  Latency: ${latency}ms\n`)
        
        // Next iteration after 1s cooldown
        setTimeout(runBenchmark, 1000)
      }
    }, 50)
    
    // Timeout after 3s
    setTimeout(() => {
      clearInterval(checkInterval)
      console.log('  ⚠️  Timeout (>3000ms)\n')
      latencies.push(3000)
      setTimeout(runBenchmark, 1000)
    }, 3000)
  }
  
  runBenchmark()
}, 10000) // Wait 10s for server startup

// Handle cleanup
process.on('SIGINT', () => {
  server.kill()
  process.exit(0)
})
