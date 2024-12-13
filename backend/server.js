const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const PriorityQueue = require('js-priority-queue');

// MongoDB connection
const mongoURI = 'YOUR_MONGODB_CONNECTION_STRING';
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

const Node = require('./schemas/node');
const Edge = require('./schemas/edge');
const Graph = require('./schemas/graph');
const GraphConfig = require('./schemas/graphRunConfig');
const validateGraph = require('./helper_functions/validateGraph');
const processFunction = require('./helper_functions/processFunction');
const generateRandomRunId = require('./helper_functions/generateUniqueRunId');
const saveNodeResultToDb = require('./helper_functions/saveNodeResult');
const Result = require('./schemas/result');

const app = express();
app.use(bodyParser.json());

// CRUD APIs for Nodes
// Create a new node
app.post('/nodes', async (req, res) => {
    try {
        const node = new Node(req.body);
        await node.save();
        res.status(201).json(node);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Retrieve all nodes
app.get('/nodes', async (req, res) => {
    try {
        const nodes = await Node.find();
        res.json(nodes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Retrieve a specific node by ID
app.get('/nodes/:id', async (req, res) => {
    try {
        const node = await Node.findById(req.params.id);
        if (!node) return res.status(404).json({ message: 'Node not found' });
        res.json(node);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a specific node
app.put('/nodes/:id', async (req, res) => {
    try {
        const node = await Node.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!node) return res.status(404).json({ message: 'Node not found' });
        res.json(node);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a specific node
app.delete('/nodes/:id', async (req, res) => {
    try {
        const node = await Node.findByIdAndDelete(req.params.id);
        if (!node) return res.status(404).json({ message: 'Node not found' });
        res.json({ message: 'Node deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// CRUD APIs for Edges

// Create a new edge
app.post('/edges', async (req, res) => {
    try {
        const edge = new Edge(req.body);
        await edge.save();
        res.status(201).json(edge);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Retrieve all edges
app.get('/edges', async (req, res) => {
    try {
        const edges = await Edge.find();
        res.json(edges);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete Edge by id
app.delete('/edges/:id', async (req, res) => {
    try {
        const edge = await Edge.findByIdAndDelete(req.params.id);
        if (!edge) return res.status(404).json({ message: 'edge not found' });
        res.json({ message: 'edge deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// CRUD APIs for Graphs

// Create or update a new graph
app.post('/graphs', async (req, res) => {
    try {
        const graph = new Graph(req.body);
        await graph.save();
        res.status(201).json(graph);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Retrieve all graphs
app.get('/graphs', async (req, res) => {
    try {
        const graphs = await Graph.find();
        res.json(graphs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete graph by id
app.delete('/graphs/:id', async (req, res) => {
    try {
        const graph = await Graph.findByIdAndDelete(req.params.id);
        if (!graph) return res.status(404).json({ message: 'Graph not found' });
        res.json({ message: 'Graph deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Validate the graph before execution
app.post('/validate-graph/:id', async (req, res) => {
    const graph = await Graph.findById(req.params.id).populate('nodes edges');
    const root_inputs = await req.body;

    // Validate the graph before execution
    /* following checks for graph:
        1. validates the nodes and edges
        2. validate src_node and dst_node
        3. checks for duplicate edges
        4. check for islands == 1, takes multiple roots into account.
        5. checks for cycles/self-loops using topological sort
    */
    const rootNodeIds = root_inputs.root_inputs;
    await validateGraph(graph, rootNodeIds);
    res.json({ message: 'Graph validated successfully' });
});

// Run the graph with the graph config file.
// This API generates a random runId and then stores it along with results schema in the database.
app.post('/run-graph/:id', async (req, res) => {
    try {
        const graphId = req.params.id;
        const graphConfig = new GraphConfig(req.body);

        const { enable_list, disable_list, root_inputs, data_overwrites } = graphConfig;
        console.log("Received request to run graph with ID:", graphId);

        // Step 1: Validate Config File
        if (enable_list.length > 0 && disable_list.length > 0) {
            console.log("Error: Both enable_list and disable_list provided.");
            return res.status(400).send({ error: 'Only one of enable_list or disable_list can be provided.' });
        }

        console.log("Validating root_inputs and data_overwrites...");
        console.log("root_inputs:", root_inputs);
        for (let nodeId of root_inputs.keys()) {
            const rootNode = await Node.findOne({ node_id: nodeId });
            if (!rootNode) {
                console.log(`Error: Root node ${nodeId} not found in database.`);
                return res.status(400).send({ error: `Root node ${nodeId} not found in database.` });
            }
            // Use the get method to access the value associated with the nodeId key
            const rootInputValue = root_inputs.get(nodeId); // This retrieves the value for the current nodeId

            const requiredDataInKeys = Object.keys(rootNode.data_in);
            const providedDataInKeys = Object.keys(rootInputValue.data_in); // Access data_in correctly

            if (!requiredDataInKeys.every(key => providedDataInKeys.includes(key))) {
                console.log(`Error: Incomplete data_in keys for root node ${nodeId}.`);
                return res.status(400).send({ error: `Incomplete data_in keys for root node ${nodeId}.` });
            }
        }

        for (let nodeId of data_overwrites.keys()) {
            const overwriteNode = await Node.findOne({ node_id: nodeId });
            if (!overwriteNode) {
                console.log(`Error: Overwrite node ${nodeId} not found in database.`);
                return res.status(400).send({ error: `Overwrite node ${nodeId} not found in database.` });
            }
            const overwriteValue = data_overwrites.get(nodeId); // Retrieve the value for the current nodeId
            const providedDataInKeys = Object.keys(overwriteValue.data_in); // Access data_in correctly

            if (!providedDataInKeys.length) {
                console.log(`Error: data_in values must be provided for overwrite node ${nodeId}.`);
                return res.status(400).send({ error: `data_in values must be provided for overwrite node ${nodeId}.` });
            }
        }

        // Step 2: Build in-degree map and initialize priority queue for topological order
        console.log("Building in-degree map and initializing priority queue...");
        const inDegree = {};
        var nodesMap = {};
        const queue = new PriorityQueue((a, b) => a.localeCompare(b));

        // Fetch the graph and populate nodesMap
        const graph = await Graph.findById(graphId).populate('nodes edges');
        if (!graph) {
            return res.status(404).send({ error: 'Graph not found.' });
        }

        for (const node of graph.nodes) {
            nodesMap[node.node_id] = {
                node_id: node.node_id,
                data_in: new Map(),          
                data_out: node.data_out || {}, 
                paths_in: node.paths_in || [], 
                paths_out: node.paths_out || [], 
                status: "unprocessed",         
                is_enabled: null,               
                level: null,                  
                timestamp: Date.now()         
            };
            if (enable_list.length > 0) {
                if (enable_list.includes(node.node_id)) {
                    nodesMap[node.node_id].is_enabled = true;
                } else {
                    nodesMap[node.node_id].is_enabled = false;
                }
            }
            if (disable_list.length > 0) {
                if (disable_list.includes(node.node_id)) {
                    nodesMap[node.node_id].is_enabled = false;
                } else {
                    nodesMap[node.node_id].is_enabled = true;
                }
            }
        }

        // Initialize in-degrees
        for (const nodeId in nodesMap) {
            inDegree[nodeId] = 0; // Initialize in-degrees for all nodes
        }

        for (const edge of graph.edges) {
            const { src_node, dst_node } = edge;
            const targetNode = await Node.findById(dst_node); // Fetch target node using ObjectId
            console.log(`Processing edge ${targetNode.node_id}...`);
            if (targetNode) {
                const targetNodeId = targetNode.node_id; // Access the node_id property

                // Increment in-degree for the target node based on its node_id
                inDegree[targetNodeId] = (inDegree[targetNodeId] || 0) + 1;
            }
        }
        // Now process root nodes in `root_inputs` and validate in-degrees
        for (let [nodeId, rootInput] of root_inputs.entries()) {
            console.log(`Processing root node ${nodeId}...`);
            nodesMap[nodeId].level = 0;
            // Check if in-degree is non-zero for root node
            if (inDegree[nodeId] > 0) {
                console.error(`Root node ${nodeId} has a non-zero in-degree (${inDegree[nodeId]}). Skipping this node.`);
                continue;
            }

            // Initialize node from nodesMap with data_in from root_inputs
            if (nodesMap[nodeId]) {
                nodesMap[nodeId].data_in = new Map(rootInput.data_in); // Initialize data_in from root_inputs
            } else {
                console.error(`Node ${nodeId} not found in nodesMap. Skipping this node.`);
                continue;
            }

            // Add root nodes with in-degree 0 to the queue
            queue.queue(nodeId);
            console.log(`Root node ${nodeId} added to queue.`);
        };

        console.log("In-degree map:", inDegree);
        console.log("Nodes map:", nodesMap);


        // Step 3: Process nodes in topological order
        console.log("Processing nodes in topological order...");
        const processedNodes = new Set();
        while (queue.length > 0) {
            const currentNodeId = queue.dequeue();
            console.log(`Processing node ${currentNodeId}...`);
            // Retrieve the current node from nodesMap
            let currentNode = nodesMap[currentNodeId];
            if (!currentNode) {
                console.error(`Node ${currentNodeId} not found in nodesMap. Skipping this node.`);
                continue;
            }

            // Apply data overwrite if present for the current node
            if (data_overwrites.has(currentNodeId)) {
                console.log(`Applying data overwrite for node ${currentNodeId}`);

                // Get the overwrite data for the current node
                const overwriteData = data_overwrites.get(currentNodeId);
                console.log(`overwriteData:`, overwriteData);

                // Get the data_in from overwriteData
                const overwriteDataIn = overwriteData.data_in;

                nodesMap[currentNodeId]["data_in"] = new Map(overwriteDataIn);

                console.log(`Updated data_in for node ${currentNodeId}:`, nodesMap[currentNodeId].data_in);
            }

            // Process the current node based on `data_in` and update `data_out`
            let processedDataOut;
            try {
                processedDataOut = processFunction(currentNode.data_in); // Ensure processFunction returns a Map
                currentNode.data_out = new Map();
                for (const [key, value] of processedDataOut.entries()) {
                    currentNode.data_out.set(key, value);
                }
                console.log(`Processed data_out for node ${currentNodeId}:`, Array.from(currentNode.data_out.entries()));
            } catch (error) {
                console.error(`Error processing data_out for node ${currentNodeId}: ${error.message}`);
                continue;
            }

            // Update neighbors (using paths_out) and adjust in-degrees
            for (const node of currentNode.paths_out) {
                try {
                    const neighborNode = await Node.findById(node);
                    const neighborNodeId = neighborNode.node_id;
                    let neighborNodesMap = nodesMap[neighborNodeId];

                    if (!neighborNodesMap) {
                        console.warn(`Neighbor node with node ID ${node} not found. Skipping this neighbor.`);
                        continue;
                    }

                    // Ensure neighborNode's data_in is a Map
                    // neighborNodesMap.data_in = neighborNodesMap.data_in instanceof Map ? neighborNodesMap.data_in : new Map();

                    // Copy `data_out` from current node to `data_in` of the neighbor node
                    for (const [key, value] of currentNode.data_out.entries()) {
                        neighborNodesMap.data_in.set(key, value);
                    }
                    nodesMap[neighborNodeId] = neighborNodesMap;

                    // Update in-degree and check if it qualifies to be added to the queue
                    inDegree[neighborNodeId] -= 1;
                    console.log(`Updated in-degree for neighbor ${neighborNodeId}: ${inDegree[neighborNodeId]}`);
                    if (inDegree[neighborNodeId] === 0 && !processedNodes.has(neighborNodeId) && nodesMap[neighborNodeId].is_enabled) {
                        queue.queue(neighborNodeId);
                        nodesMap[neighborNodeId].level = currentNode.level + 1;
                        console.log(`Neighbor ${neighborNodeId} added to queue.`);
                    }
                } catch (error) {
                    console.error(`Error processing neighbor with node ID ${node}: ${error.message}`);
                }
            }

            processedNodes.add(currentNodeId);
            nodesMap[currentNodeId].status = "processed";
            nodesMap[currentNodeId].timestamp = Date.now();
        }
        console.log("Processed nodes:", processedNodes);
        console.log("Nodes map:", nodesMap);
        
        // Nodes that are not processed will be marked as disabled.
        for(const nodeId in nodesMap) {
            console.log(`NodeId ${nodeId}`);   
            if(!processedNodes.has(nodeId)) {
                console.log(`Node ${nodeId} not processed`);
                console.log("initial enabled or not",nodesMap[nodeId].is_enabled);
                nodesMap[nodeId].is_enabled = false;
            }
        }
        // Clean metadata from nodesMap data_in
        // metadata keys to exclude
        const metadataKeys = new Set([
            '$__parent',
            '$basePath',
            '$__',
            '_doc',
            '__v',
            '$__deferred',
            '$__path',
            '$__schemaType'
        ]);

        // Clean metadata from nodesMap
        for (const nodeId in nodesMap) {
            const node = nodesMap[nodeId];

            // Remove metadata keys from data_in Map
            for (const key of metadataKeys) {
                if (node.data_in.has(key)) {
                    node.data_in.delete(key);
                }
            }

            // Uncomment to remove metadata from data_out too
            // for (const key of metadataKeys) {
            //     if (node.data_out.has(key)) {
            //         node.data_out.delete(key);
            //     }
            // }

            // Log the cleaned node for verification
            console.log(`Cleaned node ${nodeId}:`, node);
        }

        // Proceed with the next steps after cleaning
        console.log("Nodes map after cleaning metadata:", nodesMap);

        // Step 4: Generate unique run_id and save in result schema
        const runId = generateRandomRunId();
        console.log("Run ID:", runId);
        await saveNodeResultToDb(runId, graphId, nodesMap, graphConfig, processedNodes);
        console.log("Graph run completed. Run ID:", runId);

        res.status(200).send({ runId, message: 'Graph run completed successfully.' });

    } catch (error) {
        console.error("Error encountered during graph run:", error);
        res.status(500).send({ error: error.message });
    }
});

// get graph results by runId
app.get('/graphs/results/:id', async (req, res) => {
    try {
        const graphResults = await Result.findOne({ run_id: req.params.id });
        if (!graphResults) return res.status(404).json({ message: 'runId not found' });
        res.json(graphResults);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// get graph data_out by runId and nodeId
app.get('/graphs/results/:nodeId/:runId', async (req, res) => {
    try {
        const graphResults = await Result.findOne({ run_id: req.params.runId });
        if (!graphResults) return res.status(404).json({ message: 'runId not found' });
        var nodeId = req.params.nodeId.toString();
        const outputs = graphResults["node_results"].get(nodeId).get("data_out");
        res.json(outputs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Leaf outputs for the run graph given run_id
app.get('/graphs/leaf-outputs/:runId', async (req, res) => {
    try {
        const graphResults = await Result.findOne({ run_id: req.params.runId });
        if (!graphResults) return res.status(404).json({ message: 'runId not found' });

        let maxLevel = 0;
        var nodeList = Array.from(graphResults["node_results"].keys());
        for (const key of nodeList) {
            if (graphResults["node_results"].get(key).get("level") > maxLevel) {
                maxLevel = graphResults["node_results"].get(key).get("level");
            }
        }

        console.log("Maximum level:", maxLevel);
        const results = [];
        for (const nodeId of nodeList) {
            const level = graphResults["node_results"].get(nodeId).get("level");
            console.log(`Node ID: ${nodeId}, Level: ${level}`);
            if (level == maxLevel) {
                results.push({ nodeId, data_out: graphResults["node_results"].get(nodeId).get("data_out")});
            }
        }
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// get graph level-wise travesal
app.get('/graphs/level-wise/:runId', async (req, res) => {
    try {
        const graphResults = await Result.findOne({ run_id: req.params.runId });
        if (!graphResults) return res.status(404).json({ message: 'runId not found' });

        // Initialize an object to group nodes by their levels
        const levels = {};

        // Iterate through each node in node_results
        var nodeList = Array.from(graphResults["node_results"].keys());
        for (const nodeId of nodeList) {
            const level = graphResults["node_results"].get(nodeId).get("level"); // Default to level 0 if undefined
            if (level != null && !levels[level]) {
                levels[level] = []; // Initialize the level array if it doesn't exist
            }
            if(level != null){
                levels[level].push({ nodeId, data: graphResults["node_results"].get(nodeId)});
            }
        }
        console.log(levels);
        // Sort levels and format response in level order
        const levelWiseTraversal = Object.keys(levels)
            .sort((a, b) => a - b) // Sort levels numerically
            .map(level => ({
                level: parseInt(level),
                nodes: levels[level]
            }));

        res.json(levelWiseTraversal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// get graph topological order
app.get('/graphs/topological-order/:runId', async (req, res) => {
    try {
        const graphResults = await Result.findOne({ run_id: req.params.runId });
        if (!graphResults) return res.status(404).json({ message: 'runId not found' });
        res.json(graphResults.topological_order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// get graph islands
app.get('/graphs/islands/:runId', async (req, res) => {
    try {
        const graphResults = await Result.findOne({ run_id: req.params.runId });
        if (!graphResults) return res.status(404).json({ message: 'runId not found' });
        res.json(graphResults.islands);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
