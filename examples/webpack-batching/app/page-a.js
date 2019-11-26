import './shared-ab';
import styles from './page-a.css';

console.log('page-a');

console.log(styles);

import(/* webpackChunkName: "dyn-i" */ './dyn-i').then(() => {
  console.log('page-a, after dyn-i');
});

if (module.hot) {
  module.hot.accept('./shared-ab', function() {
    console.log('Accepting the updated printMe module!');
    // printMe();
  })
}
