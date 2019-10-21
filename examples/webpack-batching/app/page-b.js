import './shared-ab';

console.log('page-b');

import(/* webpackChunkName: "dyn-j" */ './dyn-j').then(() => {
  console.log('page-a, after dyn-j');
});
