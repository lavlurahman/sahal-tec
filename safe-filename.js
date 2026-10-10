
'use strict';

function cleanFilename(value) {
  let cleaned = String(value || 'SAHAL_TEC_Document')
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
    .replace(/[. ]+$/g, '')
    .slice(0, 80);

  if (!cleaned || /^\.+$/.test(cleaned)) {
    cleaned = 'SAHAL_TEC_Document';
  }

  // Windows reserved filenames
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(cleaned)) {
    cleaned = `_${cleaned}`;
  }

  return cleaned;
}

module.exports = { cleanFilename };
