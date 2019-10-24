import React from 'react';
import Link from 'next/link';

import Greet from '../components/greet';

console.log('Code to render Robin was loaded');

function render(props) {
  return <>
    <Greet {...props} />
    <Link href="/world">
      <a>To World</a>
    </Link>
  </>;
}
export default render;

render.getInitialProps = ({ query }) => {
  return { name: 'Robin', ...query };
};
