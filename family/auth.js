const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const ALLOWED_USERS = [
    "s.michael.forde@gmail.com",
    "m.forde116@gmail.com",
    "spookybreadmold@gmail.com"
];

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginView = document.getElementById("login-view");
const familyView = document.getElementById("family-view");
const loginError = document.getElementById("login-error");
const userEmail = document.getElementById("user-email");
const signOutBtn = document.getElementById("sign-out-btn");
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email-input");

function showFamilyView(email) {
    loginView.classList.add("hidden");
    familyView.classList.remove("hidden");
    userEmail.textContent = `Signed in as ${email}`;
}

function showLoginView(message = "") {
    familyView.classList.add("hidden");
    loginView.classList.remove("hidden");
    loginError.textContent = message;
}

function isAllowed(email) {
    return ALLOWED_USERS.includes(email.toLowerCase());
}

async function checkSession() {
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session) {
        showLoginView();
        return;
    }

    const email = session.user.email;

    if (!isAllowed(email)) {
        await supabase.auth.signOut();
        showLoginView("This email is not approved for Forde Family HQ.");
        return;
    }

    showFamilyView(email);
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();

    if (!isAllowed(email)) {
        showLoginView("This email is not approved for Forde Family HQ.");
        return;
    }

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: `${window.location.origin}/family/`
        }
    });

    if (error) {
        showLoginView(error.message);
        return;
    }

    showLoginView("Check your email for the login link.");
});

signOutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    showLoginView();
});

checkSession();