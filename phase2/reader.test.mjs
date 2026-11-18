import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { readAnnotated, source } from './fixture.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const html = await readFile(new URL('../releases/citations-context-rc-20261117/reader.html', import.meta.url));
const host = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0}iframe{width:100%;display:block;border:0}</style><iframe title="Reader"></iframe>
<script>
const frame = document.querySelector('iframe'), session = 'test-session', saved = {main:1,parental:2};
let revision = 0;
const send = body => frame.contentWindow.postMessage({ version:1, session, ...body }, location.origin);
const initial = {campaign:'main',through:'1',slug:'${source}'};
history.replaceState(initial, '');
window.addEventListener('popstate', event => {
  revision++;
  send({ type:'codex-sync',revision,phase:'loading' });
  send({ type:'codex-sync',revision,phase:'ready',initial:event.state });
});
window.addEventListener('message', async ({data:m,origin,source}) => {
  if (origin !== location.origin || source !== frame.contentWindow) return;
  if (m.type === 'codex-ready') send({type:'codex-init',revision,initial});
  if (m.type === 'codex-content-height') frame.style.height = m.height + 'px';
  if (m.type === 'codex-route') {
    const {campaign,episode,slug} = m.state;
    const next = {campaign,through:String(episode),slug};
    if (JSON.stringify(next) !== JSON.stringify(history.state)) {
      history.pushState(next,'', '?campaign=' + campaign + '&through=' + episode + '&slug=' + slug);
      if (history.state.slug) window.scrollTo(0, 0);
    }
  }
  if (m.type !== 'codex-request') return;
  const p = m.payload;
  let value;
  switch (m.action) {
    case 'selection': value = {campaign:p.campaign,episode:Number(p.through || saved[p.campaign])}; break;
    case 'commit': saved[p.campaign] = p.episode; value = true; break;
    case 'present': value = {facts:[{label:'Role',text:'Travelers'}],media:null}; break;
    case 'read': value = await fetch('/dto', {method:'POST',body:JSON.stringify(p)}).then(r => r.json()); break;
  }
  send({type:'codex-response',revision:m.revision,id:m.id,ok:true,value});
});
frame.src = '/reader';
</script>`;

async function start() {
  const server = createServer(async (req, res) => {
    if (req.url === '/dto') {
      let body = '';
      for await (const chunk of req) body += chunk;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(await readAnnotated(JSON.parse(body))));
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(req.url === '/reader' ? html : host);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}

for (const viewport of [{ width: 1280, height: 800 }, { width: 320, height: 700 }]) {
  test('Chromium iframe and history at ' + viewport.width + ' px', async () => {
    const server = await start();
    let browser;
    try {
      browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
      const page = await browser.newPage({ viewport });
      page.setDefaultTimeout(8000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:' + server.address().port);
      const frame = page.frameLocator('iframe');
      const ready = async title => frame.locator('#reader[data-status=ready] .article-title')
        .filter({ hasText: title }).waitFor({ timeout: 7000 });
      const height = () => page.locator('iframe').evaluate(el => el.clientHeight);
      await ready('Fictional travelers');
      assert.equal(await frame.locator('.infobox dd').last().textContent(), 'Travelers');
      assert.equal(await frame.locator('.citation-markers button').count(), 2);
      const first = frame.getByRole('button', { name: 'Citation 1', exact: true });
      const details = frame.locator('#citation-detail-1');
      await first.click();
      await details.waitFor();
      assert.match(await details.textContent(), /Approximately 00:00:42.*Patreon ad-free/);
      assert.equal(await first.getAttribute('aria-expanded'), 'true');
      const markerY = await frame.locator('.citation-markers button').evaluateAll(nodes =>
        nodes.map(node => node.getBoundingClientRect().top));
      assert.equal(markerY[0], markerY[1]);
      assert.ok(await frame.locator('html').evaluate(el => el.scrollWidth <= el.clientWidth));
      await page.waitForFunction(() => {
        const frame = document.querySelector('iframe');
        const doc = frame.contentDocument;
        return doc.documentElement.scrollHeight <= frame.clientHeight &&
          Math.abs(doc.querySelector('#reader').getBoundingClientRect().height - frame.clientHeight) < 4;
      });
      const expanded = await height();
      await first.click();
      await details.waitFor({ state: 'hidden' });
      await page.waitForFunction(h => document.querySelector('iframe').clientHeight < h, expanded);

      await frame.locator('#episode').selectOption('47');
      await ready('Fictional travelers');
      assert.equal(await frame.locator('.citation-markers button').count(), 2);
      const tall = await height();
      const link = frame.locator('.inline-codex-link');
      assert.match(await link.getAttribute('href'), /campaign=main&through=47$/);
      await link.click();
      await ready('Painted Harbor');
      await page.waitForFunction(h => document.querySelector('iframe').clientHeight < h, tall);
      assert.equal(await frame.locator('#episode').inputValue(), '47');
      await page.goBack();
      await ready('Fictional travelers');
      assert.equal(await frame.locator('#episode').inputValue(), '47');
      await page.goForward();
      await ready('Painted Harbor');

      await frame.locator('#campaign').selectOption('parental');
      await ready('Article directory');
      assert.equal(await frame.locator('#episode').inputValue(), '2');
      await frame.getByRole('button', { name: 'Parental fixture' }).click();
      await ready('Parental fixture');
      assert.equal(await frame.locator('#campaign').inputValue(), 'parental');
      assert.equal(await frame.locator('.citation-markers button').count(), 0);
      await frame.locator('#campaign').selectOption('main');
      await ready('Article directory');
      assert.equal(await frame.locator('#episode').inputValue(), '47');
      if (viewport.width < 480) await frame.locator('.wiki-menu > summary').click();
      await frame.locator('summary').filter({ hasText: /^Categories$/ }).click();
      await frame.locator('.categories').getByRole('button', { name: 'People' }).click();
      await frame.locator('.directory .entry-title').filter({ hasText: 'Fictional travelers' }).waitFor();
      assert.equal(await frame.locator('.directory .entry-title').count(), 1);
      if (viewport.width < 480) await frame.locator('.wiki-menu > summary').click();
      await frame.locator('.all-link').click();
      await frame.locator('.directory .entry-title').filter({ hasText: 'LATE_TITLE' }).waitFor();
      await frame.locator('#search').fill('Painted');
      await frame.locator('.directory .entry-title').filter({ hasText: 'Painted Harbor' }).waitFor();
      assert.equal(await frame.locator('.directory .entry-title').count(), 1);
      await frame.locator('.directory .entry-title').click();
      await ready('Painted Harbor');
      assert.deepEqual(errors, []);
    } finally {
      await browser?.close();
      server.close();
    }
  });
}
