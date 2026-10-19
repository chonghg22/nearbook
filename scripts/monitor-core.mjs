// One-shot GET monitor. No credentials, private routes, writes, refreshes or sends.
// Default probes use only in-process search and stored library metadata.
const legacy = process.argv.includes('--legacy')
const includeWeb = process.argv.includes('--web')
const expectedRevision = process.env.EXPECTED_API_REVISION
const origins = ['https://api.near-book.com', 'https://www.near-book.com/api']

async function read(url, json = true) {
  const started = Date.now()
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000), redirect: 'error',
    headers: { 'Cache-Control': 'no-cache' },
  })
  if (response.status !== 200) throw new Error(`HTTP ${response.status}: ${url}`)
  const result = json ? await response.json() : await response.text()
  console.log(JSON.stringify({ url, status: response.status, durationMs: Date.now() - started }))
  return result
}
function requireValue(condition, message) { if (!condition) throw new Error(message) }

try {
  let selectedIsbn
  let homepage
  for (const origin of origins) {
    if (legacy) {
      requireValue((await read(`${origin}/health`)).status === 'ok', 'liveness failed')
      requireValue((await read(`${origin}/operations/search`)).index?.ready === true, 'index not ready')
    } else {
      const ready = await read(`${origin}/ready`)
      requireValue(ready.status === 'ready' && ready.checks?.database === true &&
        ready.checks?.search === true && ready.schedulerEnabled === true, 'dependencies not ready')
      if (expectedRevision) requireValue(ready.revision === expectedRevision, 'wrong source revision')
    }
    const result = await read(`${origin}/search/suggest?q=9791161571195`)
    const book = result.data?.find((row) => /^\d{10,13}$/.test(row.isbn) && typeof row.title === 'string' && row.title)
    requireValue(book, 'stored search returned no book metadata')
    selectedIsbn ??= book.isbn
    const payload = await read(`${origin}/libraries/111314`)
    const library = payload.data ?? payload
    requireValue(String(library.id) === '111314' && typeof library.name === 'string', 'library metadata invalid')
    homepage = new URL(library.homepage)
    requireValue(['https:', 'http:'].includes(homepage.protocol) && !homepage.username && !homepage.password,
      'official library link invalid')
  }
  if (includeWeb) {
    // Normal SSR detail GETs can perform existing optional provider lookups.
    // Opt-in only; never a scheduled provider refresh or a library reservation.
    const bookPage = await read(`https://www.near-book.com/book/${selectedIsbn}`, false)
    requireValue(bookPage.includes('<h1') && bookPage.includes(selectedIsbn) &&
      !/name="robots"[^>]*content="[^"]*noindex/.test(bookPage), 'book HTML invalid')
    const libraryPage = await read('https://www.near-book.com/library/111314', false)
    requireValue(libraryPage.includes('<h1') && libraryPage.includes(homepage.hostname), 'library official link missing')
  }
  console.log(JSON.stringify({ status: 'ok', legacy, includeWeb, selectedIsbn, officialLinkHost: homepage.hostname }))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
