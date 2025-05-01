export function getOrientedDimensions(width, length, orientation) {
  const o = orientation?.toUpperCase();

  // 'HORIZONTAL' = width across X, length down Y (default)
  // 'VERTICAL' = rotate 90° → width becomes Y, length becomes X
  if (o === 'VERTICAL') {
    return [length, width];  // rotate
  } else if (o === 'HORIZONTAL') {
    return [width, length];  // default
  } else {
    throw new Error(`Unknown orientation: ${orientation}`);
  }
}

export function getOrientedSize(sizeOrArray, orientation) {
  let width, length;

  if (typeof sizeOrArray === 'string') {
    [width, length] = sizeOrArray.split('x').map(Number);
  } else if (Array.isArray(sizeOrArray)) {
    [width, length] = sizeOrArray;
  } else {
    throw new Error('Invalid size passed to getOrientedSize');
  }

  return getOrientedDimensions(width, length, orientation);
}