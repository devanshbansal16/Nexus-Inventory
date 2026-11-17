const { spawn, exec } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║   🚀 CIMS — Nexus Inventory Full Stack Startup in One Go       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// 1. Start Backend
console.log('[1/2] Starting Backend Server (Express + In-Memory MongoDB + Socket.IO)...');
const backend = spawn(npmCmd, ['run', 'start'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true,
});

// 2. Start Frontend
console.log('[2/2] Starting Frontend App (Vite + React 19 + Tailwind CSS)...');
const frontend = spawn(npmCmd, ['run', 'dev', '--', '--host'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true,
});

// 3. Open browser after 3 seconds
setTimeout(() => {
  console.log('\n✨ Launching browser at http://localhost:5173 ...\n');
  const startCmd = isWindows ? 'start http://localhost:5173' : 'open http://localhost:5173';
  exec(startCmd, () => {});
}, 3000);

// Graceful shutdown
const cleanup = () => {
  console.log('\n[CIMS] Stopping all services...');
  if (backend && !backend.killed) backend.kill('SIGINT');
  if (frontend && !frontend.killed) frontend.kill('SIGINT');
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
