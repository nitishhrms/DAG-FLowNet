const mongoose = require('mongoose');
const Node = require('../schemas/node');
const Edge = require('../schemas/edge');

const validateGraph = async (graph, root_inputs) => {
    console.log('Starting graph validation');

    // Step 1: Validate the nodes and edges
    console.log('Step 1: Validating nodes and edges');
    const nodes = await Node.find({ _id: { $in: graph.nodes } });
    const edges = await Edge.find({ _id: { $in: graph.edges } });

    if (nodes.length !== graph.nodes.length) {
        console.error('Validation Error: Some nodes are not valid');
        throw new Error('Some nodes are not valid');
    }

    if (edges.length !== graph.edges.length) {
        console.error('Validation Error: Some edges are not valid');
        throw new Error('Some edges are not valid');
    }
    console.log('Nodes and edges validated successfully');

    // Step 2: Validate src_node and dst_node
    console.log('Step 2: Validating src_node and dst_node');
    for (const edge of edges) {
        if (!nodes.some(node => node._id.equals(edge.src_node))) {
            console.error(`Validation Error: Source node ${edge.src_node} does not exist`);
            throw new Error(`Source node ${edge.src_node} does not exist`);
        }
        if (!nodes.some(node => node._id.equals(edge.dst_node))) {
            console.error(`Validation Error: Destination node ${edge.dst_node} does not exist`);
            throw new Error(`Destination node ${edge.dst_node} does not exist`);
        }
    }
    console.log('Source and destination nodes validated successfully');

    // Step 3: Check for duplicate edges
    console.log('Step 3: Checking for duplicate edges');
    const edgeIds = graph.edges;
    const uniqueEdges = new Set(edgeIds);
    if (uniqueEdges.size !== edgeIds.length) {
        console.error('Validation Error: Duplicate edges detected');
        throw new Error('Duplicate edges detected');
    }
    console.log('No duplicate edges detected in graph');

    // Step 4: Check for islands (single connected component) with multi-source BFS
    console.log('Step 4: Checking for islands (single connected component) with multi-source BFS');

    // Ensure at least one root node is provided
    if (root_inputs.length < 1) {
        throw new Error('At least one root node must be specified');
    }

    const visited = new Set();
    const adjacencyList = {};

    // Build adjacency list
    nodes.forEach(node => {
        adjacencyList[node._id] = [];
    });
    edges.forEach(edge => {
        adjacencyList[edge.src_node].push(edge.dst_node);
    });

    console.log('Adjacency list created:', adjacencyList);

    // BFS from each root node
    const bfsQueue = [...root_inputs]; 
    bfsQueue.forEach(root => visited.add(root)); // Mark all roots as visited initially
    while (bfsQueue.length > 0) {
        const node = bfsQueue.shift();
        const neighbors = adjacencyList[node] || [];
        neighbors.forEach(neighbor => {
            const neighborId = neighbor.toString();
            if (!visited.has(neighborId)) {
                visited.add(neighborId);
                bfsQueue.push(neighborId);
            }
        });
    }

    console.log('Visited nodes:', visited);

    // Check if all nodes were visited
    if (visited.size !== nodes.length) {
        console.error('Validation Error: Graph contains islands; not all nodes are reachable from the specified root inputs');
        throw new Error('Graph contains islands; not all nodes are reachable from the specified root inputs');
    }

    console.log('Graph is a single connected component based on root inputs');

    // Step 5: Check for cycles using topological sort
    console.log('Step 5: Checking for cycles using topological sort');
    const indegree = new Map();
    edges.forEach(edge => {
        const dstNodeId = edge.dst_node.toString(); // Convert to string
        indegree.set(dstNodeId, (indegree.get(dstNodeId) || 0) + 1);
    });
    console.log('In-degree map:', indegree);

    const queue = [];
    nodes.forEach(node => {
        if (!indegree.has(node._id.toString())) {
            queue.push(node._id.toString());
        }
    });
    console.log('Initial queue for topological sort:', queue);

    let count = 0;
    while (queue.length > 0) {
        const node = queue.shift();
        count++;
        (adjacencyList[node] || []).forEach(neighbor => {
            const neighborId = neighbor.toString(); // Convert ObjectId to string
            console.log('Processing node', node, 'with neighbor', neighborId);
            indegree.set(neighborId, (indegree.get(neighborId) || 0) - 1);

            if (indegree.get(neighborId) === 0) {
                queue.push(neighborId);
            }
        });
        console.log('Queue after processing node', node, ':', queue);
    }


    if (count !== nodes.length) {
        console.error('Validation Error: Graph contains a cycle');
        throw new Error('Graph contains a cycle');
    }
    console.log('Graph passed topological sort - no cycles detected');

    console.log('Graph validation completed successfully');
};

module.exports = validateGraph;
