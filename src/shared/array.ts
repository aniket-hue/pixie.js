export function iterateReverse<T>(array: T[], callback: (item: T) => boolean): void {
  for (let i = array.length - 1; i >= 0; i--) {
    const shouldBreak = callback(array[i]);

    if (shouldBreak) {
      break;
    }
  }
}

export function iterateForward<T>(array: T[], callback: (item: T) => boolean): void {
  for (let i = 0; i < array.length; i++) {
    const shouldBreak = callback(array[i]);

    if (shouldBreak) {
      break;
    }
  }
}
