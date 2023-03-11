import { GeneralNodeTypeDefinition, Node, NodeType, NodeTypeDefinition } from './node';

/* Example of use of walker:

 var walker = w.walker();
 var event;

 while (event = walker.next()) {
 console.log(event.entering, event.node.type);
 }

 */

export type NodeWalkerEvent<T extends NodeType> = {
  entering: boolean;
  node: Node<T>;
};

export class NodeWalker<T extends NodeType> {

  readonly definition: NodeTypeDefinition<T>;

  private _current?: Node<T>;
  private _root: Node<T>;
  private _entering: boolean;

  public get current() { return this._current; }
  public get root() { return this._root; }
  public get entering() { return this._entering; }

  constructor(root: Node<T>, definition?: NodeTypeDefinition<T>) {
    this.definition = Object.assign({}, GeneralNodeTypeDefinition, definition);

    this._current = root;
    this._root = root;
    this._entering = true;
  }

  resumeAt(node: Node<T>, entering: boolean) {
    this._current = node;
    this._entering = entering;
  }

  next(): NodeWalkerEvent<T> | undefined {
    const cur = this.current;
    const entering = this.entering;

    if (cur === undefined) {
      return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const container = this.definition.isContainer!(cur);

    if (entering && container) {
      if (cur.firstChild) {
        this._current = cur.firstChild;
        this._entering = true;
      } else {
        // stay on node but exit
        this._entering = false;
      }
    } else if (cur === this.root) {
      this._current = undefined;
    } else if (cur.next === undefined) {
      this._current = cur.parent;
      this._entering = false;
    } else {
      this._current = cur.next;
      this._entering = true;
    }

    return { entering: entering, node: cur };
  }
}

export const walkThrough = <T extends NodeType>(node: Node<T>, callbacks: Record<NodeType, (node: Node<T>, entering: boolean) => void>) => {
  const walker = new NodeWalker(node);
  let e: NodeWalkerEvent<T> | undefined = undefined;
  while ((e = walker.next())) {
    const { node, entering } = e;
    const cb = callbacks[node.type];
    if (cb !== undefined) {
      cb(node, entering);
    }
  }
};