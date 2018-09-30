const buble = require('rollup-plugin-buble')
const createBanner = require('create-banner');
const pkg = require('./package');

const name = 'MCropper';

const banner = createBanner({
  data: {
    name: `${name}.js`,
    year: '2018-present',
  },
});

module.exports = {
  input: './index.js',
  plugins: [
    buble(),
  ],
  output: [
    {
      name,
      banner,
      file: `dist/mcropper.js`,
      format: 'umd',
    },
    {
      banner,
      file: `dist/mcropper.common.js`,
      format: 'cjs',
    },
    {
      banner,
      file: `dist/mcropper.esm.js`,
      format: 'esm',
    },
  ],
};
