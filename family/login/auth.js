const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

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

    if (error) showError(error.message);
});

redirectIfLoggedIn();