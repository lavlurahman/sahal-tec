function cleanFilename(value) {
  const cleaned = String(value || 'SAHAL_TEC_Document')
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 80);
  return cleaned || 'SAHAL_TEC_Document';
}
module.exports = { cleanFilename };
