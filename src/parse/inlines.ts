import Node, { GeneralNodeType, NodeType, NodeTypeDefinition } from '../node';
import * as common from '../common';
import fromCodePoint from '../from-code-point';
import { decodeHTML } from 'entities';
import 'string.prototype.repeat'; // Polyfill for String.prototype.repeat
import { escapeForRegExp } from '../common';

const normalizeURI = common.normalizeURI;
const unescapeString = common.unescapeString;

// Constants for character codes:

const C_NEWLINE = 10;
const C_ASTERISK = 42;
const C_UNDERSCORE = 95;
const C_BACKTICK = 96;
const C_OPEN_BRACKET = 91;
const C_CLOSE_BRACKET = 93;
const C_LESSTHAN = 60;
const C_BANG = 33;
const C_BACKSLASH = 92;
const C_AMPERSAND = 38;
const C_OPEN_PAREN = 40;
const C_CLOSE_PAREN = 41;
const C_COLON = 58;
const C_SINGLEQUOTE = 39;
const C_DOUBLEQUOTE = 34;

// Some regexps used in inline parser:

const ESCAPABLE = common.ESCAPABLE;
const ESCAPED_CHAR = '\\\\' + ESCAPABLE;

const ENTITY = common.ENTITY;
const reHtmlTag = common.reHtmlTag;


// Regex definitions

const reLinkTitle = new RegExp(
  '^(?:"(' +
  ESCAPED_CHAR +
  '|\\\\[^\\\\]' +
  '|[^\\\\"\\x00])*"' +
  '|' +
  '\'(' +
  ESCAPED_CHAR +
  '|\\\\[^\\\\]' +
  '|[^\\\\\'\\x00])*\'' +
  '|' +
  '\\((' +
  ESCAPED_CHAR +
  '|\\\\[^\\\\]' +
  '|[^\\\\()\\x00])*\\))'
);

const reLinkDestinationBraces = /^(?:<(?:[^<>\n\\\x00]|\\.)*>)/;

const reEscapable = new RegExp('^' + ESCAPABLE);

const reEntityHere = new RegExp('^' + ENTITY, 'i');

const reTicks = /`+/;

const reTicksHere = /^`+/;

const reEllipses = /\.\.\./g;

const reDash = /--+/g;

const reEmailAutolink = /^<([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)>/;

const reAutolink = /^<[A-Za-z][A-Za-z0-9.+-]{1,31}:[^<>\x00-\x20]*>/i;

const reSpnl = /^ *(?:\n *)?/;

const reWhitespaceChar = /^[ \t\n\x0b\x0c\x0d]/;

const reFinalSpace = / *$/;

const reInitialSpace = /^ */;

const reSpaceAtEndOfLine = /^ *(?:\n|$)/;

const reLinkLabel = /^\[(?:[^\\\[\]]|\\.){0,1000}\]/s;

// Used in run delimiters
const reUnicodeWhitespaceChar = /^\s/;
const rePunctuation = new RegExp(
  /^[!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u0AF0\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E42\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC9\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDF3C-\uDF3E]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]/
);

/**
 * Matches a string of non-special characters.
 */
const reMain = /^[^\n`\[\]\\!<&*_'"]+/m;


/**
 * 
 * @param chars Characters to be excluded in regex square brackets escape form.
 * @param raw `true` if `chars` is not processed to escape form (e.g. `.|$`), `false` if 
 * otherwise (e.g. `\\.\\|\\$`). Default to `false`.
 * @returns 
 */
export const compileNonSpecialCharRegExp = (chars: string, raw?: boolean) => {
  if (raw) {
    chars = escapeForRegExp(chars);
  }
  return new RegExp(`^[^\\n\`\\[\\]\\\\!<&*_\'"${chars}]+`);
};

// Definitions

/**
 * 
 * Try to match something at the current position in the subject. 
 * Called in the corresponding character is triggered.
 * 
 * If the matching is succeeded, further processions, like
 * appending a new node calling `block.appendChild(...)` is handled 
 * inside the function.
 * @return A boolean value indicating if it succeed in matching anything.
 * 
 * If `true` is returned, The inline parser will do nothing; If `false` is 
 * returned, it will consider the current character as a `text` node.
 */
export type InlineHandler<T extends NodeType> = (parser: InlineParser<T>, block: Node<T>) => boolean;


export interface InlineParsingOptions<T extends NodeType> {
  type?: NodeTypeDefinition<T>;

  smart?: boolean;

  reNonSpecialChars?: RegExp;
  reDelimiterPunctuation?: RegExp;
  reDelimiterWhiteSpace?: RegExp;

  inlineHandlers?: [string, InlineHandler<T>][];
}

export interface Delimiters<T extends NodeType> {
  cc: number;
  numdelims: number;
  origdelims: number;
  node: Node<T>;
  previous?: Delimiters<T>;
  next?: Delimiters<T>;
  can_open: boolean;
  can_close: boolean;
}

export interface Brackets<T extends NodeType> {
  node: Node<T>;
  previous?: Brackets<T>;
  previousDelimiter?: Delimiters<T>;
  bracketAfter?: boolean;
  index: number;
  image: boolean;
  active: boolean;
}

export type RefMap = Record<string, {
  destination: string,
  title?: string,
}>;



export const createTextnode = <T extends NodeType>(literal: string) => {
  const node = new Node<GeneralNodeType>('text') as Node<T>;
  node._literal = literal;
  return node;
};

/**
 * normalize a reference in reference link (remove []s, trim,
 * collapse internal space, unicode case fold.
 * See commonmark/commonmark.js#168.
 * @param str 
 * @returns 
 */
export const normalizeReference = (str: string) => {
  return str
    .slice(1, str.length - 1)
    .trim()
    .replace(/[ \t\r\n]+/g, ' ')
    .toLowerCase()
    .toUpperCase();
};


export const removeDelimitersBetween = <T extends NodeType>(bottom: Delimiters<T>, top: Delimiters<T>) => {
  if (bottom.next !== top) {
    bottom.next = top;
    top.previous = bottom;
  }
};


/**
 * An InlineParser keeps track of a subject (a string to be parsed) and a position in that subject.
 */
export class InlineParser<T extends NodeType> {

  readonly options: InlineParsingOptions<T>;
  readonly withDefinedRules: boolean;

  subject: string;
  delimiters?: Delimiters<T>;
  brackets?: Brackets<T>;
  pos: number;
  refmap: RefMap;

  constructor(options?: InlineParsingOptions<T>, doNotShallowCopy?: boolean) {
    // parse options
    this.options = doNotShallowCopy ? (options ?? {}) : Object.assign({}, options);

    this.options.reDelimiterPunctuation = this.options.reDelimiterPunctuation ?? rePunctuation;
    this.options.reDelimiterWhiteSpace = this.options.reDelimiterWhiteSpace ?? reUnicodeWhitespaceChar;

    this.options.inlineHandlers = [...this.options.inlineHandlers ?? []];
    for (const [c] of this.options.inlineHandlers)
      if (c.length !== 1)
        throw 'Invalid triggering character(s): ' + JSON.stringify(c);

    this.withDefinedRules = this.options.inlineHandlers.length !== 0;
    
    if (this.options.reNonSpecialChars === undefined) {
      if (!this.withDefinedRules)
        this.options.reNonSpecialChars = reMain;
      else {
        this.options.reNonSpecialChars = compileNonSpecialCharRegExp(
          this.options.inlineHandlers.map(x => x[0]).join(''), 
          true
        );
      }
    }

    this.subject = '';
    this.pos = 0;
    this.refmap = {};
  }

  /**
   * If `re` matches at current position in the subject, advance
   * position in subject and return the match; otherwise return undefined.
   * @param re 
   * @returns 
   */
  match(re: RegExp) {
    const m = re.exec(this.subject.slice(this.pos));
    if (m === null) {
      return undefined;
    } else {
      this.pos += m.index + m[0].length;
      return m[0];
    }
  }

  /**
   * Returns the code for the character at the current subject position, 
   * or -1 if there are no more characters.
   * @returns 
   */
  peek() {
    if (this.pos < this.subject.length) {
      return this.subject.charCodeAt(this.pos);
    } else {
      return -1;
    }
  }

  /**
   * Parse zero or more space characters, including at most one newline
   * @returns 
   */
  spnl() {
    this.match(reSpnl);
    return true;
  }

  /**
   * Attempt to parse backticks, adding either a backtick code span or a
   * literal sequence of backticks.
   * @param block 
   * @returns 
   */
  parseBackticks(block: Node<T>) {
    const ticks = this.match(reTicksHere);
    if (ticks === undefined) {
      return false;
    }
    const afterOpenTicks = this.pos;
    let matched;
    let node;
    let contents;
    while ((matched = this.match(reTicks)) !== undefined) {
      if (matched === ticks) {
        node = new Node('code' as T);
        contents = this.subject
          .slice(afterOpenTicks, this.pos - ticks.length)
          .replace(/\n/gm, ' ');
        const cond = contents.length > 0 &&
          contents.match(/[^ ]/) !== null &&
          contents[0] === ' ' &&
          contents[contents.length - 1] === ' ';
        if (cond) {
          node._literal = contents.slice(1, contents.length - 1);
        } else {
          node._literal = contents;
        }
        block.appendChild(node);
        return true;
      }
    }
    // If we got here, we didn't match a closing backtick sequence.
    this.pos = afterOpenTicks;
    block.appendChild(createTextnode(ticks));
    return true;
  }

  /**
   * Parse a backslash-escaped special character, adding either the escaped
   * character, a hard line break (if the backslash is followed by a newline),
   * or a literal backslash to the block's children.  Assumes current character
   * is a backslash.
   * @param block 
   * @returns 
   */
  parseBackslash(block: Node<T>) {
    const subj = this.subject;
    let node;
    this.pos += 1;
    if (this.peek() === C_NEWLINE) {
      this.pos += 1;
      node = new Node('linebreak' as T);
      block.appendChild(node);
    } else if (reEscapable.test(subj.charAt(this.pos))) {
      block.appendChild(createTextnode(subj.charAt(this.pos)));
      this.pos += 1;
    } else {
      block.appendChild(createTextnode('\\'));
    }
    return true;
  }

  /**
   * Attempt to parse an autolink (URL or email in pointy brackets).
   * @param block 
   * @returns 
   */
  parseAutolink(block: Node<T>) {
    let m;
    let dest;
    let node;
    if ((m = this.match(reEmailAutolink))) {
      dest = m.slice(1, m.length - 1);
      node = new Node('link' as T);
      node._destination = normalizeURI('mailto:' + dest);
      node._title = '';
      node.appendChild(createTextnode(dest));
      block.appendChild(node);
      return true;
    } else if ((m = this.match(reAutolink))) {
      dest = m.slice(1, m.length - 1);
      node = new Node('link' as T);
      node._destination = normalizeURI(dest);
      node._title = '';
      node.appendChild(createTextnode(dest));
      block.appendChild(node);
      return true;
    } else {
      return false;
    }
  }

  /**
   * Attempt to parse a raw HTML tag.
   * @param block 
   * @returns 
   */
  parseHtmlTag(block: Node<T>) {
    const m = this.match(reHtmlTag);
    if (m === undefined) {
      return false;
    } else {
      const node = new Node('html_inline' as T);
      node._literal = m;
      block.appendChild(node);
      return true;
    }
  }

  /**
   * Scan a sequence of characters with code `cc`, and return information about
   * the number of delimiters and whether they are positioned such that
   * they can open and/or close emphasis or strong emphasis.  A utility
   * function for strong/emph parsing.
   * @param cc 
   * @returns 
   */
  scanDelims(cc: number) {
    let numdelims = 0;
    const startpos = this.pos;
    let can_open, can_close;

    if (cc === C_SINGLEQUOTE || cc === C_DOUBLEQUOTE) {
      numdelims++;
      this.pos++;
    } else {
      while (this.peek() === cc) {
        numdelims++;
        this.pos++;
      }
    }

    if (numdelims === 0) {
      return undefined;
    }

    const char_before = startpos === 0 ? '\n' : this.subject.charAt(startpos - 1);

    const cc_after = this.peek();
    const char_after = cc_after === -1 ?
      '\n' :
      fromCodePoint(cc_after);

    const after_is_whitespace = this.options.reDelimiterWhiteSpace?.test(char_after) ?? false;
    const after_is_punctuation = this.options.reDelimiterPunctuation?.test(char_after) ?? false;
    const before_is_whitespace = this.options.reDelimiterWhiteSpace?.test(char_before) ?? false;
    const before_is_punctuation = this.options.reDelimiterPunctuation?.test(char_before) ?? false;

    const left_flanking =
      !after_is_whitespace &&
      (!after_is_punctuation ||
        before_is_whitespace ||
        before_is_punctuation);
    const right_flanking =
      !before_is_whitespace &&
      (!before_is_punctuation || after_is_whitespace || after_is_punctuation);
    if (cc === C_UNDERSCORE) {
      can_open = left_flanking && (!right_flanking || before_is_punctuation);
      can_close = right_flanking && (!left_flanking || after_is_punctuation);
    } else if (cc === C_SINGLEQUOTE || cc === C_DOUBLEQUOTE) {
      can_open = left_flanking && !right_flanking;
      can_close = right_flanking;
    } else {
      can_open = left_flanking;
      can_close = right_flanking;
    }
    this.pos = startpos;
    return { numdelims: numdelims, can_open: can_open, can_close: can_close };
  }

  /**
   * Handle a delimiter marker for emphasis or a quote.
   * @param cc 
   * @param block 
   * @returns 
   */
  handleDelim(cc: number, block: Node<T>) {
    const res = this.scanDelims(cc);
    if (!res) {
      return false;
    }
    const numdelims = res.numdelims;
    const startpos = this.pos;
    let contents;

    this.pos += numdelims;
    if (cc === C_SINGLEQUOTE) {
      contents = '\u2019';
    } else if (cc === C_DOUBLEQUOTE) {
      contents = '\u201C';
    } else {
      contents = this.subject.slice(startpos, this.pos);
    }
    const node = createTextnode<T>(contents);
    block.appendChild(node);

    // Add entry to stack for this opener
    if (
      (res.can_open || res.can_close) &&
      (this.options.smart || (cc !== C_SINGLEQUOTE && cc !== C_DOUBLEQUOTE))
    ) {
      this.delimiters = {
        cc: cc,
        numdelims: numdelims,
        origdelims: numdelims,
        node: node,
        previous: this.delimiters,
        next: undefined,
        can_open: res.can_open,
        can_close: res.can_close
      };
      if (this.delimiters.previous !== undefined) {
        this.delimiters.previous.next = this.delimiters;
      }
    }

    return true;
  }

  removeDelimiter(delim: Delimiters<T>) {
    if (delim.previous !== undefined) {
      delim.previous.next = delim.next;
    }
    if (delim.next === undefined) {
      // top of stack
      this.delimiters = delim.previous;
    } else {
      delim.next.previous = delim.previous;
    }
  }

  processEmphasis(stack_bottom?: Delimiters<T>) {
    let opener, closer, old_closer;
    let opener_inl, closer_inl;
    let tempstack;
    let use_delims;
    let tmp, next;
    let opener_found;
    const openers_bottom = [];
    let openers_bottom_index;
    let odd_match = false;

    for (let i = 0; i < 8; i++) {
      openers_bottom[i] = stack_bottom;
    }
    // find first closer above stack_bottom:
    closer = this.delimiters;
    while (closer !== undefined && closer.previous !== stack_bottom) {
      closer = closer.previous;
    }
    // move forward, looking for closers, and handling each
    while (closer !== undefined) {
      const closercc = closer.cc;
      if (!closer.can_close) {
        closer = closer.next;
      } else {
        // found emphasis closer. now look back for first matching opener:
        opener = closer.previous;
        opener_found = false;
        switch (closercc) {
        case C_SINGLEQUOTE:
          openers_bottom_index = 0;
          break;
        case C_DOUBLEQUOTE:
          openers_bottom_index = 1;
          break;
        case C_UNDERSCORE:
          openers_bottom_index = 2;
          break;
        case C_ASTERISK:
          openers_bottom_index = 3 + (closer.can_open ? 3 : 0)
              + (closer.origdelims % 3);
          break;
        default:
          openers_bottom_index = -1;
        }
        while (
          opener !== undefined &&
          opener !== stack_bottom &&
          opener !== openers_bottom[openers_bottom_index]
        ) {
          odd_match =
            (closer.can_open || opener.can_close) &&
            closer.origdelims % 3 !== 0 &&
            (opener.origdelims + closer.origdelims) % 3 === 0;
          if (opener.cc === closer.cc && opener.can_open && !odd_match) {
            opener_found = true;
            break;
          }
          opener = opener.previous;
        }
        old_closer = closer;

        if (closercc === C_ASTERISK || closercc === C_UNDERSCORE) {
          if (!opener_found) {
            closer = closer.next;
          } else {
            opener = opener as Delimiters<T>;
            // calculate actual number of delimiters used from closer
            use_delims = closer.numdelims >= 2 && opener.numdelims >= 2 ? 2 : 1;

            opener_inl = opener.node;
            closer_inl = closer.node;

            // remove used delimiters from stack elts and inlines
            opener.numdelims -= use_delims;
            closer.numdelims -= use_delims;
            opener_inl._literal = opener_inl._literal?.slice(
              0,
              opener_inl._literal.length - use_delims
            );
            closer_inl._literal = closer_inl._literal?.slice(
              0,
              closer_inl._literal.length - use_delims
            );

            // build contents for new emph element
            const emph = new Node(use_delims === 1 ? 'emph' : 'strong') as Node<T>;

            tmp = opener_inl._next;
            while (tmp && tmp !== closer_inl) {
              next = tmp._next;
              tmp.unlink();
              emph.appendChild(tmp);
              tmp = next;
            }

            opener_inl.insertAfter(emph);

            // remove elts between opener and closer in delimiters stack
            removeDelimitersBetween(opener, closer);

            // if opener has 0 delims, remove it and the inline
            if (opener.numdelims === 0) {
              opener_inl.unlink();
              this.removeDelimiter(opener);
            }

            if (closer.numdelims === 0) {
              closer_inl.unlink();
              tempstack = closer.next;
              this.removeDelimiter(closer);
              closer = tempstack;
            }
          }
        } else if (closercc === C_SINGLEQUOTE) {
          closer.node._literal = '\u2019';
          if (opener_found) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            opener!.node._literal = '\u2018';
          }
          closer = closer.next;
        } else if (closercc === C_DOUBLEQUOTE) {
          closer.node._literal = '\u201D';
          if (opener_found) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            opener!.node._literal = '\u201C';
          }
          closer = closer.next;
        }
        if (!opener_found) {
          // Set lower bound for future searches for openers:
          openers_bottom[openers_bottom_index] =
            old_closer.previous;
          if (!old_closer.can_open) {
            // We can remove a closer that can't be an opener,
            // once we've seen there's no matching opener:
            this.removeDelimiter(old_closer);
          }
        }
      }
    }

    // remove all delimiters
    while (this.delimiters !== undefined && this.delimiters !== stack_bottom) {
      this.removeDelimiter(this.delimiters);
    }
  }

  /**
   * Attempt to parse link title (sans quotes), returning the string
   * or undefined if no match.
   * @returns 
   */
  parseLinkTitle() {
    const title = this.match(reLinkTitle);
    if (title === undefined) {
      return undefined;
    } else {
      // chop off quotes from title and unescape:
      return unescapeString(title.slice(1, -1));
    }
  }

  /**
   * Attempt to parse link destination, returning the string or
   * undefined if no match. */
  parseLinkDestination() {
    let res = this.match(reLinkDestinationBraces);
    if (res === undefined) {
      if (this.peek() === C_LESSTHAN) {
        return undefined;
      }
      // TODO handrolled parser; res should be undefined or the string
      const savepos = this.pos;
      let openparens = 0;
      let c;
      while ((c = this.peek()) !== -1) {
        if (
          c === C_BACKSLASH &&
          reEscapable.test(this.subject.charAt(this.pos + 1))
        ) {
          this.pos += 1;
          if (this.peek() !== -1) {
            this.pos += 1;
          }
        } else if (c === C_OPEN_PAREN) {
          this.pos += 1;
          openparens += 1;
        } else if (c === C_CLOSE_PAREN) {
          if (openparens < 1) {
            break;
          } else {
            this.pos += 1;
            openparens -= 1;
          }
        } else if (reWhitespaceChar.exec(fromCodePoint(c)) !== null) {
          break;
        } else {
          this.pos += 1;
        }
      }
      if (this.pos === savepos && c !== C_CLOSE_PAREN) {
        return undefined;
      }
      if (openparens !== 0) {
        return undefined;
      }
      res = this.subject.slice(savepos, this.pos);
      return normalizeURI(unescapeString(res));
    } else {
      // chop off surrounding <..>:
      return normalizeURI(unescapeString(res.slice(1, -1)));
    }
  }

  // Attempt to parse a link label, returning number of characters parsed.
  parseLinkLabel() {
    const m = this.match(reLinkLabel);
    if (m === undefined || m.length > 1001) {
      return 0;
    } else {
      return m.length;
    }
  }

  // Add open bracket to delimiter stack and add a text node to block's children.
  parseOpenBracket(block: Node<T>) {
    const startpos = this.pos;
    this.pos += 1;

    const node = createTextnode<T>('[');
    block.appendChild(node);

    // Add entry to stack for this opener
    this.addBracket(node, startpos, false);
    return true;
  }

  // IF next character is [, and ! delimiter to delimiter stack and
  // add a text node to block's children.  Otherwise just add a text node.
  parseBang(block: Node<T>) {
    const startpos = this.pos;
    this.pos += 1;
    if (this.peek() === C_OPEN_BRACKET) {
      this.pos += 1;

      const node = createTextnode<T>('![');
      block.appendChild(node);

      // Add entry to stack for this opener
      this.addBracket(node, startpos + 1, true);
    } else {
      block.appendChild(createTextnode('!'));
    }
    return true;
  }

  /**
   * Try to match close bracket against an opening in the delimiter
   * stack.  Add either a link or image, or a plain [ character,
   * to block's children.  If there is a matching delimiter,
   * remove it from the delimiter stack.
   * @param block 
   * @returns 
   */
  parseCloseBracket(block: Node<T>) {
    let dest;
    let title;
    let matched = false;
    let reflabel;
    let opener;

    this.pos += 1;
    const startpos = this.pos;

    // get last [ or ![
    opener = this.brackets;

    if (opener === undefined) {
      // no matched opener, just return a literal
      block.appendChild(createTextnode(']'));
      return true;
    }

    if (!opener.active) {
      // no matched opener, just return a literal
      block.appendChild(createTextnode(']'));
      // take opener off brackets stack
      this.removeBracket();
      return true;
    }

    // If we got here, open is a potential opener
    const is_image = opener.image;

    // Check to see if we have a link/image

    const savepos = this.pos;

    // Inline link?
    if (this.peek() === C_OPEN_PAREN) {
      this.pos++;
      if (
        this.spnl() &&
        (dest = this.parseLinkDestination()) !== undefined &&
        this.spnl() &&
        // make sure there's a space before the title:
        ((reWhitespaceChar.test(this.subject.charAt(this.pos - 1)) &&
          (title = this.parseLinkTitle())) ||
          true) &&
        this.spnl() &&
        this.peek() === C_CLOSE_PAREN
      ) {
        this.pos += 1;
        matched = true;
      } else {
        this.pos = savepos;
      }
    }

    if (!matched) {
      // Next, see if there's a link label
      const beforelabel = this.pos;
      const n = this.parseLinkLabel();
      if (n > 2) {
        reflabel = this.subject.slice(beforelabel, beforelabel + n);
      } else if (!opener.bracketAfter) {
        // Empty or missing second label means to use the first label as the reference.
        // The reference must not contain a bracket. If we know there's a bracket, we don't even bother checking it.
        reflabel = this.subject.slice(opener.index, startpos);
      }
      if (n === 0) {
        // If shortcut reference link, rewind before spaces we skipped.
        this.pos = savepos;
      }

      if (reflabel) {
        // lookup rawlabel in refmap
        const link = this.refmap[normalizeReference(reflabel)];
        if (link) {
          dest = link.destination;
          title = link.title;
          matched = true;
        }
      }
    }

    if (matched) {
      const node = new Node(is_image ? 'image' : 'link') as Node<T>;
      node._destination = dest;
      node._title = title || '';

      let tmp: Node<T> | undefined, next: Node<T> | undefined;
      tmp = opener.node._next;
      while (tmp !== undefined) {
        next = tmp._next;
        tmp.unlink();
        node.appendChild(tmp);
        tmp = next;
      }
      block.appendChild(node);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.processEmphasis(opener.previousDelimiter!);
      this.removeBracket();
      opener.node.unlink();

      // We remove this bracket and processEmphasis will remove later delimiters.
      // Now, for a link, we also deactivate earlier link openers.
      // (no links in links)
      if (!is_image) {
        opener = this.brackets;
        while (opener !== undefined) {
          if (!opener.image) {
            opener.active = false; // deactivate this opener
          }
          opener = opener.previous;
        }
      }

      return true;
    } else {
      // no match

      this.removeBracket(); // remove this opener from stack
      this.pos = startpos;
      block.appendChild(createTextnode(']'));
      return true;
    }
  }

  addBracket(node: Node<T>, index: number, image: boolean) {
    if (this.brackets !== undefined) {
      this.brackets.bracketAfter = true;
    }
    this.brackets = {
      node: node,
      previous: this.brackets,
      previousDelimiter: this.delimiters,
      index: index,
      image: image,
      active: true
    };
  }

  removeBracket() {
    this.brackets = this.brackets?.previous;
  }

  /**
   * Attempt to parse an entity.
   * @param block 
   * @returns 
   */
  parseEntity(block: Node<T>) {
    let m;
    if ((m = this.match(reEntityHere))) {
      block.appendChild(createTextnode(decodeHTML(m)));
      return true;
    } else {
      return false;
    }
  }

  /**
   * Parse a run of ordinary characters, or a single character with
   * a special meaning in markdown, as a plain string.
   * @param block 
   * @returns 
   */
  parseString(block: Node<T>) {
    let m;
    if ((m = this.match(this.options.reNonSpecialChars ?? reMain))) {
      if (this.options.smart) {
        block.appendChild(
          createTextnode(
            m
              .replace(reEllipses, '\u2026')
              .replace(reDash, function (chars) {
                let enCount = 0;
                let emCount = 0;
                if (chars.length % 3 === 0) {
                  // If divisible by 3, use all em dashes
                  emCount = chars.length / 3;
                } else if (chars.length % 2 === 0) {
                  // If divisible by 2, use all en dashes
                  enCount = chars.length / 2;
                } else if (chars.length % 3 === 2) {
                  // If 2 extra dashes, use en dash for last 2; em dashes for rest
                  enCount = 1;
                  emCount = (chars.length - 2) / 3;
                } else {
                  // Use en dashes for last 4 hyphens; em dashes for rest
                  enCount = 2;
                  emCount = (chars.length - 4) / 3;
                }
                return (
                  '\u2014'.repeat(emCount) +
                  '\u2013'.repeat(enCount)
                );
              })
          )
        );
      } else {
        block.appendChild(createTextnode(m));
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * Parse a newline.  
   * 
   * If it was preceded by two spaces, return a hard
   * line break; otherwise a soft line break.
   * @param block 
   * @returns 
   */
  parseNewline(block: Node<T>) {
    this.pos += 1; // assume we're at a \n
    // check previous node for trailing spaces
    const lastc = block._lastChild;
    if (
      lastc &&
      lastc.type === 'text' &&
      lastc._literal !== undefined &&
      lastc._literal[lastc._literal.length - 1] === ' '
    ) {
      const hardbreak = lastc._literal[lastc._literal.length - 2] === ' ';
      lastc._literal = lastc._literal.replace(reFinalSpace, '');
      block.appendChild(new Node(hardbreak ? 'linebreak' : 'softbreak') as Node<T>);
    } else {
      block.appendChild(new Node('softbreak' as T));
    }
    this.match(reInitialSpace); // gobble leading spaces in next line
    return true;
  }

  /**
   * Attempt to parse a link reference, modifying refmap.
   * @param s 
   * @param refmap 
   * @returns 
   */
  parseReference(s: string, refmap: RefMap) {
    this.subject = s;
    this.pos = 0;
    let rawlabel;
    let title;
    const startpos = this.pos;

    // label:
    const matchChars = this.parseLinkLabel();
    if (matchChars === 0) {
      return 0;
    } else {
      rawlabel = this.subject.slice(0, matchChars);
    }

    // colon:
    if (this.peek() === C_COLON) {
      this.pos++;
    } else {
      this.pos = startpos;
      return 0;
    }

    //  link url
    this.spnl();

    const dest = this.parseLinkDestination();
    if (dest === undefined) {
      this.pos = startpos;
      return 0;
    }

    const beforetitle = this.pos;
    this.spnl();
    if (this.pos !== beforetitle) {
      title = this.parseLinkTitle();
    }
    if (title === undefined) {
      title = '';
      // rewind before spaces
      this.pos = beforetitle;
    }

    // make sure we're at line end:
    let atLineEnd = true;
    if (this.match(reSpaceAtEndOfLine) === undefined) {
      if (title === '') {
        atLineEnd = false;
      } else {
        // the potential title we found is not at the line end,
        // but it could still be a legal link reference if we
        // discard the title
        title = '';
        // rewind before spaces
        this.pos = beforetitle;
        // and instead check if the link URL is at the line end
        atLineEnd = this.match(reSpaceAtEndOfLine) !== undefined;
      }
    }

    if (!atLineEnd) {
      this.pos = startpos;
      return 0;
    }

    const normlabel = normalizeReference(rawlabel);
    if (normlabel === '') {
      // label must contain non-whitespace characters
      this.pos = startpos;
      return 0;
    }

    if (!refmap[normlabel]) {
      refmap[normlabel] = { destination: dest, title: title };
    }
    return this.pos - startpos;
  }

  /**
   * Parse the next inline element in subject, advancing subject position.
   * @param block 
   * @returns   
   * On success, add the result to block's children and return true.
   * 
   * On failure, return false.
   */
  parseInline(block: Node<T>) {
    let res = false;
    const c = this.peek();
    if (c === -1) {
      return false;
    }
    switch (c) {
    case C_NEWLINE:
      res = this.parseNewline(block);
      break;
    case C_BACKSLASH:
      res = this.parseBackslash(block);
      break;
    case C_BACKTICK:
      res = this.parseBackticks(block);
      break;
    case C_ASTERISK:
    case C_UNDERSCORE:
      res = this.handleDelim(c, block);
      break;
    case C_SINGLEQUOTE:
    case C_DOUBLEQUOTE:
      res = this.options.smart ? this.handleDelim(c, block) : false;
      break;
    case C_OPEN_BRACKET:
      res = this.parseOpenBracket(block);
      break;
    case C_BANG:
      res = this.parseBang(block);
      break;
    case C_CLOSE_BRACKET:
      res = this.parseCloseBracket(block);
      break;
    case C_LESSTHAN:
      res = this.parseAutolink(block) || this.parseHtmlTag(block);
      break;
    case C_AMPERSAND:
      res = this.parseEntity(block);
      break;
    default:
      if (this.withDefinedRules) {
        let handled = false;
        for (const [ch, handler] of this.options.inlineHandlers ?? []) {
          if (c === ch.charCodeAt(0)) {
            res = handler(this, block);
            handled = true;
            break;
          }
        }
        if (!handled)
          res = this.parseString(block);
      } else
        res = this.parseString(block);
      break;
    }
    if (!res) {
      this.pos += 1;
      block.appendChild(createTextnode(fromCodePoint(c)));
    }

    return true;
  }

  /**
   * Parse string content in block into inline children,
   * using refmap to resolve references.
   * @param block 
   */
  parse(block: Node<T>) {
    this.subject = block._string_content?.trim() ?? '';
    this.pos = 0;
    this.delimiters = undefined;
    this.brackets = undefined;
    while (this.parseInline(block)) { }
    block._string_content = undefined; // allow raw string to be garbage collected
    this.processEmphasis(undefined);
  }

}


export default InlineParser;
