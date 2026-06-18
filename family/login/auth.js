const SUPABASE_URL = "https://mnmdyzaezuhxmgktkxhu.supabase.co";
const SUPABASE_ANON_KEY = "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";

const ALLOWED_USERS = [
    "s.michael.forde@gmail.com",
    "m.forde116@gmail.com",
    "spookybreadmold@gmail.com"
];

console.log("🏠 Family page loaded");

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

console.log("✅ Supabase client created on family page");

const userEmail = document.getElementById("user-email");
const signOutBtn = document.getElementById("sign-out-btn");

function isAllowed(email) {
    const allowed = ALLOWED_USERS.includes(email.toLowerCase());

    console.log("🔍 Checking family allow list");
    console.log("   Email:", email);
    console.log("   Allowed:", allowed);

    return allowed;
}

function goToLogin(reason = "No reason provided") {
    console.warn("➡️ Redirecting to login");
    console.warn("   Reason:", reason);

    window.location.href = "/family/login/";
}

async function checkAccess() {
    console.log("🔄 Checking access on /family/...");

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("❌ Session error on family page:", error);
        goToLogin("Session error");
        return;
    }

    console.log("📦 Family session payload:", data);

    const user = data.session?.user;

    if (!user) {
        goToLogin("No user/session found");
        return;
    }

    console.log("👤 Family user found:", user);
    console.log("📧 Family user email:", user.email);

    if (!isAllowed(user.email)) {
        console.warn("⛔ Family user not approved:", user.email);
        await supabaseClient.auth.signOut();
        goToLogin("User not in allow list");
        return;
    }

    console.log("✅ Family user approved");
    userEmail.textContent = `Signed in as ${user.email}`;
}

signOutBtn.addEventListener("click", async () => {
    console.log("🚪 Sign out clicked");

    await supabaseClient.auth.signOut();

    goToLogin("User signed out");
});

supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("🔔 Family auth state changed");
    console.log("   Event:", event);
    console.log("   Session:", session);
    console.log("   Email:", session?.user?.email);
});

checkAccess();