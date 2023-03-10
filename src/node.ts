export type NodeType =
  'text' | 'softbreak' | 'linebreak' | 'emph' | 'strong' | 'html_inline' | 'link' | 'image' | 'code' | 'document' | 'paragraph' |
  'block_quote' | 'item' | 'list' | 'heading' | 'code_block' | 'html_block' | 'thematic_break' | 'custom_inline' | 'custom_block';

export type Position = [[number, number], [number, number]];

export interface ListData {
  type?: string;
  tight?: boolean;
  start?: Node;
  delimiter?: string;
  bulletChar?: string;
}


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
}


export class Node {

  _type: NodeType;
  _parent?: Node;
  _firstChild?: Node;
  _lastChild?: Node;
  _prev?: Node;
  _next?: Node;
  _sourcepos?: Position;
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
  _fenceOffset?: string;
  _level?: number;
  _onEnter?: () => void;
  _onExit?: () => void;


  constructor(nodeType: NodeType, sourcepos?: Position) {
    this._type = nodeType;
    this._sourcepos = sourcepos;
    this._lastLineBlank = false;
    this._lastLineChecked = false;
    this._open = true;
    this._listData = {};
    this._isFenced = false;
    this._fenceLength = 0;
  }

  get isContainer() {
    return isContainer(this);
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
  set listStart(n: Node | undefined) {
    this._listData.start = n;
  }


  get listDelimiter() {
    return this._listData.delimiter;
  }
  set listDelimiter(delim) {
    this._listData.delimiter = delim;
  }


  get onEnter() {
    return this._onEnter;
  }
  set onEnter(s) {
    this._onEnter = s;
  }


  get onExit() {
    return this._onExit;
  }
  set onExit(s) {
    this._onExit = s;
  }


  appendChild(child: Node) {
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

  prependChild(child: Node) {
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

  insertAfter(sibling: Node) {
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

  insertBefore(sibling: Node) {
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

}

export default Node;
