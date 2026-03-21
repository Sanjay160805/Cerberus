import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { ThreatAnalysis, AgentDecision, VaultPosition } from "@/lib/types";
import { VolatilityResult } from "@/analysis/volatilityCalculator";

// Reducer for primitive values
const numberReducer = (prev: number, update: number): number => update ?? prev;
const stringReducer = (prev: string | null, update: string | null): string | null => update ?? prev;
const objectReducer = <T>(prev: T | null, update: T | null): T | null => update ?? prev;

export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({ reducer: messagesStateReducer, default: () => [] }),
  cycle: Annotation<number>({ reducer: numberReducer, default: () => 0 }),
  threatAnalysis: Annotation<ThreatAnalysis | null>({ reducer: objectReducer<ThreatAnalysis>, default: () => null }),
  volatility: Annotation<VolatilityResult | null>({ reducer: objectReducer<VolatilityResult>, default: () => null }),
  price: Annotation<number>({ reducer: numberReducer, default: () => 0 }),
  vaultPosition: Annotation<VaultPosition | null>({ reducer: objectReducer<VaultPosition>, default: () => null }),
  decision: Annotation<AgentDecision | null>({ reducer: objectReducer<AgentDecision>, default: () => null }),
  error: Annotation<string | null>({ reducer: stringReducer, default: () => null }),
});

export type AgentStateType = typeof AgentStateAnnotation.State;
