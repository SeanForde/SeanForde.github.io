const SUPABASE_URL = "https://mnmdyzaezuhxmgktkxhu.supabase.co";
const SUPABASE_ANON_KEY = "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";

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

const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

function isAllowed(email) {
    return ALLOWED_USERS.includes(email.toLowerCase());
}

function showError(message) {
    loginError.textContent = message;
}

async function redirectIfLoggedIn() {
    const { data } = await supabaseClient.auth.getSession();

    const user = data.session?.user;

    if (user && isAllowed(user.email)) {
        window.location.href = "/family/";
    }
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${window.location.origin}/family/`
        }
    });

    if (error) {
        showError(error.message);
    }
});

redirectIfLoggedIn();