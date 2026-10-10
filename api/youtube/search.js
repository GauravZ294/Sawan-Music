// Compatibility response for visitors with an older frontend still open.
// Song discovery now runs through the owner's catalog import, not this endpoint.
export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    success: false,
    code: 'CATALOG_SEARCH_MOVED',
    error: 'The song catalog has been updated. Refresh this page and use the main search bar to find available songs.',
  });
}
