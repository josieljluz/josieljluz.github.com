// Configurações
const config = {
  metadataFile: 'files_metadata.json',
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
  itemsPerPage: 15
};

// Estado da aplicação
let filesCache = [];
let currentSort = 'name';
let currentPage = 1;
let currentSearchTerm = '';

// Elementos DOM
const fileList = document.getElementById('file-list');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');

// Funções auxiliares
const formatBytes = (bytes) => {
  if (typeof bytes !== 'number' || isNaN(bytes)) return 'Tamanho desconhecido';
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10),
    sizes.length - 1
  );
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};

const formatDate = (isoString) => {
  if (!isoString) return 'Data desconhecida';
  
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
  } catch (e) {
    return 'Data inválida';
  }
};

const getFileIcon = (filename) => {
  const extension = filename.split('.').pop().toLowerCase();
  const icons = {
    pdf: '📄',
    doc: '📝', docx: '📝',
    xls: '📊', xlsx: '📊',
    ppt: '📊', pptx: '📊',
    txt: '📑',
    zip: '🗜️', rar: '🗜️', '7z': '🗜️',
    exe: '⚙️', msi: '⚙️',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️',
    mp3: '🎵', wav: '🎵',
    mp4: '🎬', avi: '🎬', mkv: '🎬',
    default: '📁'
  };
  return icons[extension] || icons.default;
};

// Funções de ordenação
const sortFiles = (files, method) => {
  const sorted = [...files];
  
  switch(method) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'nameDesc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'date':
      return sorted.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    case 'dateOldest':
      return sorted.sort((a, b) => new Date(a.lastModified) - new Date(b.lastModified));
    case 'size':
      return sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
    case 'sizeSmallest':
      return sorted.sort((a, b) => (a.size || 0) - (b.size || 0));
    default:
      return sorted;
  }
};

// Funções de paginação
const paginateFiles = (files, page, perPage) => {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return files.slice(start, end);
};

const renderPagination = (totalItems, currentPage, itemsPerPage) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginationControls = document.getElementById('pagination-controls');
  
  if (totalPages <= 1) {
    paginationControls.innerHTML = '';
    return;
  }
  
  let buttons = [];
  
  // Botão anterior
  buttons.push(
    `<button class="pagination-button" ${currentPage === 1 ? 'disabled' : ''} 
     data-page="${currentPage - 1}">«</button>`
  );
  
  // Páginas
  const maxVisibleButtons = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  
  if (currentPage <= 3) {
    endPage = Math.min(5, totalPages);
  } else if (currentPage >= totalPages - 2) {
    startPage = Math.max(totalPages - 4, 1);
  }
  
  if (startPage > 1) {
    buttons.push('<button class="pagination-button" data-page="1">1</button>');
    if (startPage > 2) buttons.push('<span class="pagination-ellipsis">...</span>');
  }
  
  for (let i = startPage; i <= endPage; i++) {
    buttons.push(
      `<button class="pagination-button ${i === currentPage ? 'active' : ''}" 
       data-page="${i}">${i}</button>`
    );
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) buttons.push('<span class="pagination-ellipsis">...</span>');
    buttons.push(`<button class="pagination-button" data-page="${totalPages}">${totalPages}</button>`);
  }
  
  // Botão próximo
  buttons.push(
    `<button class="pagination-button" ${currentPage === totalPages ? 'disabled' : ''} 
     data-page="${currentPage + 1}">»</button>`
  );
  
  paginationControls.innerHTML = buttons.join('');
  
  // Informações de paginação
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  const infoText = `Mostrando ${startItem}-${endItem} de ${totalItems} arquivos`;
  
  let infoElement = paginationControls.nextElementSibling;
  if (!infoElement || !infoElement.classList.contains('pagination-info')) {
    infoElement = document.createElement('div');
    infoElement.className = 'pagination-info';
    paginationControls.after(infoElement);
  }
  infoElement.textContent = infoText;
};

// Renderização
const renderFiles = () => {
  let filesToRender = [...filesCache];
  
  // Aplicar filtro de busca
  if (currentSearchTerm) {
    const term = currentSearchTerm.toLowerCase();
    filesToRender = filesToRender.filter(file => 
      file.name.toLowerCase().includes(term)
    );
  }
  
  // Aplicar ordenação
  filesToRender = sortFiles(filesToRender, currentSort);
  
  // Verificar se há arquivos
  if (filesToRender.length === 0) {
    fileList.innerHTML = '<li class="error-message">Nenhum arquivo encontrado.</li>';
    document.getElementById('pagination-controls').innerHTML = '';
    return;
  }
  
  // Aplicar paginação
  const paginatedFiles = paginateFiles(filesToRender, currentPage, config.itemsPerPage);
  
  // Renderizar arquivos
  fileList.innerHTML = paginatedFiles.map(file => `
    <li>
      <a href="${file.download_url}" target="_blank" rel="noopener noreferrer">
        <span class="file-icon">${getFileIcon(file.name)}</span>
        ${file.name}
      </a>
      <div class="file-details">
        <span>📏 ${formatBytes(file.size)}</span>
        <span>🕒 ${formatDate(file.lastModified)}</span>
      </div>
    </li>
  `).join('');
  
  // Renderizar controles de paginação
  renderPagination(filesToRender.length, currentPage, config.itemsPerPage);
};

// Event listeners
const setupEventListeners = () => {
  searchInput.addEventListener('input', (e) => {
    currentSearchTerm = e.target.value;
    currentPage = 1;
    renderFiles();
  });
  
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderFiles();
  });
  
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('pagination-button')) {
      e.preventDefault();
      const page = parseInt(e.target.dataset.page);
      if (!isNaN(page) && page !== currentPage) {
        currentPage = page;
        renderFiles();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  });
};

// Carregar metadados
const loadFilesMetadata = async () => {
  try {
    const response = await fetch(config.metadataFile);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    filesCache = data
      .filter(file => !config.excludedFiles.includes(file.name))
      .map(file => ({
        ...file,
        icon: getFileIcon(file.name)
      }));
    
    renderFiles();
  } catch (error) {
    console.error('Erro ao carregar metadados:', error);
    fileList.innerHTML = `
      <li class="error-message">
        Erro ao carregar arquivos. Por favor, recarregue a página.
        <button onclick="window.location.reload()">Recarregar</button>
      </li>
    `;
  }
};

// Inicialização
const init = () => {
  setupEventListeners();
  loadFilesMetadata();
};

document.addEventListener('DOMContentLoaded', init);