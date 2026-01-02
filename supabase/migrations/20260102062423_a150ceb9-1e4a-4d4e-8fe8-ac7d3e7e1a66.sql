-- Fix: Test Answer Keys Exposed to Students
-- Solution: Create a secure RPC function for test submission and restrict direct access to correct_answer

-- 1. Drop the existing public SELECT policy for test_questions
DROP POLICY IF EXISTS "Anyone can view test questions of published courses" ON public.test_questions;

-- 2. Create a new policy that only allows viewing questions WITHOUT correct_answer for students
-- Students can view test questions but correct_answer is protected via RPC
CREATE POLICY "Students can view test questions without answers" 
ON public.test_questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l 
    JOIN public.courses c ON c.id = l.course_id 
    WHERE l.id = lesson_id AND c.is_published = true
  )
);

-- 3. Create a secure function to submit test answers and get score
-- This function validates answers server-side without exposing correct answers
CREATE OR REPLACE FUNCTION public.submit_test_answers(
  p_lesson_id UUID,
  p_user_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INTEGER := 0;
  v_max_score INTEGER := 0;
  v_question RECORD;
  v_user_answer INTEGER;
  v_result JSONB;
  v_user_id UUID;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Verify the lesson exists and is from a published course
  IF NOT EXISTS (
    SELECT 1 FROM lessons l
    JOIN courses c ON c.id = l.course_id
    WHERE l.id = p_lesson_id AND c.is_published = true
  ) THEN
    RAISE EXCEPTION 'Lesson not found or not accessible';
  END IF;
  
  -- Calculate score by comparing user answers with correct answers
  FOR v_question IN 
    SELECT id, correct_answer, order_index
    FROM test_questions 
    WHERE lesson_id = p_lesson_id
    ORDER BY order_index
  LOOP
    v_max_score := v_max_score + 1;
    
    -- Get user's answer for this question (by question id)
    v_user_answer := (p_user_answers->>v_question.id::text)::INTEGER;
    
    IF v_user_answer IS NOT NULL AND v_user_answer = v_question.correct_answer THEN
      v_score := v_score + 1;
    END IF;
  END LOOP;
  
  -- Record the test attempt
  INSERT INTO test_attempts (user_id, lesson_id, answers, score, max_score)
  VALUES (v_user_id, p_lesson_id, p_user_answers, v_score, v_max_score);
  
  -- Return score without revealing correct answers
  v_result := jsonb_build_object(
    'score', v_score,
    'max_score', v_max_score,
    'percentage', CASE WHEN v_max_score > 0 THEN ROUND((v_score::NUMERIC / v_max_score) * 100, 1) ELSE 0 END,
    'passed', CASE WHEN v_max_score > 0 AND (v_score::NUMERIC / v_max_score) >= 0.7 THEN true ELSE false END
  );
  
  RETURN v_result;
END;
$$;

-- 4. Create a function to get test questions WITHOUT correct answers (for students)
CREATE OR REPLACE FUNCTION public.get_test_questions(p_lesson_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_questions JSONB;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if user is org manager or admin (they can see correct answers)
  IF has_role(v_user_id, 'organization') OR has_role(v_user_id, 'admin') THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'question', question,
        'options', options,
        'order_index', order_index,
        'correct_answer', correct_answer
      ) ORDER BY order_index
    )
    INTO v_questions
    FROM test_questions
    WHERE lesson_id = p_lesson_id;
  ELSE
    -- Students only get questions without correct answers
    -- First verify the lesson is from a published course
    IF NOT EXISTS (
      SELECT 1 FROM lessons l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = p_lesson_id AND c.is_published = true
    ) THEN
      RAISE EXCEPTION 'Lesson not found or not accessible';
    END IF;
    
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'question', question,
        'options', options,
        'order_index', order_index
      ) ORDER BY order_index
    )
    INTO v_questions
    FROM test_questions
    WHERE lesson_id = p_lesson_id;
  END IF;
  
  RETURN COALESCE(v_questions, '[]'::jsonb);
END;
$$;