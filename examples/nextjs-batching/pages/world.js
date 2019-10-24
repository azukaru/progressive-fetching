import React from 'react';
import Link from 'next/link';

import Greet from '../components/greet';

console.log('Code to render World was loaded');

function render(props) {
  return <>
    <Greet {...props} />
    <Link href="/robin">
      <a>To Robin</a>
    </Link>
  </>;
}
export default render;

render.getInitialProps = ({ query }) => {
  return { name: 'World', ...query };
};
