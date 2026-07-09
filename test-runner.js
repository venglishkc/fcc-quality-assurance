'use strict';
const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const emitter = new EventEmitter();
emitter.report = null;
emitter.run = function () {
  const mocha = new Mocha({ ui: 'tdd', timeout: 8000 });
  const testDir = path.join(__dirname, 'tests');
  fs.readdirSync(testDir).filter(f => f.endsWith('.js')).forEach(f => mocha.addFile(path.join(testDir, f)));
  const tests = [];
  const context = [];
  const runner = mocha.run();
  runner.on('suite', s => { if (s.title) context.push(s.title); });
  runner.on('suite end', s => { if (s.title) context.pop(); });
  runner.on('test end', test => {
    const body = (test.fn && test.fn.toString()) || '';
    tests.push({ title: test.title, context: context.slice().join(' -> '), state: test.state, assertions: body.match(/assert\.\w+/g) || [] });
  });
  runner.on('end', () => { emitter.report = tests; emitter.emit('done', tests); });
  return runner;
};
module.exports = emitter;
