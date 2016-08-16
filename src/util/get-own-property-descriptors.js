export default function (obj) {
  return Object.getOwnPropertyNames(obj || {}).reduce((prev, curr) => {
    if (curr !== 'arguments' && curr !== 'caller' && curr !== 'constructor' && curr !== 'length' && curr !== 'prototype') {
      prev[curr] = Object.getOwnPropertyDescriptor(obj, curr);
    }
    return prev;
  }, {});
}
