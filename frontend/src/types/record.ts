export interface RecordRequest {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  phoneNumber?: string;
}

/** Certify may serialize dates as ISO strings or (legacy) numeric tuples. */
export type RecordDateField = string | number[];

export interface RecordResponse {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: RecordDateField;
  gender?: string;
  email?: string;
  phoneNumber?: string;
  createdAt?: string | number[];
  updatedAt?: string | number[];
}
