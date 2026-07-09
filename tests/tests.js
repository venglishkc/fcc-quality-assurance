const chai = require('chai');
const chaiHttp = require('chai-http');
const assert = chai.assert;
const server = require('../server');
chai.use(chaiHttp);
const ConvertHandler = server.ConvertHandler;
const SudokuSolver = server.SudokuSolver;
const Translator = server.Translator;

const validPuzzle = '1.5..2.84..63.12.7.2..5.....9..1....8.2.3674.3.7.2..9.47...8..1..16....926914.37.';
const solvedPuzzle = '135762984946381257728459613694517832812936745357824196473298561581673429269145378';

suite('Unit Tests', function () {
  // --- Metric-Imperial (16) ---
  const c = new ConvertHandler();
  test('MIC: whole number', () => assert.equal(c.getNum('32L'), 32));
  test('MIC: decimal', () => assert.equal(c.getNum('3.2L'), 3.2));
  test('MIC: fraction', () => assert.equal(c.getNum('1/2L'), 0.5));
  test('MIC: fraction w/ decimal', () => assert.approximately(c.getNum('5.4/3L'), 1.8, 0.0001));
  test('MIC: double-fraction error', () => assert.equal(c.getNum('3/2/3L'), 'invalid'));
  test('MIC: default 1', () => assert.equal(c.getNum('kg'), 1));
  test('MIC: each valid unit', () => { ['gal','L','mi','km','lbs','kg'].forEach(u => assert.equal(c.getUnit('1'+u), u)); assert.equal(c.getUnit('1GAL'),'gal'); });
  test('MIC: invalid unit', () => assert.equal(c.getUnit('34kilograms'), 'invalid'));
  test('MIC: return units', () => { assert.equal(c.getReturnUnit('gal'),'L'); assert.equal(c.getReturnUnit('L'),'gal'); assert.equal(c.getReturnUnit('mi'),'km'); assert.equal(c.getReturnUnit('km'),'mi'); assert.equal(c.getReturnUnit('lbs'),'kg'); assert.equal(c.getReturnUnit('kg'),'lbs'); });
  test('MIC: spelled units', () => { assert.equal(c.spellOutUnit('gal'),'gallons'); assert.equal(c.spellOutUnit('L'),'liters'); assert.equal(c.spellOutUnit('mi'),'miles'); assert.equal(c.spellOutUnit('km'),'kilometers'); assert.equal(c.spellOutUnit('lbs'),'pounds'); assert.equal(c.spellOutUnit('kg'),'kilograms'); });
  test('MIC: gal->L', () => assert.approximately(c.convert(1,'gal'), 3.78541, 0.0001));
  test('MIC: L->gal', () => assert.approximately(c.convert(1,'L'), 0.26417, 0.0001));
  test('MIC: mi->km', () => assert.approximately(c.convert(1,'mi'), 1.60934, 0.0001));
  test('MIC: km->mi', () => assert.approximately(c.convert(1,'km'), 0.62137, 0.0001));
  test('MIC: lbs->kg', () => assert.approximately(c.convert(1,'lbs'), 0.45359, 0.0001));
  test('MIC: kg->lbs', () => assert.approximately(c.convert(1,'kg'), 2.20462, 0.0001));

  // --- Sudoku (14) ---
  const s = new SudokuSolver();
  test('SUD: valid 81 chars', () => assert.equal(s.validate(validPuzzle).ok, true));
  test('SUD: invalid chars', () => assert.equal(s.validate(validPuzzle.replace('1','a')).error, 'Invalid characters in puzzle'));
  test('SUD: wrong length', () => assert.equal(s.validate('1.5').error, 'Expected puzzle to be 81 characters long'));
  test('SUD: row valid', () => assert.isTrue(s.checkRowPlacement(validPuzzle, 0, 1, 3)));
  test('SUD: row invalid', () => assert.isFalse(s.checkRowPlacement(validPuzzle, 0, 1, 1)));
  test('SUD: col valid', () => assert.isTrue(s.checkColPlacement(validPuzzle, 0, 1, 3)));
  test('SUD: col invalid', () => assert.isFalse(s.checkColPlacement(validPuzzle, 0, 1, 6)));
  test('SUD: region valid', () => assert.isTrue(s.checkRegionPlacement(validPuzzle, 0, 1, 3)));
  test('SUD: region invalid', () => assert.isFalse(s.checkRegionPlacement(validPuzzle, 0, 1, 5)));
  test('SUD: solver valid returns solution', () => assert.equal(s.solve(validPuzzle).solution, solvedPuzzle));
  test('SUD: solver invalid returns error', () => assert.equal(s.solve(validPuzzle.replace('1','a')).error, 'Invalid characters in puzzle'));
  test('SUD: solver incomplete length error', () => assert.equal(s.solve('1.5').error, 'Expected puzzle to be 81 characters long'));
  test('SUD: solver returns expected string', () => assert.equal(s.solve(validPuzzle).solution, solvedPuzzle));
  test('SUD: unsolvable', () => assert.equal(s.solve('9'.repeat(2)+validPuzzle.slice(2)).error, 'Puzzle cannot be solved'));

  // --- Translator (24) ---
  const t = new Translator();
  const inc = (text, loc, part) => assert.include(t.translate(text, loc).translation, part);
  test('TR: favorite', () => inc('Mangoes are my favorite fruit.', 'american-to-british', 'favourite'));
  test('TR: yogurt', () => inc('I ate yogurt for breakfast.', 'american-to-british', 'yoghurt'));
  test('TR: condo', () => inc("We had a party at my friend's condo.", 'american-to-british', 'flat'));
  test('TR: trashcan', () => inc('Can you toss this in the trashcan for me?', 'american-to-british', 'bin'));
  test('TR: parking lot', () => inc('The parking lot was full.', 'american-to-british', 'car park'));
  test('TR: Mr.', () => inc('No Mr. Bond, I expect you to die.', 'american-to-british', 'Mr'));
  test('TR: Dr.', () => inc('Dr. Grosh will see you now.', 'american-to-british', 'Dr'));
  test('TR: time colon->dot', () => inc('Lunch is at 12:15 today.', 'american-to-british', '12.15'));
  test('TR: gray', () => inc('The color gray is dull.', 'american-to-british', 'grey'));
  test('TR: center', () => inc('Go to the center of town.', 'american-to-british', 'centre'));
  test('TR: footie', () => inc('We watched the footie match.', 'british-to-american', 'soccer'));
  test('TR: paracetamol', () => inc('Paracetamol takes an hour.', 'british-to-american', 'Tylenol'));
  test('TR: caramelise', () => inc('First, caramelise the onions.', 'british-to-american', 'caramelize'));
  test('TR: Mrs', () => inc('Have you met Mrs Kalyani?', 'british-to-american', 'Mrs.'));
  test('TR: bank holiday', () => inc('I spent the bank holiday out.', 'british-to-american', 'public holiday'));
  test('TR: bits and bobs', () => inc('I got bits and bobs.', 'british-to-american', 'odds and ends'));
  test('TR: bum bag', () => inc('Stuff in my bum bag.', 'british-to-american', 'fanny pack'));
  test('TR: time dot->colon', () => inc('It is 4.00 now.', 'british-to-american', '4:00'));
  test('TR: highlight favourite', () => inc('Mangoes are my favorite fruit.', 'american-to-british', '<span class="highlight">favourite</span>'));
  test('TR: highlight yoghurt', () => inc('I ate yogurt.', 'american-to-british', '<span class="highlight">yoghurt</span>'));
  test('TR: highlight Mr', () => inc('No Mr. Bond.', 'american-to-british', '<span class="highlight">Mr</span>'));
  test('TR: highlight 12.15', () => inc('Lunch at 12:15.', 'american-to-british', '<span class="highlight">12.15</span>'));
  test('TR: highlight soccer', () => inc('The footie match.', 'british-to-american', '<span class="highlight">soccer</span>'));
  test('TR: no change message', () => assert.equal(t.translate('This is fine.', 'american-to-british').translation, 'Everything looks good to me!'));
});

suite('Functional Tests', function () {
  // --- Metric-Imperial (5) ---
  test('MIC: valid 10L', (done) => { chai.request(server).get('/api/convert').query({input:'10L'}).end((e,r)=>{ assert.equal(r.status,200); assert.equal(r.body.initNum,10); assert.equal(r.body.initUnit,'L'); assert.approximately(r.body.returnNum,2.64172,0.001); assert.equal(r.body.returnUnit,'gal'); done(); }); });
  test('MIC: invalid unit 32g', (done) => { chai.request(server).get('/api/convert').query({input:'32g'}).end((e,r)=>{ assert.equal(r.text,'invalid unit'); done(); }); });
  test('MIC: invalid number', (done) => { chai.request(server).get('/api/convert').query({input:'3/7.2/4kg'}).end((e,r)=>{ assert.equal(r.text,'invalid number'); done(); }); });
  test('MIC: invalid number and unit', (done) => { chai.request(server).get('/api/convert').query({input:'3/7.2/4kilomegagram'}).end((e,r)=>{ assert.equal(r.text,'invalid number and unit'); done(); }); });
  test('MIC: no number kg', (done) => { chai.request(server).get('/api/convert').query({input:'kg'}).end((e,r)=>{ assert.equal(r.body.initNum,1); assert.equal(r.body.initUnit,'kg'); done(); }); });

  // --- Sudoku (14) ---
  test('SUD: solve valid', (done) => { chai.request(server).post('/api/solve').send({puzzle:validPuzzle}).end((e,r)=>{ assert.equal(r.body.solution, solvedPuzzle); done(); }); });
  test('SUD: solve missing', (done) => { chai.request(server).post('/api/solve').send({}).end((e,r)=>{ assert.equal(r.body.error,'Required field missing'); done(); }); });
  test('SUD: solve invalid chars', (done) => { chai.request(server).post('/api/solve').send({puzzle:validPuzzle.replace('1','a')}).end((e,r)=>{ assert.equal(r.body.error,'Invalid characters in puzzle'); done(); }); });
  test('SUD: solve wrong length', (done) => { chai.request(server).post('/api/solve').send({puzzle:'1.5'}).end((e,r)=>{ assert.equal(r.body.error,'Expected puzzle to be 81 characters long'); done(); }); });
  test('SUD: solve unsolvable', (done) => { chai.request(server).post('/api/solve').send({puzzle:'9'.repeat(2)+validPuzzle.slice(2)}).end((e,r)=>{ assert.equal(r.body.error,'Puzzle cannot be solved'); done(); }); });
  test('SUD: check all valid', (done) => { chai.request(server).post('/api/check').send({puzzle:validPuzzle, coordinate:'A2', value:'3'}).end((e,r)=>{ assert.isTrue(r.body.valid); done(); }); });
  test('SUD: check single conflict', (done) => { chai.request(server).post('/api/check').send({puzzle:validPuzzle, coordinate:'A2', value:'8'}).end((e,r)=>{ assert.isFalse(r.body.valid); assert.equal(r.body.conflict.length,1); done(); }); });
  test('SUD: check multiple conflict', (done) => { chai.request(server).post('/api/check').send({puzzle:validPuzzle, coordinate:'A2', value:'6'}).end((e,r)=>{ assert.isFalse(r.body.valid); assert.isAbove(r.body.conflict.length,1); done(); }); });
  test('SUD: check all conflicts', (done) => { chai.request(server).post('/api/check').send({puzzle:validPuzzle, coordinate:'A2', value:'2'}).end((e,r)=>{ assert.isFalse(r.body.valid); assert.equal(r.body.conflict.length,3); done(); }); });
  test('SUD: check missing fields', (done) => { chai.request(server).post('/api/check').send({puzzle:validPuzzle}).end((e,r)=>{ assert.equal(r.body.error,'Required field(s) missing'); done(); }); });
  test('SUD: check invalid chars', (done) => { chai.request(server).post('/api/check').send({puzzle:validPuzzle.replace('1','a'), coordinate:'A2', value:'3'}).end((e,r)=>{ assert.equal(r.body.error,'Invalid characters in puzzle'); done(); }); });
  test('SUD: check wrong length', (done) => { chai.request(server).post('/api/check').send({puzzle:'1.5', coordinate:'A2', value:'3'}).end((e,r)=>{ assert.equal(r.body.error,'Expected puzzle to be 81 characters long'); done(); }); });
  test('SUD: check invalid coordinate', (done) => { chai.request(server).post('/api/check').send({puzzle:validPuzzle, coordinate:'Z9', value:'3'}).end((e,r)=>{ assert.equal(r.body.error,'Invalid coordinate'); done(); }); });
  test('SUD: check invalid value', (done) => { chai.request(server).post('/api/check').send({puzzle:validPuzzle, coordinate:'A2', value:'0'}).end((e,r)=>{ assert.equal(r.body.error,'Invalid value'); done(); }); });

  // --- Translator (6) ---
  test('TR: translate a-to-b', (done) => { chai.request(server).post('/api/translate').send({text:'Mangoes are my favorite fruit.', locale:'american-to-british'}).end((e,r)=>{ assert.include(r.body.translation,'favourite'); done(); }); });
  test('TR: translate b-to-a', (done) => { chai.request(server).post('/api/translate').send({text:'Paracetamol please.', locale:'british-to-american'}).end((e,r)=>{ assert.include(r.body.translation,'Tylenol'); done(); }); });
  test('TR: missing field', (done) => { chai.request(server).post('/api/translate').send({text:'hi'}).end((e,r)=>{ assert.equal(r.body.error,'Required field(s) missing'); done(); }); });
  test('TR: empty text', (done) => { chai.request(server).post('/api/translate').send({text:'', locale:'american-to-british'}).end((e,r)=>{ assert.equal(r.body.error,'No text to translate'); done(); }); });
  test('TR: invalid locale', (done) => { chai.request(server).post('/api/translate').send({text:'hi', locale:'klingon'}).end((e,r)=>{ assert.equal(r.body.error,'Invalid value for locale field'); done(); }); });
  test('TR: no change', (done) => { chai.request(server).post('/api/translate').send({text:'This is fine.', locale:'american-to-british'}).end((e,r)=>{ assert.equal(r.body.translation,'Everything looks good to me!'); done(); }); });

  // --- Issue Tracker (10) ---
  let itId;
  test('IT: create all fields', (done) => { chai.request(server).post('/api/issues/apitest').send({issue_title:'t',issue_text:'x',created_by:'me',assigned_to:'you',status_text:'s'}).end((e,r)=>{ assert.equal(r.body.issue_title,'t'); assert.property(r.body,'_id'); itId=r.body._id; done(); }); });
  test('IT: create required only', (done) => { chai.request(server).post('/api/issues/apitest').send({issue_title:'t2',issue_text:'x2',created_by:'me'}).end((e,r)=>{ assert.equal(r.body.assigned_to,''); assert.equal(r.body.open,true); done(); }); });
  test('IT: create missing required', (done) => { chai.request(server).post('/api/issues/apitest').send({issue_title:'t'}).end((e,r)=>{ assert.equal(r.body.error,'required field(s) missing'); done(); }); });
  test('IT: get all', (done) => { chai.request(server).get('/api/issues/apitest').end((e,r)=>{ assert.isArray(r.body); assert.isAbove(r.body.length,0); done(); }); });
  test('IT: get one filter', (done) => { chai.request(server).get('/api/issues/apitest').query({created_by:'me'}).end((e,r)=>{ assert.isArray(r.body); done(); }); });
  test('IT: get multiple filters', (done) => { chai.request(server).get('/api/issues/apitest').query({created_by:'me',open:'true'}).end((e,r)=>{ assert.isArray(r.body); done(); }); });
  test('IT: put one field', (done) => { chai.request(server).put('/api/issues/apitest').send({_id:itId, issue_text:'updated'}).end((e,r)=>{ assert.equal(r.body.result,'successfully updated'); done(); }); });
  test('IT: put missing _id', (done) => { chai.request(server).put('/api/issues/apitest').send({issue_text:'x'}).end((e,r)=>{ assert.equal(r.body.error,'missing _id'); done(); }); });
  test('IT: put no fields', (done) => { chai.request(server).put('/api/issues/apitest').send({_id:itId}).end((e,r)=>{ assert.equal(r.body.error,'no update field(s) sent'); done(); }); });
  test('IT: delete', (done) => { chai.request(server).delete('/api/issues/apitest').send({_id:itId}).end((e,r)=>{ assert.equal(r.body.result,'successfully deleted'); done(); }); });

  // --- Personal Library (8) ---
  let bookId;
  test('PL: post book', (done) => { chai.request(server).post('/api/books').send({title:'MyBook'}).end((e,r)=>{ assert.equal(r.body.title,'MyBook'); assert.property(r.body,'_id'); bookId=r.body._id; done(); }); });
  test('PL: post no title', (done) => { chai.request(server).post('/api/books').send({}).end((e,r)=>{ assert.equal(r.text,'missing required field title'); done(); }); });
  test('PL: get all', (done) => { chai.request(server).get('/api/books').end((e,r)=>{ assert.isArray(r.body); assert.property(r.body[0],'commentcount'); done(); }); });
  test('PL: get one', (done) => { chai.request(server).get('/api/books/'+bookId).end((e,r)=>{ assert.equal(r.body.title,'MyBook'); assert.isArray(r.body.comments); done(); }); });
  test('PL: get invalid id', (done) => { chai.request(server).get('/api/books/000000000000000000000000').end((e,r)=>{ assert.equal(r.text,'no book exists'); done(); }); });
  test('PL: post comment', (done) => { chai.request(server).post('/api/books/'+bookId).send({comment:'nice'}).end((e,r)=>{ assert.include(r.body.comments,'nice'); done(); }); });
  test('PL: post comment missing', (done) => { chai.request(server).post('/api/books/'+bookId).send({}).end((e,r)=>{ assert.equal(r.text,'missing required field comment'); done(); }); });
  test('PL: delete book', (done) => { chai.request(server).delete('/api/books/'+bookId).end((e,r)=>{ assert.equal(r.text,'delete successful'); done(); }); });
});
