-- Add length constraints to text fields for defense-in-depth validation

-- Profiles table: limit full_name and avatar_url
ALTER TABLE profiles ADD CONSTRAINT profiles_full_name_length CHECK (length(full_name) <= 200);
ALTER TABLE profiles ADD CONSTRAINT profiles_avatar_url_length CHECK (length(avatar_url) <= 500);

-- Chat messages: limit content length
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_content_length CHECK (length(content) <= 10000);

-- Courses: limit title and description
ALTER TABLE courses ADD CONSTRAINT courses_title_length CHECK (length(title) <= 200);
ALTER TABLE courses ADD CONSTRAINT courses_description_length CHECK (length(description) <= 5000);
ALTER TABLE courses ADD CONSTRAINT courses_duration_length CHECK (length(duration) <= 100);

-- Lessons: limit title and content
ALTER TABLE lessons ADD CONSTRAINT lessons_title_length CHECK (length(title) <= 200);
ALTER TABLE lessons ADD CONSTRAINT lessons_content_length CHECK (length(content) <= 100000);

-- Organizations: limit text fields
ALTER TABLE organizations ADD CONSTRAINT organizations_name_length CHECK (length(name) <= 200);
ALTER TABLE organizations ADD CONSTRAINT organizations_email_length CHECK (length(email) <= 255);
ALTER TABLE organizations ADD CONSTRAINT organizations_phone_length CHECK (length(phone) <= 50);
ALTER TABLE organizations ADD CONSTRAINT organizations_inn_length CHECK (length(inn) <= 50);
ALTER TABLE organizations ADD CONSTRAINT organizations_contact_name_length CHECK (length(contact_name) <= 200);

-- Test questions: limit question text
ALTER TABLE test_questions ADD CONSTRAINT test_questions_question_length CHECK (length(question) <= 2000);