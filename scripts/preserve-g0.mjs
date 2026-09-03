#!/usr/bin/env node
// Copy current harness to g0.html/g0.js (dev artifact; product registers EXACTLY 5 tools).
// g0.html keeps the single-tool get_demo_status spike for human Inspector verification.
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUB = join(HERE, '..', 'public');
const HARNESS_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Machine Passport — WebMCP G0 harness (dev)</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <main class="g0-page">
    <h1>Machine Passport <span class="dim">/ WebMCP G0 runtime probe (dev page)</span></h1>
    <p class="sub">Single-tool spike: register → discover → invoke → deterministic return → AbortController lifecycle.</p>
    <section id="probe" class="card"><h2>WebMCP availability</h2><p id="mc-presence" class="muted">checking…</p><pre id="mc-detail" class="code"></pre></section>
    <section class="card"><h2>G0 test suite <button id="run" class="btn">Run G0 test</button></h2><ul id="steps" class="steps"></ul><pre id="result" class="code"></pre></section>
    <footer class="boundary"><strong>MACHINE MUTATION = NONE.</strong> Dev-only harness; the product page registers exactly 5 tools.</footer>
  </main>
  <script type="module" src="/g0.js"></script>
</body>
</html>
`;
await mkdir(PUB, { recursive: true });
await import('node:fs/promises').then(({ writeFile }) => writeFile(join(PUB, 'g0.html'), HARNESS_HTML));
await copyFile(join(PUB, 'app.js'), join(PUB, 'g0.js'));
console.log('[preserve-g0] wrote public/g0.html and public/g0.js (copy of harness)');