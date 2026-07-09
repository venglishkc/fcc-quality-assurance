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
  const units = ['gal','l','lbs','kg','mi','km'];
  this.getNum = function (input) { const n=(input||'').match(/^[^a-zA-Z]*/)[0]; if(n==='')return 1; const p=n.split('/'); if(p.length>2)return 'invalid'; const nums=p.map(Number); if(nums.some(x=>isNaN(x)))return 'invalid'; if(p.length===2){if(nums[1]===0)return 'invalid'; return nums[0]/nums[1];} return nums[0]; };
  this.getUnit = function (input) { const m=(input||'').match(/[a-zA-Z]+$/); if(!m)return 'invalid'; const u=m[0].toLowerCase(); if(!units.includes(u))return 'invalid'; return u==='l'?'L':u; };
  this.getReturnUnit = function (u) { return {gal:'L',L:'gal',lbs:'kg',kg:'lbs',mi:'km',km:'mi'}[u]; };
  this.spellOutUnit = function (u) { return {gal:'gallons',L:'liters',lbs:'pounds',kg:'kilograms',mi:'miles',km:'kilometers'}[u]; };
  this.convert = function (n,u) { const G=3.78541,L=0.453592,M=1.60934; let r; switch(u){case 'gal':r=n*G;break;case 'L':r=n/G;break;case 'lbs':r=n*L;break;case 'kg':r=n/L;break;case 'mi':r=n*M;break;case 'km':r=n/M;break;} return Math.round(r*100000)/100000; };
  this.getString = function (n,u,rn,ru) { return n+' '+this.spellOutUnit(u)+' converts to '+rn+' '+this.spellOutUnit(ru); };
}
const convertHandler = new ConvertHandler();
app.get('/api/convert', function (req, res) {
  const input=req.query.input; const iN=convertHandler.getNum(input); const iU=convertHandler.getUnit(input);
  if(iN==='invalid'&&iU==='invalid')return res.send('invalid number and unit');
  if(iN==='invalid')return res.send('invalid number');
  if(iU==='invalid')return res.send('invalid unit');
  const rN=convertHandler.convert(iN,iU); const rU=convertHandler.getReturnUnit(iU);
  res.json({initNum:iN,initUnit:iU,returnNum:rN,returnUnit:rU,string:convertHandler.getString(iN,iU,rN,rU)});
});

// ---------- Sudoku Solver ----------
class SudokuSolver {
  validate(puzzleString) {
    if (!puzzleString) return { error: 'Required field missing' };
    if (puzzleString.length !== 81) return { error: 'Expected puzzle to be 81 characters long' };
    if (/[^1-9.]/.test(puzzleString)) return { error: 'Invalid characters in puzzle' };
    return { ok: true };
  }
  _grid(p) { const g = []; for (let i = 0; i < 9; i++) g.push(p.slice(i * 9, i * 9 + 9).split('')); return g; }
  checkRowPlacement(puzzleString, row, column, value) {
    const g = this._grid(puzzleString);
    for (let c = 0; c < 9; c++) { if (c !== column && g[row][c] === String(value)) return false; }
    return true;
  }
  checkColPlacement(puzzleString, row, column, value) {
    const g = this._grid(puzzleString);
    for (let r = 0; r < 9; r++) { if (r !== row && g[r][column] === String(value)) return false; }
    return true;
  }
  checkRegionPlacement(puzzleString, row, column, value) {
    const g = this._grid(puzzleString);
    const r0 = Math.floor(row / 3) * 3, c0 = Math.floor(column / 3) * 3;
    for (let r = r0; r < r0 + 3; r++) for (let c = c0; c < c0 + 3; c++) {
      if ((r !== row || c !== column) && g[r][c] === String(value)) return false;
    }
    return true;
  }
  solve(puzzleString) {
    const v = this.validate(puzzleString);
    if (!v.ok) return v;
    const board = puzzleString.split('');
    const valid = (idx, ch) => {
      const row = Math.floor(idx / 9), col = idx % 9;
      const p = board.join('');
      return this.checkRowPlacement(p, row, col, ch) && this.checkColPlacement(p, row, col, ch) && this.checkRegionPlacement(p, row, col, ch);
    };
    const backtrack = (pos) => {
      if (pos === 81) return true;
      if (board[pos] !== '.') return backtrack(pos + 1);
      for (let n = 1; n <= 9; n++) {
        const ch = String(n);
        if (valid(pos, ch)) { board[pos] = ch; if (backtrack(pos + 1)) return true; board[pos] = '.'; }
      }
      return false;
    };
    // quick sanity: existing conflicts => unsolvable
    for (let i = 0; i < 81; i++) { if (board[i] !== '.') { const ch = board[i]; board[i] = '.'; if (!valid(i, ch)) { board[i] = ch; return { error: 'Puzzle cannot be solved' }; } board[i] = ch; } }
    if (!backtrack(0)) return { error: 'Puzzle cannot be solved' };
    return { solution: board.join('') };
  }
}


const solver = new SudokuSolver();
app.post('/api/solve', function (req, res) {
  const puzzle = req.body.puzzle;
  const r = solver.solve(puzzle);
  if (r.error) return res.json({ error: r.error });
  res.json({ solution: r.solution });
});
app.post('/api/check', function (req, res) {
  const { puzzle, coordinate, value } = req.body;
  if (!puzzle || !coordinate || !value) return res.json({ error: 'Required field(s) missing' });
  const v = solver.validate(puzzle);
  if (v.error) return res.json({ error: v.error });
  if (!/^[A-Ia-i][1-9]$/.test(coordinate)) return res.json({ error: 'Invalid coordinate' });
  if (!/^[1-9]$/.test(String(value))) return res.json({ error: 'Invalid value' });
  const row = coordinate[0].toUpperCase().charCodeAt(0) - 65;
  const col = parseInt(coordinate[1]) - 1;
  const idx = row * 9 + col;
  if (puzzle[idx] === String(value)) return res.json({ valid: true });
  const conflict = [];
  if (!solver.checkRowPlacement(puzzle, row, col, value)) conflict.push('row');
  if (!solver.checkColPlacement(puzzle, row, col, value)) conflict.push('column');
  if (!solver.checkRegionPlacement(puzzle, row, col, value)) conflict.push('region');
  if (conflict.length === 0) return res.json({ valid: true });
  res.json({ valid: false, conflict });
});

// ---------- American-British Translator ----------
const americanToBritishSpelling = {
  favorite:'favourite', yogurt:'yoghurt', color:'colour', colors:'colours', flavor:'flavour', honor:'honour',
  neighbor:'neighbour', center:'centre', theater:'theatre', meter:'metre', liter:'litre', fiber:'fibre',
  organize:'organise', realize:'realise', analyze:'analyse', apologize:'apologise', gray:'grey',
  mold:'mould', defense:'defence', aluminum:'aluminium', jewelry:'jewellery', pajamas:'pyjamas', mustache:'moustache'
};
const britishToAmericanSpelling = {};
Object.keys(americanToBritishSpelling).forEach(k => { britishToAmericanSpelling[americanToBritishSpelling[k]] = k; });
britishToAmericanSpelling['caramelise'] = 'caramelize';
const americanToBritishTitles = { 'mr.':'mr', 'mrs.':'mrs', 'ms.':'ms', 'mx.':'mx', 'dr.':'dr', 'prof.':'prof' };
const americanOnly = {
  'rube goldberg machine':'heath robinson device', 'play hooky':'bunk off', 'freeway':'motorway',
  'trashcan':'bin', 'parking lot':'car park', 'condo':'flat', 'sidewalk':'pavement', 'elevator':'lift',
  'flashlight':'torch', 'french fries':'chips', 'diaper':'nappy'
};
const britishOnly = {
  'footie':'soccer', 'paracetamol':'tylenol', 'bank holiday':'public holiday', 'funfair':'carnival',
  'bicky':'biscuit', 'chippy':'fish-and-chip shop', 'bits and bobs':'odds and ends', 'bum bag':'fanny pack',
  'car boot sale':'swap meet', 'chip shop':'fish-and-chip shop', 'whinge':'whine', 'wonky':'unsteady', 'lorry':'truck'
};
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
class Translator {
  translate(text, locale) {
    let replacements = [];
    let dictWord, dictTitle;
    if (locale === 'american-to-british') {
      dictWord = Object.assign({}, americanToBritishSpelling, americanOnly);
      dictTitle = americanToBritishTitles;
    } else {
      dictWord = Object.assign({}, britishToAmericanSpelling, britishOnly);
      dictTitle = {}; Object.keys(americanToBritishTitles).forEach(k => { dictTitle[americanToBritishTitles[k]] = k; });
    }
    const entries = Object.entries(dictWord).sort((a,b)=> b[0].split(' ').length - a[0].split(' ').length || b[0].length - a[0].length);
    let result = text;
    const mark = (rep) => { replacements.push(rep); return 'HLSTART' + rep + 'HLEND'; };
    for (const [from,to] of entries) {
      const re = new RegExp('(?<![A-Za-z])' + esc(from) + '(?![A-Za-z])', 'gi');
      result = result.replace(re, (m)=> mark(/^[A-Z]/.test(m) ? to.charAt(0).toUpperCase()+to.slice(1) : to));
    }
    for (const [from,to] of Object.entries(dictTitle)) {
      const re = new RegExp('(?<![A-Za-z])' + esc(from) + '(?![A-Za-z])', 'gi');
      result = result.replace(re, (m)=> mark(to.charAt(0).toUpperCase()+to.slice(1)));
    }
    if (locale === 'american-to-british') result = result.replace(/(\d{1,2}):(\d{2})/g, (m,h,mm)=> mark(h+'.'+mm));
    else result = result.replace(/(\d{1,2})\.(\d{2})/g, (m,h,mm)=> mark(h+':'+mm));
    if (replacements.length === 0) return { text, translation: "Everything looks good to me!" };
    const highlighted = result.split('HLSTART').join('<span class="highlight">').split('HLEND').join('</span>');
    return { text, translation: highlighted };
  }
}


const translator = new Translator();
app.post('/api/translate', function (req, res) {
  const { text, locale } = req.body;
  if (text === undefined || locale === undefined) return res.json({ error: 'Required field(s) missing' });
  if (text === '') return res.json({ error: 'No text to translate' });
  if (locale !== 'american-to-british' && locale !== 'british-to-american') return res.json({ error: 'Invalid value for locale field' });
  const r = translator.translate(text, locale);
  res.json({ text: r.text, translation: r.translation });
});

// ---------- Issue Tracker ----------
(function mountIssues(app){
  const db = {}; // project -> [issues]
  let counter = 1;
  app.route('/api/issues/:project')
    .get((req, res) => {
      const project = req.params.project;
      let issues = (db[project] || []).slice();
      const q = req.query;
      Object.keys(q).forEach(k => { issues = issues.filter(i => String(i[k]) === String(q[k])); });
      res.json(issues);
    })
    .post((req, res) => {
      const project = req.params.project;
      const { issue_title, issue_text, created_by, assigned_to, status_text } = req.body;
      if (!issue_title || !issue_text || !created_by) return res.json({ error: 'required field(s) missing' });
      const now = new Date().toISOString();
      const issue = {
        _id: (counter++).toString(16).padStart(24, '0'),
        issue_title, issue_text, created_by,
        assigned_to: assigned_to || '', status_text: status_text || '',
        created_on: now, updated_on: now, open: true
      };
      if (!db[project]) db[project] = [];
      db[project].push(issue);
      res.json(issue);
    })
    .put((req, res) => {
      const project = req.params.project;
      const { _id, ...fields } = req.body;
      if (!_id) return res.json({ error: 'missing _id' });
      const updates = Object.keys(fields).filter(k => fields[k] !== '' && fields[k] !== undefined);
      if (updates.length === 0) return res.json({ error: 'no update field(s) sent', _id });
      const issue = (db[project] || []).find(i => i._id === _id);
      if (!issue) return res.json({ error: 'could not update', _id });
      updates.forEach(k => { issue[k] = k === 'open' ? (fields[k] === 'true' || fields[k] === true ? true : false) : fields[k]; });
      issue.updated_on = new Date().toISOString();
      res.json({ result: 'successfully updated', _id });
    })
    .delete((req, res) => {
      const project = req.params.project;
      const { _id } = req.body;
      if (!_id) return res.json({ error: 'missing _id' });
      const arr = db[project] || [];
      const idx = arr.findIndex(i => i._id === _id);
      if (idx === -1) return res.json({ error: 'could not delete', _id });
      arr.splice(idx, 1);
      res.json({ result: 'successfully deleted', _id });
    });
})(app);

// ---------- Personal Library ----------
(function mountBooks(app){
  let books = []; let counter = 1;
  app.route('/api/books')
    .get((req, res) => res.json(books.map(b => ({ _id: b._id, title: b.title, commentcount: b.comments.length }))))
    .post((req, res) => {
      const title = req.body.title;
      if (!title) return res.send('missing required field title');
      const book = { _id: (counter++).toString(16).padStart(24, '0'), title, comments: [] };
      books.push(book);
      res.json({ _id: book._id, title: book.title });
    })
    .delete((req, res) => { books = []; res.send('complete delete successful'); });
  app.route('/api/books/:id')
    .get((req, res) => {
      const book = books.find(b => b._id === req.params.id);
      if (!book) return res.send('no book exists');
      res.json({ _id: book._id, title: book.title, comments: book.comments });
    })
    .post((req, res) => {
      const comment = req.body.comment;
      const book = books.find(b => b._id === req.params.id);
      if (!comment) return res.send('missing required field comment');
      if (!book) return res.send('no book exists');
      book.comments.push(comment);
      res.json({ _id: book._id, title: book.title, comments: book.comments });
    })
    .delete((req, res) => {
      const idx = books.findIndex(b => b._id === req.params.id);
      if (idx === -1) return res.send('no book exists');
      books.splice(idx, 1);
      res.send('delete successful');
    });
})(app);
// ---------- FCC testing routes ----------
app.get('/_api/get-tests', function (req, res) {
  if (runner.report) return res.json(runner.report);
  runner.once('done', function (report) { res.json(report); });
});
app.get('/_api/app-info', function (req, res) { res.json({ headers: req.headers }); });

app.get('/', function (req, res) {
  res.type('html').send('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>QA Projects</title></head><body><h1>freeCodeCamp Quality Assurance</h1><ul><li><a href="/api/convert?input=10L">Metric-Imperial Converter</a></li><li>Sudoku Solver</li><li>American-British Translator</li><li>Issue Tracker</li><li>Personal Library</li></ul></body></html>');
});

app.use(function (req, res) { res.status(404).type('text').send('Not Found'); });

module.exports = app;
module.exports.ConvertHandler = ConvertHandler;
module.exports.SudokuSolver = SudokuSolver;
module.exports.Translator = Translator;

const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Listening on port ' + listener.address().port);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () { try { runner.run(); } catch (e) { console.error(e); } }, 2500);
  }
});
