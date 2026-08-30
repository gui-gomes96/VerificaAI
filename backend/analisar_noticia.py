# -*- coding: utf-8 -*-
import re
import os
import joblib

# Caminhos absolutos/relativos para os modelos salvos por você
CAMINHO_MODELO = "modelo/modelo_fake_news.joblib"
CAMINHO_TFIDF = "modelo/tfidf.joblib"

# Carregamento global do modelo (carrega apenas uma vez quando o arquivo é importado)
MODELO_CARREGADO = False
try:
    if os.path.exists(CAMINHO_MODELO) and os.path.exists(CAMINHO_TFIDF):
        modelo_ml = joblib.load(CAMINHO_MODELO)
        vetorizador = joblib.load(CAMINHO_TFIDF)
        MODELO_CARREGADO = True
    else:
        print("⚠️ Modelos de IA não encontrados na pasta 'modelo/'.")
except Exception as e:
    print(f"⚠️ Erro ao carregar IA: {e}")


def analisar_noticia(noticia):
    """
    Usa o modelo de Machine Learning treinado para prever se a notícia é falsa ou verdadeira,
    mantendo também a extração de dados básicos.
    """
    titulo = noticia.get("titulo", "")
    conteudo = noticia.get("conteudo", "")
    conteudo_lower = conteudo.lower()
    
    quantidade_palavras = len(re.findall(r"\b\w+\b", conteudo_lower))
    numeros = re.findall(r"\d+[.,]?\d*%?", conteudo_lower)

    # Identificação de fontes governamentais/institucionais (Manteve sua lógica inteligente)
    fontes_importantes = ["ibge", "mec", "inep", "saeb", "unesp", "usp", "universidade", "instituto", "ministério"]
    fontes_detectadas = [fonte for fonte in fontes_importantes if fonte in conteudo_lower]

    # Dicionário de retorno base
    resultado = {
        "titulo": titulo,
        "palavras": quantidade_palavras,
        "numeros": numeros[:15],
        "fontes": fontes_detectadas,
        "caracteristicas": [],
        "pontuacao": 0,
        "classificacao": "Análise Indisponível"
    }

    if not conteudo:
        resultado["classificacao"] = "Conteúdo vazio ou insuficiente"
        return resultado

    # ==========================================
    # PREVISÃO COM O MODELO DE MACHINE LEARNING
    # ==========================================
    if MODELO_CARREGADO:
        try:
            # 1. Transforma o texto extraído no formato TF-IDF que a IA entende
            X_novo = vetorizador.transform([conteudo])
            
            # 2. Faz a previsão (0 = fake, 1 = true) e pega as porcentagens
            classe_predita = modelo_ml.predict(X_novo)[0]
            probabilidades = modelo_ml.predict_proba(X_novo)[0]
            
            prob_fake = probabilidades[0] * 100
            prob_true = probabilidades[1] * 100
            
            if classe_predita == 1:
                resultado["classificacao"] = f"✅ Notícia Confiável (Certeza da IA: {prob_true:.1f}%)"
                resultado["pontuacao"] = 7 # Nota máxima para integrar com o seu main
            else:
                resultado["classificacao"] = f"🚨 Possível FAKE NEWS (Certeza da IA: {prob_fake:.1f}%)"
                resultado["pontuacao"] = 1
                
        except Exception as e:
            resultado["classificacao"] = f"Erro na IA: {str(e)}"
    else:
        resultado["classificacao"] = "Modo de análise por regras (Modelo ML não carregado)"

    return resultado