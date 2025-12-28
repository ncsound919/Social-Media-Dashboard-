/**
 * Rules Engine - Lightweight automation for workflows
 * Following coding rule: Typed interfaces and explicit error handling
 */

import { RuleRepository, PostDraftRepository, MetricSnapshotRepository } from '@/data/repository';
import { Rule, RuleTriggerType, RuleCondition, RuleAction, PostDraft, MetricSnapshot } from '@/data/models';
import { logger } from '@/utils/logging';
import { v4 as uuidv4 } from 'uuid';

export interface TriggerContext {
  type: RuleTriggerType;
  postDraft?: PostDraft;
  metricSnapshot?: MetricSnapshot;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  action: RuleAction;
  message: string;
  error?: string;
}

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  conditionsMet: boolean;
  actionsExecuted: ActionResult[];
  timestamp: Date;
}

// Action handler interface
export interface ActionHandler {
  execute(action: RuleAction, context: TriggerContext): Promise<ActionResult>;
}

export class RulesEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RulesEngineError';
  }
}

export class RulesEngine {
  private actionHandlers: Map<string, ActionHandler> = new Map();

  constructor(
    private ruleRepo: RuleRepository,
    private draftRepo: PostDraftRepository,
    private metricRepo: MetricSnapshotRepository
  ) {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    // Mark evergreen handler
    this.actionHandlers.set('mark_evergreen', {
      execute: async (action, context) => {
        try {
          if (context.postDraft) {
            const draft = this.draftRepo.getById(context.postDraft.id);
            if (draft) {
              this.draftRepo.save({ ...draft, status: 'evergreen' });
              return { 
                success: true, 
                action, 
                message: `Marked post "${draft.title}" as evergreen` 
              };
            }
          }
          return { success: false, action, message: 'No post draft in context' };
        } catch (error) {
          return { success: false, action, message: 'Failed to mark as evergreen', error: String(error) };
        }
      }
    });

    // Add to recycle queue handler
    this.actionHandlers.set('add_to_recycle_queue', {
      execute: async (action, context) => {
        try {
          if (context.postDraft) {
            const draft = this.draftRepo.getById(context.postDraft.id);
            if (draft) {
              const updatedTags = [...draft.tags, 'recycle-queue'];
              this.draftRepo.save({ ...draft, tags: updatedTags });
              return { 
                success: true, 
                action, 
                message: `Added post "${draft.title}" to recycle queue` 
              };
            }
          }
          return { success: false, action, message: 'No post draft in context' };
        } catch (error) {
          return { success: false, action, message: 'Failed to add to recycle queue', error: String(error) };
        }
      }
    });

    // Warn user handler
    this.actionHandlers.set('warn_user', {
      execute: async (action, context) => {
        const message = action.params.message as string || 'Warning triggered by automation rule';
        logger.warn('User warning from rules engine', { message, context: context.type });
        return { success: true, action, message: `Warning: ${message}` };
      }
    });

    // Suggest alternative slot handler
    this.actionHandlers.set('suggest_alternative_slot', {
      execute: async (action, context) => {
        const suggestion = 'Consider scheduling for an optimal time slot';
        logger.info('Suggesting alternative slot', { context: context.type });
        return { success: true, action, message: suggestion };
      }
    });

    // Send notification handler
    this.actionHandlers.set('send_notification', {
      execute: async (action, context) => {
        const title = action.params.title as string || 'Notification';
        const body = action.params.body as string || 'Automation notification';
        logger.info('Notification', { title, body });
        return { success: true, action, message: `Notification sent: ${title}` };
      }
    });

    // Update status handler
    this.actionHandlers.set('update_status', {
      execute: async (action, context) => {
        try {
          if (context.postDraft) {
            const draft = this.draftRepo.getById(context.postDraft.id);
            if (draft) {
              const newStatus = action.params.status as PostDraft['status'] || 'ready';
              this.draftRepo.save({ ...draft, status: newStatus });
              return { 
                success: true, 
                action, 
                message: `Updated post status to ${newStatus}` 
              };
            }
          }
          return { success: false, action, message: 'No post draft in context' };
        } catch (error) {
          return { success: false, action, message: 'Failed to update status', error: String(error) };
        }
      }
    });
  }

  registerActionHandler(type: string, handler: ActionHandler): void {
    this.actionHandlers.set(type, handler);
    logger.info('Registered action handler', { type });
  }

  createRule(
    name: string,
    triggerType: RuleTriggerType,
    conditions: RuleCondition[],
    actions: RuleAction[]
  ): Rule {
    const rule: Rule = {
      id: uuidv4(),
      name,
      triggerType,
      conditions,
      actions,
      enabled: true,
      createdAt: new Date(),
      lastTriggeredAt: null,
    };

    this.ruleRepo.save(rule);
    logger.info('Rule created', { ruleId: rule.id, name });
    return rule;
  }

  enableRule(ruleId: string): void {
    const rule = this.ruleRepo.getById(ruleId);
    if (rule) {
      this.ruleRepo.save({ ...rule, enabled: true });
      logger.info('Rule enabled', { ruleId });
    }
  }

  disableRule(ruleId: string): void {
    const rule = this.ruleRepo.getById(ruleId);
    if (rule) {
      this.ruleRepo.save({ ...rule, enabled: false });
      logger.info('Rule disabled', { ruleId });
    }
  }

  deleteRule(ruleId: string): void {
    this.ruleRepo.delete(ruleId);
    logger.info('Rule deleted', { ruleId });
  }

  getAllRules(): Rule[] {
    return this.ruleRepo.getAll();
  }

  async trigger(context: TriggerContext): Promise<RuleExecutionResult[]> {
    const rules = this.ruleRepo.getByTrigger(context.type);
    const results: RuleExecutionResult[] = [];

    for (const rule of rules) {
      const result = await this.executeRule(rule, context);
      results.push(result);
    }

    return results;
  }

  private async executeRule(rule: Rule, context: TriggerContext): Promise<RuleExecutionResult> {
    const result: RuleExecutionResult = {
      ruleId: rule.id,
      ruleName: rule.name,
      triggered: true,
      conditionsMet: false,
      actionsExecuted: [],
      timestamp: new Date(),
    };

    try {
      // Evaluate conditions
      const conditionsMet = this.evaluateConditions(rule.conditions, context);
      result.conditionsMet = conditionsMet;

      if (!conditionsMet) {
        logger.debug('Rule conditions not met', { ruleId: rule.id });
        return result;
      }

      // Execute actions
      for (const action of rule.actions) {
        const handler = this.actionHandlers.get(action.type);
        if (handler) {
          const actionResult = await handler.execute(action, context);
          result.actionsExecuted.push(actionResult);
        } else {
          logger.warn('No handler for action type', { type: action.type });
          result.actionsExecuted.push({
            success: false,
            action,
            message: `No handler registered for action type: ${action.type}`,
          });
        }
      }

      // Update last triggered timestamp
      this.ruleRepo.save({ ...rule, lastTriggeredAt: new Date() });

    } catch (error) {
      logger.error('Rule execution failed', { ruleId: rule.id, error });
      result.actionsExecuted.push({
        success: false,
        action: { type: 'send_notification', params: { title: 'Error', body: 'Rule execution failed' } },
        message: 'Rule execution failed',
        error: String(error),
      });
    }

    return result;
  }

  private evaluateConditions(conditions: RuleCondition[], context: TriggerContext): boolean {
    if (conditions.length === 0) return true;

    return conditions.every(condition => {
      try {
        const value = this.getFieldValue(condition.field, context);
        const conditionValue = condition.value;

        switch (condition.operator) {
          case '>': return Number(value) > Number(conditionValue);
          case '<': return Number(value) < Number(conditionValue);
          case '>=': return Number(value) >= Number(conditionValue);
          case '<=': return Number(value) <= Number(conditionValue);
          case '==': return value === conditionValue;
          case '!=': return value !== conditionValue;
          default: return false;
        }
      } catch (error) {
        logger.warn('Condition evaluation failed', { condition, error });
        return false;
      }
    });
  }

  private getFieldValue(field: string, context: TriggerContext): string | number {
    // Check context data first
    if (field in context.data) {
      return context.data[field] as string | number;
    }

    // Check metric snapshot
    if (context.metricSnapshot) {
      const metrics = context.metricSnapshot.metrics;
      if (field in metrics) {
        return metrics[field as keyof typeof metrics];
      }
    }

    // Check post draft
    if (context.postDraft) {
      if (field === 'status') return context.postDraft.status;
      if (field === 'tags_count') return context.postDraft.tags.length;
    }

    throw new RulesEngineError(`Unknown field: ${field}`);
  }
}
