// Same coverage as the npm-test workflow's prettier-check glob (the previous
// '{,src/**/,webpack/}' glob silently skipped generators/**, letting unformatted
// code reach CI). eslint --fix mirrors the lint gate; unfixable errors block the commit.
module.exports = {
  '{,**/}*.{md,json,yml,html,js,ts,tsx,css,scss,vue,java}': ['prettier --write'],
  '{,**/}*.{js,ts,tsx}': ['eslint --fix'],
};
