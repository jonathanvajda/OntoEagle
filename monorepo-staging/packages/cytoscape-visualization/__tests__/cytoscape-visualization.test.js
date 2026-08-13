import {
  createGraphEdgeId,
  createGraphTermId,
  buildInspectorViewModel,
  buildLabelIndex,
  buildNodePropertyIndex,
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

describe('Cytoscape visualization Phase 3 label and property indexes', () => {
  test('prefers rdfs:label over alternate label predicates and preserves multiline labels', () => {
    const subject = namedNode('http://example.org/Entity');
    const labelIndex = buildLabelIndex([
      quad(subject, namedNode(COMMON_NAMESPACE_IRIS.skos.prefLabel), literal('Preferred label')),
      quad(subject, namedNode(COMMON_NAMESPACE_IRIS.rdfs.label), literal('Line one\nLine two', COMMON_NAMESPACE_IRIS.xsd.string, 'en'))
    ]);

    expect(labelIndex.get(createGraphTermId(subject))).toMatchObject({
      label: 'Line one\nLine two',
      predicateIri: COMMON_NAMESPACE_IRIS.rdfs.label,
      language: 'en'
    });
  });

  test('builds deterministic node property rows for repeated annotations and typed literals', () => {
    const subject = namedNode('http://example.org/Entity');
    const quads = [
      quad(subject, namedNode(COMMON_NAMESPACE_IRIS.rdf.type), namedNode(COMMON_NAMESPACE_IRIS.owl.Class)),
      quad(subject, namedNode(COMMON_NAMESPACE_IRIS.rdfs.comment), literal('Second comment')),
      quad(subject, namedNode(COMMON_NAMESPACE_IRIS.rdfs.comment), literal('First comment', COMMON_NAMESPACE_IRIS.xsd.string, 'en')),
      quad(subject, namedNode('http://example.org/age'), literal('42', COMMON_NAMESPACE_IRIS.xsd.integer)),
      quad(subject, namedNode(COMMON_NAMESPACE_IRIS.rdfs.subClassOf), namedNode('http://example.org/Parent'))
    ];
    const state = projectRdfToGraphState(quads);
    const record = buildNodePropertyIndex(quads, state.indexes).get(createGraphTermId(subject));

    expect(record.typeIris).toContain(COMMON_NAMESPACE_IRIS.owl.Class);
    expect(record.annotations).toEqual([
      expect.objectContaining({
        predicateIri: COMMON_NAMESPACE_IRIS.rdfs.comment,
        value: 'First comment',
        language: 'en'
      }),
      expect.objectContaining({
        predicateIri: COMMON_NAMESPACE_IRIS.rdfs.comment,
        value: 'Second comment'
      })
    ]);
    expect(record.datatypeProperties).toEqual([
      expect.objectContaining({
        predicateIri: 'http://example.org/age',
        value: '42',
        datatypeIri: COMMON_NAMESPACE_IRIS.xsd.integer
      })
    ]);
    expect(record.objectProperties).toHaveLength(0);
  });

  test('adds property records to Cytoscape node data and builds grouped inspector view models', () => {
    const subject = namedNode('http://example.org/Entity');
    const state = projectRdfToGraphState([
      quad(subject, namedNode(COMMON_NAMESPACE_IRIS.rdf.type), namedNode(COMMON_NAMESPACE_IRIS.owl.Class)),
      quad(subject, namedNode(COMMON_NAMESPACE_IRIS.rdfs.label), literal('Entity'))
    ]);
    const nodeElement = projectGraphStateToCytoscapeElements(state, { hideBlankNodes: false })
      .find((element) => element.group === 'nodes' && element.data.iri === subject.value);
    const viewModel = buildInspectorViewModel(nodeElement.data, state.indexes.propertyIndex);

    expect(nodeElement.data.propertyRecord).toBeTruthy();
    expect(viewModel.headingRows).toContainEqual(['Label', 'Entity']);
    expect(viewModel.groups.some((group) => group.label === 'Types')).toBe(true);
    expect(viewModel.groups.some((group) => group.label === 'Annotations')).toBe(true);
  });
});
