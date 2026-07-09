'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const runner = require('./test-runner');
const app = express();

app.use(function (req, res, next) { req.url = req.url.replace(/\/{2,}/g, '/'); next(); });
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ---------- Metric-Imperial Converter ----------
function ConvertHandler() {
  const units = ['gal', 'l', 'lbs', 'kg', 'mi', 'km'];
  this.getNum = function (input) {
    const numStr = (input || '').match(/^[^a-zA-Z]*/)[0];
    if (numStr === '') return 1;
    const parts = numStr.split('/');
    if (parts.length > 2) return 'invalid';
    const nums = parts.map(Number);
    if (nums.some(n => isNaN(n))) return 'invalid';
    if (parts.length === 2) { if (nums[1] === 0) return 'invalid'; return nums[0] / nums[1]; }
    return nums[0];
  };
  this.getUnit = function (input) {
    const m = (input || '').match(/[a-zA-Z]+$/);
    if (!m) return 'invalid';
    const u = m[0].toLowerCase();
    if (!units.includes(u)) return 'invalid';
    return u === 'l' ? 'L' : u;
  };
  this.getReturnUnit = function (initUnit) {
    return { gal: 'L', L: 'gal', lbs: 'kg', kg: 'lbs', mi: 'km', km: 'mi' }[initUnit];
  };
  this.spellOutUnit = function (unit) {
    return { gal: 'gallons', L: 'liters', lbs: 'pounds', kg: 'kilograms', mi: 'miles', km: 'kilometers' }[unit];
  };
  this.convert = function (initNum, initUnit) {
    const galToL = 3.78541, lbsToKg = 0.453592, miToKm = 1.60934;
    let r;
    switch (initUnit) {
      case 'gal': r = initNum * galToL; break;
      case 'L': r = initNum / galToL; break;
      case 'lbs': r = initNum * lbsToKg; break;
      case 'kg': r = initNum / lbsToKg; break;
      case 'mi': r = initNum * miToKm; break;
      case 'km': r = initNum / miToKm; break;
    }
    return Math.round(r * 100000) / 100000;
  };
  this.getString = function (initNum, initUnit, returnNum, returnUnit) {
    return `${initNum} ${this.spellOutUnit(initUnit)} converts to ${returnNum} ${this.spellOutUnit(returnUnit)}`;
  };
}
const convertHandler = new ConvertHandler();
app.get('/api/convert', function (req, res) {
  const input = req.query.input;
  const initNum = convertHandler.getNum(input);
  const initUnit = convertHandler.getUnit(input);
  if (initNum === 'invalid' && initUnit === 'invalid') return res.send('invalid number and unit');
  if (initNum === 'invalid') return res.send('invalid number');
  if (initUnit === 'invalid') return res.send('invalid unit');
  const returnNum = convertHandler.convert(initNum, initUnit);
  const returnUnit = convertHandler.getReturnUnit(initUnit);
  res.json({ initNum, initUnit, returnNum, returnUnit, string: convertHandler.getString(initNum, initUnit, returnNum, returnUnit) });
});

// ---------- FCC testing routes ----------
app.get('/_api/get-tests', function (req, res) {
  if (runner.report) return res.json(runner.report);
  runner.once('done', function (report) { res.json(report); });
});
app.get('/_api/app-info', function (req, res) { res.json({ headers: req.headers }); });

// ---------- Home ----------
app.get('/', function (req, res) {
  res.type('html').send('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>QA Projects</title></head><body><h1>freeCodeCamp Quality Assurance</h1><h2>Metric-Imperial Converter</h2><form id="convertForm"><input id="convertField" name="input" value="10L"><button>Convert</button></form><p><a href="/api/convert?input=10L">/api/convert?input=10L</a></p></body></html>');
});

app.use(function (req, res) { res.status(404).type('text').send('Not Found'); });

module.exports = app;
module.exports.ConvertHandler = ConvertHandler;

const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Listening on port ' + listener.address().port);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () { try { runner.run(); } catch (e) { console.error(e); } }, 2000);
  }
});
