export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  organization: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  template_type: string;
  template_content: string | null;
  file_url: string | null;
  placeholders: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CertificateBatch {
  id: string;
  user_id: string;
  template_id: string;
  batch_name: string;
  total_certificates: number;
  generated_certificates: number;
  status: string;
  batch_zip_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  template?: { name: string };
}

export interface Certificate {
  id: string;
  batch_id: string;
  user_id: string;
  recipient_name: string;
  recipient_email: string | null;
  certificate_data: any;
  certificate_url: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface ExcelData {
  [key: string]: string | number;
}