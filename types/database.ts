export interface Course {
  id: string;
  name: string;
  mode: 'TUS' | 'DUS';
  color_code: string;
  sort_order: number;
  created_at: string;
}

export interface Question {
  id: string;
  user_id: string;
  course_id: string;
  image_url: string;
  status: 'failed' | 'skipped' | 'solved';
  correct_answer: string | null;
  question_text: string | null;
  options: Record<string, string> | null;
  is_favorite: boolean;
  note: string | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
  course?: Course;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  user_id: string;
  course_id: string | null;
  name: string;
  created_at: string;
}

export interface QuestionTag {
  question_id: string;
  tag_id: string;
  created_at: string;
}