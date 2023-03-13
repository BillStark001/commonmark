import { decodeHTML } from 'entities';
import mdurl from 'mdurl';

const C_BACKSLASH = 92;

export const ENTITY = '&(?:#x[a-f0-9]{1,6}|#[0-9]{1,7}|[a-z][a-z0-9]{1,31});';

export const HTML_TAG_NAME = '[A-Za-z][A-Za-z0-9-]*';

const ATTRIBUTE_NAME = '[a-zA-Z_:][a-zA-Z0-9:._-]*';
const UNQUOTED_VALUE = '[^"\'=<>`\\x00-\\x20]+';
const SINGLE_QUOTED_VALUE = '\'[^\']*\'';
const DOUBLE_QUOTED_VALUE = '"[^"]*"';
const ATTRIBUTE_VALUE =
  '(?:' +
  UNQUOTED_VALUE +
  '|' +
  SINGLE_QUOTED_VALUE +
  '|' +
  DOUBLE_QUOTED_VALUE +
  ')';

const ATTRIBUTE_VALUE_SPEC = '(?:' + '\\s*=' + '\\s*' + ATTRIBUTE_VALUE + ')';
const ATTRIBUTE = '(?:' + '\\s+' + ATTRIBUTE_NAME + ATTRIBUTE_VALUE_SPEC + '?)';


export const HTML_OPEN_TAG = '<' + HTML_TAG_NAME + ATTRIBUTE + '*' + '\\s*/?>';
export const HTML_CLOSE_TAG = '</' + HTML_TAG_NAME + '\\s*[>]';
export const HTML_COMMENT = '<!-->|<!--->|<!--(?:[^-]+|-[^-]|--[^>])*-->';
export const HTML_PROCESSING_INSTRUCTION = '[<][?][\\s\\S]*?[?][>]';
export const HTML_DECLARATION = '<![A-Z]+' + '[^>]*>';
export const HTML_CDATA = '<!\\[CDATA\\[[\\s\\S]*?\\]\\]>';

export const HTML_TAG =
  '(?:' +
  HTML_OPEN_TAG +
  '|' +
  HTML_CLOSE_TAG +
  '|' +
  HTML_COMMENT +
  '|' +
  HTML_PROCESSING_INSTRUCTION +
  '|' +
  HTML_DECLARATION +
  '|' +
  HTML_CDATA +
  ')';


export const reHtmlOpenTag = new RegExp(HTML_OPEN_TAG);
export const reHtmlCloseTag = new RegExp(HTML_CLOSE_TAG);
export const reHtmlComment = new RegExp(HTML_COMMENT);

export const reHtmlTag = new RegExp('^' + HTML_TAG);

const reBackslashOrAmp = /[\\&]/;

export const ESCAPABLE = '[!"#$%&\'()*+,./:;<=>?@[\\\\\\]^_`{|}~-]';

const reEntityOrEscapedChar = new RegExp('\\\\' + ESCAPABLE + '|' + ENTITY, 'gi');

const XML_SPECIAL = '[&<>"]';

const reXmlSpecial = new RegExp(XML_SPECIAL, 'g');

const REGEX_SPECIAL_CHARS = '.+*?^$()[]{}|\\';
const REGEX_CHAR_ESCAPE = '\\';

export const escapeForRegExp = (chars: string) => {
  let chars2 = '';
  for (const char of chars)
    chars2 += REGEX_SPECIAL_CHARS.indexOf(char) >= 0 ? (REGEX_CHAR_ESCAPE + char) : char;
  return chars2;
};

export const unescapeChar = function (s: string) {
  if (s.charCodeAt(0) === C_BACKSLASH) {
    return s.charAt(1);
  } else {
    return decodeHTML(s);
  }
};

// Replace entities and backslash escapes with literal characters.
export const unescapeString = function (s: string) {
  if (reBackslashOrAmp.test(s)) {
    return s.replace(reEntityOrEscapedChar, unescapeChar);
  } else {
    return s;
  }
};

export const normalizeURI = function (uri: string) {
  try {
    return mdurl.encode(uri);
  } catch (err) {
    return uri;
  }
};

export const replaceUnsafeChar = function (s: string) {
  switch (s) {
  case '&':
    return '&amp;';
  case '<':
    return '&lt;';
  case '>':
    return '&gt;';
  case '"':
    return '&quot;';
  default:
    return s;
  }
};

export const escapeXml = function (s: string) {
  if (reXmlSpecial.test(s)) {
    return s.replace(reXmlSpecial, replaceUnsafeChar);
  } else {
    return s;
  }
};

