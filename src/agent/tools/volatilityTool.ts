/**
 * Volatility Analysis Tool for LangChain Agent
 * Wraps SupraOracles and volatility calculation
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getVolatilityData } from "../../oracle/supraOracle.js";

const volatilityToolSchema = z.object({});

export const volatilityTool = tool(
  async () => {
    try {
      const volatilityData = await getVolatilityData();

      return {
        currentPrice: volatilityData.currentPrice,
        priceChangePercent24h: volatilityData.priceChangePercent24h,
        realizedVolatility: volatilityData.realizedVolatility,
        volatilityClassification: volatilityData.volatilityClassification,
        dataSource: volatilityData.dataSource,
        timestamp: volatilityData.timestamp,
      };
    } catch (error) {
      console.error("✗ Volatility tool failed:", error);
      return {
        currentPrice: 0.15,
        priceChangePercent24h: 0,
        realizedVolatility: 0,
        volatilityClassification: "STABLE",
        dataSource: "mock",
        timestamp: new Date(),
      };
    }
  },
  {
    name: "get_volatility_data",
    description:
      "Fetches current HBAR/USDC price and calculates realized volatility. Returns price, 24h price change %, annualized volatility, classification (STABLE/VOLATILE/EXTREME), and data source.",
    schema: volatilityToolSchema,
  },
);

export default volatilityTool;
