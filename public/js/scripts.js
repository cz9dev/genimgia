document.addEventListener("DOMContentLoaded", () => {
  // Ocultar mensajes flash solo si existen
  const messages = document.querySelectorAll(".bg-red-100, .bg-green-100");
  if (messages.length > 0) {
    messages.forEach((msg) => {
      setTimeout(() => {
        msg.classList.add("opacity-0");
        setTimeout(() => msg.remove(), 300);
      }, 5000);
    });
  }

  const generateForm = document.getElementById("generateForm");
  const resultContainer = document.getElementById("resultContainer");
  const generatedImage = document.getElementById("generatedImage");
  const downloadBtn = document.getElementById("downloadBtn");
  const saveBtn = document.getElementById("saveBtn");
  const gallery = document.getElementById("gallery");
  const loaderContainer = document.getElementById("loaderContainer");
  const cancelBtn = document.getElementById("cancelGeneration");

  let controller = null;

  // Función para mostrar alertas
  const showAlert = (message, type) => {
    if (!message?.trim()) return;

    const alertDiv = document.createElement("div");
    alertDiv.className = `fixed top-4 right-4 p-4 rounded-md ${
      type === "success"
        ? "bg-green-100 text-green-800"
        : "bg-red-100 text-red-800"
    }`;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
      alertDiv.classList.add("opacity-0", "transition-opacity", "duration-300");
      setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
  };

  // Función para cargar imágenes del usuario
  const loadUserImages = async () => {
    try {
      const response = await fetch("/generator/images");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      if (data.success) {
        gallery.innerHTML =
          data.images?.length > 0
            ? data.images
                .map(
                  (image) => `
              <div class="bg-gray-50 rounded-lg overflow-hidden shadow-sm image-card">
                <img src="${image.imageUrl}" alt="${
                    image.prompt
                  }" class="w-full h-48 object-cover">
                <div class="p-3">
                  <p class="text-sm text-gray-600 truncate">${image.prompt}</p>
                  <p class="text-xs text-gray-500 mt-1">
                    ${new Date(image.createdAt).toLocaleString()}
                  </p>
                  <div class="image-actions">
                    <button class="delete-btn" data-id="${
                      image.id
                    }">Eliminar</button>
                    <button class="share-btn" data-id="${
                      image.id
                    }">Compartir</button>
                  </div>
                </div>
              </div>
            `
                )
                .join("")
            : '<p class="text-gray-500 text-center py-4">No tienes imágenes guardadas aún</p>';
      }
    } catch (error) {
      console.error("Error loading images:", error);
      showAlert("Error al cargar las imágenes", "error");
    }
  };

  // Evento para el formulario de generación
  generateForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Configurar estado de carga
    const submitButton = generateForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Generando...
    `;
    loaderContainer.classList.remove("hidden");
    controller = new AbortController();

    try {
      const formData = new FormData(generateForm);
      const response = await fetch("/generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
        signal: controller.signal,
      });

      const data = await response.json();

      if (data.success) {
        generatedImage.src = data.imageUrl;
        downloadBtn.href = data.imageUrl;
        downloadBtn.download = `imagen-generada-${Date.now()}.png`;
        resultContainer.classList.remove("hidden");

        // Actualizar galería solo si se guardó automáticamente
        if (data.autoSaved) {
          await loadUserImages();
        }
      } else {
        showAlert(data.error || "No se pudo generar la imagen", "error");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Error:", error);
        showAlert("Ocurrió un error al generar la imagen", "error");
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Generar Imagen";
      loaderContainer.classList.add("hidden");
      controller = null;
    }
  });

  // Evento para cancelar generación
  cancelBtn.addEventListener("click", () => {
    if (controller) {
      controller.abort();
      showAlert("Generación cancelada", "info");
    }
  });

  // Evento para guardar imagen
  saveBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/generator/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: generatedImage.src,
          prompt: generateForm.prompt.value,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showAlert("Imagen guardada en tu galería", "success");
        await loadUserImages();
      } else {
        showAlert(data.error || "No se pudo guardar la imagen", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      showAlert("Ocurrió un error al guardar la imagen", "error");
    }
  });

  // Delegación de eventos para acciones dinámicas
  document.addEventListener("click", async (e) => {
    // Eliminar imagen
    if (e.target.classList.contains("delete-btn")) {
      if (confirm("¿Seguro que quieres eliminar esta imagen?")) {
        try {
          const response = await fetch(`/generator/${e.target.dataset.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          });

          const result = await response.json();
          if (result.success) {
            e.target.closest(".image-card").remove();
            showAlert("Imagen eliminada correctamente", "success");
          } else {
            showAlert(result.error || "Error al eliminar la imagen", "error");
          }
        } catch (error) {
          console.error("Error:", error);
          showAlert("Error al eliminar la imagen", "error");
        }
      }
    }

    // Compartir imagen
    if (e.target.classList.contains("share-btn")) {
      try {
        const response = await fetch(
          `/generator/${e.target.dataset.id}/share`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );

        const result = await response.json();
        if (result.success) {
          await navigator.clipboard.writeText(result.shareUrl);
          showAlert("Enlace copiado al portapapeles", "success");
        } else {
          showAlert(result.error || "Error al compartir la imagen", "error");
        }
      } catch (error) {
        console.error("Error:", error);
        showAlert("Error al compartir la imagen", "error");
      }
    }
  });

  // Cargar imágenes al iniciar
  loadUserImages();
});
