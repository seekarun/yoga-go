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
import { AddButtonEdge, type AddButtonEdgeData } from "./AddButtonEdge";

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
  background: "var(--color-primary, #6366f1)",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
};

const edgeStyle: CSSProperties = {
  stroke: "var(--color-primary, #6366f1)",
  strokeWidth: 2,
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

type InsertHandler = (
  edgeId: string,
  source: string,
  target: string,
  sourceHandle: string | null,
) => void;

/**
 * Convert SurveyQuestion[] → React Flow nodes (prepends virtual Start node)
 */
function questionsToNodes(questions: SurveyQuestion[]): QNode[] {
  const first = getStartQuestion(questions);
  const firstPos = first?.position ?? { x: 200, y: 200 };

  const startNode: QNode = {
    id: START_ID,
    type: "start",
    position: { x: firstPos.x + 90, y: firstPos.y - 120 },
    deletable: false,
    selectable: false,
    data: { question: {} as SurveyQuestion },
  };

  const questionNodes: QNode[] = questions.map((q, i) => ({
    id: q.id,
    type: "question" as const,
    position: q.position ?? {
      x: 100 + (i % 3) * 320,
      y: 80 + Math.floor(i / 3) * 260,
    },
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
    onInsert: (edgeId, source, target, sourceHandle) =>
      insertRef.current?.(edgeId, source, target, sourceHandle),
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
      data,
    });
  }

  // Question-to-question edges
  for (const q of questions) {
    for (const b of q.branches ?? []) {
      if (!b.nextQuestionId) continue;
      const hasOpts =
        q.type === "multiple-choice" ||
        (q.type === "text" && q.inference === "process");
      const sourceHandle =
        hasOpts && b.optionId ? `option-${b.optionId}` : "default";
      edges.push({
        id: `${q.id}-${sourceHandle}-${b.nextQuestionId}`,
        source: q.id,
        sourceHandle,
        target: b.nextQuestionId,
        targetHandle: "target",
        animated: true,
        style: edgeStyle,
        type: "addButton",
        data,
      });
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
  const { screenToFlowPosition } = useReactFlow();

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

  /** Insert a new MC question on an edge ("+" button) */
  const handleInsertOnEdge = useCallback(
    (
      _edgeId: string,
      source: string,
      target: string,
      sourceHandle: string | null,
    ) => {
      const opt1Id = generateId();
      const opt2Id = generateId();
      const newId = generateId();

      const newQ: SurveyQuestion = {
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
        position: { x: 0, y: 0 }, // will be set below
      };

      // Calculate midpoint position
      const sourceNode = nodes.find(
        (n) => n.id === (source === START_ID ? START_ID : source),
      );
      const targetNode = nodes.find((n) => n.id === target);
      if (sourceNode && targetNode) {
        newQ.position = {
          x: (sourceNode.position.x + targetNode.position.x) / 2,
          y: (sourceNode.position.y + targetNode.position.y) / 2,
        };
      }

      let updatedQuestions: SurveyQuestion[];

      if (source === START_ID) {
        // Inserting after Start — new question becomes start (no incoming branches needed)
        updatedQuestions = [...questions, newQ];
      } else {
        // Update the source question's branch that pointed to target → now points to new question
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

      // Rebuild nodes and edges from the updated questions
      setNodes(questionsToNodes(updatedQuestions));
      setEdges(questionsToEdges(updatedQuestions, insertRef, readOnly));
      changeWithHistory(updatedQuestions);
      setSelectedId(newId);
    },
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
    ) => {
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

  /** Handle node drag end — persist positions */
  const handleNodesChange: OnNodesChange<QNode> = useCallback(
    (changes) => {
      // Block removal of the last finish node (keyboard Backspace)
      const filtered = changes.filter((c) => {
        if (c.type !== "remove") return true;
        return canDeleteQuestion(c.id);
      });
      onNodesChange(filtered);
      // After position updates, sync
      const hasDrag = changes.some((c) => c.type === "position" && !c.dragging);
      if (hasDrag) {
        requestAnimationFrame(() => {
          setNodes((latest) => {
            setEdges((latestEdges) => {
              syncToParent(latest as QNode[], latestEdges);
              return latestEdges;
            });
            return latest;
          });
        });
      }
    },
    [onNodesChange, canDeleteQuestion, setNodes, setEdges, syncToParent],
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      const hasRemove = changes.some((c) => c.type === "remove");
      if (hasRemove) {
        requestAnimationFrame(() => {
          setNodes((latest) => {
            setEdges((latestEdges) => {
              syncToParent(latest as QNode[], latestEdges);
              return latestEdges;
            });
            return latest;
          });
        });
      }
    },
    [onEdgesChange, setNodes, setEdges, syncToParent],
  );

  /** Handle new edge connection */
  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((prev) => {
        const next = addEdge(
          {
            ...conn,
            animated: true,
            style: edgeStyle,
            type: "addButton",
            data: makeEdgeData(insertRef, readOnly),
          },
          prev,
        );
        requestAnimationFrame(() => {
          setNodes((latestNodes) => {
            syncToParent(latestNodes as QNode[], next);
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
      setEdges((prev) => [...prev, newEdge]);

      const updatedQuestions = [...questions, newQ];
      requestAnimationFrame(() => {
        setNodes((latestNodes) => {
          setEdges((latestEdges) => {
            syncToParent(latestNodes as QNode[], latestEdges, updatedQuestions);
            return latestEdges;
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
      if (!readOnly && node.id !== START_ID) setSelectedId(node.id);
    },
    [readOnly],
  );

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

      setNodes((prev) =>
        prev.map((n) =>
          n.id === updated.id ? { ...n, data: { question: updated } } : n,
        ),
      );

      // Rebuild edges from branches so handle changes (e.g. MC→text) are reflected
      setEdges(questionsToEdges(updatedQuestions, insertRef, readOnly));
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
              background: canUndo ? "var(--color-primary, #6366f1)" : "#9ca3af",
              cursor: canUndo ? "pointer" : "not-allowed",
              opacity: canUndo ? 1 : 0.6,
            }}
            title="Undo (Ctrl+Z)"
          >
            &#x21a9; Undo
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
