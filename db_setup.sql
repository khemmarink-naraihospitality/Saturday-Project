-- Create a table for Tasks
create table tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status text default 'To Do',
  priority text default 'Medium',
  due_date timestamptz,
  created_at timestamptz default now()
);

-- Create a table for Attachments that links to Tasks
create table attachments (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade not null,
  file_name text not null,
  file_path text not null, -- Store the path in the storage bucket
  file_size bigint,
  file_type text,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS) is recommended, but for simplicity in this prototype, 
-- we will allow public read/write access initially (Note: securely configure this for production!)
alter table tasks enable row level security;
alter table attachments enable row level security;

-- Create policies to allow everything for now (Dev Mode)
create policy "Allow all access to tasks" on tasks for all using (true) with check (true);
create policy "Allow all access to attachments" on attachments for all using (true) with check (true);

-- Storage Bucket Setup Instructions (Run this part or create in Dashboard)
-- You need to create a public bucket named 'saturday-files'
insert into storage.buckets (id, name, public) values ('saturday-files', 'saturday-files', true);

-- Policy to allow public access to the bucket
create policy "Public Access" on storage.objects for all using ( bucket_id = 'saturday-files' );
