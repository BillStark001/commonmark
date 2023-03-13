#!/usr/bin/env node

import fs from 'fs';
import * as commonmark from '../dist/commonmark';

// Definitions

interface Example {
  number: number;
  section: string;
  markdown: string;
  html: string;
}

type CursorFunction = (s: string) => Cursor;
type CursorColor = () => Cursor;

interface Cursor {
  write: CursorFunction;
  red: CursorColor;
  cyan: CursorColor;
  green: CursorColor;
  reset: CursorColor;
}

interface Example {
  number: number;
  section: string;
  markdown: string;
  html: string;
}

interface Result {
  passed: number;
  failed: number;
}

interface TestCase {
  name: string;
  input: string; 
  expected: string;
}

type Converter = (inStr: string) => string;

// Utility functions

const repeat = function (pattern: string, count: number) {
  if (count < 1) {
    return '';
  }
  let result = '';
  while (count > 1) {
    if (count & 1) {
      result += pattern;
    }
    count >>= 1;
    pattern += pattern;
  }
  return result + pattern;
};


const escSeq = function (s: string): CursorColor {
  return function (this: Cursor) {
    process.stdout.write('\u001b' + s);
    return this;
  };
};


// Home made mini-version of the npm ansi module
const cursor: Cursor = {
  write: function (s: string) {
    process.stdout.write(s);
    return this;
  },
  green: escSeq('[0;32m'),
  red: escSeq('[0;31m'),
  cyan: escSeq('[0;36m'),
  reset: escSeq('[0m')
};

const writer = new commonmark.HtmlRenderer();
const reader = new commonmark.BlockParser();
const readerSmart = new commonmark.BlockParser({ smart: true });

const results: Result = {
  passed: 0,
  failed: 0
};


const showSpaces = function (s: string) {
  const t = s;
  return t.replace(/\t/g, '→').replace(/ /g, '␣');
};

// Test functions

const extractSpecTests = function (testfile: string) {
  const data = fs.readFileSync(testfile, 'utf8');
  const examples: Example[] = [];
  let current_section = '';
  let example_number = 0;
  const tests = data
    .replace(/\r\n?/g, '\n') // Normalize newlines for platform independence
    .replace(/^<!-- END TESTS -->(.|[\n])*/m, '');

  tests.replace(
    /^`{32} example\n([\s\S]*?)^\.\n([\s\S]*?)^`{32}$|^#{1,6} *(.*)$/gm,
    (_: string, markdownSubmatch: string, htmlSubmatch: string, sectionSubmatch: string) => {
      if (sectionSubmatch) {
        current_section = sectionSubmatch;
      } else {
        example_number++;
        examples.push({
          markdown: markdownSubmatch,
          html: htmlSubmatch,
          section: current_section,
          number: example_number
        });
      }
      return _;
    }
  );
  return examples;
};

const specTest = function (testcase: Example, res: Result, converter: Converter) {
  const markdown = testcase.markdown.replace(/→/g, '\t');
  const expected = testcase.html.replace(/→/g, '\t');
  const actual = converter(markdown);
  if (actual === expected) {
    res.passed++;
    cursor
      .green()
      .write('✓')
      .reset();
  } else {
    res.failed++;
    cursor.write('\n');

    cursor.red().write('✘ Example ' + testcase.number + '\n');
    cursor.cyan();
    cursor.write('=== markdown ===============\n');
    cursor.write(showSpaces(markdown));
    cursor.write('=== expected ===============\n');
    cursor.write(showSpaces(expected));
    cursor.write('=== got ====================\n');
    cursor.write(showSpaces(actual));
    cursor.reset();
  }
};

const specTests = function (examples: Example[], res: Result, converter: Converter) {

  let current_section = '';

  console.time('Elapsed time');
  for (let i = 0; i < examples.length; i++) {
    const testcase = examples[i];
    if (testcase.section !== current_section) {
      if (current_section !== '') {
        cursor.write('\n');
      }
      current_section = testcase.section;
      cursor
        .reset()
        .write(current_section)
        .reset()
        .write('  ');
    }
    specTest(testcase, results, converter);
  }
  cursor.write('\n');
  console.timeEnd('Elapsed time');
  cursor.write('\n');
};

const pathologicalTest = function (testcase: TestCase, res: Result, converter: Converter) {
  cursor.write(testcase.name + ' ');
  console.time('  elapsed time');
  const actual = converter(testcase.input);
  if (actual === testcase.expected) {
    cursor
      .green()
      .write('✓\n')
      .reset();
    res.passed += 1;
  } else {
    cursor.red().write('✘\n');
    cursor.cyan();
    cursor.write('=== markdown ===============\n');
    cursor.write(showSpaces(testcase.input));
    cursor.write('=== expected ===============\n');
    cursor.write(showSpaces(testcase.expected));
    cursor.write('=== got ====================\n');
    cursor.write(showSpaces(actual));
    cursor.write('\n');
    cursor.reset();
    res.failed += 1;
  }
  console.timeEnd('  elapsed time');
};

const parseAndRender = function (z: string) {
  const ast = reader.parse(z);
  return writer.render(ast);
};

const parseAndRenderSmart = function (z: string) {
  const ast = readerSmart.parse(z);
  return writer.render(ast);
};


// Constructing pathological test cases

const cases: TestCase[] = [
  {
    name: 'U+0000 in input',
    input: 'abc\u0000xyz\u0000\n',
    expected: '<p>abc\ufffdxyz\ufffd</p>\n'
  },
  {
    name: 'alternate line endings',
    input: '- a\n- b\r- c\r\n- d',
    expected:
      '<ul>\n<li>a</li>\n<li>b</li>\n<li>c</li>\n<li>d</li>\n</ul>\n'
  }
];

let x;
for (x = 1000; x <= 10000; x *= 10) {
  cases.push({
    name: 'nested strong emph ' + x + ' deep',
    input: repeat('*a **a ', x) + 'b' + repeat(' a** a*', x),
    expected:
      '<p>' +
      repeat('<em>a <strong>a ', x) +
      'b' +
      repeat(' a</strong> a</em>', x) +
      '</p>\n'
  });
}
for (x = 1000; x <= 10000; x *= 10) {
  cases.push({
    name: x + ' emph closers with no openers',
    input: repeat('a_ ', x),
    expected: '<p>' + repeat('a_ ', x - 1) + 'a_</p>\n'
  });
}
for (x = 1000; x <= 10000; x *= 10) {
  cases.push({
    name: x + ' emph openers with no closers',
    input: repeat('_a ', x),
    expected: '<p>' + repeat('_a ', x - 1) + '_a</p>\n'
  });
}
for (x = 1000; x <= 10000; x *= 10) {
  cases.push({
    name: x + ' openers and closers multiple of 3',
    input: 'a**b' + repeat('c* ', x),
    expected: '<p>a**b' + repeat('c* ', x - 1) + 'c*</p>\n'
  });
}
for (x = 1000; x <= 10000; x *= 10) {
  cases.push({
    name: x + ' #172',
    input: repeat('*_* _ ', x),
    expected: '<p>' + repeat('<em>_</em> _ ', x - 1) + '<em>_</em> _</p>\n'
  });
}
for (x = 1000; x <= 10000; x *= 10) {
  cases.push({
    name: x + ' link closers with no openers',
    input: repeat('a] ', x),
    expected: '<p>' + repeat('a] ', x - 1) + 'a]</p>\n'
  });
}
for (x = 1000; x <= 10000; x *= 10) {
  cases.push({
    name: x + ' link openers with no closers',
    input: repeat('[a ', x),
    expected: '<p>' + repeat('[a ', x - 1) + '[a</p>\n'
  });
}
for (x = 1000; x <= 10000; x *= 10) {
  cases.push({
    name: x + ' link openers and emph closers',
    input: repeat('[ a_ ', x),
    expected: '<p>' + repeat('[ a_ ', x - 1) + '[ a_</p>\n'
  });
}
for (x = 1000; x <= 10000; x *= 10) {
  cases.push({
    name: x + ' mismatched openers and closers',
    input: repeat('*a_ ', x),
    expected: '<p>' + repeat('*a_ ', x - 1) + '*a_</p>\n'
  });
}
for (x = 1000; x <= 10000; x *= 10) {
  cases.push({
    name: x + ' pattern [ (](',
    input: repeat('[ (](', x),
    expected: '<p>' + repeat('[ (](', x) + '</p>\n'
  });
}
for (x = 1000; x <= 10000; x *= 10) {
  cases.push({
    name: 'nested brackets ' + x + ' deep',
    input: repeat('[', x) + 'a' + repeat(']', x),
    expected: '<p>' + repeat('[', x) + 'a' + repeat(']', x) + '</p>\n'
  });
}
for (x = 1000; x <= 10000; x *= 10) {
  cases.push({
    name: 'nested block quote ' + x + ' deep',
    input: repeat('> ', x) + 'a\n',
    expected:
      repeat('<blockquote>\n', x) +
      '<p>a</p>\n' +
      repeat('</blockquote>\n', x)
  });
}
for (x = 1000; x <= 10000; x *= 10) {
  cases.push({
    name: '[\\\\... ' + x + ' deep',
    input: '[' + repeat('\\', x) + '\n',
    expected: '<p>' + '[' + repeat('\\', x / 2) + '</p>\n'
  });
}
for (x = 10; x <= 1000; x *= 10) {
  cases.push({
    name: x + ' backslashes in unclosed link title',
    input: '[test](\\url "' + repeat('\\', x) + '\n',
    expected: '<p>[test](\\url &quot;' + repeat('\\', x / 2) + '</p>\n'
  });
}

// Commented out til we have a fix... see #129
for (x = 10; x <= 1000; x *= 10) {
  cases.push(
    { name: '[]( ' + x + ' deep',
      input: repeat('[](', x) + '\n',
      expected: '<p>' + repeat('[](', x) + '</p>\n'
    });
}

const spec = extractSpecTests('test/spec.txt');
const punct = extractSpecTests('test/smart_punct.txt');
const regression = extractSpecTests('test/regression.txt');

console.time('Total elapsed time');

cursor.write('Spec tests [' + 'test/spec.txt' + ']:\n');
specTests(spec, results, parseAndRender);

cursor.write('Spec tests [' + 'test/smart_punct.txt' + ']:\n');
specTests(punct, results, parseAndRenderSmart);

cursor.write('Spec tests [' + 'test/regression.txt' + ']:\n');
specTests(regression, results, parseAndRender);

// Pathological cases
cursor.write('Pathological cases:\n');


for (let j = 0; j < cases.length; j++) {
  pathologicalTest(cases[j], results, parseAndRender);
}

// Result

cursor.write('\n');

cursor.write(
  results.passed.toString() +
  ' tests passed, ' +
  results.failed.toString() +
  ' failed.\n'
);

console.timeEnd('Total elapsed time');

process.exit(results.failed);
