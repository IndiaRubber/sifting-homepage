// Only author the JSON and template; commit the generated HTML for static hosts.
import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const entries = JSON.parse(await read('content/minerva-codex.json'));
const ids = new Set();
for (const entry of entries) {
  if (!/^[a-z][a-z0-9-]*$/.test(entry.id) || ids.has(entry.id) || !entry.term || !entry.definition) throw new Error('Invalid or duplicate Codex entry: ' + entry.id);
  ids.add(entry.id);
}
// Sort by displayed spelling, including "The"; ignore punctuation and case.
entries.sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base', ignorePunctuation: true }));
const groups = new Map();
for (const entry of entries) {
  const letter = entry.term[0].toUpperCase();
  if (!groups.has(letter)) groups.set(letter, []);
  groups.get(letter).push(entry);
}
const index = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(letter => groups.has(letter)
  ? `<a href="#letter-${letter.toLowerCase()}" aria-label="Terms beginning with ${letter}">${letter}</a>`
  : `<span aria-hidden="true">${letter}</span>`).join('\n        ');
const records = [...groups].map(([letter, list]) => `    <section class="codex-group" aria-labelledby="letter-${letter.toLowerCase()}">
      <h2 id="letter-${letter.toLowerCase()}" tabindex="-1">${letter}</h2>
      <div>${list.map(entry => `
        <details class="codex-entry" id="${entry.id}">
          <summary>${escape(entry.term)}<span class="codex-entry__mark" aria-hidden="true"></span></summary>
          <div class="codex-entry__body">
            ${Array.isArray(entry.definition) ? '<ol>' + entry.definition.map(line => `<li>${escape(line)}</li>`).join('') + '</ol>' : `<p>${escape(entry.definition)}</p>`}
            ${entry.note ? `<p class="codex-entry__note">${escape(entry.note)}</p>` : ''}
            <a class="codex-entry__link" href="#${entry.id}" aria-label="Link to ${escape(entry.term)}">Link to entry <span aria-hidden="true">↗</span></a>
          </div>
        </details>`).join('')}
      </div>
    </section>`).join('\n');
const template = await read('observer/codex/template.html');
const html = template.replace('<!-- CODEX_INDEX -->', index).replace('<!-- CODEX_ENTRIES -->', records).replaceAll('{{COUNT}}', entries.length);
const destination = 'observer/codex/index.html';
if (process.argv.includes('--check')) {
  if (await read(destination) !== html) throw new Error('Codex HTML is stale. Run node scripts/build-codex.mjs');
  console.log(`Codex verified: ${entries.length} entries.`);
} else {
  await writeFile(new URL(destination, root), html);
  console.log(`Codex generated: ${entries.length} entries.`);
}
