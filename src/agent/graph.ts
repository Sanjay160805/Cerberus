import { StateGraph, END } from "@langchain/langgraph";
import { AgentStateAnnotation } from "./state";
import { ingestNode, analyzeNode, positionNode, decideNode, executeNode } from "./nodes";

export function buildAgentGraph() {
  const graph = new StateGraph(AgentStateAnnotation)
    .addNode("ingest", ingestNode)
    .addNode("analyze", analyzeNode)
    .addNode("position", positionNode)
    .addNode("decide", decideNode)
    .addNode("execute", executeNode)
    .addEdge("__start__", "ingest")
    .addEdge("ingest", "analyze")
    .addEdge("analyze", "position")
    .addEdge("position", "decide")
    .addEdge("decide", "execute")
    .addEdge("execute", END);
  return graph.compile();
}
