// Troque esta URL pelo endereço da sua API hospedada (ex: https://verifica-ai-api.onrender.com) quando subir online
const API_BASE_URL = "http://127.0.0.1:8000";

let visitanteId = "";
let conversasSalvas = [];
let conversaAtivaId = null;
let usuarioAtual = "Visitante";

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
            // Cria uma nova conversa limpa se vier da busca da Home
            const ativa = obterConversaAtiva();
            if (ativa && ativa.mensagens.length > 0) {
                criarNovaConversa(false);
            }
            document.getElementById("campoTexto").value = consultaInicial;
            window.history.replaceState({}, document.title, "index.html");
            setTimeout(() => enviarMensagem(), 450);
        }
    }
});

// ==========================================================================
// 4. FUNÇÕES DA PÁGINA INICIAL (inicio.html)
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
        const timeoutId = setTimeout(() => controller.abort(), 3000);

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
    // Mantém no máximo as 30 conversas mais recentes no aparelho
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
    conversaAtivaId = id;
    salvarEstadoConversas();
    renderizarListaConversas();
    renderizarChat();
    alternarSidebarMobile(false);
}

function excluirConversa(event, id) {
    event.stopPropagation();
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
                    `<div class="message ai history" id="${idHist}">${htmlCard}</div>`
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
// 7. VOZ, DIGITAÇÃO E SUGESTÕES
// ==========================================================================
function iniciarReconhecimentoVoz() {
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

    // Desabilita ambos os botões do card para evitar cliques duplicados
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

    // Salva no estado local da conversa
    const ativa = obterConversaAtiva();
    if (ativa) {
        const msgAlvo = ativa.mensagens.find((m) => m.perguntaOrigem === afirmacao && m.role === "assistant");
        if (msgAlvo) {
            msgAlvo.feedbackEnviado = avaliacao;
            salvarEstadoConversas();
        }
    }

    // Envia de forma anônima para o FastAPI registrar no dataset_coletado_evento.csv
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
// 9. GERAÇÃO DE LAUDO PERICIAL EM PDF (IMPRESSÃO LIMPA A4)
// ==========================================================================
function baixarLaudoPDF(idMensagem) {
    const elementoOriginal = document.getElementById(idMensagem);
    if (!elementoOriginal) {
        alert("Laudo não encontrado na tela.");
        return;
    }

    const clone = elementoOriginal.cloneNode(true);

    const areaAcoes = clone.querySelector(".feedback-area");
    if (areaAcoes) areaAcoes.remove();

    clone.querySelectorAll("details").forEach((d) => d.setAttribute("open", "true"));

    const dataAtual = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

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
                    border-bottom: 2px solid #0B2545;
                    padding-bottom: 12px;
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                .cabecalho-laudo h1 {
                    margin: 0;
                    font-size: 20px;
                    color: #0B2545;
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
                .lista-fontes a { color: #1D4ED8; text-decoration: none; word-break: break-all; }
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
                    <p>Arquitetura Híbrida: Análise Contextual + Machine Learning (SVM) + Busca Web</p>
                </div>
                <div style="text-align: right;">
                    <p><strong>Pesquisador:</strong> ${escaparHTML(usuarioAtual)}</p>
                    <p><strong>Emissão:</strong> ${dataAtual}</p>
                </div>
            </div>
            ${clone.innerHTML}
            <div class="rodape-laudo">
                Documento gerado pelo sistema VERIFICA.AI. Os índices estatísticos refletem a análise combinada do modelo SVM e das fontes jornalísticas consultadas na data de emissão.
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
        enviarMensagem();
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
    const campo = document.getElementById("campoTexto");
    const texto = campo.value.trim();
    const chatContainer = document.getElementById("chatContainer");
    const botao = document.getElementById("btnEnviar");

    if (!texto) return;

    const ativa = obterConversaAtiva();
    if (!ativa) return;

    // Atualiza o título da conversa na barra lateral com a primeira pergunta
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
    botao.disabled = true;

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

        // Guarda atributos no card para o envio de feedback anônimo
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

        // Limita a 30 mensagens por conversa para não pesar o aparelho
        ativa.mensagens = ativa.mensagens.slice(-30);
        salvarEstadoConversas();
        renderizarListaConversas();

        if (dados.origem === "agente_verificacao" || dados.origem === "fallback_estatistico") {
            cardMensagem.innerHTML = construirHTMLTransparencia(dados, idTemp, texto);
            const divTexto = cardMensagem.querySelector(".texto-veredito");
            efeitoDigitacaoSeguro(divTexto, formatarTextoIA(dados.texto), 12, () => {
                adicionarRespostasRapidas();
                chatContainer.scrollTop = chatContainer.scrollHeight;
            });
        } else {
            cardMensagem.innerHTML = "";
            efeitoDigitacaoSeguro(cardMensagem, formatarTextoIA(dados.texto), 15, () => {
                adicionarRespostasRapidas();
                chatContainer.scrollTop = chatContainer.scrollHeight;
            });
        }
    } catch (erro) {
        clearTimeout(timeoutId);
        clearInterval(timerInterval);
        const cardErro = document.getElementById(idTemp);
        if (cardErro) {
            cardErro.classList.remove("pensando");
            cardErro.innerHTML = `<span style="color: #ef4444;">Não foi possível conectar ao servidor VERIFICA.AI (${escaparHTML(erro.message)}). Verifique se o backend está rodando.</span>`;
        }
    } finally {
        botao.disabled = false;
        campo.focus();
    }
}