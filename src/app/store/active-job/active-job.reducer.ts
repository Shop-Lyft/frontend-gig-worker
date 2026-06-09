import { createReducer, on } from '@ngrx/store';
import { Job } from '../../core/models/job.model';
import { PickItem, SubstitutionStatus } from '../../core/models/picklist.model';
import * as ActiveJobActions from './active-job.actions';

export interface ActiveJobState {
  data: Job | null;
  loading: boolean;
  error: { message: string; timestamp: number } | null;
  lastFetchedAt: number | null;
  picklist: PickItem[] | null;
  picklistLoading: boolean;
  picklistError: string | null;
  substitutions: Record<string, SubstitutionStatus>;
}

export const initialActiveJobState: ActiveJobState = {
  data: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
  picklist: null,
  picklistLoading: false,
  picklistError: null,
  substitutions: {},
};

export const activeJobReducer = createReducer(
  initialActiveJobState,

  // Load Active Job
  on(ActiveJobActions.loadActiveJob, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  // Background load (stale-while-revalidate: show cached data, no spinner)
  on(ActiveJobActions.loadActiveJobBackground, (state) => ({
    ...state,
    error: null,
  })),
  on(ActiveJobActions.loadActiveJobSuccess, (state, { job }) => ({
    ...state,
    data: job,
    loading: false,
    error: null,
    lastFetchedAt: Date.now(),
  })),
  on(ActiveJobActions.loadActiveJobFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error: { message: error, timestamp: Date.now() },
  })),

  // Load Picklist
  on(ActiveJobActions.loadPicklist, (state) => ({
    ...state,
    picklistLoading: true,
    picklistError: null,
  })),
  on(ActiveJobActions.loadPicklistSuccess, (state, { items }) => ({
    ...state,
    picklist: items,
    picklistLoading: false,
    picklistError: null,
  })),
  on(ActiveJobActions.loadPicklistFailure, (state, { error }) => ({
    ...state,
    picklistLoading: false,
    picklistError: error,
  })),

  // Update Pick Item
  on(ActiveJobActions.updatePickItemSuccess, (state, { itemId, status }) => ({
    ...state,
    picklist: state.picklist
      ? state.picklist.map((item) =>
          item.id === itemId ? { ...item, status, checkedAt: new Date().toISOString() } : item
        )
      : null,
  })),
  on(ActiveJobActions.updatePickItemFailure, (state, { error }) => ({
    ...state,
    error: { message: error, timestamp: Date.now() },
  })),

  // Mark All Picked
  on(ActiveJobActions.markAllPickedSuccess, (state) => ({
    ...state,
    data: null,
    picklist: null,
    substitutions: {},
  })),
  on(ActiveJobActions.markAllPickedFailure, (state, { error }) => ({
    ...state,
    error: { message: error, timestamp: Date.now() },
  })),

  // Complete Delivery
  on(ActiveJobActions.completeDeliverySuccess, (state) => ({
    ...state,
    data: null,
    picklist: null,
    substitutions: {},
  })),
  on(ActiveJobActions.completeDeliveryFailure, (state, { error }) => ({
    ...state,
    error: { message: error, timestamp: Date.now() },
  })),

  // Propose Substitution
  on(ActiveJobActions.proposeSubstitutionSuccess, (state, { itemId }) => ({
    ...state,
    substitutions: {
      ...state.substitutions,
      [itemId]: { status: 'pending' as const },
    },
  })),
  on(ActiveJobActions.proposeSubstitutionFailure, (state, { error }) => ({
    ...state,
    error: { message: error, timestamp: Date.now() },
  })),

  // Cancel Substitution
  on(ActiveJobActions.cancelSubstitutionSuccess, (state, { itemId }) => {
    const { [itemId]: _, ...remainingSubstitutions } = state.substitutions;
    return {
      ...state,
      substitutions: remainingSubstitutions,
      picklist: state.picklist
        ? state.picklist.map((item) =>
            item.id === itemId ? { ...item, status: 'pending' as const, checkedAt: undefined } : item
          )
        : null,
    };
  }),
  on(ActiveJobActions.cancelSubstitutionFailure, (state, { error }) => ({
    ...state,
    error: { message: error, timestamp: Date.now() },
  })),

  // Substitution Response (WebSocket)
  on(ActiveJobActions.substitutionResponse, (state, { response }) => {
    const updatedSubstitutions = { ...state.substitutions };
    let updatedPicklist = state.picklist;

    if (response.approved) {
      updatedSubstitutions[response.itemId] = {
        status: 'approved',
        substituteName: response.substituteName,
        substituteQuantity: response.substituteQuantity,
      };
      updatedPicklist = updatedPicklist
        ? updatedPicklist.map((item) =>
            item.id === response.itemId
              ? {
                  ...item,
                  productName: response.substituteName || item.productName,
                  quantity: response.substituteQuantity || item.quantity,
                  status: 'substituted' as const,
                }
              : item
          )
        : null;
    } else {
      updatedSubstitutions[response.itemId] = { status: 'rejected' };
      updatedPicklist = updatedPicklist
        ? updatedPicklist.map((item) =>
            item.id === response.itemId
              ? { ...item, status: 'skipped' as const }
              : item
          )
        : null;
    }

    return {
      ...state,
      substitutions: updatedSubstitutions,
      picklist: updatedPicklist,
    };
  }),

  // Clear state on logout
  on(ActiveJobActions.clearActiveJobState, () => ({ ...initialActiveJobState }))
);
