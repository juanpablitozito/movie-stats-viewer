async function enviar() {
    const input = document.getElementById('input');
    const messages = document.getElementById('messages');

    const texto = input.value;

    messages.innerHTML += `<div class="message user">${texto}</div>`;

    const res = await fetch("/chatbot", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ mensagem: texto })
    });

    const data = await res.json();

    messages.innerHTML += `<div class="message bot">${data.resposta}</div>`;

    input.value = "";
}