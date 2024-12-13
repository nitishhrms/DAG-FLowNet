const Result = require('../schemas/result');
async function saveNodeResultToDb(runId, graphId, nodesMap, graphConfig, processedNodes) {
    try {
        // Prepare node results by iterating over nodesMap
        const nodeResults = new Map();
        let islands = {};
        var islandIndexEnabled = 'Enabled';
        var islandIndexDisabled = 0;
        for (const [nodeId, nodeData] of Object.entries(nodesMap)) {
            nodeResults.set(nodeId, {
                node_id: nodeData.node_id,
                data_in: Object.fromEntries(nodeData.data_in), // Convert Map to an object
                data_out: nodeData.data_out,
                paths_in: nodeData.paths_in,
                paths_out: nodeData.paths_out,
                timestamp_node_processed: nodeData.timestamp,
                status: nodeData.status,
                level: nodeData.level,
                is_enabled: nodeData.is_enabled,
            });

            if(nodeData.is_enabled == false) {
                if (!islands[islandIndexDisabled]) {
                    console.log("island",islands[islandIndexDisabled]);
                    islands[islandIndexDisabled] = [];
                }
                islands[islandIndexDisabled].push(nodeId);
                islandIndexDisabled++
            }
            else{
                if (!islands[islandIndexEnabled]) {
                    islands[islandIndexEnabled] = []; 
                }
                islands[islandIndexEnabled].push(nodeId);
            }
        }
        // Create a new Result document with the run details
        const result = new Result({
            run_id: runId,
            graph_id: graphId,
            node_results: nodeResults,
            graph_config: graphConfig,
            topological_order: Array.from(processedNodes),
            islands: islands,
        });

        // Save the result to the database
        await result.save();
        console.log("Node results saved to the database for Run ID:", runId);
        return result;
    
    } catch (error) {
        console.error("Error saving node results to the database:", error);
        throw error;
    }
}

module.exports = saveNodeResultToDb;
