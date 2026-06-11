const ALLOWED_USERS = [
    "s.michael.forde@gmail.com",
    "m.forde116@gmail.com",
    "spookybreadmold@gmail.com"
];

const loginView = document.getElementById("login-view");
const familyView = document.getElementById("family-view");
const loginError = document.getElementById("login-error");
const userEmail = document.getElementById("user-email");
const signOutBtn = document.getElementById("sign-out-btn");

function decodeJwt(token) {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
        atob(base64)
            .split("")
            .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
    );

    return JSON.parse(jsonPayload);
}

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

function handleCredentialResponse(response) {
    const user = decodeJwt(response.credential);
    const email = user.email;

    if (!ALLOWED_USERS.includes(email)) {
        localStorage.removeItem("fordeFamilyUser");
        showLoginView("This Google account is not approved for Forde Family HQ.");
        return;
    }

    localStorage.setItem("fordeFamilyUser", email);
    showFamilyView(email);
}

signOutBtn.addEventListener("click", () => {
    localStorage.removeItem("fordeFamilyUser");
    showLoginView();
});

const existingUser = localStorage.getItem("fordeFamilyUser");

if (existingUser && ALLOWED_USERS.includes(existingUser)) {
    showFamilyView(existingUser);
}
