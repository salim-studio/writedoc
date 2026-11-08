// XML whitespace at the edges of w:t is stripped unless that element itself
// requests preservation. Separate nonconforming-input controls establish that
// xml:space declarations on w:r/w:p are also ignored (not allowed by OOXML).
export function wordText(node) {
  const text = node.textContent;
  return node.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'space') === 'preserve'
    ? text : text.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');
}

export function parseXml(bytes) {
  let text;
  if (typeof bytes === 'string') {
    text = bytes;
  } else if (bytes) {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes.buffer ? bytes.buffer : bytes);
    const encoding = u8[0] === 255 && u8[1] === 254 ? 'utf-16le' : u8[0] === 254 && u8[1] === 255 ? 'utf-16be' : 'utf-8';
    text = new TextDecoder(encoding, { fatal: false }).decode(u8);
  } else {
    text = '';
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('Files with XML entity declarations are not supported.');
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('The DOCX contains invalid XML.');
  return doc;
}
