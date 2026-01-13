const supabaseUrl = 'https://idhbxbnveskwfwlimlqk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkaGJ4Ym52ZXNrd2Z3bGltbHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTE0NDUsImV4cCI6MjA3NzMyNzQ0NX0.U4-5X9PIipTGE5BkCZALBYy8Wge2QZt464IEeOsEE7k';
const { createClient } = window.supabase;
window.supabase = createClient(supabaseUrl, supabaseKey);