const test = require('node:test');
const assert = require('node:assert/strict');
test('release metadata identifies the desktop application',()=>{const pkg=require('../package.json');assert.equal(pkg.main,'electron/main.cjs');assert.equal(pkg.build.productName,'Signal Room');assert.match(pkg.scripts.dist,/electron-builder/);});
