// QR Studio Pro features.
//
// Everything here runs on the device. Nothing is uploaded, and the licence
// that unlocks these features is checked offline with a public key.
(function (global) {
  'use strict';

  const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  /* ---------------- shared helpers ---------------- */

  function base32Encode(bytes) {
    let bits = 0;
    let value = 0;
    let output = '';
    for (const byte of bytes) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        output += BASE32[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
    return output;
  }

  function bytesFromBase64(text) {
    const binary = atob(String(text).replace(/-/g, '+').replace(/_/g, '/'));
    return new Uint8Array([...binary].map((character) => character.charCodeAt(0)));
  }

  /* ---------------- Google Authenticator migration ---------------- */

  // The migration payload is a small protocol buffer. Only the fields QR
  // Studio needs are read: the accounts and the settings on each one.
  function readVarint(bytes, offset) {
    let result = 0;
    let shift = 0;
    let index = offset;
    while (index < bytes.length) {
      const byte = bytes[index];
      index += 1;
      result += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
      if (shift > 63) break;
    }
    return [result, index];
  }

  function parseFields(bytes) {
    const fields = [];
    let offset = 0;
    while (offset < bytes.length) {
      let key;
      [key, offset] = readVarint(bytes, offset);
      const fieldNumber = Math.floor(key / 8);
      const wireType = key & 7;
      if (wireType === 0) {
        let value;
        [value, offset] = readVarint(bytes, offset);
        fields.push({ fieldNumber, wireType, value });
      } else if (wireType === 2) {
        let length;
        [length, offset] = readVarint(bytes, offset);
        fields.push({ fieldNumber, wireType, data: bytes.subarray(offset, offset + length) });
        offset += length;
      } else if (wireType === 5) {
        offset += 4;
      } else if (wireType === 1) {
        offset += 8;
      } else {
        break;
      }
    }
    return fields;
  }

  const ALGORITHMS = ['SHA1', 'SHA256', 'SHA512'];
  const DIGITS = [6, 8];

  // The shape an account is handed to the vault in.
  function accountShape({ type, secret, issuer, accountName, algorithm, digits, period, counter }) {
    return {
      type,
      secret,
      issuer: issuer || '',
      accountName: accountName || '',
      algorithm: algorithm || 'SHA1',
      digits: Number(digits) || 6,
      period: Number(period) || 30,
      counter: Number(counter) || 0
    };
  }

  // otpauth-migration://offline?data=<base64>
  //
  // The accounts are in field 1 and the version of the format in field 2. A
  // big export is split over several codes, and fields 3 to 5 say how many
  // there are and which one this is.
  function parseMigrationUri(uri) {
    const text = String(uri || '').trim();
    if (!/^otpauth-migration:\/\//i.test(text)) throw new Error('That is not a Google Authenticator migration code.');
    // The data is standard base64, which can contain "+" and "/". A query
    // string would turn "+" into a space, so the value is taken by hand.
    const query = text.slice(text.indexOf('?') + 1);
    let data = '';
    for (const part of query.split('&')) {
      if (!part.toLowerCase().startsWith('data=')) continue;
      data = decodeURIComponent(part.slice(5));
      break;
    }
    if (!data) throw new Error('The migration code carries no data.');
    const bytes = bytesFromBase64(data);
    const accounts = [];
    const failed = [];
    let version = 0;
    let batchSize = 0;
    let batchIndex = 0;
    let batchId = 0;
    for (const field of parseFields(bytes)) {
      if (field.fieldNumber === 1 && field.wireType === 2) {
        try {
          accounts.push(parseMigrationAccount(field.data));
        } catch (error) {
          failed.push({ reason: error.message });
        }
        continue;
      }
      if (field.wireType !== 0) continue;
      if (field.fieldNumber === 2) version = field.value;
      else if (field.fieldNumber === 3) batchSize = field.value;
      else if (field.fieldNumber === 4) batchIndex = field.value;
      else if (field.fieldNumber === 5) batchId = field.value;
    }
    if (!accounts.length && !failed.length) throw new Error('No authenticator accounts were found in that migration code.');
    const batch = batchSize > 1
      ? { size: batchSize, index: batchIndex, number: batchIndex + 1, total: batchSize, id: batchId }
      : null;
    accounts.forEach((account) => { account.batch = batch; });
    return { accounts, failed, format: 'google', version, batch };
  }

  function parseMigrationAccount(bytes) {
    const account = { type: 'totp', secret: '', issuer: '', accountName: '', algorithm: 'SHA1', digits: 6, period: 30, counter: 0 };
    for (const field of parseFields(bytes)) {
      if (field.fieldNumber === 1 && field.wireType === 2) account.secret = base32Encode(field.data);
      else if (field.fieldNumber === 2 && field.wireType === 2) account.issuer = new TextDecoder().decode(field.data);
      else if (field.fieldNumber === 3 && field.wireType === 2) account.accountName = new TextDecoder().decode(field.data);
      else if (field.fieldNumber === 4 && field.wireType === 0) {
        // An algorithm that is not one of the three would quietly produce the
        // wrong code, so the account is refused instead.
        const algorithm = ALGORITHMS[field.value - 1];
        if (!algorithm) throw new Error('This account uses an algorithm QR Studio does not support.');
        account.algorithm = algorithm;
      }
      else if (field.fieldNumber === 5 && field.wireType === 0) account.digits = DIGITS[field.value - 1] || 6;
      else if (field.fieldNumber === 6 && field.wireType === 0) account.type = field.value === 1 ? 'hotp' : 'totp';
      else if (field.fieldNumber === 7 && field.wireType === 0) account.counter = field.value;
    }
    // Some exports put the whole label in the name, as "Issuer:account".
    const splitAt = account.accountName.indexOf(':');
    if (splitAt >= 0) {
      account.issuer = account.issuer || account.accountName.slice(0, splitAt).trim();
      account.accountName = account.accountName.slice(splitAt + 1).trim();
    }
    account.accountName = account.accountName || account.issuer || 'Account';
    account.issuer = account.issuer || 'Authenticator';
    return account;
  }

  /* ---------------- other export formats ---------------- */

  // 2FAS keeps the secret beside the settings rather than inside the setup
  // link, so the account is built from the two.
  function parseTwoFas(text) {
    const data = JSON.parse(text);
    const services = Array.isArray(data) ? data : data?.services;
    if (!Array.isArray(services) || !services.length) {
      throw new Error('That 2FAS backup has no services in it. If it is protected by a password, export it without one and try again.');
    }
    const accounts = [];
    const failed = [];
    for (const service of services) {
      try {
        accounts.push(twoFasAccount(service));
      } catch (error) {
        failed.push({ reason: error.message });
      }
    }
    if (!accounts.length) throw new Error('No authenticator accounts were found in that 2FAS export.');
    return { accounts, failed, format: '2fas' };
  }

  function twoFasAccount(service) {
    const otp = service?.otp || {};
    const secret = String(service?.secret || '').trim();
    const link = otp.link || service?.link;
    // The link is only used when it carries a real secret. 2FAS sometimes
    // writes "secret=[hidden]" there and keeps the real one beside it, and
    // the value there may be written in its escaped form.
    let linkSecret = '';
    if (link && /^otpauth:\/\//i.test(link)) {
      const match = /[?&]secret=([^&]*)/i.exec(link);
      if (match) {
        try { linkSecret = decodeURIComponent(match[1]); } catch { linkSecret = match[1]; }
      }
    }
    if (linkSecret && !/hidden/i.test(linkSecret)) {
      const parsed = global.parseOtpAuth(link);
      return accountShape(parsed);
    }
    if (!secret) throw new Error('An entry in the 2FAS backup has no secret.');
    return accountShape({
      type: String(otp.tokenType || 'TOTP').toLowerCase() === 'hotp' ? 'hotp' : 'totp',
      secret,
      issuer: otp.issuer || '',
      accountName: otp.account || '',
      algorithm: String(otp.algorithm || 'SHA1').toUpperCase().replace(/[^A-Z0-9]/g, ''),
      digits: otp.digits,
      period: otp.period,
      counter: otp.counter
    });
  }

  // A plain list of setup URIs, one per line.
  function parseOtpAuthList(text) {
    const accounts = [];
    const failed = [];
    const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      if (!/^otpauth:\/\//i.test(line)) {
        failed.push({ reason: 'This is not a setup link.', source: line });
        continue;
      }
      try {
        accounts.push(accountShape(global.parseOtpAuth(line)));
      } catch (error) {
        failed.push({ reason: error.message, source: line });
      }
    }
    if (!accounts.length) throw new Error('No otpauth:// setup URIs were found in that text.');
    return { accounts, failed, format: 'list' };
  }

  // Works out which export format the file or text is, and reads it.
  function parseImport(text) {
    const trimmed = String(text || '').trim();
    if (/^otpauth-migration:\/\//i.test(trimmed)) return parseMigrationUri(trimmed);
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return parseTwoFas(trimmed);
      } catch (error) {
        // A file that is not a 2FAS backup may still hold setup links. If it
        // does not, the reason it was not a 2FAS backup is the useful one.
        const listed = parseOtpAuthList(trimmed);
        if (!listed.accounts.length) throw error;
        return listed;
      }
    }
    return parseOtpAuthList(trimmed);
  }

  /* ---------------- batch QR codes ---------------- */

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) {
      crc ^= bytes[index];
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // A small ZIP writer. Files are stored without compression, which keeps the
  // archive valid for every reader without needing a library.
  function createZip(files) {
    const encoder = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    for (const file of files) {
      const name = encoder.encode(file.name);
      const data = file.data;
      const checksum = crc32(data);

      const local = new Uint8Array(30 + name.length);
      const view = new DataView(local.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, 0x21, true);
      view.setUint32(14, checksum, true);
      view.setUint32(18, data.length, true);
      view.setUint32(22, data.length, true);
      view.setUint16(26, name.length, true);
      local.set(name, 30);
      parts.push(local, data);

      const entry = new Uint8Array(46 + name.length);
      const entryView = new DataView(entry.buffer);
      entryView.setUint32(0, 0x02014b50, true);
      entryView.setUint16(4, 20, true);
      entryView.setUint16(6, 20, true);
      entryView.setUint16(8, 0x0800, true);
      entryView.setUint16(10, 0, true);
      entryView.setUint16(12, 0, true);
      entryView.setUint16(14, 0x21, true);
      entryView.setUint32(16, checksum, true);
      entryView.setUint32(20, data.length, true);
      entryView.setUint32(24, data.length, true);
      entryView.setUint16(28, name.length, true);
      entryView.setUint32(42, offset, true);
      entry.set(name, 46);
      central.push(entry);

      offset += local.length + data.length;
    }

    let centralSize = 0;
    for (const entry of central) centralSize += entry.length;

    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);

    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }

  function safeFileName(text, index) {
    const cleaned = String(text || '').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48);
    return `${String(index + 1).padStart(3, '0')}-${cleaned || 'code'}.png`;
  }

  global.QRStudioPro = {
    base32Encode,
    parseMigrationUri,
    parseTwoFas,
    parseOtpAuthList,
    parseImport,
    createZip,
    safeFileName
  };
})(typeof window !== 'undefined' ? window : globalThis);
