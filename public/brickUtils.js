export function getOrientedDimensions(width, length, orientation) {
  if (orientation?.toUpperCase() === 'HORIZONTAL') {
    return [width, length];  // width = X, length = Y
  } else if (orientation?.toUpperCase() === 'VERTICAL') {
    return [length, width];  // width = Y, length = X
  } else {
    throw new Error('Unknown orientation: ' + orientation);
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