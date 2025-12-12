import { TriggerNode } from './CustomNodes'
import { ActionNode } from './CustomNodes'

export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode
} as const
