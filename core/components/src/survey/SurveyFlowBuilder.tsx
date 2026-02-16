"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnectStart,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import type { SurveyQuestion, QuestionBranch } from "@core/types";
import { getStartQuestion } from "@core/lib/survey-flow";
import { QuestionNode, type QuestionNodeData } from "./QuestionNode";
import { QuestionEditorPanel } from "./QuestionEditorPanel";
import { StartNode } from "./StartNode";
import {
  AddButtonEdge,
  type AddButtonEdgeData,
  type EdgeAction,
} from "./AddButtonEdge";

export interface SurveyFlowBuilderProps {
  questions: SurveyQuestion[];
  onChange: (questions: SurveyQuestion[]) => void;
  readOnly?: boolean;
}

type QNode = Node<QuestionNodeData>;

const START_ID = "__start__";

const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: 500,
};

const toolbarStyle: CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  zIndex: 5,
  display: "flex",
  gap: "8px",
};

const toolbarBtnStyle: CSSProperties = {
  padding: "8px 14px",
  fontSize: "13px",
  fontWeight: 600,
  background: "var(--color-primary, #008080)",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
};

import { LINE_THICKNESS, LINE_SPACING, LAYER_GAP } from "./constants";

const edgeStyle: CSSProperties = {
  stroke: "var(--color-primary, #008080)",
  strokeWidth: LINE_THICKNESS,
  opacity: 0.35,
};

const highlightedEdgeStyle: CSSProperties = {
  stroke: "var(--color-accent, #ff7f50)",
  strokeWidth: LINE_THICKNESS,
  opacity: 1,
};

const nodeTypes: NodeTypes = {
  question: QuestionNode,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- StartNode ignores data, cast is safe
  start: StartNode as any,
};

const edgeTypes: EdgeTypes = {
  addButton: AddButtonEdge,
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

const DEFAULT_NODE_WIDTH = 250;

type InsertHandler = (
  edgeId: string,
  source: string,
  target: string,
  sourceHandle: string | null,
  action: EdgeAction,
) => void;

/**
 * Convert SurveyQuestion[] → React Flow nodes (prepends virtual Start node)
 */
function questionsToNodes(questions: SurveyQuestion[]): QNode[] {
  const first = getStartQuestion(questions);
  const firstPos = first?.position ?? { x: 200, y: 200 };

  /** Remove React Flow's default wrapper border — we style borders on the inner div */
  const wrapperStyle: CSSProperties = { border: "none", boxShadow: "none" };

  // Center START above first question (START width ~48, node ~250)
  const startNode: QNode = {
    id: START_ID,
    type: "start",
    position: {
      x: firstPos.x + DEFAULT_NODE_WIDTH / 2 - 24,
      y: firstPos.y - LAYER_GAP,
    },
    deletable: false,
    selectable: false,
    style: wrapperStyle,
    data: { question: {} as SurveyQuestion },
  };

  const questionNodes: QNode[] = questions.map((q, i) => ({
    id: q.id,
    type: "question" as const,
    position: q.position ?? {
      x: 100 + (i % 3) * 320,
      y: 80 + Math.floor(i / 3) * 260,
    },
    style: wrapperStyle,
    data: { question: q },
  }));

  return [startNode, ...questionNodes];
}

/**
 * Build edge data for the addButton edge type
 */
function makeEdgeData(
  insertRef: React.MutableRefObject<InsertHandler | null>,
  readOnly: boolean,
): AddButtonEdgeData {
  return {
    onInsert: (edgeId, source, target, sourceHandle, action) =>
      insertRef.current?.(edgeId, source, target, sourceHandle, action),
    readOnly,
  };
}

/**
 * Convert SurveyQuestion branches → React Flow edges
 * (includes Start → first question edge)
 */
function questionsToEdges(
  questions: SurveyQuestion[],
  insertRef: React.MutableRefObject<InsertHandler | null>,
  readOnly: boolean,
): Edge[] {
  const edges: Edge[] = [];
  const data = makeEdgeData(insertRef, readOnly);

  // Start → first question edge
  const first = getStartQuestion(questions);
  if (first) {
    edges.push({
      id: `${START_ID}-default-${first.id}`,
      source: START_ID,
      sourceHandle: "default",
      target: first.id,
      targetHandle: "target",
      animated: true,
      deletable: false,
      style: edgeStyle,
      type: "addButton",
      data: { ...data, turnDirection: "straight" },
    });
  }

  for (const q of questions) {
    const hasOpts =
      q.type === "multiple-choice" ||
      (q.type === "text" && q.inference === "process");

    // Check if all branches go to the same target (no fan-out needed)
    const branchTargets = new Set(
      (q.branches ?? [])
        .filter((b) => b.nextQuestionId)
        .map((b) => b.nextQuestionId),
    );
    const allSameTarget = branchTargets.size === 1;

    for (const b of q.branches ?? []) {
      if (!b.nextQuestionId) continue;
      const sourceHandle =
        hasOpts && b.optionId ? `option-${b.optionId}` : "default";

      // Arrow-shaped first segments: outermost lines (left & right) = 2 spacing,
      // each step inward adds +1 spacing, creating a downward chevron.
      // Left half turns left, right half turns right, center goes straight.
      // Exception: if all branches go to the same target, all go straight
      // to avoid U-turns.
      let firstSegment = LINE_SPACING;
      let turnDirection: "left" | "right" | "straight" = allSameTarget
        ? "straight"
        : "right";
      if (hasOpts && b.optionId && q.options) {
        const optIdx = q.options.findIndex((o) => o.id === b.optionId);
        if (optIdx >= 0) {
          const n = q.options.length;
          const distFromEdge = Math.min(optIdx, n - 1 - optIdx);
          firstSegment = (2 + distFromEdge) * LINE_SPACING;

          if (allSameTarget) {
            turnDirection = "straight";
          } else if (n % 2 === 1 && optIdx === Math.floor(n / 2)) {
            turnDirection = "straight";
          } else if (optIdx >= n / 2) {
            turnDirection = "left";
          } else {
            turnDirection = "right";
          }
        }
      }

      edges.push({
        id: `${q.id}-${sourceHandle}-${b.nextQuestionId}`,
        source: q.id,
        sourceHandle,
        target: b.nextQuestionId,
        targetHandle: "target",
        animated: true,
        style: edgeStyle,
        type: "addButton",
        data: { ...data, firstSegment, turnDirection },
      });
    }
  }

  // For targets with multiple incoming edges, set a shared lastSegment
  // so the final vertical drop and preceding horizontal are uniform.
  const incomingCount = new Map<string, number>();
  for (const e of edges) {
    incomingCount.set(e.target, (incomingCount.get(e.target) ?? 0) + 1);
  }
  const SHARED_LAST_SEGMENT = 2 * LINE_SPACING;
  for (const e of edges) {
    if ((incomingCount.get(e.target) ?? 0) > 1) {
      e.data = { ...e.data, lastSegment: SHARED_LAST_SEGMENT };
    }
  }

  return edges;
}

/**
 * Re-derive branches from edges (filters out Start node edges)
 */
function edgesToBranches(edges: Edge[], questionId: string): QuestionBranch[] {
  return edges
    .filter((e) => e.source === questionId && e.source !== START_ID)
    .map((e) => {
      const optionId = e.sourceHandle?.startsWith("option-")
        ? e.sourceHandle.replace("option-", "")
        : undefined;
      return {
        optionId,
        nextQuestionId: e.target,
      };
    });
}

function SurveyFlowBuilderInner({
  questions,
  onChange,
  readOnly = false,
}: SurveyFlowBuilderProps) {
  // Stable ref for the insert handler (avoids stale closures in edge data)
  const insertRef = useRef<InsertHandler | null>(null);

  const initialNodes = useMemo(() => questionsToNodes(questions), [questions]);
  const initialEdges = useMemo(
    () => questionsToEdges(questions, insertRef, readOnly),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- insertRef is stable, readOnly rarely changes
    [questions, readOnly],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Track the source of a pending connection drag
  const connectStartRef = useRef<{
    nodeId: string;
    handleId: string | null;
  } | null>(null);

  // Undo history
  const historyRef = useRef<SurveyQuestion[][]>([]);
  const isUndoingRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);

  const selectedQuestion = useMemo(
    () => questions.find((q) => q.id === selectedId) ?? null,
    [questions, selectedId],
  );

  // Highlight edges and neighbor nodes connected to the selected node or edge
  useEffect(() => {
    const connectedEdgeIds = new Set<string>();
    const neighborIds = new Set<string>();
    // Track which handles on each node are on highlighted edges
    const nodeHighlightedHandles = new Map<string, Set<string>>();

    const addHandle = (nodeId: string, handle: string) => {
      let s = nodeHighlightedHandles.get(nodeId);
      if (!s) {
        s = new Set();
        nodeHighlightedHandles.set(nodeId, s);
      }
      s.add(handle);
    };

    if (selectedEdgeId) {
      for (const e of edges) {
        if (e.id === selectedEdgeId) {
          connectedEdgeIds.add(e.id);
          neighborIds.add(e.source);
          neighborIds.add(e.target);
          if (e.sourceHandle) addHandle(e.source, e.sourceHandle);
          addHandle(e.target, "target");
          break;
        }
      }
    } else if (selectedId) {
      for (const e of edges) {
        if (e.source === selectedId || e.target === selectedId) {
          connectedEdgeIds.add(e.id);
          if (e.source === selectedId) {
            neighborIds.add(e.target);
            if (e.sourceHandle) addHandle(e.source, e.sourceHandle);
            addHandle(e.target, "target");
          }
          if (e.target === selectedId) {
            neighborIds.add(e.source);
            if (e.sourceHandle) addHandle(e.source, e.sourceHandle);
            addHandle(e.target, "target");
          }
        }
      }
    }

    setEdges((prev) =>
      prev.map((e) => {
        const isHighlighted = connectedEdgeIds.has(e.id);
        const target = isHighlighted ? highlightedEdgeStyle : edgeStyle;
        const newData = { ...e.data, highlighted: isHighlighted };
        return e.style === target && e.data?.highlighted === isHighlighted
          ? e
          : { ...e, style: target, data: newData };
      }),
    );
    setNodes((prev) =>
      prev.map((n) => {
        const shouldHighlight = neighborIds.has(n.id);
        const handles = nodeHighlightedHandles.get(n.id);
        const handleArr = handles ? Array.from(handles) : [];
        const prevHandles: string[] =
          (n.data.highlightedHandles as string[]) ?? [];
        if (
          (n.data.highlighted ?? false) === shouldHighlight &&
          prevHandles.length === handleArr.length &&
          prevHandles.every((h, i) => h === handleArr[i])
        )
          return n;
        return {
          ...n,
          data: {
            ...n.data,
            highlighted: shouldHighlight,
            highlightedHandles: handleArr,
          },
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- edges read for neighbor lookup, effect should only re-run on selection change
  }, [selectedId, selectedEdgeId, setEdges, setNodes]);

  /** Wrap onChange to record history before each mutation */
  const changeWithHistory = useCallback(
    (newQuestions: SurveyQuestion[]) => {
      if (!isUndoingRef.current) {
        historyRef.current = [...historyRef.current, questions];
        if (historyRef.current.length > 50) {
          historyRef.current = historyRef.current.slice(-50);
        }
        setCanUndo(true);
      }
      isUndoingRef.current = false;
      onChange(newQuestions);
    },
    [questions, onChange],
  );

  /** Insert a new question on an edge (pencil context menu) */
  const handleInsertOnEdge = useCallback(
    (
      _edgeId: string,
      source: string,
      target: string,
      sourceHandle: string | null,
      action: EdgeAction,
    ) => {
      // --- Delete edge action ---
      if (action === "delete") {
        const updatedQuestions = questions.map((q) => {
          if (q.id !== source || source === START_ID) return q;
          const srcHasOpts =
            q.type === "multiple-choice" ||
            (q.type === "text" && q.inference === "process");
          return {
            ...q,
            branches: (q.branches ?? []).filter((b) => {
              const branchHandle =
                srcHasOpts && b.optionId ? `option-${b.optionId}` : "default";
              return !(
                b.nextQuestionId === target &&
                branchHandle === (sourceHandle ?? "default")
              );
            }),
          };
        });
        setNodes(questionsToNodes(updatedQuestions));
        setEdges(questionsToEdges(updatedQuestions, insertRef, readOnly));
        changeWithHistory(updatedQuestions);
        return;
      }

      // --- Insert question actions ---
      const newId = generateId();

      let newQ: SurveyQuestion;
      if (action === "text") {
        newQ = {
          id: newId,
          questionText: "",
          type: "text",
          required: false,
          order: questions.length + 1,
          options: [],
          branches: [{ nextQuestionId: target }],
          position: { x: 0, y: 0 },
        };
      } else if (action === "finish") {
        newQ = {
          id: newId,
          questionText: "Thank you for your time",
          type: "finish",
          required: false,
          order: questions.length + 1,
          options: [],
          branches: [],
          position: { x: 0, y: 0 },
        };
      } else {
        // multiple-choice (default)
        const opt1Id = generateId();
        const opt2Id = generateId();
        newQ = {
          id: newId,
          questionText: "",
          type: "multiple-choice",
          required: false,
          order: questions.length + 1,
          options: [
            { id: opt1Id, label: "Option 1" },
            { id: opt2Id, label: "Option 2" },
          ],
          branches: [
            { optionId: opt1Id, nextQuestionId: target },
            { optionId: opt2Id, nextQuestionId: target },
          ],
          position: { x: 0, y: 0 },
        };
      }

      // Position new node midway between source and target
      const sourceNode = nodes.find(
        (n) => n.id === (source === START_ID ? START_ID : source),
      );
      const targetNode = nodes.find((n) => n.id === target);
      if (sourceNode && targetNode) {
        const sourceBottom =
          sourceNode.position.y + (sourceNode.measured?.height ?? 160);
        const midY = (sourceBottom + targetNode.position.y) / 2;
        const sourceCenterX =
          sourceNode.position.x +
          (sourceNode.measured?.width ?? DEFAULT_NODE_WIDTH) / 2;
        newQ.position = {
          x: sourceCenterX - DEFAULT_NODE_WIDTH / 2,
          y: midY,
        };
      }

      let updatedQuestions: SurveyQuestion[];

      if (source === START_ID) {
        updatedQuestions = [...questions, newQ];
      } else {
        // Source branch now points to the new node instead of the old target
        updatedQuestions = questions.map((q) => {
          if (q.id !== source) return q;
          const srcHasOpts =
            q.type === "multiple-choice" ||
            (q.type === "text" && q.inference === "process");
          return {
            ...q,
            branches: (q.branches ?? []).map((b) => {
              const branchHandle =
                srcHasOpts && b.optionId ? `option-${b.optionId}` : "default";
              if (
                b.nextQuestionId === target &&
                branchHandle === (sourceHandle ?? "default")
              ) {
                return { ...b, nextQuestionId: newId };
              }
              return b;
            }),
          };
        });
        updatedQuestions = [...updatedQuestions, newQ];
      }

      setNodes(questionsToNodes(updatedQuestions));
      setEdges(questionsToEdges(updatedQuestions, insertRef, readOnly));
      changeWithHistory(updatedQuestions);
      setSelectedId(newId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, nodes, readOnly, setNodes, setEdges, changeWithHistory],
  );

  // Keep insertRef up to date every render
  insertRef.current = handleInsertOnEdge;

  /** Undo the last change */
  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setCanUndo(historyRef.current.length > 0);
    isUndoingRef.current = true;
    setNodes(questionsToNodes(prev));
    setEdges(questionsToEdges(prev, insertRef, readOnly));
    onChange(prev);
  }, [onChange, readOnly, setNodes, setEdges]);

  /** Arrange nodes in a top-down tree layout */
  const arrangeNodes = useCallback(() => {
    const H_GAP = 2 * LINE_SPACING;

    const V_GAP = 8 * LINE_SPACING;

    // Build adjacency: source → target[], target → parents[]
    const children = new Map<string, string[]>();
    const parents = new Map<string, string[]>();
    const allIds = new Set<string>();

    for (const n of nodes) {
      allIds.add(n.id);
    }

    // Build question option index lookup: questionId → { optionId → index }
    const qOptIdx = new Map<string, Map<string, number>>();
    for (const q of questions) {
      if (q.options) {
        const m = new Map<string, number>();
        q.options.forEach((o, i) => m.set(o.id, i));
        qOptIdx.set(q.id, m);
      }
    }

    // Map (source→target) to option index for ordering
    const edgeOptionIdx = new Map<string, number>();

    for (const e of edges) {
      if (!allIds.has(e.source) || !allIds.has(e.target)) continue;
      const c = children.get(e.source) ?? [];
      if (!c.includes(e.target)) c.push(e.target);
      children.set(e.source, c);
      const p = parents.get(e.target) ?? [];
      if (!p.includes(e.source)) p.push(e.source);
      parents.set(e.target, p);

      // Record option index for this edge
      const handle = e.sourceHandle ?? "default";
      const optId = handle.startsWith("option-")
        ? handle.replace("option-", "")
        : null;
      const idx = optId != null ? (qOptIdx.get(e.source)?.get(optId) ?? 0) : 0;
      edgeOptionIdx.set(`${e.source}->${e.target}`, idx);
    }

    // Assign layers via BFS: layer = max(parent layers) + 1
    const layer = new Map<string, number>();
    layer.set(START_ID, 0);
    const queue = [START_ID];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const curLayer = layer.get(cur) ?? 0;
      for (const child of children.get(cur) ?? []) {
        const prev = layer.get(child) ?? -1;
        if (curLayer + 1 > prev) {
          layer.set(child, curLayer + 1);
          queue.push(child);
        }
      }
    }

    // Assign layer 1 to any unconnected nodes
    for (const n of nodes) {
      if (!layer.has(n.id) && n.id !== START_ID) {
        layer.set(n.id, 1);
      }
    }

    // Group nodes by layer
    const layers = new Map<number, string[]>();
    for (const [id, l] of layer) {
      const arr = layers.get(l) ?? [];
      arr.push(id);
      layers.set(l, arr);
    }

    // Measure node dimensions from DOM
    const heights = new Map<string, number>();
    const widths = new Map<string, number>();
    for (const n of nodes) {
      heights.set(n.id, n.measured?.height ?? 80);
      widths.set(n.id, n.measured?.width ?? DEFAULT_NODE_WIDTH);
    }

    // Compute Y per node: V_GAP below the bottom of its lowest parent
    const posY = new Map<string, number>();
    const maxLayer = Math.max(...layer.values());
    posY.set(START_ID, 0);
    for (let l = 1; l <= maxLayer; l++) {
      for (const id of layers.get(l) ?? []) {
        const nodeParents = parents.get(id) ?? [];
        let lowestParentBottom = 0;
        for (const pid of nodeParents) {
          const py = posY.get(pid) ?? 0;
          const ph = heights.get(pid) ?? 80;
          lowestParentBottom = Math.max(lowestParentBottom, py + ph);
        }
        posY.set(id, lowestParentBottom + V_GAP);
      }

      // Align siblings from the same source to the same Y (max among them)
      for (const parentId of layers.get(l - 1) ?? []) {
        const kids = (children.get(parentId) ?? []).filter(
          (c) => layer.get(c) === l,
        );
        if (kids.length < 2) continue;
        const maxY = Math.max(...kids.map((k) => posY.get(k) ?? 0));
        for (const k of kids) {
          posY.set(k, maxY);
        }
      }
    }

    // Compute X: siblings from the same source placed side-by-side,
    // sorted by handle order (descending option index = left-to-right)
    const posX = new Map<string, number>();
    for (let l = 0; l <= maxLayer; l++) {
      const layerNodes = layers.get(l) ?? [];
      // Group nodes by their primary parent (first parent)
      const siblingGroups = new Map<string, string[]>();
      const orphans: string[] = [];
      for (const id of layerNodes) {
        const nodeParents = parents.get(id) ?? [];
        if (nodeParents.length > 0) {
          const primaryParent = nodeParents[0];
          const group = siblingGroups.get(primaryParent) ?? [];
          group.push(id);
          siblingGroups.set(primaryParent, group);
        } else {
          orphans.push(id);
        }
      }

      // Sort each sibling group by descending option index (left-to-right handle order)
      for (const [parentId, group] of siblingGroups) {
        group.sort((a, b) => {
          const aIdx = edgeOptionIdx.get(`${parentId}->${a}`) ?? 0;
          const bIdx = edgeOptionIdx.get(`${parentId}->${b}`) ?? 0;
          return bIdx - aIdx;
        });
      }

      // Order groups by parent X, then lay out sequentially
      const sortedParents = [...siblingGroups.keys()].sort(
        (a, b) => (posX.get(a) ?? 0) - (posX.get(b) ?? 0),
      );

      let x = 0;
      // Place orphans first
      for (const id of orphans) {
        posX.set(id, x);
        x += (widths.get(id) ?? DEFAULT_NODE_WIDTH) + H_GAP;
      }
      // Place sibling groups
      for (const parentId of sortedParents) {
        const group = siblingGroups.get(parentId) ?? [];
        for (const id of group) {
          posX.set(id, x);
          x += (widths.get(id) ?? DEFAULT_NODE_WIDTH) + H_GAP;
        }
      }
    }

    // Multi-parent nodes: left edge flush with leftmost source node's left edge
    for (const [id, nodeParents] of parents) {
      if (nodeParents.length < 2) continue;
      const leftmostParentX = Math.min(
        ...nodeParents.map((pid) => posX.get(pid) ?? 0),
      );
      posX.set(id, leftmostParentX);
    }

    // Single-parent nodes attached to the leftmost output handle:
    // flush left edge with source node's left edge
    for (const [id, nodeParents] of parents) {
      if (nodeParents.length !== 1) continue;
      const parentId = nodeParents[0];
      const optIdx = edgeOptionIdx.get(`${parentId}->${id}`) ?? 0;
      // Find the parent's max option index (leftmost handle)
      const parentQ = questions.find((q) => q.id === parentId);
      const pHasOpts =
        parentQ &&
        (parentQ.type === "multiple-choice" ||
          (parentQ.type === "text" && parentQ.inference === "process"));
      const pOptCount = pHasOpts ? (parentQ?.options?.length ?? 0) : 0;
      if (pOptCount > 1 && optIdx === pOptCount - 1) {
        posX.set(id, posX.get(parentId) ?? 0);
      }
    }

    // Apply positions
    setNodes((prev) =>
      prev.map((n) => {
        const x = posX.get(n.id) ?? n.position.x;
        const y = posY.get(n.id) ?? n.position.y;
        return { ...n, position: { x, y } };
      }),
    );

    // Fit view after layout
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [nodes, edges, setNodes, fitView]);

  /** Keyboard shortcut: Ctrl/Cmd+Z for undo */
  useEffect(() => {
    if (readOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept undo inside text inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, readOnly]);

  /** Remove orphan edges whose source or target node no longer exists */
  useEffect(() => {
    const nodeIds = new Set(nodes.map((n) => n.id));
    setEdges((prev) => {
      const cleaned = prev.filter(
        (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
      );
      return cleaned.length === prev.length ? prev : cleaned;
    });
  }, [nodes, setEdges]);

  /** Sync local flow state back to parent as SurveyQuestion[] */
  const syncToParent = useCallback(
    (
      currentNodes: QNode[],
      currentEdges: Edge[],
      updatedQuestions?: SurveyQuestion[],
    ): SurveyQuestion[] => {
      const base = updatedQuestions ?? questions;
      const qMap = new Map(base.map((q) => [q.id, q]));

      // Filter out the virtual Start node before syncing
      const synced: SurveyQuestion[] = currentNodes
        .filter((n) => n.id !== START_ID)
        .map((n) => {
          const existing = qMap.get(n.id) ?? n.data.question;
          return {
            ...existing,
            position: { x: n.position.x, y: n.position.y },
            branches: edgesToBranches(currentEdges, n.id),
          };
        });

      changeWithHistory(synced);
      return synced;
    },
    [questions, changeWithHistory],
  );

  /** Check whether a question can be deleted (last finish node cannot) */
  const canDeleteQuestion = useCallback(
    (questionId: string) => {
      const q = questions.find((q) => q.id === questionId);
      if (!q || q.type !== "finish") return true;
      const finishCount = questions.filter((q) => q.type === "finish").length;
      return finishCount > 1;
    },
    [questions],
  );

  /** Handle node drag / drag-end — persist positions */
  const handleNodesChange: OnNodesChange<QNode> = useCallback(
    (changes) => {
      // Block removal of the last finish node (keyboard Backspace)
      const filtered = changes.filter((c) => {
        if (c.type !== "remove") return true;
        return canDeleteQuestion(c.id);
      });

      onNodesChange(filtered);

      // On drag end, sync positions back to questions and rebuild edges
      const hasDragEnd = filtered.some(
        (c) => c.type === "position" && !c.dragging,
      );
      if (hasDragEnd) {
        requestAnimationFrame(() => {
          setNodes((latest) => {
            const qMap = new Map(questions.map((q) => [q.id, q]));
            const updatedQs: SurveyQuestion[] = (latest as QNode[])
              .filter((n) => n.id !== START_ID)
              .map((n) => {
                const existing = qMap.get(n.id) ?? n.data.question;
                return {
                  ...existing,
                  position: { x: n.position.x, y: n.position.y },
                };
              });

            setEdges(questionsToEdges(updatedQs, insertRef, readOnly));
            changeWithHistory(updatedQs);
            return latest;
          });
        });
      }
    },
    [
      onNodesChange,
      canDeleteQuestion,
      questions,
      readOnly,
      setNodes,
      setEdges,
      changeWithHistory,
    ],
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      const hasRemove = changes.some((c) => c.type === "remove");
      if (hasRemove) {
        requestAnimationFrame(() => {
          setNodes((latest) => {
            setEdges((latestEdges) => {
              const updatedQs = syncToParent(latest as QNode[], latestEdges);
              return questionsToEdges(updatedQs, insertRef, readOnly);
            });
            return latest;
          });
        });
      }
    },
    [onEdgesChange, setNodes, setEdges, syncToParent, readOnly],
  );

  /** Handle new edge connection — removes existing edge from same source handle first */
  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((prev) => {
        // Remove any existing edge from the same source handle (one edge per handle)
        const filtered = prev.filter(
          (e) =>
            !(e.source === conn.source && e.sourceHandle === conn.sourceHandle),
        );
        const next = addEdge(
          {
            ...conn,
            animated: true,
            style: edgeStyle,
            type: "addButton",
            data: makeEdgeData(insertRef, readOnly),
          },
          filtered,
        );
        requestAnimationFrame(() => {
          setNodes((latestNodes) => {
            const updatedQs = syncToParent(latestNodes as QNode[], next);
            setEdges(questionsToEdges(updatedQs, insertRef, readOnly));
            return latestNodes;
          });
        });
        return next;
      });
    },
    [readOnly, setEdges, setNodes, syncToParent],
  );

  /** Track connection drag start so we know the source on drop */
  const onConnectStart: OnConnectStart = useCallback((_event, params) => {
    connectStartRef.current = {
      nodeId: params.nodeId ?? "",
      handleId: params.handleId ?? null,
    };
  }, []);

  /**
   * When a connection drag ends on empty canvas (no target node),
   * create a new MC question at the drop position and connect it.
   */
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const origin = connectStartRef.current;
      connectStartRef.current = null;
      if (!origin?.nodeId) return;

      // Check if the drop target is the canvas (not an existing node handle)
      const target = (event as MouseEvent).target as HTMLElement;
      const isPane = target.classList.contains("react-flow__pane");
      if (!isPane) return;

      // Get canvas position from mouse/touch coordinates
      const clientX =
        "changedTouches" in event
          ? event.changedTouches[0].clientX
          : (event as MouseEvent).clientX;
      const clientY =
        "changedTouches" in event
          ? event.changedTouches[0].clientY
          : (event as MouseEvent).clientY;

      const position = screenToFlowPosition({ x: clientX, y: clientY });

      // Create a new MC question node at the drop position
      const id = generateId();
      const order = questions.length + 1;
      const newQ: SurveyQuestion = {
        id,
        questionText: "",
        type: "multiple-choice",
        required: false,
        order,
        options: [
          { id: generateId(), label: "Option 1" },
          { id: generateId(), label: "Option 2" },
        ],
        position: { x: position.x, y: position.y },
        branches: [],
      };

      const newNode: QNode = {
        id,
        type: "question",
        position: newQ.position!,
        data: { question: newQ },
      };

      // Create the edge from source handle → new node
      const newEdge: Edge = {
        id: `${origin.nodeId}-${origin.handleId ?? "default"}-${id}`,
        source: origin.nodeId,
        sourceHandle: origin.handleId,
        target: id,
        targetHandle: "target",
        animated: true,
        style: edgeStyle,
        type: "addButton",
        data: makeEdgeData(insertRef, readOnly),
      };

      setNodes((prev) => [...prev, newNode]);
      // Remove any existing edge from the same source handle before adding new one
      setEdges((prev) => [
        ...prev.filter(
          (e) =>
            !(e.source === origin.nodeId && e.sourceHandle === origin.handleId),
        ),
        newEdge,
      ]);

      const updatedQuestions = [...questions, newQ];
      requestAnimationFrame(() => {
        setNodes((latestNodes) => {
          setEdges((latestEdges) => {
            const syncedQs = syncToParent(
              latestNodes as QNode[],
              latestEdges,
              updatedQuestions,
            );
            return questionsToEdges(syncedQs, insertRef, readOnly);
          });
          return latestNodes;
        });
      });

      setSelectedId(id);
    },
    [
      questions,
      readOnly,
      screenToFlowPosition,
      setNodes,
      setEdges,
      syncToParent,
    ],
  );

  /** Handle node click to open editor */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- React Flow onNodeClick types are loosely generic
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: QNode) => {
      setSelectedEdgeId(null);
      if (!readOnly && node.id !== START_ID) setSelectedId(node.id);
    },
    [readOnly],
  );

  /** Handle edge click to highlight single line */
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedId(null);
    setSelectedEdgeId(edge.id);
  }, []);

  /** Clear selection on pane click */
  const onPaneClick = useCallback(() => {
    setSelectedId(null);
    setSelectedEdgeId(null);
  }, []);

  /** Add a new question */
  const addQuestion = useCallback(
    (type: "text" | "multiple-choice") => {
      const id = generateId();
      const order = questions.length + 1;
      const newQ: SurveyQuestion = {
        id,
        questionText: "",
        type,
        required: false,
        order,
        options:
          type === "multiple-choice"
            ? [
                { id: generateId(), label: "Option 1" },
                { id: generateId(), label: "Option 2" },
              ]
            : undefined,
        position: {
          x: 100 + (questions.length % 3) * 320,
          y: 80 + Math.floor(questions.length / 3) * 260,
        },
        branches: [],
      };

      const newNode: QNode = {
        id,
        type: "question",
        position: newQ.position!,
        data: { question: newQ },
      };

      setNodes((prev) => [...prev, newNode]);
      const updated = [...questions, newQ];
      changeWithHistory(updated);
      setSelectedId(id);
    },
    [questions, changeWithHistory, setNodes],
  );

  /** Update a question from the editor panel */
  const handleQuestionChange = useCallback(
    (updated: SurveyQuestion) => {
      const updatedQuestions = questions.map((q) =>
        q.id === updated.id ? updated : q,
      );

      setNodes((prev) => {
        const updatedNodes = prev.map((n) =>
          n.id === updated.id ? { ...n, data: { question: updated } } : n,
        );
        // Rebuild edges from branches so handle changes (e.g. MC→text) are reflected
        setEdges(questionsToEdges(updatedQuestions, insertRef, readOnly));
        return updatedNodes;
      });
      changeWithHistory(updatedQuestions);
    },
    [questions, setNodes, setEdges, readOnly, changeWithHistory],
  );

  /** Delete a question */
  const handleDeleteQuestion = useCallback(
    (questionId: string) => {
      if (!canDeleteQuestion(questionId)) return;

      setNodes((prev) => prev.filter((n) => n.id !== questionId));
      setEdges((prev) =>
        prev.filter((e) => e.source !== questionId && e.target !== questionId),
      );

      const updated = questions.filter((q) => q.id !== questionId);
      if (selectedId === questionId) setSelectedId(null);

      requestAnimationFrame(() => {
        changeWithHistory(updated);
      });
    },
    [
      questions,
      selectedId,
      canDeleteQuestion,
      changeWithHistory,
      setNodes,
      setEdges,
    ],
  );

  return (
    <div style={containerStyle}>
      {/* Toolbar */}
      {!readOnly && (
        <div style={toolbarStyle}>
          <button onClick={() => addQuestion("text")} style={toolbarBtnStyle}>
            + Text Question
          </button>
          <button
            onClick={() => addQuestion("multiple-choice")}
            style={toolbarBtnStyle}
          >
            + Multiple Choice
          </button>
          <button
            onClick={undo}
            disabled={!canUndo}
            style={{
              ...toolbarBtnStyle,
              background: canUndo ? "var(--color-primary, #008080)" : "#9ca3af",
              cursor: canUndo ? "pointer" : "not-allowed",
              opacity: canUndo ? 1 : 0.6,
            }}
            title="Undo (Ctrl+Z)"
          >
            &#x21a9; Undo
          </button>
          <button onClick={arrangeNodes} style={toolbarBtnStyle}>
            Arrange
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : handleNodesChange}
        onEdgesChange={readOnly ? undefined : handleEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onConnectStart={readOnly ? undefined : onConnectStart}
        onConnectEnd={readOnly ? undefined : onConnectEnd}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode={readOnly ? null : "Backspace"}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="#f0f0f0" />
        <Controls showInteractive={false} />
      </ReactFlow>

      {/* Editor panel */}
      {!readOnly && selectedQuestion && (
        <QuestionEditorPanel
          key={selectedQuestion.id}
          question={selectedQuestion}
          onChange={handleQuestionChange}
          onDelete={handleDeleteQuestion}
          onClose={() => setSelectedId(null)}
          canDelete={canDeleteQuestion(selectedQuestion.id)}
        />
      )}
    </div>
  );
}

/**
 * Public export — wraps in ReactFlowProvider so useReactFlow() works.
 */
export function SurveyFlowBuilder(props: SurveyFlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <SurveyFlowBuilderInner {...props} />
    </ReactFlowProvider>
  );
}
