const SUPABASE_URL = "https://zwnxwqraumsolvoudxfj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bnh3cXJhdW1zb2x2b3VkeGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NDc5MjgsImV4cCI6MjA4OTEyMzkyOH0.XuAt1yizqWgCYLvE4uxUVvuYWQW561tBpMsfnd9PR3U";

const { createClient } = supabase;

window._sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
