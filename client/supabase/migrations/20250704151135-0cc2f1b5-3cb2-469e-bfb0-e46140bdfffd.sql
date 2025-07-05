-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  organization TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create certificate templates table
CREATE TABLE public.certificate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'html', -- html, docx, pptx
  template_content TEXT, -- For HTML templates
  file_url TEXT, -- For uploaded files
  placeholders JSONB DEFAULT '[]'::jsonb, -- Array of placeholder names
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on certificate_templates
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for certificate_templates
CREATE POLICY "Users can view their own templates" 
ON public.certificate_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" 
ON public.certificate_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" 
ON public.certificate_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" 
ON public.certificate_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create certificate batches table
CREATE TABLE public.certificate_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.certificate_templates(id) ON DELETE CASCADE,
  batch_name TEXT NOT NULL,
  total_certificates INTEGER NOT NULL DEFAULT 0,
  generated_certificates INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  batch_zip_url TEXT, -- URL to download entire batch as zip
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on certificate_batches
ALTER TABLE public.certificate_batches ENABLE ROW LEVEL SECURITY;

-- Create policies for certificate_batches
CREATE POLICY "Users can view their own batches" 
ON public.certificate_batches 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own batches" 
ON public.certificate_batches 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batches" 
ON public.certificate_batches 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create individual certificates table
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.certificate_batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  certificate_data JSONB NOT NULL, -- Contains all the data for this certificate
  certificate_url TEXT, -- URL to the generated PDF
  status TEXT NOT NULL DEFAULT 'pending', -- pending, generated, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on certificates
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Create policies for certificates
CREATE POLICY "Users can view their own certificates" 
ON public.certificates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own certificates" 
ON public.certificates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own certificates" 
ON public.certificates 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('templates', 'templates', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', false);

-- Create storage policies for templates bucket
CREATE POLICY "Users can upload their own templates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own templates" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own templates" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own templates" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for certificates bucket
CREATE POLICY "Users can upload their own certificates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own certificates" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certificate_templates_updated_at
  BEFORE UPDATE ON public.certificate_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certificate_batches_updated_at
  BEFORE UPDATE ON public.certificate_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();