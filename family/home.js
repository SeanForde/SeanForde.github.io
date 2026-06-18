const SUPABASE_URL = "https://mnmdyzaezuhxmgktkxhu.supabase.co";
const SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_PUBLIC_KEY_HERE";

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

const userEmail = document.getElementById("user-email");
const signOutBtn = document.getElementById("sign-out-btn");

function isAllowed(email) {
    return ALLOWED_USERS.includes(email.toLowerCase());
}

function goToLogin() {
    window.location.href = "/family/login/";
}

async function checkAccess() {
    const { data } = await supabaseClient.auth.getSession();
    const user = data.session?.user;

    if (!user) {
        goToLogin();
        return;
    }

    if (!isAllowed(user.email)) {
        await supabaseClient.auth.signOut();
        goToLogin();
        return;
    }

    userEmail.textContent = `Signed in as ${user.email}`;
}

signOutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    goToLogin();
});

checkAccess();