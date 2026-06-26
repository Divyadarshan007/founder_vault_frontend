export type ContentType =
  | "THOUGHT"
  | "EVENT"
  | "MEETING"
  | "VOICE_NOTE"
  | "PHOTO"
  | "VIDEO"
  | "DOCUMENT";

export type ShareStatus = "PENDING" | "ACCEPTED" | "REVOKED";

export interface User {
  _id: string;
  name: string;
  email: string;
  companyName: string;
  designation: string;
  profileImage?: string;
  bio?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  _id: string;
  contentId?: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  r2Key: string;
  uploadedAt: string;
}

export interface Content {
  _id: string;
  ownerId: string;
  title: string;
  description: string;
  type: ContentType;
  tags: string[];
  transcript?: string;
  attachmentIds: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Share {
  _id: string;
  founderId: User | string;
  agencyId: User | string;
  role: "VIEWER";
  status: ShareStatus;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ContentFilters {
  type?: ContentType;
  tag?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  ownerId?: string;
}

export interface ContentStats {
  TOTAL: number;
  THOUGHT: number;
  EVENT: number;
  MEETING: number;
  VOICE_NOTE: number;
  PHOTO: number;
  VIDEO: number;
  DOCUMENT: number;
}

export interface UploadedAttachment {
  attachmentId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}
