import {
  getD3JsonOutputMimeDescriptor,
  getMermaidOutputMimeDescriptor,
  getOutputMimeTypeForExtension
} from './index.js';

/**
 * Resolves the MIME type to use for a browser text download.
 *
 * @param {string} fileName - Intended download filename.
 * @param {{mimeType?: string, outputKind?: 'mermaid'|'d3Json'}} [options]
 * Optional explicit MIME or known visualization output kind.
 * @returns {string} MIME type with UTF-8 charset for text-like downloads.
 */
export function getDownloadMimeTypeForFilename(fileName, options = {}) {
  if (options.mimeType) return withUtf8Charset(options.mimeType);
  if (options.outputKind === 'mermaid') return withUtf8Charset(getMermaidOutputMimeDescriptor().mimeType);
  if (options.outputKind === 'd3Json') return withUtf8Charset(getD3JsonOutputMimeDescriptor().mimeType);

  const extension = String(fileName || '').split(/[?#]/, 1)[0].split('.').pop() || '';
  const result = getOutputMimeTypeForExtension(extension);
  return withUtf8Charset(result.ok ? result.value.mimeType : 'text/plain');
}

/**
 * Downloads text through browser Blob and object URL APIs.
 *
 * @param {string} fileName - Download filename.
 * @param {string} text - Text content.
 * @param {{mimeType?: string, outputKind?: 'mermaid'|'d3Json'}} [options]
 * MIME options.
 * @returns {void}
 */
export function downloadTextFile(fileName, text, options = {}) {
  const blob = new Blob([String(text ?? '')], {
    type: getDownloadMimeTypeForFilename(fileName, options)
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function withUtf8Charset(mimeType) {
  const value = String(mimeType || 'text/plain').trim();
  return /;\s*charset=/i.test(value) ? value : `${value};charset=utf-8`;
}
