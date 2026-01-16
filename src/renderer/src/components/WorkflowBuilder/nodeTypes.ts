import { ConditionNode, TriggerNode, ActionNode, SnippetNode } from './CustomNodes'

export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  snippet: SnippetNode
} as const
