export function getOrientedDimensions(width, length, orientation) {
  if (orientation?.toUpperCase() === 'VERTICAL') {
    return [length, width];
  }
  return [width, length];
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