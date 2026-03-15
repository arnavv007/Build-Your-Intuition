/* ================================================================
   js/supabase.js — Supabase client setup
================================================================ */
 
const SUPABASE_URL  = 'https://zwnxwqraumsolvoudxfj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bnh3cXJhdW1zb2x2b3VkeGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NDc5MjgsImV4cCI6MjA4OTEyMzkyOH0.XuAt1yizqWgCYLvE4uxUVvuYWQW561tBpMsfnd9PR3U'; // eyJ... key from Legacy tab
const FOUNDER_EMAIL = 'arnavv338@gmail.com';
 
// Wait until the CDN library is ready then create the client
(function initSupabase() {
  if (window.supabase && window.supabase.createClient) {
    window._sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.log('Supabase client ready:', !!window._sb);
  } else {
    // Retry after a short delay if CDN hasn't loaded yet
    setTimeout(initSupabase, 50);
  }
})();