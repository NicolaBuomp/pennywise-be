export interface User {
  id: string;
  email: string;
  created_at?: string;
  updated_at?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    [key: string]: any;
  };
  app_metadata?: {
    [key: string]: any;
  };
  role?: string;
  aud?: string;
  confirmed_at?: string;
  phone?: string;
  last_sign_in_at?: string;
}
