---

# 🚀 DAG FlowNet

Welcome to the **DAG FlowNet**! Built on **Node.js** and **Express**, and powered by **MongoDB**.

![Node.js](https://img.shields.io/badge/Node.js-6DA55F?style=for-the-badge&logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)

## 📋 Table of Contents
- [👩🏼‍💻 Demo](#-demo)
- [✨ Features & Implementation Guide](#-features--implementation-guide)
- [🔧 Installation](#-installation)
- [⚙️ API Endpoints](#️-api-endpoints)
  - [🔗 Node Endpoints](#-node-endpoints)
  - [🔗 Edge Endpoints](#-edge-endpoints)
  - [🔗 Graph Endpoints](#-graph-endpoints)
  - [🔗 Graph Execution Endpoints](#-graph-execution-endpoints)
  - [🔗 Graph Results Endpoints](#-graph-results-endpoints)
- [🛠 Helper Functions](#-helper-functions)

---

## 👩🏼‍💻 Demo

Watch the demo [here](https://youtu.be/_rHH_r8vPxU).

## ✨ Features & Implementation Guide

For a comprehensive overview of the implementation, check out the [Implementation Guide](https://docs.google.com/document/d/1BRCRPmDuuuDzebZkeF0TLpaTjq9ol43PZTYCPOjqQsE/edit?usp=sharing).

### Key Optimizations:
- **Graph Validation:** Efficient checks for edge compatibility and connectivity with O(N + E) complexity.
- **BFS Execution:** Utilizes a priority queue for efficient node processing in alphabetical order.
- **Informative Result Schema:** The Result schema captures all relevant data, including inputs, outputs, and processing status, making it easy to track and access results.
-  **Memory Management:** Implements space-efficient data structures to minimize overhead during processing.

--- 

## 🔧 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anushka81/DAG-FLowNet.git
   cd DAG-FLowNet
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up MongoDB connection:**
   Update the `mongoURI` variable in `server.js` with your MongoDB connection string.

4. **Start the server:**
   ```bash
   node server.js
   ```
   Your server will be live at `http://localhost:5000`! 🎉

5.  **Import the test_data csv files to respective MongoDB collections.**

## ⚙️ API Endpoints

#### 🔗 **Node Endpoints**
- **POST /nodes**: Create a new node.
- **GET /nodes**: Retrieve all nodes.
- **GET /nodes/:id**: Get a specific node by its ID.
- **PUT /nodes/:id**: Update a specific node by its ID.
- **DELETE /nodes/:id**: Remove a node by its ID.

#### 🔗 **Edge Endpoints**
- **POST /edges**: Create a new edge.
- **GET /edges**: Retrieve all edges.

#### 🔗 **Graph Endpoints**
- **POST /graphs**: Create or update a new graph.
- **GET /graphs**: Retrieve all graphs.
- **DELETE /graphs/:id**: Delete a graph by its ID.

#### 🔗 **Graph Execution Endpoints**
- **POST /validate-graph/:id**: Validate the structure and integrity of a graph, checking for cycles, islands, and more.
- **POST /run-graph/:id**: Execute a graph based on its configuration, processing nodes in topological order.

#### 🔗 **Graph Results Endpoints**
- **GET /graphs/results/:nodeId/:runId**: Retrieve the output data for a specific node and run ID.
- **GET /graphs/leaf-outputs/:runId**: Get outputs for leaf nodes in the graph corresponding to a specific run ID.
- **GET /graphs/level-wise/:runId**: Fetch level-wise traversal of the graph for the given run ID.
- **GET /graphs/topological-order/:runId**: Retrieve the topological order of the graph based on the run ID.
- **GET /graphs/islands/:runId**: Get the islands present in the graph for a specific run ID.

---

## 🛠 Helper Functions

- **validateGraph**: Validates graph structure and constraints.
- **processFunction**: Processes each node based on its data and configuration.
- **generateUniqueRunId**: Creates a unique `runId` for tracking executions.
- **saveNodeResultToDb**: Stores results of node processing in MongoDB.

---

Thank you for checking out the **DAG FlowNet**! For any questions or suggestions, feel free to reach out at anniegirdhar08@gmail.com. Happy coding! 🌟

---
