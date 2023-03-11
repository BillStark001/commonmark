import Node, { GeneralNodeTypeDefinition, NodeType, NodeTypeDefinition } from '../node';
import { NodeWalker, NodeWalkerEvent } from '../node-walker';


export class Renderer<T extends NodeType> {

  readonly definition: NodeTypeDefinition<T>;

  buffer: string;
  lastOut: string;

  constructor(definition?: NodeTypeDefinition<T>, doNotShallowCopy?: boolean) {
    definition = definition ?? (GeneralNodeTypeDefinition as NodeTypeDefinition<T>);
    this.definition = doNotShallowCopy ? definition : Object.assign({}, definition);

    this.buffer = '';
    this.lastOut = '';
  }

  /**
 *  Walks the AST and calls member methods for each Node type.
 *
 *  @param ast {Node} The root of the abstract syntax tree.
 */
  render(ast: Node<T>) {
    const walker = new NodeWalker(ast, this.definition, true);
    let event: NodeWalkerEvent<T> | undefined;

    this.buffer = '';
    this.lastOut = '\n';

    while ((event = walker.next())) {
      const type = event.node.type;
      const thisVar = this as unknown as Record<T, (node: Node<T>, entering: boolean) => void>;
      const renderer = thisVar[type] as ((node: Node<T>, entering: boolean) => void) | undefined;
      if (renderer !== undefined) {
        renderer.bind(thisVar)(event.node, event.entering);
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

export default Renderer;