-- Create user_achievements table to store unlocked achievements
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cabaña_id UUID NOT NULL,
  achievement_code TEXT NOT NULL,
  achievement_category TEXT NOT NULL,
  medal_tier TEXT NOT NULL CHECK (medal_tier IN ('bronze', 'silver', 'gold')),
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress_value INTEGER NOT NULL DEFAULT 0,
  shared_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_code)
);

-- Enable Row Level Security
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements" 
ON public.user_achievements 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_category ON public.user_achievements(achievement_category);

-- Create function to update shared count
CREATE OR REPLACE FUNCTION public.increment_achievement_share(achievement_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_achievements 
  SET shared_count = shared_count + 1 
  WHERE id = achievement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;