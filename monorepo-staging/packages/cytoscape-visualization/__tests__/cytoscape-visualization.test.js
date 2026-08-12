import {
  createGraphEdgeId,
  createGraphTermId,
  classifyOntologyNode,
  isAxiomSupportNode,
  isRenderedPredicate,
  projectGraphStateToCytoscapeElements,
  projectRdfToGraphState
} from '../src/index.js';
import {
  COMMON_NAMESPACE_IRIS
} from '../../namespace-registry/src/index.js';

const namedNode = (value) => ({ termType: 'NamedNode', value });
const blankNode = (value) => ({ termType: 'BlankNode', value });
const literal = (value, datatype = COMMON_NAMESPACE_IRIS.xsd.string, language = '') => ({
  termType: 'Literal',
  value,
  language,
  datatype: namedNode(datatype)
});
const defaultGraph = () => ({ termType: 'DefaultGraph', value: '' });
const quad = (subject, predicate, object, graph = defaultGraph()) => ({ subject, predicate, object, graph });

describe('Cytoscape visualization Phase 1 graph state', () => {
  test('creates stable RDF term and edge IDs', () => {
    expect(createGraphTermId(namedNode('http://example.org/A'))).toBe('rdf-term:NamedNode:http%3A%2F%2Fexample.org%2FA');
    expect(createGraphTermId(blankNode('b1'))).toBe('rdf-term:BlankNode:b1');
    expect(createGraphTermId(literal('hello', COMMON_NAMESPACE_IRIS.xsd.string, 'en'))).toBe(
      `rdf-term:Literal:hello:${encodeURIComponent(COMMON_NAMESPACE_IRIS.xsd.string)}:en`
    );

    const edgeId = createGraphEdgeId(quad(
      namedNode('http://example.org/A'),
      namedNode(COMMON_NAMESPACE_IRIS.rdfs.subClassOf),
      namedNode('http://example.org/B'),
      namedNode('http://example.org/graph')
    ));
    expect(edgeId).toContain('rdf-term:NamedNode:http%3A%2F%2Fexample.org%2Fgraph');
  });

  test('projects type statements into classification and keeps literal annotations off edges by default', () => {
    const state = projectRdfToGraphState([
      quad(namedNode('http://example.org/Person'), namedNode(COMMON_NAMESPACE_IRIS.rdf.type), namedNode(COMMON_NAMESPACE_IRIS.owl.Class)),
      quad(namedNode('http://example.org/Person'), namedNode(COMMON_NAMESPACE_IRIS.rdfs.label), literal('Person')),
      quad(namedNode('http://example.org/Person'), namedNode(COMMON_NAMESPACE_IRIS.rdfs.subClassOf), namedNode('http://example.org/Entity'))
    ]);
    const person = state.nodes.find((node) => node.iri === 'http://example.org/Person');

    expect(person.kind).toBe('class');
    expect(person.annotations[0]).toMatchObject({
      predicateIri: COMMON_NAMESPACE_IRIS.rdfs.label,
      value: 'Person'
    });
    expect(state.edges).toHaveLength(1);
  });

  test('deduplicates nodes, preserves named graphs, and hides blank nodes in Cytoscape projection by default', () => {
    const state = projectRdfToGraphState([
      quad(namedNode('http://example.org/A'), namedNode('http://example.org/p'), namedNode('http://example.org/B'), namedNode('http://example.org/g1')),
      quad(namedNode('http://example.org/A'), namedNode('http://example.org/p'), namedNode('http://example.org/B'), namedNode('http://example.org/g2')),
      quad(blankNode('b1'), namedNode('http://example.org/p'), namedNode('http://example.org/A'))
    ]);
    const elements = projectGraphStateToCytoscapeElements(state);

    expect(state.nodes.filter((node) => node.iri === 'http://example.org/A')).toHaveLength(1);
    expect(new Set(state.edges.map((edge) => edge.graphId)).size).toBe(3);
    expect(elements.filter((element) => element.group === 'nodes').every((node) => node.data.kind !== 'blank-node')).toBe(true);
  });
});

describe('Cytoscape visualization Phase 2 ontology classification', () => {
  test('treats rdf:type as metadata unless all-triples rendering is requested', () => {
    expect(isRenderedPredicate(COMMON_NAMESPACE_IRIS.rdf.type)).toBe(false);
    expect(isRenderedPredicate(COMMON_NAMESPACE_IRIS.rdf.type, { includeTypeEdges: true })).toBe(true);
    expect(isRenderedPredicate(COMMON_NAMESPACE_IRIS.rdfs.subClassOf)).toBe(true);
  });

  test('applies deterministic type precedence for ontology resources', () => {
    const node = {
      term: namedNode('http://example.org/Ontology'),
      typeIris: [
        COMMON_NAMESPACE_IRIS.owl.Class,
        COMMON_NAMESPACE_IRIS.owl.Ontology
      ]
    };

    expect(classifyOntologyNode(node)).toBe('ontology');
  });

  test('classifies common OWL restriction blank nodes as axiom support and hides them by default', () => {
    const restriction = blankNode('restriction1');
    const state = projectRdfToGraphState([
      quad(namedNode('http://example.org/Part'), namedNode(COMMON_NAMESPACE_IRIS.rdfs.subClassOf), restriction),
      quad(restriction, namedNode(COMMON_NAMESPACE_IRIS.rdf.type), namedNode(COMMON_NAMESPACE_IRIS.owl.Restriction)),
      quad(restriction, namedNode(COMMON_NAMESPACE_IRIS.owl.onProperty), namedNode('http://example.org/partOf')),
      quad(restriction, namedNode(COMMON_NAMESPACE_IRIS.owl.someValuesFrom), namedNode('http://example.org/Whole'))
    ]);
    const restrictionNode = state.nodes.find((node) => node.term?.termType === 'BlankNode');

    expect(isAxiomSupportNode(restrictionNode, state.indexes)).toBe(true);
    expect(restrictionNode.kind).toBe('axiom-support');
    expect(projectGraphStateToCytoscapeElements(state).some((element) => element.data.kind === 'axiom-support')).toBe(false);
    expect(projectGraphStateToCytoscapeElements(state, { hideAxiomSupportNodes: false }).some((element) => element.data.kind === 'axiom-support')).toBe(true);
  });

  test('keeps unknown named resources neutral', () => {
    expect(classifyOntologyNode({ term: namedNode('http://example.org/Unknown'), typeIris: [] })).toBe('resource');
  });
});
