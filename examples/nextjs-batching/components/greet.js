import React, { useEffect } from 'react';

export default function greet({ name }) {
  useEffect(() => {
    console.log('Said hello to', name);
    document.title = `Welcome to ${name}`;
  });
  return <h1>Hello, {name}</h1>;
}
