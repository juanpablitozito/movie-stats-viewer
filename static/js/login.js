const password = document.getElementById("password");
const toggle = document.getElementById("togglePassword");
toggle.addEventListener("click", () => {
    const visible = password.type === "password";
    password.type = visible ? "text" : "password";
    toggle.textContent = visible ? "Ocultar" : "Mostrar";
    toggle.setAttribute("aria-pressed", String(visible));
});
password.addEventListener("keyup", event => {
    document.getElementById("capsWarning").hidden = !event.getModifierState("CapsLock");
});
password.addEventListener("blur", () => { document.getElementById("capsWarning").hidden = true; });
document.querySelector("form").addEventListener("submit", () => {
    const button = document.querySelector(".btn-acesso");
    button.disabled = true;
    button.textContent = "Entrando…";
});
window.addEventListener("pageshow", () => {
    const button = document.querySelector(".btn-acesso");
    button.disabled = false;
    button.innerHTML = 'Entrar na minha conta <span aria-hidden="true">↗</span>';
});
