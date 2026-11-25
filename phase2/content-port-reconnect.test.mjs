import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

const exportedPort = process.env.CODEX_CONTENT_PORT;
const { chromium } = createRequire(import.meta.url)('playwright');

test('old held response cannot satisfy a request in a new iframe', { skip: !exportedPort }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'codex-port-'));
  const server = createServer();
  let browser;
  try {
    const original = (await readFile(exportedPort, 'utf8')).replaceAll('\r\n', '\n');
    const output = join(dir, 'public', 'codexContentPort.js');
    await mkdir(join(dir, 'public'));
    await writeFile(output, original);
    execFileSync('patch', ['-p1', '-i', new URL('./wix-content-port-reconnect.patch', import.meta.url).pathname], { cwd: dir });
    const fixed = await readFile(output, 'utf8');
    const reader = await readFile(new URL('../releases/citations-context-rc-20261117/reader.html', import.meta.url));
    server.on('request', (req, res) => {
      if (req.url.startsWith('/reader')) {
        res.setHeader('Content-Type', 'text/html');
        res.end(reader);
      } else if (req.url === '/original.js' || req.url === '/fixed.js') {
        res.setHeader('Content-Type', 'text/javascript');
        res.end(req.url === '/original.js' ? original : fixed);
      } else {
        res.setHeader('Content-Type', 'text/html');
        res.end(harness(req.url === '/before' ? 'original' : 'fixed'));
      }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    for (const scenario of ['before', 'after']) {
      const page = await browser.newPage();
      try {
        await page.goto('http://127.0.0.1:' + server.address().port + '/' + scenario);
        await page.waitForFunction(() => window.heldRequest?.id === '1');
        await page.evaluate(() => window.reconnect());
        await page.waitForFunction(() => window.trace.some(m => m.type === 'codex-request' &&
          m.action === 'selection' && m.id === '1' && m.revision === 0 && m.connection === 'second'));
        if (scenario === 'before') {
          await page.waitForFunction(() => window.trace.some(m => m.type === 'codex-request' &&
            m.action === 'read' && m.revision === 0 && m.payload.episode === 47));
        }
        await page.waitForFunction(() => window.trace.some(m => m.type === 'codex-request' &&
          m.action === 'read' && m.revision === 1 && m.payload.episode === 1));
        await page.frameLocator('iframe').locator('#reader[data-status=ready]').waitFor();
        const results = await page.evaluate(() => ({
          queued: window.acceptedHeldResponse,
          staleDispatched: window.trace.some((m, index) => m.type === 'codex-response' &&
            m.revision === 0 && m.connection === 'second' &&
            index < window.trace.findIndex(entry => entry.type === 'codex-sync' && entry.revision === 1)),
          staleRead: window.trace.some(m => m.type === 'codex-request' && m.action === 'read' && m.payload.episode === 47)
        }));
        const baseline = scenario === 'before';
        assert.deepEqual(results, { queued: baseline, staleDispatched: baseline, staleRead: baseline });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser?.close();
    if (server.listening) server.close();
    await rm(dir, { recursive: true, force: true });
  }
});

function harness(portVariant) {
  return `<!doctype html><iframe></iframe><script type="module">
import { createCodexContentPort } from '/${portVariant}.js';
const frame = document.querySelector('iframe');
window.trace = [];
let token, listener, connection = 'first', revision = 0;
let connected = 0;
const dispatch = detail => listener({ detail: { version: 1, connection, ...detail } });
const element = {
  on: (_, handler) => { listener = handler; },
  setAttribute(name, json) {
    const envelope = JSON.parse(json);
    if (name === 'codex-bridge-arm') token = envelope.token;
    if (name === 'codex-host-message') {
      window.trace.push({ ...envelope.message, connection: envelope.connection });
      frame.contentWindow.postMessage(envelope.message, location.origin);
    }
  }
};
const port = createCodexContentPort(element);
const send = message => port.postMessage({ version: 1, session: 'held-reply-test', revision, ...message });
const initial = { campaign: 'main', slug: '', through: '1' };
port.onMessage(({ data }) => {
  if (data.type === 'codex-ready') {
    if (connected++ === 0) send({ type: 'codex-init', initial });
    else window.advanceRevision();
    return;
  }
  if (data.type !== 'codex-request') return;
  if (data.revision === 1 && data.action === 'read') {
    send({ type: 'codex-response', id: data.id, ok: true, value: {
      status: 'ready', selectedEpisode: 1, maximumEpisode: 47, entries: [], categories: [], article: null
    } });
    return;
  }
  if (data.action !== 'selection') return;
  if (connection === 'first') window.heldRequest = data;
  if (data.revision === 1) send({ type: 'codex-response', id: data.id, ok: true,
    value: { campaign: 'main', episode: 1 } });
});
window.reconnect = () => {
  connection = 'second';
  dispatch({ type: 'codex-bridge-ready', token });
  window.acceptedHeldResponse = send({ type: 'codex-response', id: window.heldRequest.id,
    ok: true, value: { campaign: 'main', episode: 47 } });
  frame.src = '/reader?second';
};
window.advanceRevision = () => {
  revision++;
  send({ type: 'codex-sync', phase: 'loading' });
  send({ type: 'codex-sync', phase: 'ready', initial });
};
window.addEventListener('message', ({ source, origin, data }) => {
  if (source !== frame.contentWindow || origin !== location.origin) return;
  if (data.type === 'codex-ready') {
    if (connection === 'first') dispatch({ type: 'codex-bridge-ready', token });
    dispatch({ type: 'codex-bridge-acknowledged', token });
  } else {
    window.trace.push({ ...data, connection });
    dispatch({ ...data, bridgeToken: token });
  }
});
frame.src = '/reader?first';
</script>`;
}
