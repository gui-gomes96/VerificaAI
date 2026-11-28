// Troque esta URL pelo endereço da sua API hospedada (ex: https://verifica-ai-api.onrender.com) quando subir online
const API_BASE_URL = "";

let visitanteId = "";
let conversasSalvas = [];
let conversaAtivaId = null;
let usuarioAtual = "Visitante";
let iaRespondendo = false; // Trava anti-spam enquanto a IA processa ou digita

// ==========================================================================
// 1. SISTEMA DE COOKIE ANÔNIMO (IDENTIFICAÇÃO LOCAL SEM LOGIN)
// ==========================================================================
function obterOuCriarCookieVisitante() {
    const nomeCookie = "verifica_ai_vid";
    const partes = document.cookie.split("; ");
    for (const parte of partes) {
        if (parte.startsWith(nomeCookie + "=")) {
            return decodeURIComponent(parte.split("=")[1]);
        }
    }

    const novoId = "v_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 9);
    const validade = new Date();
    validade.setDate(validade.getDate() + 30); // Validade de 30 dias
    document.cookie = `${nomeCookie}=${encodeURIComponent(novoId)}; expires=${validade.toUTCString()}; path=/; SameSite=Lax`;
    return novoId;
}

function chaveStorageConversas() {
    return `verifica_ai_chats_${visitanteId}`;
}

function chaveStorageConversaAtiva() {
    return `verifica_ai_ativa_${visitanteId}`;
}

// ==========================================================================
// 2. CONTROLE DE MODO NOTURNO ADAPTATIVO E SINCRONIZADO
// ==========================================================================
function obterTemaPreferido() {
    const salvo = localStorage.getItem("verifica_ai_tema");
    if (salvo === "dark" || salvo === "light") {
        return salvo;
    }
    const prefereEscuro = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefereEscuro ? "dark" : "light";
}

function aplicarTema(tema) {
    document.documentElement.setAttribute("data-theme", tema);
    atualizarBotaoTema(tema);
}

function alternarTema() {
    const temaAtual = document.documentElement.getAttribute("data-theme") || obterTemaPreferido();
    const novoTema = temaAtual === "dark" ? "light" : "dark";
    localStorage.setItem("verifica_ai_tema", novoTema);
    aplicarTema(novoTema);
}

function atualizarBotaoTema(tema) {
    const botoes = document.querySelectorAll(".btn-theme-toggle");
    botoes.forEach((btn) => {
        if (tema === "dark") {
            btn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                <span>Modo Claro</span>
            `;
            btn.title = "Mudar para Modo Claro";
        } else {
            btn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
                <span>Modo Noturno</span>
            `;
            btn.title = "Mudar para Modo Noturno";
        }
    });
}

window.addEventListener("storage", (event) => {
    if (event.key === "verifica_ai_tema") {
        aplicarTema(obterTemaPreferido());
    }
});

if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
        if (!localStorage.getItem("verifica_ai_tema")) {
            aplicarTema(event.matches ? "dark" : "light");
        }
    });
}

// ==========================================================================
// 3. INICIALIZAÇÃO GERAL
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    aplicarTema(obterTemaPreferido());
    visitanteId = obterOuCriarCookieVisitante();

    if (document.getElementById("navbar")) {
        configurarNavbarScroll();
    }
    if (document.getElementById("statusApi")) {
        verificarStatusServidor();
    }

    if (document.getElementById("chatContainer")) {
        carregarNomePesquisador();
        inicializarGerenciadorConversas();

        const paramsUrl = new URLSearchParams(window.location.search);
        const consultaInicial = paramsUrl.get("q");
        if (consultaInicial && document.getElementById("campoTexto")) {
            const ativa = obterConversaAtiva();
            if (ativa && ativa.mensagens.length > 0) {
                criarNovaConversa(false);
            }
            document.getElementById("campoTexto").value = consultaInicial;
            window.history.replaceState({}, document.title, "chat.html");

            setTimeout(() => enviarMensagem(), 450);
        }
    }
});

// ==========================================================================
// 4. FUNÇÕES DA PÁGINA INICIAL (index.html)
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
    if (!pill) return;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const resposta = await fetch(`${API_BASE_URL}/health`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!resposta.ok) {
            throw new Error("Servidor indisponível");
        }

        const dados = await resposta.json();
        pill.className = "status-indicator online";
        if (texto) {
            texto.textContent = dados.svm_carregado
                ? "Sistema e Filtro SVM Ativos"
                : "Sistema Online";
        }
    } catch (erro) {
        pill.className = "status-indicator offline";
        if (texto) texto.textContent = "Aguardando servidor";
    }
}

// ==========================================================================
// 5. GERENCIADOR DE MÚLTIPLAS CONVERSAS (ESTILO CHAT DE IA)
// ==========================================================================
function carregarNomePesquisador() {
    const inputNome = document.getElementById("nomeUsuario");
    const salvo = localStorage.getItem(`verifica_ai_nome_${visitanteId}`) || "";
    usuarioAtual = salvo.trim() !== "" ? salvo.trim() : "Visitante";
    if (inputNome) {
        inputNome.value = salvo;
    }
}

function verificarEnterUsuario(event) {
    if (event.key === "Enter") {
        document.getElementById("nomeUsuario").blur();
    }
}

function salvarNomePesquisador() {
    const inputNome = document.getElementById("nomeUsuario");
    if (!inputNome) return;
    const valor = inputNome.value.trim();
    usuarioAtual = valor !== "" ? valor : "Visitante";
    localStorage.setItem(`verifica_ai_nome_${visitanteId}`, valor);
}

function inicializarGerenciadorConversas() {
    try {
        const raw = localStorage.getItem(chaveStorageConversas());
        conversasSalvas = raw ? JSON.parse(raw) : [];
    } catch {
        conversasSalvas = [];
    }

    const salvaAtiva = localStorage.getItem(chaveStorageConversaAtiva());

    if (conversasSalvas.length === 0) {
        criarNovaConversa(false);
    } else {
        const existe = conversasSalvas.find((c) => c.id === salvaAtiva);
        conversaAtivaId = existe ? existe.id : conversasSalvas[0].id;
        salvarEstadoConversas();
        renderizarListaConversas();
        renderizarChat();
    }
}

function salvarEstadoConversas() {
    conversasSalvas = conversasSalvas.slice(0, 30);
    localStorage.setItem(chaveStorageConversas(), JSON.stringify(conversasSalvas));
    if (conversaAtivaId) {
        localStorage.setItem(chaveStorageConversaAtiva(), conversaAtivaId);
    }
}

function obterConversaAtiva() {
    return conversasSalvas.find((c) => c.id === conversaAtivaId) || null;
}

function criarNovaConversa(fecharMenuMobile = true) {
    if (iaRespondendo) return;

    const agora = new Date();
    const horaFmt = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const nova = {
        id: "chat_" + Date.now(),
        titulo: "Nova checagem",
        data: `Hoje, ${horaFmt}`,
        mensagens: []
    };

    conversasSalvas.unshift(nova);
    conversaAtivaId = nova.id;
    salvarEstadoConversas();
    renderizarListaConversas();
    renderizarChat();

    if (fecharMenuMobile) {
        alternarSidebarMobile(false);
    }
    const campo = document.getElementById("campoTexto");
    if (campo) campo.focus();
}

function selecionarConversa(id) {
    if (iaRespondendo) return;

    conversaAtivaId = id;
    salvarEstadoConversas();
    renderizarListaConversas();
    renderizarChat();
    alternarSidebarMobile(false);
}

function excluirConversa(event, id) {
    event.stopPropagation();
    if (iaRespondendo && id === conversaAtivaId) return;

    conversasSalvas = conversasSalvas.filter((c) => c.id !== id);

    if (conversasSalvas.length === 0) {
        criarNovaConversa(false);
        return;
    }

    if (conversaAtivaId === id) {
        conversaAtivaId = conversasSalvas[0].id;
    }

    salvarEstadoConversas();
    renderizarListaConversas();
    renderizarChat();
}

function apagarTodoHistorico() {
    if (iaRespondendo) return;
    if (!confirm("Deseja apagar todas as verificações salvas neste aparelho?")) return;
    conversasSalvas = [];
    criarNovaConversa(true);
}

function alternarSidebarMobile(abrir) {
    const sidebar = document.getElementById("chatSidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (!sidebar || !backdrop) return;

    if (abrir) {
        sidebar.classList.add("open");
        backdrop.classList.add("open");
    } else {
        sidebar.classList.remove("open");
        backdrop.classList.remove("open");
    }
}

function renderizarListaConversas() {
    const lista = document.getElementById("listaConversas");
    if (!lista) return;

    lista.innerHTML = "";
    conversasSalvas.forEach((conv) => {
        const ativaClass = conv.id === conversaAtivaId ? "active" : "";
        const item = document.createElement("div");
        item.className = `conv-item ${ativaClass}`;
        item.onclick = () => selecionarConversa(conv.id);

        item.innerHTML = `
            <div class="conv-info">
                <div class="conv-title">${escaparHTML(conv.titulo)}</div>
                <div class="conv-meta">${escaparHTML(conv.data)} • ${Math.floor(conv.mensagens.length / 2)} checagem(ns)</div>
            </div>
            <button type="button" class="btn-delete-conv" title="Excluir esta conversa" aria-label="Excluir conversa">&times;</button>
        `;

        const btnDel = item.querySelector(".btn-delete-conv");
        btnDel.onclick = (e) => excluirConversa(e, conv.id);

        lista.appendChild(item);
    });
}

// ==========================================================================
// 6. UTILITÁRIOS E RENDERIZAÇÃO DO CHAT
// ==========================================================================
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

function renderizarChat() {
    const chatContainer = document.getElementById("chatContainer");
    if (!chatContainer) return;

    const ativa = obterConversaAtiva();
    const mensagens = ativa ? ativa.mensagens : [];

    chatContainer.innerHTML = `
        <div class="message ai">
            Olá! Digite ou cole abaixo a notícia ou afirmação que deseja verificar. Suas conversas ficam salvas automaticamente neste aparelho, sem precisar de login.
        </div>
    `;

    mensagens.forEach((msg, index) => {
        if (msg.role === "user") {
            chatContainer.insertAdjacentHTML(
                "beforeend",
                `<div class="message user history">${escaparHTML(msg.content)}</div>`
            );
        } else if (msg.role === "assistant") {
            const idHist = `msg-hist-${index}`;
            if (msg.meta && (msg.meta.origem === "agente_verificacao" || msg.meta.origem === "fallback_estatistico")) {
                const htmlCard = construirHTMLTransparencia(
                    msg.meta,
                    idHist,
                    msg.perguntaOrigem || "",
                    formatarTextoIA(msg.content),
                    msg.feedbackEnviado || null
                );
                chatContainer.insertAdjacentHTML(
                    "beforeend",
                    `<div class="message ai history" id="${idHist}" data-afirmacao="${escaparHTML(msg.perguntaOrigem || "")}" data-veredito="${escaparHTML(msg.meta.fato_real || "INCONCLUSIVO")}">${htmlCard}</div>`
                );
            } else {
                chatContainer.insertAdjacentHTML(
                    "beforeend",
                    `<div class="message ai history" id="${idHist}">${formatarTextoIA(msg.content)}</div>`
                );
            }
        }
    });

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ==========================================================================
// 7. TRAVA ANTI-SPAM, VOZ, DIGITAÇÃO E SUGESTÕES
// ==========================================================================
function definirEstadoEnvio(ocupado) {
    iaRespondendo = ocupado;
    const btnEnviar = document.getElementById("btnEnviar");
    const btnVoz = document.getElementById("btnVoz");
    const btnNova = document.querySelector(".btn-new-chat");

    if (btnEnviar) {
        btnEnviar.disabled = ocupado;
        const spanEnviar = btnEnviar.querySelector("span");
        if (spanEnviar) {
            spanEnviar.textContent = ocupado ? "Aguarde..." : "Verificar";
        }
    }
    if (btnVoz) {
        btnVoz.disabled = ocupado;
    }
    if (btnNova) {
        btnNova.disabled = ocupado;
        btnNova.style.opacity = ocupado ? "0.6" : "1";
    }
}

function iniciarReconhecimentoVoz() {
    if (iaRespondendo) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Este navegador não suporta reconhecimento de voz nativo. Utilize o Google Chrome ou Edge.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.start();

    const btnVoz = document.getElementById("btnVoz");
    btnVoz.classList.add("gravando");
    btnVoz.innerText = "Ouvindo...";

    recognition.onresult = function (event) {
        const transcricao = event.results[0][0].transcript;
        document.getElementById("campoTexto").value = transcricao;
        setTimeout(enviarMensagem, 500);
    };

    recognition.onerror = function () {
        btnVoz.classList.remove("gravando");
        btnVoz.innerText = "Voz";
    };

    recognition.onend = function () {
        btnVoz.classList.remove("gravando");
        btnVoz.innerText = "Voz";
    };
}

function efeitoDigitacaoSeguro(elementoHtml, htmlCompleto, velocidade, callback) {
    let i = 0;
    let isTag = false;
    let textoAtual = "";
    const chatContainer = document.getElementById("chatContainer");

    function digitar() {
        if (i < htmlCompleto.length) {
            const char = htmlCompleto.charAt(i);
            textoAtual += char;
            elementoHtml.innerHTML = textoAtual;

            if (char === "<") isTag = true;
            if (char === ">") isTag = false;

            i++;
            if (isTag) {
                digitar();
            } else {
                if (chatContainer && i % 15 === 0) {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
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

    chatContainer.insertAdjacentHTML(
        "beforeend",
        `
        <div id="${idSugestoes}" class="quick-replies">
            <button type="button" class="btn-quick" onclick="usarSugestao('Resuma a avaliação em uma linha, por favor.', '${idSugestoes}')">Resumir parecer</button>
            <button type="button" class="btn-quick" onclick="usarSugestao('Como funciona o modelo SVM?', '${idSugestoes}')">O que é SVM?</button>
            <button type="button" class="btn-quick" onclick="usarSugestao('Qual foi a minha pergunta anterior?', '${idSugestoes}')">Revisar histórico</button>
        </div>
        `
    );
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function usarSugestao(texto, idParaRemover) {
    if (iaRespondendo) return;
    const el = document.getElementById(idParaRemover);
    if (el) el.remove();
    document.getElementById("campoTexto").value = texto;
    enviarMensagem();
}

// ==========================================================================
// 8. FEEDBACK ANÔNIMO PARA APRENDIZADO CONTÍNUO DO SVM (/feedback)
// ==========================================================================
async function enviarFeedbackModelo(btnClicado, idCard, avaliacao) {
    const card = document.getElementById(idCard);
    if (!card) return;

    const afirmacao = card.getAttribute("data-afirmacao") || "";
    const veredito = card.getAttribute("data-veredito") || "";

    const botoes = card.querySelectorAll(".btn-feedback");
    botoes.forEach((b) => (b.disabled = true));

    if (avaliacao === "preciso") {
        btnClicado.innerText = "Confirmado (Obrigado!)";
        btnClicado.style.borderColor = "#15803D";
        btnClicado.style.color = "#15803D";
    } else {
        btnClicado.innerText = "Registrado para revisão";
        btnClicado.style.borderColor = "#B91C1C";
        btnClicado.style.color = "#B91C1C";
    }

    const ativa = obterConversaAtiva();
    if (ativa) {
        const msgAlvo = ativa.mensagens.find((m) => m.perguntaOrigem === afirmacao && m.role === "assistant");
        if (msgAlvo) {
            msgAlvo.feedbackEnviado = avaliacao;
            salvarEstadoConversas();
        }
    }

    try {
        await fetch(`${API_BASE_URL}/feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                texto_afirmacao: afirmacao,
                veredito_exibido: veredito,
                avaliacao: avaliacao
            })
        });
    } catch {
        // Falha silenciosa se estiver offline
    }
}

// ==========================================================================
// 9. GERAÇÃO DE LAUDO TÉCNICO EM PDF — PADRÃO ABNT (NBR 14724 / NBR 6023)
// ==========================================================================
function formatarDataABNT(data = new Date()) {
    const meses = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = meses[data.getMonth()];
    const ano = data.getFullYear();
    return `${dia} ${mes} ${ano}`;
}

function baixarLaudoPDF(idMensagem) {
    const elementoOriginal = document.getElementById(idMensagem);
    if (!elementoOriginal) {
        alert("Laudo não encontrado na tela.");
        return;
    }

    salvarNomePesquisador();
    const solicitante = usuarioAtual !== "Visitante" ? usuarioAtual : "Não identificado (Consulta Pública)";

    const agora = new Date();
    const dataExtenso = agora.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const dataAcessoABNT = formatarDataABNT(agora);
    const protocolo = `VAI-${agora.getFullYear()}${String(agora.getMonth() + 1).padStart(2, "0")}${String(agora.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Extrai os dados estruturados do card
    const afirmacaoOriginal = elementoOriginal.getAttribute("data-afirmacao") || "Afirmação submetida no painel de verificação.";
    const vereditoFinal = elementoOriginal.getAttribute("data-veredito") || "INCONCLUSIVO";

    const divVeredito = elementoOriginal.querySelector(".texto-veredito");
    const textoBruto = divVeredito ? divVeredito.innerText : "";
    const paragrafosHTML = textoBruto
        .split(/\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((p) => `<p class="abnt-paragrafo">${escaparHTML(p)}</p>`)
        .join("");

    // Extrai estatísticas do SVM
    const stats = elementoOriginal.querySelectorAll(".termometro .stat-item strong");
    const pVerdade = stats[0] ? stats[0].innerText.trim() : "50%";
    const pFalso = stats[1] ? stats[1].innerText.trim() : "50%";
    const totalFontes = stats[2] ? stats[2].innerText.trim() : "0";

    // Extrai eventual nota de divergência do SVM
    const alertaDiv = elementoOriginal.querySelector(".alerta-divergencia");
    const notaDivergenciaHTML = alertaDiv
        ? `<p class="abnt-paragrafo"><strong>Nota de Auditoria Algorítmica:</strong> ${escaparHTML(alertaDiv.innerText.replace("Divergência Detectada no Filtro SVM:", "").trim())}</p>`
        : "";

    // Formata referências bibliográficas no padrão ABNT NBR 6023
    const linksFontes = elementoOriginal.querySelectorAll(".lista-fontes li a");
    let referenciasHTML = `<p class="abnt-referencia">Nenhuma fonte jornalística externa indexada para esta consulta.</p>`;

    if (linksFontes.length > 0) {
        referenciasHTML = Array.from(linksFontes).map((a) => {
            const titulo = escaparHTML(a.innerText.trim());
            const url = escaparHTML(a.getAttribute("href") || "");
            let dominio = "PORTAL DE NOTÍCIAS";
            try {
                if (url.startsWith("http")) {
                    dominio = new URL(url).hostname.replace(/^www\./, "").toUpperCase();
                }
            } catch {
                dominio = "PORTAL DE NOTÍCIAS";
            }
            return `<p class="abnt-referencia">${dominio}. <strong>${titulo}</strong>. Disponível em: &lt;${url}&gt;. Acesso em: ${dataAcessoABNT}.</p>`;
        }).join("");
    }

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
            <title>Laudo_ABNT_VerificaAI_${escaparHTML(solicitante)}</title>
            <style>
                /* Padrão ABNT NBR 14724: Papel A4, margens 3cm (sup/esq) e 2cm (inf/dir) */
                @page {
                    size: A4 portrait;
                    margin: 3cm 2cm 2cm 3cm;
                }
                body {
                    font-family: "Times New Roman", Times, Arial, serif;
                    font-size: 12pt;
                    line-height: 1.5;
                    color: #000000;
                    background: #ffffff;
                    margin: 0;
                    padding: 0;
                }
                .abnt-cabecalho {
                    text-align: center;
                    font-weight: bold;
                    text-transform: uppercase;
                    line-height: 1.3;
                    margin-bottom: 1.2cm;
                }
                .abnt-titulo {
                    text-align: center;
                    font-weight: bold;
                    text-transform: uppercase;
                    font-size: 12pt;
                    margin: 0.8cm 0;
                }
                .abnt-metadados {
                    border-top: 1px solid #000000;
                    border-bottom: 1px solid #000000;
                    padding: 8px 0;
                    margin-bottom: 1cm;
                    font-size: 11pt;
                    line-height: 1.4;
                }
                .abnt-secao {
                    font-weight: bold;
                    text-transform: uppercase;
                    font-size: 12pt;
                    margin-top: 0.9cm;
                    margin-bottom: 0.4cm;
                    page-break-after: avoid;
                }
                .abnt-paragrafo {
                    text-align: justify;
                    text-indent: 1.25cm;
                    margin-top: 0;
                    margin-bottom: 0.35cm;
                }
                /* Citação direta com mais de 3 linhas (recuo de 4cm, fonte 10pt, espaço simples) */
                .abnt-citacao-recuada {
                    margin-left: 4cm;
                    font-size: 10pt;
                    line-height: 1.15;
                    text-align: justify;
                    margin-top: 0.4cm;
                    margin-bottom: 0.6cm;
                }
                /* Tabela padrão IBGE/ABNT (sem linhas verticais nas bordas) */
                .abnt-tabela {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 0.5cm 0 0.7cm 0;
                    font-size: 10pt;
                    line-height: 1.2;
                    page-break-inside: avoid;
                }
                .abnt-tabela th,
                .abnt-tabela td {
                    border-top: 1px solid #000000;
                    border-bottom: 1px solid #000000;
                    padding: 6px 8px;
                    text-align: left;
                }
                .abnt-tabela th {
                    font-weight: bold;
                }
                /* Referências NBR 6023 (alinhadas à esquerda, espaço simples, fonte 10pt) */
                .abnt-referencia {
                    text-align: left;
                    font-size: 10pt;
                    line-height: 1.15;
                    margin-top: 0;
                    margin-bottom: 0.35cm;
                    word-break: break-word;
                }
                .abnt-assinatura {
                    margin-top: 1.8cm;
                    text-align: center;
                    font-size: 11pt;
                    line-height: 1.3;
                    page-break-inside: avoid;
                }
            </style>
        </head>
        <body>
            <div class="abnt-cabecalho">
                <div>PLATAFORMA VERIFICA.AI — AUDITORIA FACTUAL E CHECAGEM DE DADOS</div>
                <div>SISTEMA HÍBRIDO DE ANÁLISE CONTEXTUAL E APRENDIZADO DE MÁQUINA</div>
            </div>

            <div class="abnt-titulo">LAUDO TÉCNICO DE VERIFICAÇÃO FACTUAL</div>

            <div class="abnt-metadados">
                <div><strong>Protocolo:</strong> ${protocolo}</div>
                <div><strong>Solicitante:</strong> ${escaparHTML(solicitante)}</div>
                <div><strong>Data de Emissão:</strong> ${dataExtenso}</div>
                <div><strong>Classificação Final:</strong> ${escaparHTML(vereditoFinal)}</div>
            </div>

            <div class="abnt-secao">1 OBJETO DA ANÁLISE</div>
            <div class="abnt-citacao-recuada">
                “${escaparHTML(afirmacaoOriginal)}”
            </div>

            <div class="abnt-secao">2 INDICADORES ESTATÍSTICOS (MODELO SVM + TF-IDF)</div>
            <table class="abnt-tabela">
                <thead>
                    <tr>
                        <th>Parâmetro Avaliado</th>
                        <th>Resultado Obtido</th>
                        <th>Método Aplicado</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Índice de Veracidade Lexical</td>
                        <td>${escaparHTML(pVerdade)}</td>
                        <td>Classificador Support Vector Machine (SVM)</td>
                    </tr>
                    <tr>
                        <td>Índice de Padrão de Desinformação</td>
                        <td>${escaparHTML(pFalso)}</td>
                        <td>Vetorização TF-IDF</td>
                    </tr>
                    <tr>
                        <td>Fontes Jornalísticas Cruzadas</td>
                        <td>${escaparHTML(totalFontes)} veículo(s)</td>
                        <td>Busca automatizada em portais indexados</td>
                    </tr>
                </tbody>
            </table>
            ${notaDivergenciaHTML}

            <div class="abnt-secao">3 PARECER TÉCNICO E CONTEXTUALIZAÇÃO</div>
            ${paragrafosHTML}

            <div class="abnt-secao">REFERÊNCIAS</div>
            ${referenciasHTML}

            <div class="abnt-assinatura">
                ____________________________________________________<br>
                <strong>VERIFICA.AI — Motor de Auditoria Factual</strong><br>
                Documento gerado eletronicamente em ${dataExtenso}.
            </div>
        </body>
        </html>
    `);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
}

// ==========================================================================
// 10. COMUNICAÇÃO COM A API FASTAPI (/chat)
// ==========================================================================
function checarEnter(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (!iaRespondendo) {
            enviarMensagem();
        }
    }
}

function construirHTMLTransparencia(dados, idCard, perguntaOrigem = "", textoInicial = "", feedbackAnterior = null) {
    const ml = dados.dados_ml || { verdadeiro: 50, falso: 50, fontes_cruzadas: 0, fontes_lista: [] };
    const vereditoStr = dados.fato_real || "INCONCLUSIVO";
    const classeSelo = vereditoStr.toLowerCase();

    let alertaErroHTML = "";
    if (dados.modelo_errou) {
        alertaErroHTML = `
            <div class="alerta-divergencia">
                <strong>Divergência Detectada no Filtro SVM:</strong> ${escaparHTML(dados.motivo_erro || "O modelo estatístico divergiu das evidências jornalísticas.")}
            </div>
        `;
    }

    let listaFontesHTML = "<p class='sem-fontes'>Nenhuma fonte externa indexada para esta consulta.</p>";
    if (ml.fontes_lista && ml.fontes_lista.length > 0) {
        const itens = ml.fontes_lista.map((f) => {
            if (typeof f === "string") {
                return `<li>${escaparHTML(f)}</li>`;
            }
            const titulo = escaparHTML(f.titulo || f.title || f.url || "Fonte consultada");
            const link = f.link || f.url || "#";
            return `<li><a href="${escaparHTML(link)}" target="_blank" rel="noopener noreferrer">${titulo}</a></li>`;
        }).join("");
        listaFontesHTML = `<ul class="lista-fontes">${itens}</ul>`;
    }

    const disAttr = feedbackAnterior ? "disabled" : "";
    const txtPreciso = feedbackAnterior === "preciso" ? "Confirmado (Obrigado!)" : "Preciso";
    const txtDivergente = feedbackAnterior === "divergente" ? "Registrado para revisão" : "Divergente";

    return `
        <div class="veredito-header">
            <span class="selo-fato ${classeSelo}">VEREDITO: ${escaparHTML(vereditoStr)}</span>
        </div>
        <div class="texto-veredito">${textoInicial}</div>
        <details class="painel-transparencia">
            <summary>Auditoria Técnica (Filtro SVM + ${ml.fontes_cruzadas} Fontes)</summary>
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
            <span class="feedback-label">Esta análise ajudou? (Ensina o modelo):</span>
            <button type="button" class="btn-feedback" ${disAttr} onclick="enviarFeedbackModelo(this, '${idCard}', 'preciso')">${txtPreciso}</button>
            <button type="button" class="btn-feedback" ${disAttr} onclick="enviarFeedbackModelo(this, '${idCard}', 'divergente')">${txtDivergente}</button>
            <button type="button" class="btn-pdf" onclick="baixarLaudoPDF('${idCard}')">Baixar Laudo PDF</button>
        </div>
    `;
}

async function enviarMensagem() {
    if (iaRespondendo) return;

    const campo = document.getElementById("campoTexto");
    const texto = campo.value.trim();
    const chatContainer = document.getElementById("chatContainer");

    if (!texto) return;

    const ativa = obterConversaAtiva();
    if (!ativa) return;

    definirEstadoEnvio(true);

    if (ativa.mensagens.length === 0) {
        ativa.titulo = texto.length > 42 ? texto.substring(0, 42) + "..." : texto;
    }

    document.querySelectorAll(".quick-replies").forEach((el) => el.remove());

    chatContainer.insertAdjacentHTML("beforeend", `<div class="message user">${escaparHTML(texto)}</div>`);
    campo.value = "";
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const idTemp = "msg-" + Date.now();
    chatContainer.insertAdjacentHTML(
        "beforeend",
        `<div class="message ai pensando" id="${idTemp}">[01s] Iniciando triagem inteligente...</div>`
    );
    chatContainer.scrollTop = chatContainer.scrollHeight;

    let segundos = 1;
    const timerInterval = setInterval(() => {
        segundos++;
        const el = document.getElementById(idTemp);
        if (el) {
            const tempoFormatado = String(segundos).padStart(2, "0");
            let statusTexto = "Iniciando triagem...";
            if (segundos >= 2 && segundos < 5) statusTexto = "Consultando filtro SVM e buscando notícias...";
            else if (segundos >= 5) statusTexto = "Cruzando fontes e redigindo veredito...";
            el.innerText = `[${tempoFormatado}s] ${statusTexto}`;
        }
    }, 1000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
        const historicoLimpo = ativa.mensagens.slice(-6).map((m) => ({
            role: m.role,
            content: m.content
        }));

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

        if (!resposta.ok) {
            throw new Error(`Erro HTTP ${resposta.status}`);
        }

        const dados = await resposta.json();
        const cardMensagem = document.getElementById(idTemp);
        cardMensagem.classList.remove("pensando");

        cardMensagem.setAttribute("data-afirmacao", texto);
        cardMensagem.setAttribute("data-veredito", dados.fato_real || "INCONCLUSIVO");

        ativa.mensagens.push({ role: "user", content: texto });
        ativa.mensagens.push({
            role: "assistant",
            content: dados.texto,
            meta: dados,
            perguntaOrigem: texto,
            feedbackEnviado: null
        });

        ativa.mensagens = ativa.mensagens.slice(-30);
        salvarEstadoConversas();
        renderizarListaConversas();

        const finalizarResposta = () => {
            adicionarRespostasRapidas();
            chatContainer.scrollTop = chatContainer.scrollHeight;
            definirEstadoEnvio(false);
            campo.focus();
        };

        if (dados.origem === "agente_verificacao" || dados.origem === "fallback_estatistico") {
            cardMensagem.innerHTML = construirHTMLTransparencia(dados, idTemp, texto);
            const divTexto = cardMensagem.querySelector(".texto-veredito");
            efeitoDigitacaoSeguro(divTexto, formatarTextoIA(dados.texto), 12, finalizarResposta);
        } else {
            cardMensagem.innerHTML = "";
            efeitoDigitacaoSeguro(cardMensagem, formatarTextoIA(dados.texto), 15, finalizarResposta);
        }
    } catch (erro) {
        clearTimeout(timeoutId);
        clearInterval(timerInterval);
        const cardErro = document.getElementById(idTemp);
        if (cardErro) {
            cardErro.classList.remove("pensando");
            cardErro.innerHTML = `<span style="color: #ef4444;">Não foi possível conectar ao servidor VERIFICA.AI (${escaparHTML(erro.message)}). Verifique se o backend está rodando.</span>`;
        }
        definirEstadoEnvio(false);
        campo.focus();
    }
}