export interface SubmissionCheckItem {
  id: string;
  category: string;
  label: string;
  checked: boolean;
  required: boolean;
  notes?: string;
}

export interface ReviewerCandidate {
  id: string;
  name: string;
  affiliation: string;
  email?: string;
  expertise: string;
  reason?: string;
}
