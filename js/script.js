const API_BASE_URL = "http://127.0.0.1:8000";
let memoriaConversa = [];
let usuarioAtual = "Visitante";

document.addEventListener("DOMContentLoaded", () => {
<<<<<<< HEAD
    verificarStatusAPI();
});

async function verificarStatusAPI() {
    const badge = document.getElementById("statusApi");
    if (!badge) return;

    try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (!res.ok) throw new Error("Offline");
        const dados = await res.json();

        badge.className = "status-badge online";
        badge.innerText = dados.svm_carregado ? "● API + SVM Online" : "● API Online (Sem SVM)";
    } catch {
        badge.className = "status-badge offline";
        badge.innerText = "● API Desconectada";
    }
}

function escaparHTML(texto) {
    if (!texto) return "";
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

function formatarTextoIA(texto) {
    return escaparHTML(texto)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
}

=======
    // Inicialização específica da página inicial (inicio.html)
    if (document.getElementById("navbar")) {
        configurarNavbarScroll();
    }
    if (document.getElementById("statusApi")) {
        verificarStatusServidor();
    }

    // Inicialização específica do verificador (index.html)
    if (document.getElementById("chatContainer") && document.getElementById("nomeUsuario")) {
        carregarUsuario();
    }
});

// ==========================================================================
// FUNÇÕES DA HOME (inicio.html)
// ==========================================================================
function configurarNavbarScroll() {
    const navbar = document.getElementById("navbar");
    if (!navbar) return;

    window.addEventListener("scroll", () => {
        if (window.scrollY > 12) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    });
}

async function verificarStatusServidor() {
    const pill = document.getElementById("statusApi");
    const texto = document.getElementById("statusTexto");
    if (!pill || !texto) return;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const resposta = await fetch(`${API_BASE_URL}/health`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!resposta.ok) {
            throw new Error("Servidor indisponível");
        }

        const dados = await resposta.json();
        pill.className = "status-pill online";
        texto.textContent = dados.svm_carregado
            ? "Servidor e SVM Ativos"
            : "Servidor Online";
    } catch (erro) {
        try {
            const respDocs = await fetch(`${API_BASE_URL}/docs`);
            if (respDocs.ok) {
                pill.className = "status-pill online";
                texto.textContent = "Servidor Local Ativo";
                return;
            }
        } catch (_) {
            // Backend local desligado
        }

        pill.className = "status-pill offline";
        texto.textContent = "Servidor Local Aguardando";
    }
}

// ==========================================================================
// SISTEMA DE USUÁRIO E MEMÓRIA LOCAL (index.html)
// ==========================================================================
>>>>>>> 0379ef2 (Home do site versão provisoria test)
function carregarUsuario() {
    const inputNome = document.getElementById("nomeUsuario");
    if (!inputNome) return;

    const ultimoUsuario = localStorage.getItem("verifica_ai_ultimo_user") || "Visitante";
    inputNome.value = ultimoUsuario === "Visitante" ? "" : ultimoUsuario;
    trocarUsuario();
}

function verificarEnterUsuario(event) {
    if (event.key === "Enter") {
        document.getElementById("nomeUsuario").blur();
    }
}

function trocarUsuario() {
<<<<<<< HEAD
    const inputNome = document.getElementById("nomeUsuario").value.trim();
    usuarioAtual = inputNome !== "" ? inputNome : "Visitante";
=======
    const inputNome = document.getElementById("nomeUsuario");
    if (!inputNome) return;

    const valorNome = inputNome.value.trim();
    usuarioAtual = valorNome !== "" ? valorNome : "Visitante";

>>>>>>> 0379ef2 (Home do site versão provisoria test)
    localStorage.setItem("verifica_ai_ultimo_user", usuarioAtual);

    const conversaSalva = localStorage.getItem(`verifica_ai_chat_${usuarioAtual}`);
    memoriaConversa = conversaSalva ? JSON.parse(conversaSalva) : [];
<<<<<<< HEAD
=======

>>>>>>> 0379ef2 (Home do site versão provisoria test)
    renderizarChat();
}

function salvarConversaNoNavegador() {
    const recorte = memoriaConversa.slice(-25);
    localStorage.setItem(`verifica_ai_chat_${usuarioAtual}`, JSON.stringify(recorte));
}

function renderizarChat() {
    const chatContainer = document.getElementById("chatContainer");
<<<<<<< HEAD
    chatContainer.innerHTML = `
        <div class="message ai">
            Olá, <strong>${escaparHTML(usuarioAtual)}</strong>! Sou o agente investigador do VERIFICA.AI. Digite a afirmação que deseja checar ou use o microfone.
        </div>
    `;

    memoriaConversa.forEach((msg, index) => {
        if (msg.role === "user") {
            chatContainer.insertAdjacentHTML(
                "beforeend",
                `<div class="message user history">${escaparHTML(msg.content)}</div>`
            );
        } else if (msg.role === "assistant") {
            const idHist = `msg-hist-${index}`;
            if (msg.meta && (msg.meta.origem === "agente_verificacao" || msg.meta.origem === "fallback_estatistico")) {
                const htmlCard = construirHTMLTransparencia(msg.meta, idHist, formatarTextoIA(msg.content));
                chatContainer.insertAdjacentHTML(
                    "beforeend",
                    `<div class="message ai history" id="${idHist}">${htmlCard}</div>`
                );
            } else {
                chatContainer.insertAdjacentHTML(
                    "beforeend",
                    `<div class="message ai history" id="${idHist}">${formatarTextoIA(msg.content)}</div>`
                );
            }
=======
    if (!chatContainer) return;

    chatContainer.innerHTML = `
        <div class="message ai">
            Sessão ativa para <strong>${usuarioAtual}</strong>. Insira a afirmação ou notícia que deseja auditar nas bases de dados.
        </div>
    `;

    memoriaConversa.forEach(msg => {
        if (msg.role === "user") {
            chatContainer.innerHTML += `<div class="message user history">${msg.content}</div>`;
        } else if (msg.role === "assistant") {
            chatContainer.innerHTML += `<div class="message ai history">${formatarTextoIA(msg.content)}</div>`;
>>>>>>> 0379ef2 (Home do site versão provisoria test)
        }
    });

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function limparConversa() {
    memoriaConversa = [];
    salvarConversaNoNavegador();
    renderizarChat();
}

<<<<<<< HEAD
function iniciarReconhecimentoVoz() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Seu navegador não suporta reconhecimento de voz nativo. Utilize o Google Chrome ou Edge.");
=======
// ==========================================================================
// ENTRADA POR VOZ, EFEITO DE DIGITAÇÃO E SUGESTÕES
// ==========================================================================
function iniciarReconhecimentoVoz() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Este navegador não suporta reconhecimento de voz nativo. Utilize o Google Chrome.");
>>>>>>> 0379ef2 (Home do site versão provisoria test)
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.start();

    const btnVoz = document.getElementById("btnVoz");
    btnVoz.classList.add("gravando");
<<<<<<< HEAD
    btnVoz.innerText = "🔴";
=======
    btnVoz.innerText = "Ouvindo...";
>>>>>>> 0379ef2 (Home do site versão provisoria test)

    recognition.onresult = function (event) {
        const transcricao = event.results[0][0].transcript;
        document.getElementById("campoTexto").value = transcricao;
<<<<<<< HEAD
        setTimeout(enviarMensagem, 500);
    };

    recognition.onerror = function () {
        btnVoz.classList.remove("gravando");
        btnVoz.innerText = "🎙️";
    };

=======
        setTimeout(enviarMensagem, 600);
    };

>>>>>>> 0379ef2 (Home do site versão provisoria test)
    recognition.onend = function () {
        btnVoz.classList.remove("gravando");
        btnVoz.innerText = "Voz";
    };
}

function efeitoDigitacaoSeguro(elementoHtml, htmlCompleto, velocidade, callback) {
    let i = 0;
    let isTag = false;
    let textoAtual = "";

    function digitar() {
        if (i < htmlCompleto.length) {
            const char = htmlCompleto.charAt(i);
            textoAtual += char;
            elementoHtml.innerHTML = textoAtual;

            if (char === "<") isTag = true;
            if (char === ">") isTag = false;

            i++;
<<<<<<< HEAD
=======

>>>>>>> 0379ef2 (Home do site versão provisoria test)
            if (isTag) {
                digitar();
            } else {
                setTimeout(digitar, velocidade);
            }
        } else if (callback) {
            callback();
        }
    }
    digitar();
}

function adicionarRespostasRapidas() {
    const chatContainer = document.getElementById("chatContainer");
    const idSugestoes = "sugestoes-" + Date.now();

<<<<<<< HEAD
    chatContainer.insertAdjacentHTML(
        "beforeend",
        `
        <div id="${idSugestoes}" class="quick-replies">
            <button type="button" class="btn-quick" onclick="usarSugestao('Resuma a avaliação em uma linha, por favor.', '${idSugestoes}')">Resumir</button>
            <button type="button" class="btn-quick" onclick="usarSugestao('Como funciona o cálculo do modelo SVM?', '${idSugestoes}')">O que é SVM?</button>
            <button type="button" class="btn-quick" onclick="usarSugestao('Obrigado pela análise!', '${idSugestoes}')">Obrigado</button>
=======
    chatContainer.innerHTML += `
        <div id="${idSugestoes}" class="quick-replies">
            <button class="btn-quick" onclick="usarSugestao('Resuma a avaliação anterior em uma linha.', '${idSugestoes}')">Resumir parecer</button>
            <button class="btn-quick" onclick="usarSugestao('Como funciona o classificador SVM utilizado?', '${idSugestoes}')">Explicar modelo SVM</button>
            <button class="btn-quick" onclick="usarSugestao('Qual foi a minha pergunta anterior?', '${idSugestoes}')">Revisar histórico</button>
>>>>>>> 0379ef2 (Home do site versão provisoria test)
        </div>
        `
    );
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function usarSugestao(texto, idParaRemover) {
    const el = document.getElementById(idParaRemover);
    if (el) el.remove();
    document.getElementById("campoTexto").value = texto;
    enviarMensagem();
}

<<<<<<< HEAD
function baixarLaudoPDF(idMensagem) {
    const elementoOriginal = document.getElementById(idMensagem);
    if (!elementoOriginal) {
        alert("Erro: Laudo não encontrado na tela.");
        return;
    }

    const clone = elementoOriginal.cloneNode(true);

    // Remove o botão de ação para não sair na folha
    const areaAcoes = clone.querySelector(".feedback-area");
    if (areaAcoes) areaAcoes.remove();

    // Abre o painel de auditoria do SVM e fontes para sair completo
    clone.querySelectorAll("details").forEach((d) => d.setAttribute("open", "true"));

    const dataAtual = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
=======
// ==========================================================================
// GERAÇÃO DE LAUDO PERICIAL EM PDF
// ==========================================================================
function baixarLaudoPDF(idMensagem) {
    const elementoOriginal = document.getElementById(idMensagem);
    const elementoClone = elementoOriginal.cloneNode(true);

    const botaoPdf = elementoClone.querySelector(".btn-pdf");
    if (botaoPdf) botaoPdf.remove();

    const feedbackArea = elementoClone.querySelector(".feedback-area");
    if (feedbackArea) feedbackArea.remove();

    const detalhes = elementoClone.querySelectorAll("details");
    detalhes.forEach(detalhe => detalhe.setAttribute("open", "true"));

    elementoClone.style.padding = "20px";
    elementoClone.style.backgroundColor = "#0f172a";
    elementoClone.style.color = "#f8fafc";
    elementoClone.style.width = "100%";
    elementoClone.style.maxWidth = "800px";
    elementoClone.style.boxSizing = "border-box";
    elementoClone.style.borderRadius = "0";

    const cabecalho = document.createElement("div");
    const dataAtual = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
    cabecalho.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid #334155; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="color: #38bdf8; margin: 0; font-size: 20px; text-transform: uppercase;">VERIFICA.AI — Laudo Técnico de Checagem</h2>
            <p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0 0;">Pesquisador: ${usuarioAtual} | Emissão: ${dataAtual}</p>
        </div>
    `;
    elementoClone.insertBefore(cabecalho, elementoClone.firstChild);

    const divTemporaria = document.createElement("div");
    divTemporaria.style.position = "absolute";
    divTemporaria.style.left = "-9999px";
    divTemporaria.appendChild(elementoClone);
    document.body.appendChild(divTemporaria);

    const opcoes = {
        margin: 15,
        filename: `Laudo_VerificaAI_${usuarioAtual}.pdf`,
        image: { type: "jpeg", quality: 1.0 },
        html2canvas: { scale: 2, backgroundColor: "#0f172a", useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    html2pdf().set(opcoes).from(elementoClone).save().then(() => {
        document.body.removeChild(divTemporaria);
>>>>>>> 0379ef2 (Home do site versão provisoria test)
    });

<<<<<<< HEAD
    // Cria um iframe oculto (não ativa bloqueador de pop-up)
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Laudo_VerificaAI_${escaparHTML(usuarioAtual)}</title>
            <style>
                @page { size: A4; margin: 18mm; }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    color: #0f172a;
                    background: #ffffff;
                    line-height: 1.6;
                    margin: 0;
                    padding: 0;
                }
                .cabecalho-laudo {
                    border-bottom: 2px solid #0284c7;
                    padding-bottom: 12px;
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                .cabecalho-laudo h1 {
                    margin: 0;
                    font-size: 20px;
                    color: #0284c7;
                    letter-spacing: 0.5px;
                }
                .cabecalho-laudo p {
                    margin: 4px 0 0 0;
                    font-size: 11px;
                    color: #475569;
                }
                .selo-fato {
                    display: inline-block;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-weight: bold;
                    font-size: 13px;
                    margin-bottom: 14px;
                    border: 1px solid #cbd5e1;
                }
                .selo-fato.verdadeiro { background: #dcfce7; color: #166534; border-color: #16a34a; }
                .selo-fato.falso { background: #fee2e2; color: #991b1b; border-color: #dc2626; }
                .selo-fato.inconclusivo { background: #fef3c7; color: #92400e; border-color: #d97706; }
                .texto-veredito {
                    font-size: 14px;
                    text-align: justify;
                    margin-bottom: 18px;
                }
                details.painel-transparencia {
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    padding: 12px;
                    background: #f8fafc;
                    page-break-inside: avoid;
                }
                details.painel-transparencia summary {
                    font-weight: bold;
                    color: #0f172a;
                    margin-bottom: 10px;
                    list-style: none;
                }
                .termometro {
                    display: flex;
                    justify-content: space-between;
                    gap: 10px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    padding: 10px;
                    border-radius: 6px;
                    margin-bottom: 10px;
                }
                .stat-item span { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; }
                .stat-item strong { font-size: 15px; }
                .alerta-divergencia {
                    padding: 10px;
                    background: #fffbeb;
                    border-left: 3px solid #f59e0b;
                    font-size: 12px;
                    color: #78350f;
                    margin-bottom: 10px;
                }
                .fontes-box { font-size: 12px; }
                .lista-fontes { margin: 6px 0 0 18px; padding: 0; }
                .lista-fontes li { margin-bottom: 4px; }
                .lista-fontes a { color: #0284c7; text-decoration: none; word-break: break-all; }
                .rodape-laudo {
                    margin-top: 25px;
                    padding-top: 10px;
                    border-top: 1px solid #e2e8f0;
                    font-size: 10px;
                    color: #64748b;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="cabecalho-laudo">
                <div>
                    <h1>VERIFICA.AI — LAUDO DE CHECAGEM</h1>
                    <p>Arquitetura Híbrida: IA Generativa + Machine Learning (SVM) + Busca Web</p>
                </div>
                <div style="text-align: right;">
                    <p><strong>Solicitante:</strong> ${escaparHTML(usuarioAtual)}</p>
                    <p><strong>Emissão:</strong> ${dataAtual}</p>
                </div>
            </div>
            ${clone.innerHTML}
            <div class="rodape-laudo">
                Documento gerado automaticamente pelo sistema VERIFICA.AI. Os índices estatísticos refletem a análise combinada do modelo SVM e das fontes indexadas na data de emissão.
            </div>
        </body>
        </html>
    `);
    doc.close();

    // Aguarda a renderização do iframe e abre a janela de salvar como PDF
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
}
=======
// ==========================================================================
// COMUNICAÇÃO COM A API FASTAPI
// ==========================================================================
>>>>>>> 0379ef2 (Home do site versão provisoria test)
function checarEnter(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        enviarMensagem();
    }
}

<<<<<<< HEAD
function construirHTMLTransparencia(dados, idCard, textoInicial = "") {
    const ml = dados.dados_ml || { verdadeiro: 50, falso: 50, fontes_cruzadas: 0, fontes_lista: [] };
    const classeSelo = dados.fato_real ? dados.fato_real.toLowerCase() : "inconclusivo";

    let alertaErroHTML = "";
    if (dados.modelo_errou) {
        alertaErroHTML = `
            <div class="alerta-divergencia">
                <strong>⚠️ Divergência Detectada no SVM:</strong> ${escaparHTML(dados.motivo_erro || "O modelo estatístico divergiu das evidências jornalísticas.")}
            </div>
        `;
    }

    let listaFontesHTML = "<p class='sem-fontes'>Nenhuma fonte externa indexada para esta consulta.</p>";
    if (ml.fontes_lista && ml.fontes_lista.length > 0) {
        const itens = ml.fontes_lista.map((f) => {
            const titulo = escaparHTML(f.titulo || f.title || f.url || "Fonte consultada");
            const link = f.link || f.url || "#";
            return `<li><a href="${escaparHTML(link)}" target="_blank" rel="noopener noreferrer">${titulo}</a></li>`;
        }).join("");
        listaFontesHTML = `<ul class="lista-fontes">${itens}</ul>`;
    }

    return `
        <div class="veredito-header">
            <span class="selo-fato ${classeSelo}">VEREDITO: ${escaparHTML(dados.fato_real || "INCONCLUSIVO")}</span>
        </div>
        <div class="texto-veredito">${textoInicial}</div>
        <details class="painel-transparencia">
            <summary>📊 Auditoria Técnica (SVM + ${ml.fontes_cruzadas} Fontes)</summary>
            <div class="termometro">
                <div class="stat-item">
                    <span>Índice Veracidade (SVM)</span>
                    <strong style="color: #10b981;">${ml.verdadeiro}%</strong>
                </div>
                <div class="stat-item">
                    <span>Alerta Desinformação (SVM)</span>
                    <strong style="color: #ef4444;">${ml.falso}%</strong>
                </div>
                <div class="stat-item">
                    <span>Fontes Cruzadas</span>
                    <strong style="color: #38bdf8;">${ml.fontes_cruzadas}</strong>
                </div>
            </div>
            ${alertaErroHTML}
            <div class="fontes-box">
                <strong>Fontes Consultadas na Web:</strong>
                ${listaFontesHTML}
            </div>
        </details>
        <div class="feedback-area">
            <button type="button" class="btn-pdf" onclick="baixarLaudoPDF('${idCard}')">📄 Baixar Laudo PDF</button>
        </div>
    `;
=======
function formatarTextoIA(texto) {
    return texto.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
>>>>>>> 0379ef2 (Home do site versão provisoria test)
}

async function enviarMensagem() {
    const campo = document.getElementById("campoTexto");
    const texto = campo.value.trim();
    const chatContainer = document.getElementById("chatContainer");
    const botao = document.getElementById("btnEnviar");

    if (!texto) return;

<<<<<<< HEAD
    document.querySelectorAll(".quick-replies").forEach((el) => el.remove());

    chatContainer.insertAdjacentHTML("beforeend", `<div class="message user">${escaparHTML(texto)}</div>`);
=======
    chatContainer.innerHTML += `<div class="message user">${texto}</div>`;
>>>>>>> 0379ef2 (Home do site versão provisoria test)
    campo.value = "";
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const idTemp = "msg-" + Date.now();
<<<<<<< HEAD
    chatContainer.insertAdjacentHTML(
        "beforeend",
        `<div class="message ai pensando" id="${idTemp}">⏳ [01s] Iniciando triagem inteligente...</div>`
    );
=======
    chatContainer.innerHTML += `<div class="message ai pensando" id="${idTemp}">[01s] Iniciando triagem da afirmação...</div>`;
>>>>>>> 0379ef2 (Home do site versão provisoria test)
    chatContainer.scrollTop = chatContainer.scrollHeight;
    botao.disabled = true;

    let segundos = 1;
    const timerInterval = setInterval(() => {
        segundos++;
<<<<<<< HEAD
        const el = document.getElementById(idTemp);
        if (el) {
            const tempoFormatado = String(segundos).padStart(2, "0");
            let statusTexto = "Iniciando triagem...";
            if (segundos >= 2 && segundos < 5) statusTexto = "Consultando modelo SVM e buscando notícias...";
            else if (segundos >= 5) statusTexto = "Cruzando fontes e redigindo veredito...";
            el.innerText = `⏳ [${tempoFormatado}s] ${statusTexto}`;
=======
        const elementoPensando = document.getElementById(idTemp);
        if (elementoPensando) {
            let statusTexto = "Analisando...";
            if (segundos === 2) statusTexto = "Consultando fontes jornalísticas...";
            if (segundos === 4) statusTexto = "Executando modelo estatístico SVM...";
            if (segundos === 6) statusTexto = "Cruzando métricas com evidências...";
            if (segundos >= 8) statusTexto = "Consolidando parecer final...";
            elementoPensando.innerHTML = `${statusTexto} (${segundos}s)`;
>>>>>>> 0379ef2 (Home do site versão provisoria test)
        }
    }, 1000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
<<<<<<< HEAD
        const historicoLimpo = memoriaConversa.slice(-6).map((m) => ({
            role: m.role,
            content: m.content
        }));

=======
>>>>>>> 0379ef2 (Home do site versão provisoria test)
        const resposta = await fetch(`${API_BASE_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mensagem: texto,
                historico: historicoLimpo
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        clearInterval(timerInterval);

<<<<<<< HEAD
        if (!resposta.ok) {
            throw new Error(`Erro HTTP ${resposta.status}`);
        }

        const dados = await resposta.json();
        const cardMensagem = document.getElementById(idTemp);
        cardMensagem.classList.remove("pensando");

        memoriaConversa.push({ role: "user", content: texto });
        memoriaConversa.push({ role: "assistant", content: dados.texto, meta: dados });
        salvarConversaNoNavegador();

        if (dados.origem === "agente_verificacao" || dados.origem === "fallback_estatistico") {
            cardMensagem.innerHTML = construirHTMLTransparencia(dados, idTemp);
            const divTexto = cardMensagem.querySelector(".texto-veredito");
            efeitoDigitacaoSeguro(divTexto, formatarTextoIA(dados.texto), 12, () => {
                adicionarRespostasRapidas();
                chatContainer.scrollTop = chatContainer.scrollHeight;
            });
        } else {
            cardMensagem.innerHTML = "";
            efeitoDigitacaoSeguro(cardMensagem, formatarTextoIA(dados.texto), 15, () => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            });
        }
=======
        const msgElemento = document.getElementById(idTemp);
        msgElemento.classList.remove("pensando");
        msgElemento.innerHTML = "";

        memoriaConversa.push({ role: "user", content: texto });
        memoriaConversa.push({ role: "assistant", content: dados.texto });
        salvarConversaNoNavegador();

        if (dados.origem === "agente_dialogo" || dados.origem === "erro") {
            efeitoDigitacaoSeguro(msgElemento, formatarTextoIA(dados.texto), 15, () => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
                adicionarRespostasRapidas();
            });
        } else if (dados.origem === "agente_verificacao") {
            const ml = dados.dados_ml;
            const idTextoPrincipal = "txt-" + Date.now();
            const idPainelOculto = "painel-" + Date.now();

            let htmlAlertaErro = "";
            if (dados.modelo_errou) {
                const corFato = dados.fato_real === "VERDADEIRO"
                    ? "#22c55e"
                    : (dados.fato_real === "FALSO" ? "#ef4444" : "#eab308");

                htmlAlertaErro = `
                    <div style="background-color: #450a0a; border-left: 5px solid #ef4444; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
                        <h3 style="color: #fca5a5; margin: 0 0 10px 0; font-size: 14px;">ALERTA DE AUDITORIA: DIVERGÊNCIA NO MODELO ESTATÍSTICO SVM</h3>
                        <div style="margin-bottom: 10px;">
                            <span style="background-color: ${corFato}; color: #fff; padding: 5px 10px; border-radius: 4px; font-weight: bold; font-size: 12px;">FATO REAL: ${dados.fato_real}</span>
                        </div>
                        <p style="color: #f8fafc; font-size: 13px; margin: 0;"><strong>Diagnóstico do erro estatístico:</strong> ${formatarTextoIA(dados.motivo_erro)}</p>
                    </div>
                `;
            }

            let htmlFontes = "";
            if (ml.fontes_lista && ml.fontes_lista.length > 0) {
                const itensLista = ml.fontes_lista.map(fonte => {
                    const textoFonte = typeof fonte === "object" ? JSON.stringify(fonte) : fonte;
                    return `<li style="margin-bottom: 6px;">${textoFonte}</li>`;
                }).join("");

                htmlFontes = `
                    <details style="margin-top: 12px; background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155;">
                        <summary style="cursor: pointer; color: #38bdf8; font-weight: bold; font-size: 13px; outline: none;">
                            Fontes Jornalísticas Coletadas (${ml.fontes_cruzadas})
                        </summary>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 11px; color: #cbd5e1; line-height: 1.4;">
                            ${itensLista}
                        </ul>
                    </details>
                `;
            }

            const htmlDetalhesTecnicos = `
                <details style="margin-top: 8px; background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155;">
                    <summary style="cursor: pointer; color: #4ade80; font-weight: bold; font-size: 13px; outline: none;">
                        Detalhes do Pipeline Técnico (Transparência Algorítmica)
                    </summary>
                    <div style="margin-top: 10px; font-size: 11px; color: #cbd5e1; line-height: 1.5; font-family: monospace;">
                        • <strong>Modelo Estatístico:</strong> SVM (TF-IDF Vectorizer)<br>
                        • <strong>Score Verdadeiro (Matemático):</strong> ${ml.verdadeiro}%<br>
                        • <strong>Score Falso (Matemático):</strong> ${ml.falso}%<br>
                        • <strong>Auditoria de Contexto:</strong> Groq API (Llama 3)<br>
                        • <strong>Coleta Web:</strong> Google News RSS Parser Ativo
                    </div>
                </details>
            `;

            msgElemento.innerHTML = `
                ${htmlAlertaErro}
                <div id="${idTextoPrincipal}" style="margin-bottom: 10px;"></div>

                <div id="${idPainelOculto}" style="display: none;">
                    <div class="termometro">
                        <div class="stat-item"><span>Veracidade (SVM)</span><strong style="color: #4ade80;">${ml.verdadeiro}%</strong></div>
                        <div class="stat-item"><span>Desinformação (SVM)</span><strong style="color: #f87171;">${ml.falso}%</strong></div>
                        <div class="stat-item"><span>Fontes Lidas</span><strong style="color: #38bdf8;">${ml.fontes_cruzadas}</strong></div>
                    </div>
                    ${htmlFontes}
                    ${htmlDetalhesTecnicos}

                    <button class="btn-pdf" onclick="baixarLaudoPDF('${idTemp}')" style="margin-top: 15px; width: 100%; background-color: #1D63DC; color: white; padding: 10px; border-radius: 6px; border: none; font-weight: bold; cursor: pointer;">
                        Baixar Laudo Oficial em PDF
                    </button>

                    <div class="feedback-area">
                        <span style="font-size: 12px; color: #94a3b8;">Avaliar precisão da análise:</span>
                        <button class="btn-feedback" onclick="this.innerText='Confirmado'; this.style.borderColor='#22c55e'; this.style.color='#22c55e';">Preciso</button>
                        <button class="btn-feedback" onclick="this.innerText='Registrado'; this.style.borderColor='#ef4444'; this.style.color='#ef4444';">Divergente</button>
                    </div>
                </div>
            `;

            const divTextoPrincipal = document.getElementById(idTextoPrincipal);
            const divPainelOculto = document.getElementById(idPainelOculto);

            efeitoDigitacaoSeguro(divTextoPrincipal, formatarTextoIA(dados.texto), 10, () => {
                divPainelOculto.style.display = "block";
                chatContainer.scrollTop = chatContainer.scrollHeight;
                adicionarRespostasRapidas();
            });
        }
>>>>>>> 0379ef2 (Home do site versão provisoria test)
    } catch (erro) {
        clearTimeout(timeoutId);
        clearInterval(timerInterval);
<<<<<<< HEAD
        const cardErro = document.getElementById(idTemp);
        if (cardErro) {
            cardErro.classList.remove("pensando");
            cardErro.innerHTML = `<span style="color: #ef4444;">❌ Não foi possível conectar ao servidor VERIFICA.AI (${escaparHTML(erro.message)}). Verifique se o backend está rodando.</span>`;
=======
        const msgElemento = document.getElementById(idTemp);
        if (msgElemento) {
            msgElemento.classList.remove("pensando");
            msgElemento.innerHTML = "Erro de conexão com o servidor local. Verifique se o Uvicorn está ativo na porta 8000.";
>>>>>>> 0379ef2 (Home do site versão provisoria test)
        }
    } finally {
        botao.disabled = false;
        campo.focus();
    }
}