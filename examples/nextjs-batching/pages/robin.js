import React from 'react';
import Greet from '../components/greet';

function render(props) {
  return <Greet {...props} />;
}
export default render;

render.getInitialProps = ({ query }) => {
  return { name: 'Robin', ...query };
};
