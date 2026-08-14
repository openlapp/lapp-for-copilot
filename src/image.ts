import { IMAGE_MEDIA_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_COUNT, MAX_IMAGE_TOTAL_BYTES } from "./constants.js";

export type ImageMediaType = (typeof IMAGE_MEDIA_TYPES)[number];

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ValidatedImage {
  mediaType: ImageMediaType;
  data: Uint8Array;
  width: number;
  height: number;
}

export class ImageValidationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ImageValidationError";
  }
}

export function isImageMediaType(value: string): value is ImageMediaType {
  return (IMAGE_MEDIA_TYPES as readonly string[]).includes(value);
}

export function matchesImageSignature(mediaType: ImageMediaType, data: Uint8Array): boolean {
  if (mediaType === "image/png") {
    return data.length >= 8
      && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47
      && data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a;
  }
  if (mediaType === "image/jpeg") {
    return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (mediaType === "image/gif") {
    return data.length >= 6
      && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38
      && (data[4] === 0x37 || data[4] === 0x39) && data[5] === 0x61;
  }
  return data.length >= 12
    && data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46
    && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50;
}

function readU32be(data: Uint8Array, offset: number): number {
  return ((data[offset] ?? 0) << 24) | ((data[offset + 1] ?? 0) << 16) | ((data[offset + 2] ?? 0) << 8) | (data[offset + 3] ?? 0);
}

function readU16le(data: Uint8Array, offset: number): number {
  return (data[offset] ?? 0) | ((data[offset + 1] ?? 0) << 8);
}

function readU24le(data: Uint8Array, offset: number): number {
  return (data[offset] ?? 0) | ((data[offset + 1] ?? 0) << 8) | ((data[offset + 2] ?? 0) << 16);
}

export function readImageDimensions(mediaType: ImageMediaType, data: Uint8Array): ImageDimensions {
  if (mediaType === "image/png") {
    if (data.length < 24) throw new ImageValidationError("IMAGE_DIMENSIONS", "PNG header is truncated.");
    return { width: readU32be(data, 16), height: readU32be(data, 20) };
  }
  if (mediaType === "image/gif") {
    if (data.length < 10) throw new ImageValidationError("IMAGE_DIMENSIONS", "GIF header is truncated.");
    return { width: readU16le(data, 6), height: readU16le(data, 8) };
  }
  if (mediaType === "image/webp") {
    return readWebpDimensions(data);
  }
  return readJpegDimensions(data);
}

function readJpegDimensions(data: Uint8Array): ImageDimensions {
  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) throw new ImageValidationError("IMAGE_DIMENSIONS", "JPEG markers are invalid.");
    const marker = data[offset + 1] ?? 0;
    const length = ((data[offset + 2] ?? 0) << 8) | (data[offset + 3] ?? 0);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return {
        height: ((data[offset + 5] ?? 0) << 8) | (data[offset + 6] ?? 0),
        width: ((data[offset + 7] ?? 0) << 8) | (data[offset + 8] ?? 0),
      };
    }
    offset += 2 + length;
  }
  throw new ImageValidationError("IMAGE_DIMENSIONS", "JPEG dimensions were not found.");
}

function readWebpDimensions(data: Uint8Array): ImageDimensions {
  if (data.length < 16) throw new ImageValidationError("IMAGE_DIMENSIONS", "WebP header is truncated.");
  const chunk = String.fromCharCode(data[12] ?? 0, data[13] ?? 0, data[14] ?? 0, data[15] ?? 0);
  if (chunk === "VP8X" && data.length >= 30) {
    return {
      width: readU24le(data, 24) + 1,
      height: readU24le(data, 27) + 1,
    };
  }
  if (chunk === "VP8L" && data.length >= 25) {
    const bits = (data[21] ?? 0) | ((data[22] ?? 0) << 8) | ((data[23] ?? 0) << 16) | ((data[24] ?? 0) << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 " && data.length >= 30) {
    return {
      width: readU16le(data, 26) & 0x3fff,
      height: readU16le(data, 28) & 0x3fff,
    };
  }
  throw new ImageValidationError("IMAGE_DIMENSIONS", "WebP dimensions were not found.");
}

export function validateImagePart(
  mediaType: string,
  data: Uint8Array,
  signal?: AbortSignal,
): ValidatedImage {
  signal?.throwIfAborted();
  if (!isImageMediaType(mediaType)) {
    throw new ImageValidationError("IMAGE_TYPE", "Only PNG, JPEG, WebP, and GIF image bytes are accepted.");
  }
  if (!(data instanceof Uint8Array) || data.byteLength === 0) {
    throw new ImageValidationError("IMAGE_EMPTY", "Image parts must contain bytes.");
  }
  if (data.byteLength > MAX_IMAGE_BYTES) {
    throw new ImageValidationError("IMAGE_TOO_LARGE", "Each image must be 5 MiB or smaller.");
  }
  if (!matchesImageSignature(mediaType, data)) {
    throw new ImageValidationError("IMAGE_SIGNATURE", `Image bytes do not match ${mediaType}.`);
  }
  const size = readImageDimensions(mediaType, data);
  if (!Number.isSafeInteger(size.width) || !Number.isSafeInteger(size.height) || size.width < 1 || size.height < 1) {
    throw new ImageValidationError("IMAGE_DIMENSIONS", "Image dimensions are invalid.");
  }
  return { mediaType, data, width: size.width, height: size.height };
}

export function validateImageSet(images: readonly ValidatedImage[]): void {
  if (images.length > MAX_IMAGE_COUNT) {
    throw new ImageValidationError("IMAGE_COUNT", "At most 10 images are accepted in one request.");
  }
  const total = images.reduce((sum, image) => sum + image.data.byteLength, 0);
  if (total > MAX_IMAGE_TOTAL_BYTES) {
    throw new ImageValidationError("IMAGE_TOTAL", "Images in one request must total 20 MiB or less.");
  }
}
