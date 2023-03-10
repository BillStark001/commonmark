import { isContainer, Node, NodeType } from './node';

/* Example of use of walker:

 var walker = w.walker();
 var event;

 while (event = walker.next()) {
 console.log(event.entering, event.node.type);
 }

 */

export type NodeWalkerEvent = {
  entering: boolean;
  node: Node;
};

export class NodeWalker {

  private _current?: Node;
  private _root: Node;
  private _entering: boolean;

  public get current() { return this._current; }
  public get root() { return this._root; }
  public get entering() { return this._entering; }

  constructor(root: Node) {
    this._current = root;
    this._root = root;
    this._entering = true;
  }

  resumeAt(node: Node, entering: boolean) {
    this._current = node;
    this._entering = entering;
  }

  next(): NodeWalkerEvent | undefined {
    const cur = this.current;
    const entering = this.entering;

    if (cur === undefined) {
      return undefined;
    }

    const container = isContainer(cur);

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

export const walkThrough = (node: Node, callbacks: Record<NodeType, (node: Node, entering: boolean) => void>) => {
  const walker = new NodeWalker(node);
  let e: NodeWalkerEvent | undefined = undefined;
  while ((e = walker.next())) {
    const { node, entering } = e;
    const cb = callbacks[node.type];
    if (cb !== undefined) {
      cb(node, entering);
    }
  }
};