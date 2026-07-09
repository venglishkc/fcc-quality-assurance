const chai = require('chai');
const chaiHttp = require('chai-http');
const assert = chai.assert;
const server = require('../server');
const ConvertHandler = server.ConvertHandler;
chai.use(chaiHttp);
let convertHandler = new ConvertHandler();

suite('Unit Tests', function () {
  test('read a whole number input', () => { assert.equal(convertHandler.getNum('32L'), 32); });
  test('read a decimal number input', () => { assert.equal(convertHandler.getNum('3.2L'), 3.2); });
  test('read a fractional input', () => { assert.equal(convertHandler.getNum('1/2L'), 0.5); });
  test('read a fractional input with a decimal', () => { assert.approximately(convertHandler.getNum('5.4/3L'), 1.8, 0.0001); });
  test('return an error on a double-fraction', () => { assert.equal(convertHandler.getNum('3/2/3L'), 'invalid'); });
  test('default to 1 when no numerical input', () => { assert.equal(convertHandler.getNum('kg'), 1); });
  test('read each valid input unit', () => { ['gal','L','mi','km','lbs','kg'].forEach(u => assert.equal(convertHandler.getUnit('1'+u), u)); assert.equal(convertHandler.getUnit('1GAL'),'gal'); });
  test('return an error for an invalid input unit', () => { assert.equal(convertHandler.getUnit('34kilograms'), 'invalid'); });
  test('return the correct return unit for each valid input unit', () => { assert.equal(convertHandler.getReturnUnit('gal'),'L'); assert.equal(convertHandler.getReturnUnit('L'),'gal'); assert.equal(convertHandler.getReturnUnit('mi'),'km'); assert.equal(convertHandler.getReturnUnit('km'),'mi'); assert.equal(convertHandler.getReturnUnit('lbs'),'kg'); assert.equal(convertHandler.getReturnUnit('kg'),'lbs'); });
  test('return the spelled-out string unit for each valid input unit', () => { assert.equal(convertHandler.spellOutUnit('gal'),'gallons'); assert.equal(convertHandler.spellOutUnit('L'),'liters'); assert.equal(convertHandler.spellOutUnit('mi'),'miles'); assert.equal(convertHandler.spellOutUnit('km'),'kilometers'); assert.equal(convertHandler.spellOutUnit('lbs'),'pounds'); assert.equal(convertHandler.spellOutUnit('kg'),'kilograms'); });
  test('convert gal to L', () => { assert.approximately(convertHandler.convert(1,'gal'), 3.78541, 0.0001); });
  test('convert L to gal', () => { assert.approximately(convertHandler.convert(1,'L'), 0.26417, 0.0001); });
  test('convert mi to km', () => { assert.approximately(convertHandler.convert(1,'mi'), 1.60934, 0.0001); });
  test('convert km to mi', () => { assert.approximately(convertHandler.convert(1,'km'), 0.62137, 0.0001); });
  test('convert lbs to kg', () => { assert.approximately(convertHandler.convert(1,'lbs'), 0.45359, 0.0001); });
  test('convert kg to lbs', () => { assert.approximately(convertHandler.convert(1,'kg'), 2.20462, 0.0001); });
});

suite('Functional Tests', function () {
  test('convert a valid input such as 10L', function (done) { chai.request(server).get('/api/convert').query({input:'10L'}).end((e,res)=>{ assert.equal(res.status,200); assert.equal(res.body.initNum,10); assert.equal(res.body.initUnit,'L'); assert.approximately(res.body.returnNum,2.64172,0.001); assert.equal(res.body.returnUnit,'gal'); done(); }); });
  test('convert an invalid input such as 32g', function (done) { chai.request(server).get('/api/convert').query({input:'32g'}).end((e,res)=>{ assert.equal(res.text,'invalid unit'); done(); }); });
  test('convert an invalid number such as 3/7.2/4kg', function (done) { chai.request(server).get('/api/convert').query({input:'3/7.2/4kg'}).end((e,res)=>{ assert.equal(res.text,'invalid number'); done(); }); });
  test('convert an invalid number AND unit such as 3/7.2/4kilomegagram', function (done) { chai.request(server).get('/api/convert').query({input:'3/7.2/4kilomegagram'}).end((e,res)=>{ assert.equal(res.text,'invalid number and unit'); done(); }); });
  test('convert with no number such as kg', function (done) { chai.request(server).get('/api/convert').query({input:'kg'}).end((e,res)=>{ assert.equal(res.body.initNum,1); assert.equal(res.body.initUnit,'kg'); done(); }); });
});
