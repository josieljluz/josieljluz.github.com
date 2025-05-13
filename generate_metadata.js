const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

// Configurações
const config = {
  owner: 'josieljluz',
  repo: 'josieljluz.github.io',
  branch: 'main',
  excludedFiles: [
    'index.html',
    '.gitignore',
    'README.md',
    'style.css',
    'script.js',
    'files_metadata.json',
    'generate_metadata.js',
    'package.json',
    'package-lock.json'
  ],
  outputFile: 'files_metadata.json'
};

// Autenticação
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'GitHub-Files-Metadata-Generator'
});

async function getFileMetadata() {
  try {
    console.log('Iniciando geração de metadados...');
    
    // Obter lista de arquivos
    const { data: files } = await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      ref: config.branch
    });

    console.log(`Total de itens encontrados: ${files.length}`);

    // Filtrar apenas arquivos (não diretórios) e excluir os não desejados
    const fileList = files.filter(item => 
      item.type === 'file' && !config.excludedFiles.includes(item.name)
    );

    console.log(`Arquivos a processar após filtro: ${fileList.length}`);

    // Obter metadados para cada arquivo
    const filesMetadata = [];
    
    for (const file of fileList) {
      try {
        console.log(`Processando: ${file.name}`);
        
        // Obter informações de commit mais recente
        const { data: commits } = await octokit.rest.repos.listCommits({
          owner: config.owner,
          repo: config.repo,
          path: file.path,
          per_page: 1
        });

        filesMetadata.push({
          name: file.name,
          path: file.path,
          size: file.size,
          lastModified: commits[0]?.commit?.committer?.date || new Date().toISOString(),
          download_url: file.download_url
        });
      } catch (error) {
        console.error(`Erro ao processar ${file.name}:`, error.message);
        // Adiciona informações básicas mesmo com erro
        filesMetadata.push({
          name: file.name,
          path: file.path,
          size: file.size,
          lastModified: new Date().toISOString(),
          download_url: file.download_url
        });
      }
    }

    // Salvar metadados em arquivo JSON
    fs.writeFileSync(
      path.join(__dirname, config.outputFile),
      JSON.stringify(filesMetadata, null, 2)
    );

    console.log(`Metadados gerados com sucesso em ${config.outputFile}`);
    console.log(`Total de arquivos processados: ${filesMetadata.length}`);
  } catch (error) {
    console.error('Erro crítico ao gerar metadados:', error);
    process.exit(1);
  }
}

getFileMetadata();