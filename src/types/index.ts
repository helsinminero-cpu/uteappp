export type TramiteType = 
  | 'designacion'
  | 'reasignacion'
  | 'sustentacion'
  | 'aprobacion';

export interface Student {
  id: string;
  fullName: string; // Title Case
  studentCode: string; // UPPERCASE unique
  organization: string; // UPPERCASE
  startDate: string; // YYYY-MM-DD
  email: string;
  createdAt: string;
}

export interface DesignacionData {
  // Obligatorios
  futNumber: string; // numeric only
  futDate: string; // YYYY-MM-DD
  expedienteNumber: string; // numeric only
  // Opcionales
  informeNumber?: string; // numeric only (solo números)
  informeDate?: string;
  advisorName?: string;
  // Admin fields
  adminResolutionNumber?: string;
  adminResolutionDate?: string;
}

export interface ReasignacionData {
  // Obligatorios
  currentResolution: string;
  currentResolutionDate: string;
  currentAdvisorName: string;
  futNumber: string; // numeric only
  futDate: string; // YYYY-MM-DD
  expedienteNumber: string; // numeric only
  // Opcionales
  informeNumber?: string; // numeric only (solo números)
  informeDate?: string;
  newAdvisorName?: string;
  // Admin fields
  adminResolutionNumber?: string;
  adminResolutionDate?: string;
}

export interface SustentacionData {
  // Obligatorios
  advisorName: string;
  futNumber: string; // numeric only
  futDate: string; // YYYY-MM-DD
  expedienteNumber: string; // numeric only
  advisorApprovalReportNumber: string; // numeric only (solo números)
  advisorApprovalReportDate: string;
  // Opcionales
  juryDesignationReportNumber?: string; // numeric only (solo números)
  juryDesignationReportDate?: string;
  // Admin fields
  presidentName?: string;
  memberName?: string;
  defenseDate?: string; // YYYY-MM-DD
  defenseTime?: string; // HH:mm
  adminResolutionNumber?: string; // numeric
  adminResolutionDate?: string; // YYYY-MM-DD
}

export interface AprobacionData {
  // Obligatorios independientes de este trámite de Aprobación
  futNumber: string; // numeric only (FUT independiente de Aprobación)
  futDate: string; // YYYY-MM-DD (Fecha de FUT de Aprobación)
  expedienteNumber: string; // numeric only (Expediente independiente de Aprobación)
  advisorDesignationReportNumber: string; // numeric only (solo números)
  advisorDesignationReportDate: string;
  advisorReviewerResolution: string;
  advisorReviewerResolutionDate: string;
  // Informe de Aprobación de PPP
  juryApprovalReportNumber?: string; // numeric only (solo números)
  juryApprovalReportDate?: string;
  // Resolución de Aprobación de PPP
  adminResolutionNumber?: string;
  adminResolutionDate?: string;
  // Linked Sustentacion info (Antecedentes)
  advisorName?: string;
  futSustentacionNumber?: string;
  futSustentacionDate?: string;
  resolutionSustentacionNumber?: string;
  resolutionSustentacionDate?: string;
  juryDesignationReportNumber?: string; // numeric only (solo números)
  juryDesignationReportDate?: string;
  presidentName?: string;
  memberName?: string;
}

export interface TramiteRecord {
  id: string;
  studentId: string;
  studentCode: string;
  type: TramiteType;
  submittedAt: string;
  updatedAt: string;
  status: 'pendiente' | 'revisado' | 'documentos_generados' | 'enviado';
  // Form payload specific to type
  designacion?: DesignacionData;
  reasignacion?: ReasignacionData;
  sustentacion?: SustentacionData;
  aprobacion?: AprobacionData;
  // Custom edited documents (if admin modifies generated text)
  customInformeText?: string;
  customResolucionText?: string;
  lastGeneratedAt?: string;
  emailSentAt?: string;
  emailLog?: {
    to: string;
    sentAt: string;
    subject: string;
  }[];
}

export interface EmailDispatchPayload {
  toEmail: string;
  studentName: string;
  tramiteTitle: string;
  documentInformeTitle: string;
  documentResolucionTitle: string;
  message: string;
}
