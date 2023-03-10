import Node, { NodeType } from '../node';
import { NodeWalker, NodeWalkerEvent } from '../node-walker';


export default class Renderer {
  buffer: string;
  lastOut: string;

  constructor() {
    this.buffer = '';
    this.lastOut = '';
    
  }

  /**
 *  Walks the AST and calls member methods for each Node type.
 *
 *  @param ast {Node} The root of the abstract syntax tree.
 */
  render(ast: Node) {
    const walker = new NodeWalker(ast);
    let event: NodeWalkerEvent | undefined;

    this.buffer = '';
    this.lastOut = '\n';

    while ((event = walker.next())) {
      const type = event.node.type;
      const renderer = (this as unknown as Record<NodeType, (node: Node, entering: boolean) => void>)[type];
      if (renderer !== undefined) {
        renderer.bind(this)(event.node, event.entering);
      }
    }
    return this.buffer;
  }

  /**
 *  Concatenate a literal string to the buffer.
 *
 *  @param str {String} The string to concatenate.
 */
  lit(str: string) {
    this.buffer += str;
    this.lastOut = str;
  }

  /**
 *  Output a newline to the buffer.
 */
  cr() {
    if (this.lastOut !== '\n') {
      this.lit('\n');
    }
  }

  /**
 *  Concatenate a string to the buffer possibly escaping the content.
 *
 *  Concrete renderer implementations should override this method.
 *
 *  @param str {String} The string to concatenate.
 */
  out(str: string) {
    this.lit(str);
  }

  /**
 *  Escape a string for the target renderer.
 *
 *  Abstract function that should be implemented by concrete
 *  renderer implementations.
 *
 *  @param str {String} The string to escape.
 */
  esc(str: string) {
    return str;
  }
}

