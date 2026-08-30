# -*- coding: utf-8 -*-
import sys
import io

# ============================================================
# CORREÇÃO DE ENCODING PARA WINDOWS/POWERSHELL
# Impede que acentos apareçam como "Ã£" e conserta as Regex
# ============================================================
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='replace')

# Importando os SEUS módulos originais
from backend.analisar_afirmacao import analisar_afirmacao
from backend.buscar_noticias import buscar_noticias
from backend.resolver_noticia import encontrar_noticia
from backend.extrair_noticia import extrair_noticia
from backend.analisar_noticia import analisar_noticia

def calcular_confianca(analise):
    """Sua lógica original de cálculo de confiança."""
    pontuacao = 0
    if analise.get("possui_afirmacao_factual"):
        pontuacao += 30
    if analise.get("possui_ranking"):
        pontuacao += 20
    if analise.get("possui_comparacao"):
        pontuacao += 15
    if analise.get("numeros"):
        pontuacao += 15
    if analise.get("termos_importantes"):
        pontuacao += 20
    
    # Adicionando um piso para não ficar em 0% e um teto seguro
    return max(15, min(pontuacao, 95))

def mostrar_analise(analise):
    print("\n================================")
    print("       ANÁLISE INICIAL")
    print("================================")
    print(f"\n📝 Afirmação:\n{analise.get('texto', '')}")
    print(f"\n📊 Tipo: {analise.get('tipo', 'Não identificado')}")
    
    confianca = calcular_confianca(analise)
    print(f"\n🎯 Confiança da análise inicial: {confianca}%")
    print("\n⚠️ ATENÇÃO: Essa porcentagem NÃO significa que a informação é verdadeira ou falsa.")
    print("Ela representa apenas a confiança da análise inicial da estrutura da afirmação.")

    if analise.get("possui_afirmacao_factual"):
        print("\n✅ A frase apresenta uma afirmação que pode ser verificada.")
    if analise.get("possui_ranking"):
        print("🏆 A afirmação envolve ranking ou classificação.")
    if analise.get("possui_comparacao"):
        print("⚖️ A afirmação possui uma comparação.")
    
    if analise.get("termos_importantes"):
        print("\n🔎 Termos importantes extraídos para busca:")
        for termo in analise["termos_importantes"]:
            print(f"   • {termo}")

def mostrar_noticias(noticias):
    print("\n================================")
    print("       NOTÍCIAS RELACIONADAS")
    print("================================")
    if not noticias:
        print("\n❌ Nenhuma notícia encontrada.")
        return

    for i, noticia in enumerate(noticias, start=1):
        print(f"\n{i}. {noticia.get('titulo', 'Sem título')}")
        print(f"🏢 {noticia.get('fonte', 'Fonte desconhecida')}")

def selecionar_noticia(noticias):
    while True:
        escolha = input("\nDigite o número de uma notícia para extrair e analisar ou 'voltar':\n> ").strip()
        if escolha.lower() == "voltar":
            return None
        if not escolha.isdigit():
            print("\n⚠️ Digite apenas um número.")
            continue
        
        numero = int(escolha)
        if numero < 1 or numero > len(noticias):
            print("\n⚠️ Número inválido.")
            continue
        
        return noticias[numero - 1]

def main():
    print("================================")
    print("          VERIFICA.AI")
    print("================================")
    print("\nDigite uma informação ou afirmação.")
    
    while True:
        texto = input("\n🔎 Informação (ou 'sair'):\n> ").strip()
        if texto.lower() == "sair":
            print("\nEncerrando...")
            break
        if not texto:
            print("\n⚠️ Digite alguma informação.")
            continue

        # 1. ANÁLISE
        print("\n🔎 Analisando informação...")
        try:
            analise = analisar_afirmacao(texto)
        except Exception as erro:
            print(f"\n❌ Erro na análise: {erro}")
            continue
            
        mostrar_analise(analise)

        # 2. BUSCA DE NOTÍCIAS
        print("\n================================")
        print("       BUSCANDO EVIDÊNCIAS")
        print("================================")
        print("\n🔎 Pesquisando notícias...")
        
        # Otimização: se extraiu termos, busca por eles, senão busca a frase inteira
        termos_busca = " ".join(analise.get("termos_importantes", []))
        query = termos_busca if termos_busca else texto

        try:
            noticias = buscar_noticias(query)
        except Exception as erro:
            print(f"\n❌ Erro ao buscar notícias: {erro}")
            continue

        mostrar_noticias(noticias)
        if not noticias:
            print("\n⚠️ Não foram encontradas fontes suficientes.")
            continue

        # 3. EXTRAÇÃO E ANÁLISE DE CONTEÚDO (NOVA INTEGRAÇÃO)
        noticia = selecionar_noticia(noticias)
        if noticia is None:
            continue

        print("\n================================")
        print("       RESOLVENDO LINK")
        print("================================")
        
        link_bruto = noticia.get('link', '')
        titulo_noticia = noticia.get('titulo', '')
        fonte_noticia = noticia.get('fonte', '')
        
        url_resolvida = encontrar_noticia(titulo=titulo_noticia, fonte=fonte_noticia, url=link_bruto)

        if url_resolvida:
            dados_extraidos = extrair_noticia(url=url_resolvida)
            
            if dados_extraidos and dados_extraidos.get("conteudo"):
                print("\n================================")
                print("      AVALIAÇÃO DA FONTE")
                print("================================")
                
                # Passa o conteúdo extraído para o seu analisador
                analise_fonte = analisar_noticia(dados_extraidos)
                
                print(f"📊 Classificação: {analise_fonte['classificacao']}")
                print(f"📈 Pontuação da Fonte: {analise_fonte['pontuacao']}/7")
                print(f"📝 Tamanho: {analise_fonte['palavras']} palavras")
                
                if analise_fonte['fontes']:
                    print(f"🏢 Órgãos citados: {', '.join(analise_fonte['fontes'])}")
                
                print("\n📌 Conclusão: A fonte acima foi analisada.")
                print("Recomendamos a leitura do link original para formar sua própria conclusão:")
                print(url_resolvida)
                print("================================\n")
            else:
                print("\n⚠️ A URL foi resolvida, mas não foi possível extrair o texto para análise.")
        else:
             print("\n⚠️ Não foi possível chegar à página final da notícia.")

if __name__ == "__main__":
    main()