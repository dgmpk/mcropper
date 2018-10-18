// https://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  parser: 'babel-eslint',
  env: {
    browser: true,
  },
  extends: [
    // https://github.com/standard/standard/blob/master/docs/RULES-en.md
    'standard'
  ],
  // add your custom rules here
  rules: {
    // 要求箭头函数的参数使用圆括号
    'arrow-parens': 0,
    // 禁止末尾逗号
    'comma-dangle': 0,
    // allow async-await
    'generator-star-spacing': 0,
    // 强制在关键字前后使用一致的空格
    'keyword-spacing': 0,
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    // 禁止在使用new构造一个实例后不赋值
    'no-new': 0,
    // 语句强制分号结尾
    'semi': 0,
    // 强制在 function的左括号之前使用一致的空格
    'space-before-function-paren': 0,
    'prefer-promise-reject-errors': 1,
    'standard/no-callback-literal': 0
  }
}
