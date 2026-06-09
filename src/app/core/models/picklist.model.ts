export interface PickItem {
  id: string;
  productName: string;
  quantity: number;
  status: PickItemStatus;
  checkedAt?: string;
}

export type PickItemStatus = 'pending' | 'picked' | 'unavailable' | 'substituted' | 'skipped';

export interface SubstitutionProposal {
  substituteName: string;
  substituteQuantity: number;
  reason: 'out_of_stock' | 'damaged' | 'expired';
}

export interface SubstitutionResponse {
  orderId: string;
  itemId: string;
  approved: boolean;
  substituteName?: string;
  substituteQuantity?: number;
}

export interface SubstitutionStatus {
  status: 'pending' | 'approved' | 'rejected' | 'timed_out' | 'cancelled';
  substituteName?: string;
  substituteQuantity?: number;
}
