export type GeneralNodeType = 
  'text' | 'softbreak' | 'linebreak' | 'emph' | 'strong' | 'html_inline' | 
  'link' | 'image' | 'code' | 'document' | 'paragraph' |
  'block_quote' | 'item' | 'list' | 'heading' | 'code_block' | 'html_block' | 'thematic_break';

export type NodeType = GeneralNodeType | (string | number | symbol);

export type Position = [[number, number], [number, number]];

export interface ListData {
  type?: string;
  tight?: boolean;
  start?: number;
  delimiter?: string;
  bulletChar?: string;
  padding?: number;
  markerOffset?: number;
}


export const generalIsContainer = <T extends NodeType>(node: Node<T>) => {
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
    return true;
  default:
    return false;
  }
};

export const generalIsCodeBlockCategory = <T extends NodeType>(t: T) => t === 'code_block';
export const generalNeedsInlineParse = <T extends NodeType>(t: T) => t === 'paragraph' || t === 'heading';

export interface NodeTypeDefinition<T extends NodeType> {
  isContainer: (node: Node<T>) => boolean;
  isCodeBlockCategory: (t: T) => boolean;
  needsInlineParse: (t: T) => boolean;
}

export const GeneralNodeTypeDefinition: NodeTypeDefinition<GeneralNodeType> = Object.freeze({
  isContainer: generalIsContainer, 
  isCodeBlockCategory: generalIsCodeBlockCategory, 
  needsInlineParse: generalNeedsInlineParse,
});


export class Node<T extends NodeType> {

  private readonly _type: T;

  private _parent?: Node<T>;
  private _firstChild?: Node<T>;
  private _lastChild?: Node<T>;
  private _prev?: Node<T>;
  private _next?: Node<T>;

  private readonly _sourcepos: Position;
  _lastLineBlank: boolean;
  _lastLineChecked: boolean;
  _open: boolean;
  _string_content?: string;
  _literal?: string;
  _listData: ListData;
  _info?: string;
  _destination?: string;
  _title?: string;
  _isFenced: boolean;
  _fenceChar?: string;
  _fenceLength: number;
  _fenceOffset?: number;
  _level?: number;
  _htmlBlockType?: number;

  _customData?: unknown;


  removeCycle() {
    const n: Node<T> = Object.assign({}, this);
    delete n._parent;
    delete n._lastChild;
    delete n._prev;
    if (n._firstChild !== undefined)
      n._firstChild = n._firstChild.removeCycle();
    if (n._next !== undefined)
      n._next = n._next.removeCycle();
    return n;
  }
  
  constructor(nodeType: T, sourcepos?: Position) {
    this._type = nodeType;
    this._sourcepos = sourcepos ?? [[-1, -1], [-1, -1]];
    this._lastLineBlank = false;
    this._lastLineChecked = false;
    this._open = true;
    this._listData = {};
    this._isFenced = false;
    this._fenceLength = 0;
  }

  get type() {
    return this._type;
  }


  get firstChild() {
    return this._firstChild;
  }
  get lastChild() {
    return this._lastChild;
  }
  get next() {
    return this._next;
  }
  get prev() {
    return this._prev;
  }


  get parent() {
    return this._parent;
  }


  get sourcepos() {
    return this._sourcepos;
  }


  get literal() {
    return this._literal;
  }
  set literal(s) {
    this._literal = s;
  }


  get destination() {
    return this._destination;
  }
  set destination(s) {
    this._destination = s;
  }


  get title() {
    return this._title;
  }
  set title(s) {
    this._title = s;
  }


  get info() {
    return this._info;
  }
  set info(s) {
    this._info = s;
  }


  get level() {
    return this._level;
  }
  set level(s) {
    this._level = s;
  }


  get listType() {
    return this._listData.type;
  }
  set listType(t) {
    this._listData.type = t;
  }


  get listTight() {
    return this._listData.tight;
  }
  set listTight(t) {
    this._listData.tight = t;
  }


  get listStart() {
    return this._listData.start;
  }
  set listStart(n: number | undefined) {
    this._listData.start = n;
  }


  get listDelimiter() {
    return this._listData.delimiter;
  }
  set listDelimiter(delim) {
    this._listData.delimiter = delim;
  }


  get customData() {
    return this._customData;
  }
  set customData(s) {
    this._customData = s;
  }


  appendChild(child: Node<T>) {
    child.unlink();
    child._parent = this;
    if (this._lastChild) {
      this._lastChild._next = child;
      child._prev = this._lastChild;
      this._lastChild = child;
    } else {
      this._firstChild = child;
      this._lastChild = child;
    }
  }

  prependChild(child: Node<T>) {
    child.unlink();
    child._parent = this;
    if (this._firstChild) {
      this._firstChild._prev = child;
      child._next = this._firstChild;
      this._firstChild = child;
    } else {
      this._firstChild = child;
      this._lastChild = child;
    }
  }

  unlink() {
    if (this._prev) {
      this._prev._next = this._next;
    } else if (this._parent) {
      this._parent._firstChild = this._next;
    }
    if (this._next) {
      this._next._prev = this._prev;
    } else if (this._parent) {
      this._parent._lastChild = this._prev;
    }
    this._parent = undefined;
    this._next = undefined;
    this._prev = undefined;
  }

  insertAfter(sibling: Node<T>) {
    sibling.unlink();
    sibling._next = this._next;
    if (sibling._next) {
      sibling._next._prev = sibling;
    }
    sibling._prev = this;
    this._next = sibling;
    sibling._parent = this._parent;
    if (sibling._parent && !sibling._next) {
      sibling._parent._lastChild = sibling;
    }
  }

  insertBefore(sibling: Node<T>) {
    sibling.unlink();
    sibling._prev = this._prev;
    if (sibling._prev) {
      sibling._prev._next = sibling;
    }
    sibling._next = this;
    this._prev = sibling;
    sibling._parent = this._parent;
    if (sibling._parent && !sibling._prev) {
      sibling._parent._firstChild = sibling;
    }
  }

  /**
   * Order of start and end is not checked, so a ring is not guaranteed
   * to be prevented!
   * @param start included
   * @param end included
   */
  static unlinkNodes<T extends NodeType>(start?: Node<T>, end?: Node<T>) {
    // same node
    if (start === end) {
      if (start?.parent !== undefined)
        start.unlink();
      return;
    }
    // top-level
    if (start !== undefined && end === undefined && start.parent === undefined) {
      if (start.prev !== undefined)
        start.prev._next = undefined;
      start._prev = undefined;
      return;
    }
    if (end !== undefined && start === undefined && end.parent === undefined) {
      if (end.next !== undefined)
        end.next._prev = undefined;
      end._next = undefined;
      return;
    }
    if (start !== undefined && end !== undefined && start.parent === undefined && end.parent === undefined) {
      const sn = start.next;
      const ep = end.prev;
      start._next = end.next;
      end._prev = start.prev;
      if (sn !== undefined)
        sn._prev = undefined;
      if (ep !== undefined)
        ep._next = undefined;
      return;
    }
    // with parent
    if (start === undefined) {
      start = end?.parent?.firstChild;
    }
    if (end === undefined) {
      end = start?.parent?.lastChild;
    }
    if (start === undefined || end === undefined)
      throw 'this should never happen...';
    if (start.parent !== end.parent)
      throw 'start and end node must have the same parent!';
    let current: Node<T> | undefined = start;
    const endNext = end.next;
    while (current !== undefined && current !== endNext) {
      const next: Node<T> | undefined = current?.next;
      current.unlink();
      current = next;
    }
  }

}

export default Node;
