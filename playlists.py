# playlists.py
import os
import shutil
import requests
from hashlib import md5
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configurações globais
HEADERS = {"User-Agent": "Mozilla/5.0"}
OUTPUT_DIR = os.path.join(os.getcwd(), "playlists")
TIMEOUT = 10
RETRIES = 3
MAX_WORKERS = 5

def validate_url(url):
    if not url.startswith(("http://", "https://")):
        logger.error(f"URL inválida: {url}")
        return False
    return True

def download_file(url, save_path, retries=RETRIES):
    if not validate_url(url):
        return False

    for attempt in range(retries):
        try:
            logger.info(f"Tentativa {attempt + 1} de {retries}: Baixando de: {url}")
            response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            if response.status_code == 200:
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                with open(save_path, 'wb') as file:
                    file.write(response.content)

                if os.path.getsize(save_path) > 0:
                    logger.info(f"Sucesso: {save_path} ({os.path.getsize(save_path)} bytes)")
                    with open(save_path, 'rb') as file:
                        file_hash = md5(file.read()).hexdigest()
                    logger.info(f"Hash MD5: {file_hash}")
                    return True
                else:
                    logger.error(f"Erro: Arquivo vazio ou corrompido: {save_path}")
            else:
                logger.error(f"Falha ao baixar {url}. Código: {response.status_code}")
        except requests.exceptions.Timeout:
            logger.error(f"Timeout ao baixar {url}")
        except requests.exceptions.ConnectionError:
            logger.error(f"Problema de conexão ao baixar {url}")
        except Exception as e:
            logger.error(f"Erro inesperado: {e}")

    logger.error(f"Falha após {retries} tentativas: {url}")
    return False

def main():
    logger.info("Limpando diretório anterior...")
    shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    files_to_download = {
        "m3u": {
            "epgbrasil.m3u": "http://m3u4u.com/m3u/3wk1y24kx7uzdevxygz7",
            "epgportugal.m3u": "http://m3u4u.com/m3u/jq2zy9epr3bwxmgwyxr5",
            "epgbrasilportugal.m3u": "http://m3u4u.com/m3u/782dyqdrqkh1xegen4zp",
            "PiauiTV.m3u": "https://gitlab.com/josieljefferson12/playlists/-/raw/main/PiauiTV.m3u",
            "m3u@proton.me.m3u": "https://gitlab.com/josieljefferson12/playlists/-/raw/main/m3u4u_proton.me.m3u"
        },
        "xml.gz": {
            "epgbrasil.xml.gz": "http://m3u4u.com/epg/3wk1y24kx7uzdevxygz7",
            "epgportugal.xml.gz": "http://m3u4u.com/epg/jq2zy9epr3bwxmgwyxr5",
            "epgbrasilportugal.xml.gz": "http://m3u4u.com/epg/782dyqdrqkh1xegen4zp"
        }
    }

    logger.info("Iniciando downloads...")
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = []
        for ext, files in files_to_download.items():
            for filename, url in files.items():
                save_path = os.path.join(OUTPUT_DIR, filename)
                futures.append(executor.submit(download_file, url, save_path))

        for future in as_completed(futures):
            if not future.result():
                logger.error("Erro em um dos downloads.")

    logger.info("Downloads concluídos.")

if __name__ == "__main__":
    main()
