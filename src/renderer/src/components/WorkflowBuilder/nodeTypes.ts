import { ConditionNode, TriggerNode, ActionNode } from './CustomNodes'

export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode
} as const
