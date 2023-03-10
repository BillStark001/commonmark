import Renderer from './renderer';
import { escapeXml } from '../common';
import Node from '../node';
import { NodeWalker } from '../node-walker';

const reXMLTag = /\<[^>]*\>/;

const toTagName = (s: string) => {
  return s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
};

export interface XmlRenderingOptions {
  time?: boolean | undefined;
  sourcepos?: boolean | undefined;

  esc?: (x: string) => string;
}


export default class XmlRenderer extends Renderer {
  readonly options: XmlRenderingOptions;

  disableTags: number;
  indentLevel: number;
  indent: string;

  constructor(options?: XmlRenderingOptions) {
    super();
    this.disableTags = 0;
    this.lastOut = '\n';

    this.indentLevel = 0;
    this.indent = '  ';
    // escape html with a custom function
    // else use escapeXml

    this.options = Object.assign({}, options);

    this.esc = this.options.esc || escapeXml;
  }

  render(ast: Node) {
    this.buffer = '';

    let attrs: [string, string][];
    let tagname;
    const walker = new NodeWalker(ast);
    let event, node, entering;
    let container;
    let selfClosing;
    let nodetype;

    const options = this.options;

    if (options.time) {
      console.time('rendering');
    }

    this.buffer += '<?xml version="1.0" encoding="UTF-8"?>\n';
    this.buffer += '<!DOCTYPE document SYSTEM "CommonMark.dtd">\n';

    while ((event = walker.next())) {
      entering = event.entering;
      node = event.node;
      nodetype = node.type;

      container = node.isContainer;

      selfClosing =
      nodetype === 'thematic_break' ||
      nodetype === 'linebreak' ||
      nodetype === 'softbreak';

      tagname = toTagName(nodetype);

      if (entering) {
        attrs = [];

        switch (nodetype) {
        case 'document':
          attrs.push(['xmlns', 'http://commonmark.org/xml/1.0']);
          break;
        case 'list':
          if (node.listType !== null) {
            attrs.push(['type', node.listType?.toLowerCase() ?? '']);
          }
          if (node.listStart !== null) {
            attrs.push(['start', String(node.listStart)]);
          }
          if (node.listTight !== null) {
            attrs.push([
              'tight',
              node.listTight ? 'true' : 'false'
            ]);
          }
          // eslint-disable-next-line no-case-declarations
          const delim = node.listDelimiter;
          if (delim !== null) {
            let delimword = '';
            if (delim === '.') {
              delimword = 'period';
            } else {
              delimword = 'paren';
            }
            attrs.push(['delimiter', delimword]);
          }
          break;
        case 'code_block':
          if (node.info) {
            attrs.push(['info', node.info]);
          }
          break;
        case 'heading':
          attrs.push(['level', String(node.level)]);
          break;
        case 'link':
        case 'image':
          attrs.push(['destination', node.destination ?? '']);
          attrs.push(['title', node.title ?? '']);
          break;
        case 'custom_inline':
        case 'custom_block':
          attrs.push(['on_enter', node.onEnter ?? '']);
          attrs.push(['on_exit', node.onExit ?? '']);
          break;
        default:
          break;
        }
        if (options.sourcepos) {
          const pos = node.sourcepos;
          if (pos) {
            attrs.push([
              'sourcepos',
              String(pos[0][0]) +
            ':' +
            String(pos[0][1]) +
            '-' +
            String(pos[1][0]) +
            ':' +
            String(pos[1][1])
            ]);
          }
        }

        this.cr();
        this.out(this.tag(tagname, attrs, selfClosing));
        if (container) {
          this.indentLevel += 1;
        } else if (!container && !selfClosing) {
          const lit = node.literal;
          if (lit) {
            this.out(this.esc(lit));
          }
          this.out(this.tag('/' + tagname));
        }
      } else {
        this.indentLevel -= 1;
        this.cr();
        this.out(this.tag('/' + tagname));
      }
    }
    if (options.time) {
      console.timeEnd('rendering');
    }
    this.buffer += '\n';
    return this.buffer;
  }

  out(s: string) {
    if (this.disableTags > 0) {
      this.buffer += s.replace(reXMLTag, '');
    } else {
      this.buffer += s;
    }
    this.lastOut = s;
  }

  cr() {
    if (this.lastOut !== '\n') {
      this.buffer += '\n';
      this.lastOut = '\n';
      for (let i = this.indentLevel; i > 0; i--) {
        this.buffer += this.indent;
      }
    }
  }

  // Helper function to produce an XML tag.
  tag(name: string, attrs?: [string, string][], selfclosing?: boolean) {
    let result = '<' + name;
    if (attrs && attrs.length > 0) {
      let i = 0;
      let attrib;
      while ((attrib = attrs[i]) !== undefined) {
        result += ' ' + attrib[0] + '="' + this.esc(attrib[1]) + '"';
        i++;
      }
    }
    if (selfclosing) {
      result += ' /';
    }
    result += '>';
    return result;
  }
}
