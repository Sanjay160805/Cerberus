/**
 * Type declarations for @langchain/langgraph
 * These modules don't have strict type definitions, so we declare them as any
 */

declare module '@langchain/langgraph' {
  export const AgentState: any;
  export const RunnableCallable: any;
  export const START: any;
  export const END: any;
  export const Graph: any;
}

declare module '@langchain/langgraph/prebuilt' {
  export function createReactAgent(options: any): any;
}
