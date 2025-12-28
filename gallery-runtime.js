// Gallery Generator Script
// This script dynamically creates gallery sections from data arrays

function generateGalleries(galleries, containerSelector = 'body') {
  const container = document.querySelector(containerSelector);

  galleries.forEach((gallery, galleryIndex) => {
    const isFirst = galleryIndex === 0;
    const suffix = isFirst ? '' : galleryIndex + 1;

    // Create main container
    const galleryContainer = document.createElement('div');
    galleryContainer.className = 'container';
    if (!isFirst) {
      galleryContainer.style.paddingTop = '0';
      galleryContainer.style.marginTop = '40px';
    }

    // Menu column (empty for non-first galleries)
    const menuCol = document.createElement('div');
    menuCol.className = 'menu-col';
    if (isFirst) {
      menuCol.id = 'menu-placeholder';
    }

    // Content column
    const contentCol = document.createElement('div');
    contentCol.className = 'content-col';

    const galleryDiv = document.createElement('div');
    galleryDiv.className = 'gallery';

    // Title and description
    const titleDiv = document.createElement('div');
    titleDiv.style.marginBottom = '10px';
    titleDiv.style.textAlign = 'left';
    titleDiv.innerHTML = `<b>${gallery.title}</b><br>${gallery.description}`;

    // Preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'preview-container';
    previewContainer.id = `preview-container${suffix}`;
    if (gallery.aspectRatio === 'auto') {
      previewContainer.style.aspectRatio = 'auto';
      previewContainer.style.height = 'auto';
    }

    const previewImg = document.createElement('img');
    previewImg.id = `preview${suffix}`;

    const navLeft = document.createElement('div');
    navLeft.className = 'nav-left';
    navLeft.id = `prev${suffix}`;

    const navRight = document.createElement('div');
    navRight.className = 'nav-right';
    navRight.id = `next${suffix}`;

    previewContainer.appendChild(previewImg);
    previewContainer.appendChild(navLeft);
    previewContainer.appendChild(navRight);

    // Thumbnail container
    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.className = 'thumbnail-container';
    thumbnailContainer.id = `thumbnails${suffix}`;

    galleryDiv.appendChild(titleDiv);
    galleryDiv.appendChild(previewContainer);
    galleryDiv.appendChild(thumbnailContainer);
    contentCol.appendChild(galleryDiv);

    // Spacer column with notes
    const spacerCol = document.createElement('div');
    spacerCol.className = 'spacer-col';

    const noteDiv = document.createElement('div');
    noteDiv.id = `image-note${suffix}`;
    noteDiv.style.textAlign = 'left';
    noteDiv.style.lineHeight = '1.2';
    noteDiv.style.overflowY = 'auto';

    spacerCol.appendChild(noteDiv);

    // Assemble container
    galleryContainer.appendChild(menuCol);
    galleryContainer.appendChild(contentCol);
    galleryContainer.appendChild(spacerCol);

    container.appendChild(galleryContainer);

    // Initialize gallery functionality
    initializeGallery(gallery, suffix);
  });
}

function initializeGallery(gallery, suffix) {
  const images = gallery.images;
  const notes = gallery.notes;

  const noteDisplay = document.getElementById(`image-note${suffix}`);
  const preview = document.getElementById(`preview${suffix}`);
  const thumbnails = document.getElementById(`thumbnails${suffix}`);
  const navLeft = document.getElementById(`prev${suffix}`);
  const navRight = document.getElementById(`next${suffix}`);
  const previewContainer = document.getElementById(`preview-container${suffix}`);

  let current = 0;

  // Preload images
  images.forEach(src => {
    const i = new Image();
    i.src = src;
  });

  function showImage(i) {
    current = i;
    preview.src = images[i];
    thumbnails.querySelectorAll("img").forEach(t => t.classList.remove("active"));
    thumbnails.querySelectorAll("img")[i].classList.add("active");
    noteDisplay.innerHTML = notes[i];
  }

  function updateLayout() {
    navLeft.style.top = preview.offsetTop + "px";
    navLeft.style.height = preview.offsetHeight + "px";
    navLeft.style.width = preview.offsetWidth / 2 + "px";

    navRight.style.top = preview.offsetTop + "px";
    navRight.style.height = preview.offsetHeight + "px";
    navRight.style.width = preview.offsetWidth / 2 + "px";

    const gallery = previewContainer.parentElement;
    noteDisplay.style.marginTop = (previewContainer.offsetTop - gallery.offsetTop) + "px";
    noteDisplay.style.height = previewContainer.offsetHeight + "px";
  }

  // Create thumbnails
  images.forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src;
    img.addEventListener('click', () => showImage(i));
    thumbnails.appendChild(img);
  });
  thumbnails.querySelectorAll("img")[0].classList.add("active");

  // Navigation
  navLeft.addEventListener('click', () => showImage((current - 1 + images.length) % images.length));
  navRight.addEventListener('click', () => showImage((current + 1) % images.length));

  preview.addEventListener('load', updateLayout);
  window.addEventListener('resize', updateLayout);

  // Initial display
  preview.src = images[0];
  noteDisplay.innerHTML = notes[0];
  updateLayout();
}
