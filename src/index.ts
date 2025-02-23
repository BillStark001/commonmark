/**
 * commonmark.js - CommomMark in JavaScript
 * Copyright (C) 2014 John MacFarlane
 * License: BSD3.

 * Basic usage:
 * ```typescript
 * import { BlockParser, HtmlRenderer } from 'commonmark';
 * var parser = new BlockParser();
 * var renderer = new HtmlRenderer();
 * console.log(renderer.render(parser.parse('Hello *world*')));
 * ```
 */

export {
  Node, 
  type NodeType, 
  type NodeTypeDefinition, 
  type GeneralNodeType, 
  GeneralNodeTypeDefinition, 
  generalIsContainer,
  generalIsCodeBlockCategory, 
  generalNeedsInlineParse,
} from './node';

export {
  NodeWalker, 
  type NodeWalkerEvent, 
  walkThrough
} from './node-walker';

export {
  BlockParser, 
  type BlockHandler, 
  type BlockStartsHandler, 
  type BlockParsingOptions, 
  compileMaybeSpecialRegExp,
  
} from './parse/blocks';

export {
  InlineParser, 
  type InlineHandler, 
  type InlineParsingOptions, 
  compileNonSpecialCharRegExp,
  createTextnode,
  normalizeReference,
  removeDelimitersBetween,
} from './parse/inlines';

export {
  HIERARCHY_HIGHEST_DEFAULT,
  HIERARCHY_BLOCK_QUOTE, HIERARCHY_ATX_HEADING,
  HIERARCHY_FENCED_CODE_BLOCK, HIERARCHY_HTML_BLOCK,
  HIERARCHY_SETEXT_HEADING, HIERARCHY_THEMATIC_BREAK,
  HIERARCHY_LIST_ITEM, HIERARCHY_INDENTED_CODE_BLOCK,
  HIERARCHY_LOWEST_DEFAULT
} from './parse/blocks';

export {
  compileBlockStartsTriggerWithChar,
  compileBlockStartsTriggerWithRegex,
  Conditions as StartingConditions
} from './parse/blocks';

export * as common from './common';

export { Renderer } from './render/renderer';
export { HtmlRenderer, type HtmlRenderingOptions } from './render/html';
export { XmlRenderer, type XmlRenderingOptions } from './render/xml';
