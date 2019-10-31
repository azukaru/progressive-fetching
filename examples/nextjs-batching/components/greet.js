import React, { useEffect } from 'react';

/**
 * @param {string} name
 */
function ucFirst(name) {
  return name[0].toUpperCase() + name.slice(1);
}

export default function greet({ name }) {
  useEffect(() => {
    console.log('Said hello to', name);
    document.title = `Welcome (${name})`;
  });
  return <h1>Hello, {ucFirst(name)}</h1>;
}
