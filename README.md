# Projeto de Machine Learning: VERIFICA.AI

> **Disciplina:** Desenvolvimento Mobile / Inteligência Artificial
> **Professora:** Joelma Sartori
> **Integrantes do Grupo:**
> - Guilherme Matheus Andrade Gomes (RM: 25041)
> - Kaue Costa Paixão (RM: 25116)
> - Carlos Henrique Bertotti Mendes (RM: 25228)

---

## 1. Pesquisa Teórica

### 1.1 Machine Learning Estatístico (Scikit-Learn e SVM)
**O que é:**
O Machine Learning (aprendizado de máquina) é um campo da Inteligência Artificial onde o sistema aprende a identificar padrões em dados sem ser programado com regras manuais. No nosso projeto, utilizamos o algoritmo SVM (Support Vector Machine) junto com a vetorização TF-IDF, que transforma palavras em cálculos matemáticos para classificar textos.

**Para que serve e onde é utilizado:**
Ele serve para classificar grandes volumes de dados de forma automática. É amplamente utilizado no mercado para:
* **Filtros de Spam:** Identificar e-mails maliciosos.
* **Análise de Sentimentos:** Saber se comentários de clientes são positivos ou negativos.
* **Detecção de Fraudes e Desinformação:** Avaliar a probabilidade de um texto ser falso com base nos padrões do seu vocabulário.

### 1.2 Inteligência Artificial Generativa (API Groq e LLMs)
**O que é a ferramenta:**
A Groq é uma plataforma de nuvem de altíssima velocidade que processa Grandes Modelos de Linguagem (LLMs, como o GPT e o Llama). Ela funciona como uma interface de programação (API) que nos permite usar uma inteligência artificial capaz de ler, interpretar e escrever textos como um ser humano.

**Finalidade e funcionamento:**
Ao invés de apenas classificar dados frios, essa IA entende o contexto das informações. No nosso sistema, enviamos para a API Groq a probabilidade estatística gerada pelo nosso Machine Learning e as notícias reais capturadas na web. A IA cruza tudo isso e escreve, em tempo real, um laudo explicando o porquê a notícia é verdadeira ou falsa.

**Exemplos práticos de uso:**
* Assistentes virtuais e chatbots de atendimento complexo.
* Geração automática de textos, resumos e relatórios corporativos.
* Tutores educacionais (como o perfil de "professor moderno" adotado no nosso projeto).

### 1.3 Backend e Web Scraping (FastAPI, Python e BeautifulSoup)
**O que são as tecnologias:**
FastAPI é uma estrutura (framework) em Python usada para criar o servidor da nossa aplicação web. Web Scraping é a técnica de usar robôs de software para ler e extrair dados de sites de forma automatizada (usando bibliotecas como BeautifulSoup).

**Como ocorre a integração:**
O nosso aplicativo web recebe a frase do usuário e a envia para a API. A API aciona o Web Scraper, que varre o Google News em tempo real buscando notícias reais sobre o tema. Todos esses dados (reportagens raspadas da web + cálculos matemáticos) são organizados pelo FastAPI e enviados para a Groq gerar o veredito final que aparece na tela do usuário.

---

## 2. Proposta para a Feira Tecnológica / de Ciências

**Tema / Nome do Projeto:**
VERIFICA.AI - Sistema Híbrido Inteligente para Checagem de Fatos e Combate à Desinformação.

**Problema que busca resolver / Proposta de Valor:**
O projeto atua no combate à rápida propagação de desinformação (fake news) e teorias da conspiração. A proposta de valor é oferecer uma ferramenta de dupla verificação: ela classifica a veracidade usando matemática (Machine Learning) e cruza o resultado com buscas de notícias na web em tempo real. O sistema devolve uma explicação didática, acolhedora e acessível (com uma persona de "professor moderno") para educar o usuário.

**Público-Alvo:**
Jovens e adultos que desejam navegar na internet de forma segura, além de estudantes, professores e profissionais que precisem de uma checagem rápida de boatos digitais.

**Como será a demonstração prática na feira:**
Durante a feira, os visitantes utilizarão a interface web do aplicativo no computador do estande. O visitante será convidado a digitar um boato clássico ou uma manchete polêmica. Ao clicar em enviar, o sistema processará as fontes oficiais na web em tempo real. A tela exibirá o laudo final, mostrando o painel técnico (a porcentagem matemática gerada pelo modelo local) e a resposta em texto corrido redigida pela Inteligência Artificial.

---

## 3. Como Funciona a Aplicação Prática: A Nossa "Equipe de Especialistas"

Para garantir que a resposta seja rápida, precisa e fácil de entender, a arquitetura do projeto divide a tarefa em várias etapas, funcionando como uma equipe:
* **A Vitrine (HTML, CSS e JS):** É a interface amigável no navegador onde o usuário digita a notícia suspeita.
* **O Garçom (FastAPI e Python):** A ponte de comunicação. Ele recebe a frase do usuário e entrega para os nossos motores de análise.
* **O Calculista (Machine Learning local):** O motor estatístico. Analisa os padrões das palavras e gera uma nota de 0% a 100% de risco.
* **O Jornalista Investigativo (Web Scraping):** O robô de busca. Vasculha a internet e portais de notícias em tempo real para encontrar as informações oficiais.
* **O Professor Moderno (API Groq):** O comunicador. Recebe a nota matemática e as reportagens reais, redigindo a explicação final de forma didática, paciente e clara.

---

### Tecnologias Utilizadas

<div align="left">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" height="40" alt="Python logo" />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg" height="40" alt="FastAPI logo" />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" height="40" alt="HTML5 logo" />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" height="40" alt="CSS3 logo" />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" height="40" alt="JavaScript logo" />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg" height="40" alt="Git logo" />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" height="40" alt="GitHub logo" />
</div>
<br>
<p><i>* Arquitetura suportada pela API Groq (LLM), Scikit-Learn (Machine Learning) e bibliotecas de extração de dados web (BeautifulSoup).</i></p>

---

## Histórico de Commits e Atualizações
- `[21/08/2026]` - Criação do repositório e estrutura inicial.
- `[30/08/2026]` - Implementação do modelo híbrido de Machine Learning (SVM) e API Groq.
- `[30/08/2026]` - Adição da proposta VERIFICA.AI e tema para a Feira Tecnológica.
- `[08/09/2026]` - Finalização do README, pesquisa teórica adaptada para as tecnologias do Verifica.AI e envio para avaliação.
