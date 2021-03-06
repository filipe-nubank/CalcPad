import * as assert from 'assert';
import { describe, it } from 'mocha';
import { parse } from '../main/parser';
import { DefaultForex, Forex } from '../main/forex';

describe('parser', () => {
  it('normalises numbers', () => {
    assert.equal(parse('0.3'), '0.3');
    assert.equal(parse('.3'), '0.3');
    assert.equal(parse('.3 + .3'), '0.3 + 0.3');
    assert.equal(parse(' .3'), ' 0.3');
    assert.equal(parse('(.3'), '(0.3');
    assert.equal(parse('1 +.3'), '1 +0.3');
  });

  it('parses assignments', () => {
    assert.equal(parse('a = 1'), 'var a;\na = 1;');
    assert.equal(parse('a  =   1'), 'var a;\na = 1;');
  });

  it('parses the pow operator', () => {
    assert.equal(parse('1 ^ 2'), '1 ** 2');
    assert.equal(parse('1  ^  2'), '1  **  2');
  });

  it('parses comments', () => {
    assert.equal(parse('# abc'), '// # abc');
  });

  describe('parses constants', () => {
    it('parses PI', () => {
      assert.equal(parse('PI'), '3.1415926536');
      assert.equal(parse(' PI'), ' 3.1415926536');
      assert.equal(parse('PI '), '3.1415926536 ');
      assert.equal(parse(' PI '), ' 3.1415926536 ');
      assert.equal(parse('PI / 2'), '3.1415926536 / 2');
      assert.equal(parse('2 + PI'), '2 + 3.1415926536');
      assert.equal(parse('a = PI / 2'), 'var a;\na = 3.1415926536 / 2;');
    });

    it('parses E', () => {
      assert.equal(parse('E'), '2.7182818285');
      assert.equal(parse(' E'), ' 2.7182818285');
      assert.equal(parse('E '), '2.7182818285 ');
      assert.equal(parse(' E '), ' 2.7182818285 ');
      assert.equal(parse('E / 2'), '2.7182818285 / 2');
      assert.equal(parse('2 + E'), '2 + 2.7182818285');
      assert.equal(parse('a = E / 2'), 'var a;\na = 2.7182818285 / 2;');
    });
  });

  describe('parses multipliers', () => {
    it('parses K', () => {
      assert.equal(parse('1k'), '1000');
      assert.equal(parse('1K'), '1000');
      assert.equal(parse('a = 1K'), 'var a;\na = 1000;');
      assert.equal(parse('1K / 2'), '1000 / 2');
    });

    it('parses M', () => {
      assert.equal(parse('1M'), '1000000');
      assert.equal(parse('a = 1M'), 'var a;\na = 1000000;');
      assert.equal(parse('1M / 2'), '1000000 / 2');
    });

    it('parses billion', () => {
      assert.equal(parse('1 billion'), '1000000000');
      assert.equal(parse('1 BILLION'), '1000000000');
      assert.equal(parse('a = 1 billion'), 'var a;\na = 1000000000;');
      assert.equal(parse('1 billion / 2'), '1000000000 / 2');
    });
  });

  describe('conversions', () => {
    it('parses non-forex conversions', () => {
      assert.equal(parse('1m to cm'), 'convert(1).from(\'m\').to(\'cm\')');
      assert.equal(parse('1m in cm'), 'convert(1).from(\'m\').to(\'cm\')');
      assert.equal(parse('1m  in  cm'), 'convert(1).from(\'m\').to(\'cm\')');
      assert.equal(parse('1K m  in  cm'),
        'convert(1000).from(\'m\').to(\'cm\')');
      assert.equal(parse('a = 1m  in  cm'),
        'var a;\na = convert(1).from(\'m\').to(\'cm\');');
      assert.equal(parse('0 C in F'), 'convert(0).from(\'C\').to(\'F\')');
    });

    it('parses forex conversions', () => {
      const forex: Forex = {
        ...DefaultForex,
        EUR: 1,
        BRL: 4.2253,
        USD: 1.137,
      };
      assert.equal(parse('1 BRL to USD', forex), '(1.137 * 1 / 4.2253)');
      assert.equal(parse('1 USD to BRL', forex), '(4.2253 * 1 / 1.137)');
      assert.equal(parse('1 USD to EUR', forex), '(1 * 1 / 1.137)');
      assert.equal(parse('1 EUR to USD', forex), '(1.137 * 1 / 1)');
      assert.equal(parse('1 EUR to EUR', forex), '(1 * 1 / 1)');
    });
  });

  it('parses percentages', () => {
    assert.equal(parse('10% of 14'), '14 * 10 / 100');
    assert.equal(parse('10% off 100'), '100 - 100 * 10 / 100');
    assert.equal(parse('10% on 100'), '100 * 10 / 100 + 100');
    assert.equal(parse('10%  of  100'), '100 * 10 / 100');
    assert.equal(parse('10% of 1K'), '1000 * 10 / 100');
    assert.equal(parse('a = 10% of 100'), 'var a;\na = 100 * 10 / 100;');

    assert.equal(parse('10% of (14 / 2)'), '(14 / 2) * 10 / 100');

    assert.equal(parse('(5% on 10) - 2'), '(10 * 5 / 100 + 10) - 2');
    assert.equal(parse('10% of 14 + 5% of 20'), '14 * 10 / 100 + 20 * 5 / 100');
    assert.equal(parse('(10% of 14) + (5% of 20)'),
      '(14 * 10 / 100) + (20 * 5 / 100)');

    assert.equal(parse('a% of 14'), '14 * a / 100');
    assert.equal(parse('10% of a'), 'a * 10 / 100');
  });

  describe('functions', () => {
    it('parses functions', () => {
      assert.equal(parse('sqrt(9)'), 'Math.sqrt(9)');
      assert.equal(parse('sqrt (9)'), 'Math.sqrt(9)');
      assert.equal(parse('sqrt ( 9 )'), 'Math.sqrt( 9 )');
      assert.equal(parse('pow(2, 3)'), 'Math.pow(2, 3)');
      assert.equal(parse('a = sqrt(9)'), 'var a;\na = Math.sqrt(9);');
      assert.equal(parse('sqrt(9) / 1k'), 'Math.sqrt(9) / 1000');
    });

    it('does not parse the `convert` function', () => {
      assert.equal(parse('convert(9)'), 'convert(9)');
      assert.equal(parse('sqrt(1.5) + convert(9)'),
        'Math.sqrt(1.5) + convert(9)');
    });
  });
});
