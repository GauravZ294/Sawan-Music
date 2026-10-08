/**
 * In-browser binary metadata and embedded album thumbnail extractor for audio files (MP3, M4A, FLAC, WAV, OGG)
 */

export interface ExtractedAudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  lyrics?: string;
  thumbnailUrl?: string; // Object URL of the original embedded album art
}

/**
 * Extracts embedded album artwork thumbnail and ID3 metadata directly from an audio File
 */
export async function extractAudioFileMetadata(file: File): Promise<ExtractedAudioMetadata> {
  const result: ExtractedAudioMetadata = {};

  try {
    // Read the first 2MB which contains the ID3 / MP4 metadata and cover artwork
    const sliceSize = Math.min(file.size, 2 * 1024 * 1024);
    const buffer = await file.slice(0, sliceSize).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. Check for ID3v2 (MP3)
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      parseId3v2(bytes, result);
    }
    // 2. Check for MP4/M4A ('ftyp', 'moov')
    else if (
      (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) ||
      (bytes[4] === 0x6d && bytes[5] === 0x6f && bytes[6] === 0x6f && bytes[7] === 0x76)
    ) {
      parseMp4Cover(bytes, result);
    }

    // 3. If no thumbnail was extracted yet, perform intelligent signature scan in the metadata block
    if (!result.thumbnailUrl) {
      scanImageInMetadata(bytes, result);
    }
  } catch (err) {
    console.warn('Metadata extraction encountered an issue, will use fallback info:', err);
  }

  // 4. Fallback thumbnail if audio has no embedded artwork: generate a tailored vinyl-art canvas
  if (!result.thumbnailUrl) {
    result.thumbnailUrl = generateProceduralArtwork(
      result.title || file.name.replace(/\.[^/.]+$/, ''),
      result.artist || 'Local Music'
    );
  }

  return result;
}

/**
 * Parses ID3v2 tags (ID3v2.3 and ID3v2.4)
 */
function parseId3v2(bytes: Uint8Array, result: ExtractedAudioMetadata) {
  const majorVersion = bytes[3]; // e.g. 3 or 4
  const tagSize =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);

  let offset = 10;
  const maxOffset = Math.min(bytes.length, 10 + tagSize);

  while (offset + 10 < maxOffset) {
    // Frame ID
    const frameId = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3]
    );

    // Padding reached
    if (bytes[offset] === 0) break;

    // Frame size
    let frameSize = 0;
    if (majorVersion === 4) {
      // ID3v2.4 synchsafe
      frameSize =
        ((bytes[offset + 4] & 0x7f) << 21) |
        ((bytes[offset + 5] & 0x7f) << 14) |
        ((bytes[offset + 6] & 0x7f) << 7) |
        (bytes[offset + 7] & 0x7f);
    } else {
      // ID3v2.3 standard big-endian
      frameSize =
        (bytes[offset + 4] << 24) |
        (bytes[offset + 5] << 16) |
        (bytes[offset + 6] << 8) |
        bytes[offset + 7];
    }

    if (frameSize <= 0 || offset + 10 + frameSize > bytes.length) break;

    const frameData = bytes.subarray(offset + 10, offset + 10 + frameSize);

    // Parse Text Frames
    if (frameId === 'TIT2') {
      result.title = decodeTextFrame(frameData);
    } else if (frameId === 'TPE1') {
      result.artist = decodeTextFrame(frameData);
    } else if (frameId === 'TALB') {
      result.album = decodeTextFrame(frameData);
    } else if (frameId === 'TYER' || frameId === 'TDRC') {
      const yearStr = decodeTextFrame(frameData);
      const parsedYear = parseInt(yearStr.slice(0, 4), 10);
      if (!isNaN(parsedYear)) result.year = parsedYear;
    } else if (frameId === 'USLT') {
      // Unsychronized Lyrics
      result.lyrics = decodeLyricsFrame(frameData);
    }
    // Parse APIC (Attached Picture)
    else if (frameId === 'APIC') {
      extractApicImage(frameData, result);
    }

    offset += 10 + frameSize;
  }
}

/**
 * Extracts raw JPEG/PNG image from an APIC frame
 */
function extractApicImage(frameData: Uint8Array, result: ExtractedAudioMetadata) {
  try {
    const encoding = frameData[0];
    let offset = 1;

    // Read MIME type (null-terminated Latin-1 string)
    let mimeType = '';
    while (offset < frameData.length && frameData[offset] !== 0) {
      mimeType += String.fromCharCode(frameData[offset]);
      offset++;
    }
    offset++; // Skip null terminator

    if (!mimeType) mimeType = 'image/jpeg';
    if (mimeType.toLowerCase() === 'image/jpg') mimeType = 'image/jpeg';

    // Picture type (1 byte: 0x03 is front cover)
    const pictureType = frameData[offset];
    offset++;

    // Skip description (can be null-terminated in Latin-1 or double-null in UTF-16)
    if (encoding === 0 || encoding === 3) {
      while (offset < frameData.length && frameData[offset] !== 0) {
        offset++;
      }
      offset++;
    } else {
      while (offset + 1 < frameData.length) {
        if (frameData[offset] === 0 && frameData[offset + 1] === 0) {
          offset += 2;
          break;
        }
        offset += 2;
      }
    }

    // Now offset points to the actual image binary
    const imageData = frameData.subarray(offset);
    if (imageData.length > 32) {
      // Verify image header
      if (
        imageData[0] === 0xff &&
        imageData[1] === 0xd8 &&
        imageData[2] === 0xff
      ) {
        mimeType = 'image/jpeg';
      } else if (
        imageData[0] === 0x89 &&
        imageData[1] === 0x50 &&
        imageData[2] === 0x4e &&
        imageData[3] === 0x47
      ) {
        mimeType = 'image/png';
      }

      const blob = new Blob([imageData as any], { type: mimeType });
      result.thumbnailUrl = URL.createObjectURL(blob);
    }
  } catch (err) {
    console.warn('Could not parse APIC frame:', err);
  }
}

/**
 * Decodes ID3 text frames according to encoding byte
 */
function decodeTextFrame(data: Uint8Array): string {
  if (data.length <= 1) return '';
  const encoding = data[0];
  const textBytes = data.subarray(1);

  try {
    if (encoding === 0) {
      // ISO-8859-1
      return new TextDecoder('latin1').decode(textBytes).replace(/\0.*$/g, '').trim();
    } else if (encoding === 1) {
      // UTF-16 with BOM
      return new TextDecoder('utf-16').decode(textBytes).replace(/\0.*$/g, '').trim();
    } else if (encoding === 2) {
      // UTF-16BE without BOM
      return new TextDecoder('utf-16be').decode(textBytes).replace(/\0.*$/g, '').trim();
    } else if (encoding === 3) {
      // UTF-8
      return new TextDecoder('utf-8').decode(textBytes).replace(/\0.*$/g, '').trim();
    }
  } catch {
    return new TextDecoder().decode(textBytes).replace(/\0.*$/g, '').trim();
  }

  return '';
}

/**
 * Decodes USLT lyrics frame
 */
function decodeLyricsFrame(data: Uint8Array): string {
  try {
    if (data.length < 5) return '';
    const encoding = data[0];
    let offset = 4; // Skip encoding (1) + language (3)

    // Skip content descriptor
    if (encoding === 0 || encoding === 3) {
      while (offset < data.length && data[offset] !== 0) offset++;
      offset++;
    } else {
      while (offset + 1 < data.length) {
        if (data[offset] === 0 && data[offset + 1] === 0) {
          offset += 2;
          break;
        }
        offset += 2;
      }
    }

    const lyricsBytes = data.subarray(offset);
    if (encoding === 1) {
      return new TextDecoder('utf-16').decode(lyricsBytes).trim();
    }
    return new TextDecoder('utf-8').decode(lyricsBytes).trim();
  } catch {
    return '';
  }
}

/**
 * Parses MP4/M4A metadata for 'covr' artwork atom
 */
function parseMp4Cover(bytes: Uint8Array, result: ExtractedAudioMetadata) {
  try {
    // Search for 'covr' atom sequence
    for (let i = 0; i < bytes.length - 16; i++) {
      if (
        bytes[i] === 0x63 &&
        bytes[i + 1] === 0x6f &&
        bytes[i + 2] === 0x76 &&
        bytes[i + 3] === 0x72
      ) {
        // Found 'covr'
        // Next atom is usually 'data'
        const dataOffset = i + 8;
        if (
          bytes[dataOffset + 4] === 0x64 &&
          bytes[dataOffset + 5] === 0x61 &&
          bytes[dataOffset + 6] === 0x74 &&
          bytes[dataOffset + 7] === 0x61
        ) {
          const atomSize =
            (bytes[dataOffset] << 24) |
            (bytes[dataOffset + 1] << 16) |
            (bytes[dataOffset + 2] << 8) |
            bytes[dataOffset + 3];

          const typeFlag = bytes[dataOffset + 11]; // 13 = JPEG, 14 = PNG
          const mimeType = typeFlag === 14 ? 'image/png' : 'image/jpeg';
          const imgStart = dataOffset + 16;
          const imgLength = atomSize - 16;

          if (imgStart + imgLength <= bytes.length && imgLength > 32) {
            const imgBytes = bytes.subarray(imgStart, imgStart + imgLength);
            const blob = new Blob([imgBytes as any], { type: mimeType });
            result.thumbnailUrl = URL.createObjectURL(blob);
            return;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not parse MP4 covr atom:', err);
  }
}

/**
 * Scans for raw JPEG or PNG magic signatures within the metadata header
 */
function scanImageInMetadata(bytes: Uint8Array, result: ExtractedAudioMetadata) {
  try {
    // Search for JPEG magic number FF D8 FF E0 / E1 / DB
    for (let i = 0; i < bytes.length - 100; i++) {
      if (
        bytes[i] === 0xff &&
        bytes[i + 1] === 0xd8 &&
        bytes[i + 2] === 0xff &&
        (bytes[i + 3] === 0xe0 ||
          bytes[i + 3] === 0xe1 ||
          bytes[i + 3] === 0xdb ||
          bytes[i + 3] === 0xee)
      ) {
        // Found JPEG start! Find JPEG EOI (FF D9)
        let endIdx = -1;
        for (let j = i + 10; j < bytes.length - 1; j++) {
          if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
            endIdx = j + 2;
            break;
          }
        }

        if (endIdx > i && endIdx - i > 1024) {
          const imgBytes = bytes.subarray(i, endIdx);
          const blob = new Blob([imgBytes as any], { type: 'image/jpeg' });
          result.thumbnailUrl = URL.createObjectURL(blob);
          return;
        }
      }

      // Search for PNG magic number: 89 50 4E 47 0D 0A 1A 0A
      if (
        bytes[i] === 0x89 &&
        bytes[i + 1] === 0x50 &&
        bytes[i + 2] === 0x4e &&
        bytes[i + 3] === 0x47 &&
        bytes[i + 4] === 0x0d &&
        bytes[i + 5] === 0x0a &&
        bytes[i + 6] === 0x1a &&
        bytes[i + 7] === 0x0a
      ) {
        // Find IEND chunk (49 45 4E 44 AE 42 60 82)
        let endIdx = -1;
        for (let j = i + 16; j < bytes.length - 8; j++) {
          if (
            bytes[j] === 0x49 &&
            bytes[j + 1] === 0x45 &&
            bytes[j + 2] === 0x4e &&
            bytes[j + 3] === 0x44
          ) {
            endIdx = j + 8;
            break;
          }
        }

        if (endIdx > i && endIdx - i > 512) {
          const imgBytes = bytes.subarray(i, endIdx);
          const blob = new Blob([imgBytes as any], { type: 'image/png' });
          result.thumbnailUrl = URL.createObjectURL(blob);
          return;
        }
      }
    }
  } catch (err) {
    console.warn('Signature scanner failed:', err);
  }
}

/**
 * Creates high-fidelity procedural vinyl album artwork if the audio has no embedded picture
 */
export function generateProceduralArtwork(title: string, artist: string): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Generate color palette derived from title hash
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = (hash << 5) - hash + title.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    const hue2 = (hue + 45) % 360;

    // Dark lush gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 600, 600);
    bgGrad.addColorStop(0, `hsl(${hue}, 70%, 15%)`);
    bgGrad.addColorStop(0.5, `hsl(${hue2}, 60%, 10%)`);
    bgGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 600);

    // Vinyl grooves
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    for (let r = 80; r < 280; r += 20) {
      ctx.beginPath();
      ctx.arc(300, 300, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Inner glowing ring
    const ringGrad = ctx.createRadialGradient(300, 300, 50, 300, 300, 160);
    ringGrad.addColorStop(0, `hsla(${hue}, 90%, 60%, 0.4)`);
    ringGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(300, 300, 160, 0, Math.PI * 2);
    ctx.fill();

    // Center disc circle
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(300, 300, 75, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Musical note icon
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♫', 300, 290);

    // Title & Artist on label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(title.slice(0, 26), 300, 480);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '500 18px sans-serif';
    ctx.fillText(artist.slice(0, 30), 300, 515);

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';
  }
}
