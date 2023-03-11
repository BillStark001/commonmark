import { escapeXml } from '../common';
import Node, { GeneralNodeType, GeneralNodeTypeDefinition, NodeType } from '../node';
import Renderer from './renderer';
import { XmlRenderingOptions } from './xml';

const reUnsafeProtocol = /^javascript:|vbscript:|file:|data:/i;
const reSafeDataProtocol = /^data:image\/(?:png|gif|jpeg|webp)/i;

const potentiallyUnsafe = (url?: string) => {
  return url !== undefined && reUnsafeProtocol.test(url) && !reSafeDataProtocol.test(url);
};

export interface HtmlRenderingOptions<T extends NodeType = GeneralNodeType> extends XmlRenderingOptions<T> {
  /**
   *  if true, raw HTML will not be passed through to HTML output (it will be replaced by comments), and potentially unsafe URLs in links and images
   *  (those beginning with javascript:, vbscript:, file:, and with a few exceptions data:) will be replaced with empty strings.
   */
  safe?: boolean | undefined;
  /**
   *  if true, straight quotes will be made curly, -- will be changed to an en dash, --- will be changed to an em dash, and ... will be changed to ellipses.
   */
  smart?: boolean | undefined;
  /**
   *  if true, source position information for block-level elements will be rendered in the data-sourcepos attribute (for HTML) or the sourcepos attribute (for XML).
   */
  sourcepos?: boolean | undefined;

  /**
   * A raw string to be used for a softbreak.
   * For example, `{ softbreak: "<br/>" }` treats a softbreak as `<br/>`.
   */
  softbreak?: string | undefined;
}


export class HtmlRenderer<T extends NodeType = GeneralNodeType> extends Renderer<T> {
  readonly options: HtmlRenderingOptions<T>;

  disableTags: number;

  constructor(options?: HtmlRenderingOptions<T>) {
    super();
    this.options = Object.assign({ softbreak: '\n' }, options);
    this.options.type = Object.assign({}, GeneralNodeTypeDefinition, this.options.type);
    

    // set to "<br />" to make them hard breaks
    // set to " " if you want to ignore line wrapping in source
    this.esc = this.options.esc ?? escapeXml;
    // escape html with a custom function
    // else use escapeXml

    this.disableTags = 0;
  }

  /* Helper methods */

  out(s: string) {
    this.lit(this.esc(s));
  }

  attrs(node: Node<T>): [string, string][] {
    const att: [string, string][] = [];
    if (this.options.sourcepos) {
      const pos = node.sourcepos;
      if (pos) {
        att.push([
          'data-sourcepos',
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
    return att;
  }
  // Helper to produce an HTML tag.
  tag(name: string, attrs?: [string, string][], selfclosing?: boolean) {
    if (this.disableTags > 0) {
      return;
    }
    this.buffer += '<' + name;
    if (attrs !== undefined && attrs.length > 0) {
      let i = 0;
      let attrib;
      while ((attrib = attrs[i]) !== undefined) {
        this.buffer += ' ' + attrib[0] + '="' + attrib[1] + '"';
        i++;
      }
    }
    if (selfclosing) {
      this.buffer += ' /';
    }
    this.buffer += '>';
    this.lastOut = '>';
  }

  /* Node methods */

  text(node: Node<T>) {
    this.out(node.literal ?? '');
  }

  softbreak() {
    this.lit(this.options.softbreak ?? '');
  }

  linebreak() {
    this.tag('br', [], true);
    this.cr();
  }

  link(node: Node<T>, entering: boolean) {
    const attrs = this.attrs(node);
    if (entering) {
      if (!(this.options.safe && potentiallyUnsafe(node.destination))) {
        attrs.push(['href', this.esc(node.destination ?? '')]);
      }
      if (node.title) {
        attrs.push(['title', this.esc(node.title)]);
      }
      this.tag('a', attrs);
    } else {
      this.tag('/a');
    }
  }

  image(node: Node<T>, entering: boolean) {
    if (entering) {
      if (this.disableTags === 0) {
        if (this.options.safe && potentiallyUnsafe(node.destination)) {
          this.lit('<img src="" alt="');
        } else {
          this.lit('<img src="' + this.esc(node.destination ?? '') + '" alt="');
        }
      }
      this.disableTags += 1;
    } else {
      this.disableTags -= 1;
      if (this.disableTags === 0) {
        if (node.title) {
          this.lit('" title="' + this.esc(node.title));
        }
        this.lit('" />');
      }
    }
  }

  emph(node: Node<T>, entering: boolean) {
    this.tag(entering ? 'em' : '/em');
  }

  strong(node: Node<T>, entering: boolean) {
    this.tag(entering ? 'strong' : '/strong');
  }

  paragraph(node: Node<T>, entering: boolean) {
    const grandparent = node.parent?.parent,
      attrs = this.attrs(node);
    if (grandparent?.type === 'list') {
      if (grandparent.listTight) {
        return;
      }
    }
    if (entering) {
      this.cr();
      this.tag('p', attrs);
    } else {
      this.tag('/p');
      this.cr();
    }
  }

  heading(node: Node<T>, entering: boolean) {
    const tagname = 'h' + node.level,
      attrs = this.attrs(node);
    if (entering) {
      this.cr();
      this.tag(tagname, attrs);
    } else {
      this.tag('/' + tagname);
      this.cr();
    }
  }

  code(node: Node<T>) {
    this.tag('code');
    this.out(node.literal ?? '');
    this.tag('/code');
  }

  code_block(node: Node<T>) {
    const info_words = node.info ? node.info.split(/\s+/) : [],
      attrs = this.attrs(node);
    if (info_words.length > 0 && info_words[0].length > 0) {
      attrs.push(['class', 'language-' + this.esc(info_words[0])]);
    }
    this.cr();
    this.tag('pre');
    this.tag('code', attrs);
    this.out(node.literal ?? '');
    this.tag('/code');
    this.tag('/pre');
    this.cr();
  }

  thematic_break(node: Node<T>) {
    const attrs = this.attrs(node);
    this.cr();
    this.tag('hr', attrs, true);
    this.cr();
  }

  block_quote(node: Node<T>, entering: boolean) {
    const attrs = this.attrs(node);
    if (entering) {
      this.cr();
      this.tag('blockquote', attrs);
      this.cr();
    } else {
      this.cr();
      this.tag('/blockquote');
      this.cr();
    }
  }

  list(node: Node<T>, entering: boolean) {
    const tagname = node.listType === 'bullet' ? 'ul' : 'ol',
      attrs = this.attrs(node);

    if (entering) {
      const start = node.listStart;
      if (start !== undefined && start !== 1) {
        attrs.push(['start', start.toString()]);
      }
      this.cr();
      this.tag(tagname, attrs);
      this.cr();
    } else {
      this.cr();
      this.tag('/' + tagname);
      this.cr();
    }
  }

  item(node: Node<T>, entering: boolean) {
    const attrs = this.attrs(node);
    if (entering) {
      this.tag('li', attrs);
    } else {
      this.tag('/li');
      this.cr();
    }
  }

  html_inline(node: Node<T>) {
    if (this.options.safe) {
      this.lit('<!-- raw HTML omitted -->');
    } else {
      this.lit(node.literal ?? '');
    }
  }

  html_block(node: Node<T>) {
    this.cr();
    if (this.options.safe) {
      this.lit('<!-- raw HTML omitted -->');
    } else {
      this.lit(node.literal ?? '');
    }
    this.cr();
  }

  custom_inline(node: Node<T>, entering: boolean) {
    if (entering && node.onEnter) {
      this.lit(node.onEnter);
    } else if (!entering && node.onExit) {
      this.lit(node.onExit);
    }
  }

  custom_block(node: Node<T>, entering: boolean) {
    this.cr();
    if (entering && node.onEnter) {
      this.lit(node.onEnter);
    } else if (!entering && node.onExit) {
      this.lit(node.onExit);
    }
    this.cr();
  }

}

export default HtmlRenderer;