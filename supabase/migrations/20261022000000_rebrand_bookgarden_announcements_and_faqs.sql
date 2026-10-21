-- Migration: 20261022000000_rebrand_bookgarden_announcements_and_faqs.sql
-- Description: Rebrand public table records from TomeSphere to BookGarden

UPDATE public.announcements
SET 
    title = REPLACE(title, 'TomeSphere', 'BookGarden'),
    content = REPLACE(content, 'TomeSphere', 'BookGarden'),
    updated_at = clock_timestamp()
WHERE title ILIKE '%TomeSphere%' OR content ILIKE '%TomeSphere%';

UPDATE public.faqs
SET 
    question = REPLACE(question, 'TomeSphere', 'BookGarden'),
    answer = REPLACE(answer, 'TomeSphere', 'BookGarden')
WHERE question ILIKE '%TomeSphere%' OR answer ILIKE '%TomeSphere%';
