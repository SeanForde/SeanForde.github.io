const SUPABASE_URL = "https://mnmdyzaezuhxmgktkxhu.supabase.co";
const SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_PUBLIC_KEY_HERE";

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
const passwordInput = document.getElementById("password-input");

function isAllowed(email) {
    return ALLOWED_USERS.includes(email.toLowerCase());
}

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
    const password = passwordInput.value;

    if (!isAllowed(email)) {
        showLogin("This email is not approved for Forde Family HQ.");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        showLogin(error.message);
        return;
    }

    showFamily(data.user.email);
});

signOutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    showLogin();
});

loadSession();