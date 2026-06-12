import { createAction, props } from '@ngrx/store';
import { Job } from '../../core/models/job.model';
import { PickItem, PickItemStatus, SubstitutionProposal, SubstitutionResponse } from '../../core/models/picklist.model';

// Load Active Job
export const loadActiveJob = createAction('[Active Job] Load Active Job');
export const loadActiveJobBackground = createAction('[Active Job] Load Active Job Background');
export const loadActiveJobSuccess = createAction(
  '[Active Job] Load Active Job Success',
  props<{ job: Job | null }>()
);
export const loadActiveJobFailure = createAction(
  '[Active Job] Load Active Job Failure',
  props<{ error: string }>()
);

// Load Picklist
export const loadPicklist = createAction(
  '[Active Job] Load Picklist',
  props<{ orderId: string }>()
);
export const loadPicklistSuccess = createAction(
  '[Active Job] Load Picklist Success',
  props<{ items: PickItem[] }>()
);
export const loadPicklistFailure = createAction(
  '[Active Job] Load Picklist Failure',
  props<{ error: string }>()
);

// Update Pick Item
export const updatePickItem = createAction(
  '[Active Job] Update Pick Item',
  props<{ orderId: string; itemId: string; status: PickItemStatus }>()
);
export const updatePickItemSuccess = createAction(
  '[Active Job] Update Pick Item Success',
  props<{ itemId: string; status: PickItemStatus }>()
);
export const updatePickItemFailure = createAction(
  '[Active Job] Update Pick Item Failure',
  props<{ error: string }>()
);

// Mark All Picked
export const markAllPicked = createAction(
  '[Active Job] Mark All Picked',
  props<{ jobId: string }>()
);
export const markAllPickedSuccess = createAction('[Active Job] Mark All Picked Success');
export const markAllPickedFailure = createAction(
  '[Active Job] Mark All Picked Failure',
  props<{ error: string }>()
);

// Complete Delivery
export const completeDelivery = createAction(
  '[Active Job] Complete Delivery',
  props<{ orderId: string }>()
);
export const completeDeliverySuccess = createAction('[Active Job] Complete Delivery Success');
export const completeDeliveryFailure = createAction(
  '[Active Job] Complete Delivery Failure',
  props<{ error: string }>()
);

// Propose Substitution
export const proposeSubstitution = createAction(
  '[Active Job] Propose Substitution',
  props<{ orderId: string; itemId: string; proposal: SubstitutionProposal }>()
);
export const proposeSubstitutionSuccess = createAction(
  '[Active Job] Propose Substitution Success',
  props<{ itemId: string }>()
);
export const proposeSubstitutionFailure = createAction(
  '[Active Job] Propose Substitution Failure',
  props<{ error: string }>()
);

// Cancel Substitution
export const cancelSubstitution = createAction(
  '[Active Job] Cancel Substitution',
  props<{ orderId: string; itemId: string }>()
);
export const cancelSubstitutionSuccess = createAction(
  '[Active Job] Cancel Substitution Success',
  props<{ itemId: string }>()
);
export const cancelSubstitutionFailure = createAction(
  '[Active Job] Cancel Substitution Failure',
  props<{ error: string }>()
);

// Substitution Response (from WebSocket)
export const substitutionResponse = createAction(
  '[Active Job] Substitution Response',
  props<{ response: SubstitutionResponse }>()
);

// Cancel/Abandon Job (for stuck test jobs)
export const cancelActiveJob = createAction(
  '[Active Job] Cancel Active Job',
  props<{ jobId: string }>()
);
export const cancelActiveJobSuccess = createAction('[Active Job] Cancel Active Job Success');
export const cancelActiveJobFailure = createAction(
  '[Active Job] Cancel Active Job Failure',
  props<{ error: string }>()
);

// Clear state on logout
export const clearActiveJobState = createAction('[Active Job] Clear State');
