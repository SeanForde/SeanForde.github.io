const SUPABASE_URL = "https://supabase.com/dashboard/project/mnmdyzaezuhxmgktkxhu";
const SUPABASE_ANON_KEY = "sb_publishable_35eXWth0XZ2Z-FijRJdt0A_RbR0ApaA";

const ALLOWED_USERS = [
    "s.michael.forde@gmail.com",
    "m.forde116@gmail.com",
    "spookybreadmold@gmail.com"
];

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

const loginView = document.getElementById("login-view");
const familyView = document.getElementById("family-view");
const loginError = document.getElementById("login-error");
const userEmail = document.getElementById("user-email");
const signOutBtn = document.getElementById("sign-out-btn");
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email-input");

const redirectUrl = `${window.location.origin}/family/`;

function showLogin(message = "") {
    loginView.classList.remove("hidden");
    familyView.classList.add("hidden");
    loginError.textContent = message;
}

function showFamily(email) {
    loginView.classList.add("hidden");
    familyView.classList.remove("hidden");
    userEmail.textContent = `Signed in as ${email}`;
}

function isAllowed(email) {
    return ALLOWED_USERS.includes(email.toLowerCase());
}

async function loadSession() {
    const { data } = await supabaseClient.auth.getSession();
    const user = data.session?.user;

    if (!user) {
        showLogin();
        return;
    }

    if (!isAllowed(user.email)) {
        await supabaseClient.auth.signOut();
        showLogin("This email is not approved for Forde Family HQ.");
        return;
    }

    showFamily(user.email);
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();

    if (!isAllowed(email)) {
        showLogin("This email is not approved for Forde Family HQ.");
        return;
    }

    const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: redirectUrl
        }
    });

    if (error) {
        showLogin(error.message);
        return;
    }

    showLogin("Check your email for the login link.");
});

signOutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    showLogin();
});

loadSession();