export {
  extractSparqlPrologueDeclarations,
  formatSparqlPrefixDeclarations,
  prependSparqlPrologue,
  splitSparqlPrologueFromBody
} from './prologue.js';

export {
  readBalancedSparqlBraceBlock,
  scanSparqlLexicalTokens,
  stripSparqlLineComments
} from './lexical-scan.js';

export {
  classifySparqlOperationFamily,
  isSparqlUpdateOperation
} from './query-kind.js';

export {
  buildSparqlRewritePreviewRows,
  countAppliedSparqlIriRewrites,
  extractSparqlRewriteTokens,
  formatSparqlIriToken,
  rewriteSparqlIris
} from './iri-rewrite.js';
