import './shared-ab';

console.log('page-a');

import(/* webpackChunkName: "dyn-i" */ './dyn-i').then(() => {
  console.log('page-a, after dyn-i');
});
