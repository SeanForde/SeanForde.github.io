const userEmail = document.getElementById("user-email");
const signOutBtn = document.getElementById("sign-out-btn");

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