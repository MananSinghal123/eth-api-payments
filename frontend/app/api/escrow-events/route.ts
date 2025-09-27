import {
  createAuthInterceptor,
  createRegistry,
  createRequest,
  fetchSubstream,
  isEmptyMessage,
  streamBlocks,
  unpackMapOutput,
} from "@substreams/core";
import { createConnectTransport } from "@connectrpc/connect-node";
import type { NextRequest } from "next/server";
import { EscrowLogEvent, EscrowStreamPayload } from "@/lib/escrow-events";

export const runtime = "nodejs";
export const preferredRegion = "auto";

const SUBSTREAMS_API_TOKEN = process.env.SUBSTREAMS_API_TOKEN;
const SUBSTREAMS_ENDPOINT =
  process.env.SUBSTREAMS_ENDPOINT ?? "https://sepolia.eth.streamingfast.io";
const SUBSTREAMS_PACKAGE_URL = process.env.SUBSTREAMS_PACKAGE_URL;
const SUBSTREAMS_MODULE =
  process.env.SUBSTREAMS_MODULE ?? "map_block_meta";
const SUBSTREAMS_START_BLOCK =
  process.env.SUBSTREAMS_START_BLOCK ?? "5000000";
const ESCROW_CONTRACT_ADDRESS =
  process.env.ESCROW_CONTRACT_ADDRESS?.toLowerCase();

if (!SUBSTREAMS_API_TOKEN) {
  console.warn("Missing SUBSTREAMS_API_TOKEN environment variable");
}
if (!SUBSTREAMS_PACKAGE_URL) {
  console.warn("Missing SUBSTREAMS_PACKAGE_URL environment variable");
}
if (!ESCROW_CONTRACT_ADDRESS) {
  console.warn("Missing ESCROW_CONTRACT_ADDRESS environment variable");
}

const textEncoder = new TextEncoder();

const buildSseEvent = (data: EscrowStreamPayload, eventName?: string) => {
  const sseLines = [
    eventName ? `event: ${eventName}` : undefined,
    `data: ${JSON.stringify(data)}`,
  ].filter(Boolean);
  return `${sseLines.join("\n")}\n\n`;
};

type JsonLog = {
  address?: unknown;
  receipt?: { contractAddress?: unknown };
  logIndex?: unknown;
  index?: unknown;
  block_number?: unknown;
  blockNumber?: unknown;
  transaction_hash?: unknown;
  transactionHash?: unknown;
  tx_hash?: unknown;
  topics?: unknown;
  topic_hashes?: unknown;
  data?: unknown;
  payload?: unknown;
};

type JsonTransaction = {
  hash?: unknown;
  logs?: unknown;
};

type JsonPayload = {
  logs?: unknown;
  transactions?: unknown;
  number?: unknown;
  blockNumber?: unknown;
  timestamp?: unknown;
  block?: { timestamp?: unknown };
};

const toStringSafe = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "object" && "toString" in value) {
    try {
      const result = (value as { toString: () => string }).toString();
      if (typeof result === "string") {
        return result;
      }
    } catch (error) {
      console.error("Failed to stringify value", error);
    }
  }
  return "";
};

const asLogsArray = (value: unknown): JsonLog[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is JsonLog => typeof item === "object" && item !== null);
};

const asTransactionArray = (value: unknown): JsonTransaction[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is JsonTransaction => typeof item === "object" && item !== null);
};

const extractLogs = (payload: JsonPayload | null | undefined): EscrowLogEvent[] => {
  if (!payload) return [];
  const lowerEscrow = ESCROW_CONTRACT_ADDRESS;

  const matchingLogs: EscrowLogEvent[] = [];

  const processLog = (log: JsonLog) => {
    if (!log) return;
    const address = toStringSafe(log.address ?? log.receipt?.contractAddress ?? "").toLowerCase();
    if (lowerEscrow && address !== lowerEscrow) {
      return;
    }

    const logIndexValue = log.logIndex ?? log.index ?? null;
    const blockNumberRaw =
      log.block_number ??
      log.blockNumber ??
      payload?.number ??
      payload?.blockNumber ??
      null;
    const blockNumber =
      typeof blockNumberRaw === "number"
        ? blockNumberRaw
        : blockNumberRaw != null
        ? Number(blockNumberRaw)
        : null;

    matchingLogs.push({
      blockNumber,
      transactionHash:
        toStringSafe(log.transaction_hash ?? log.transactionHash ?? log.tx_hash ?? null) || null,
      logIndex:
        typeof logIndexValue === "number"
          ? logIndexValue
          : logIndexValue != null
          ? Number(logIndexValue)
          : null,
      address: address || null,
      topics: Array.isArray(log.topics)
        ? log.topics.map((t) => toStringSafe(t))
        : Array.isArray(log.topic_hashes)
        ? log.topic_hashes.map((t) => toStringSafe(t))
        : [],
      data: toStringSafe(log.data ?? log.payload ?? null) || null,
      timestamp: toStringSafe(payload?.timestamp ?? payload?.block?.timestamp ?? null) || null,
    });
  };

  asLogsArray(payload.logs).forEach(processLog);

  asTransactionArray(payload.transactions).forEach((tx) => {
    asLogsArray(tx.logs).forEach(processLog);
  }
  );

  return matchingLogs;
};

export async function GET(req: NextRequest): Promise<Response> {
  if (!SUBSTREAMS_API_TOKEN || !SUBSTREAMS_PACKAGE_URL || !ESCROW_CONTRACT_ADDRESS) {
    return new Response("Substreams server not configured", { status: 500 });
  }

  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => abortController.abort(), {
    once: true,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(textEncoder.encode(": connected\n\n"));
      controller.enqueue(
        textEncoder.encode(
          buildSseEvent({
            event: {
              blockNumber: null,
              transactionHash: null,
              logIndex: null,
              address: null,
              topics: [],
              data: null,
              timestamp: null,
            },
            cursor: undefined,
          }, "ready"),
        ),
      );

      const keepAlive = setInterval(() => {
        controller.enqueue(textEncoder.encode(": keep-alive\n\n"));
      }, 15000);

      try {
        const substream = await fetchSubstream(SUBSTREAMS_PACKAGE_URL);
        const registry = createRegistry(substream);
        const transport = createConnectTransport({
          baseUrl: SUBSTREAMS_ENDPOINT,
          httpVersion: "2",
          interceptors: [createAuthInterceptor(SUBSTREAMS_API_TOKEN)],
          jsonOptions: { typeRegistry: registry },
        });

        const request = createRequest({
          substreamPackage: substream,
          outputModule: SUBSTREAMS_MODULE,
          productionMode: true,
          startBlockNum: SUBSTREAMS_START_BLOCK,
          startCursor: undefined,
        });

        for await (const response of streamBlocks(transport, request)) {
          const { response: blockResponse, progress } = response;

          if (blockResponse?.message?.case === "blockScopedData") {
            const output = unpackMapOutput(blockResponse, registry);
            if (!output || isEmptyMessage(output)) {
              continue;
            }

            const jsonPayload = output.toJson({ typeRegistry: registry });
            const logs = extractLogs(jsonPayload);

            logs.forEach((event) => {
              const ssePayload: EscrowStreamPayload = { event };
              if (progress?.cursor) {
                ssePayload.cursor = progress.cursor;
              }
              controller.enqueue(textEncoder.encode(buildSseEvent(ssePayload)));
            });
          }

          if (progress?.cursor) {
            controller.enqueue(
              textEncoder.encode(
                buildSseEvent(
                  {
                    event: {
                      blockNumber: null,
                      transactionHash: null,
                      logIndex: null,
                      address: null,
                      topics: [],
                      data: null,
                      timestamp: null,
                    },
                    cursor: progress.cursor,
                  },
                  "cursor",
                ),
              ),
            );
          }
        }

        controller.close();
      } catch (error: unknown) {
        console.error("Substreams SSE error", error);
        controller.enqueue(
          textEncoder.encode(
            buildSseEvent(
              {
                event: {
                  blockNumber: null,
                  transactionHash: null,
                  logIndex: null,
                  address: null,
                  topics: [],
                  data: error instanceof Error ? error.message : String(error),
                  timestamp: null,
                },
              },
              "error",
            ),
          ),
        );
        controller.error(error);
      } finally {
        clearInterval(keepAlive);
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
