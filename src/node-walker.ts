import { Node, NodeType } from 'commonmark';

export const isContainer = (node: Node) => {
  switch (node.type) {
  case 'document':
  case 'block_quote':
  case 'list':
  case 'item':
  case 'paragraph':
  case 'heading':
  case 'emph':
  case 'strong':
  case 'link':
  case 'image':
  case 'custom_inline':
  case 'custom_block':
    return true;
  default:
    return false;
  }
};

export type NodeWalkerEvent = {
  entering: boolean;
  node: Node;
};

export class NodeWalker {

  private _current: Node | null;
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

  next(): NodeWalkerEvent | null {
    const cur = this.current;
    const entering = this.entering;

    if (cur === null) {
      return null;
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
      this._current = null;
    } else if (cur.next === null) {
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
  let e: NodeWalkerEvent | null = null;
  while ((e = walker.next())) {
    const { node, entering } = e;
    const cb = callbacks[node.type];
    if (cb !== undefined) {
      cb(node, entering);
    }
  }
};