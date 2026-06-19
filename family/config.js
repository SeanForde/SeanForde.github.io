const SUPABASE_URL = "https://mnmdyzaezuhxmgktkxhu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ubWR5emFlenVoeG1na3RreGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTk4MzEsImV4cCI6MjA5NjY5NTgzMX0.RLZyp6_x7MFoAlkoXabSIVokEFXTUotnm_3eidQwtZw";

const ALLOWED_USERS = [
    "s.michael.forde@gmail.com",
    "m.forde116@gmail.com",
    "spookybreadmold@gmail.com"
];

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true
        }
    }
);

function isAllowed(email) {
    return ALLOWED_USERS.includes(email.toLowerCase());
}